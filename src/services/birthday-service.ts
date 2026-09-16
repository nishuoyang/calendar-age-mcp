import { DEFAULT_TIMEZONE, MAX_BIRTHDAY_RANGE_YEARS } from "../constants.js";
import {
  AGE_SYSTEMS,
  type AgeSystem,
  type WarningMessage,
  chronologicalElapsedDays,
  completedGregorianYears,
  nextGregorianBirthday,
} from "../domain/age.js";
import {
  type CalendarDate,
  type CalendarDateInput,
  type CalendarName,
  type ChineseLunarDate,
  type GregorianDate,
  compareGregorianDates,
  formatCalendarDate,
  formatGregorianDate,
  normalizeCalendarDate,
  normalizeCalendarName,
} from "../domain/calendar-date.js";
import { DomainError, ERROR_CODES } from "../domain/errors.js";
import {
  type LeapMonthPolicy,
  type NominalAgeRule,
} from "../domain/leap-month-policy.js";
import {
  type CalendarCalculateAgeInput,
  type CalendarListBirthdaysInput,
} from "../schemas/calendar.js";
import {
  type CalendarConverter,
  calendarConverter,
} from "./calendar-converter.js";

export interface CalendarConversionResult {
  source: CalendarDate;
  target: CalendarDate;
  normalized_gregorian: string;
  warnings: WarningMessage[];
}

export interface AgeCalculationResult {
  birth: {
    input: CalendarDate;
    gregorian: GregorianDate;
    normalized_gregorian: string;
  };
  as_of: {
    gregorian: GregorianDate;
    normalized_gregorian: string;
    timezone: string;
  };
  rules: {
    leap_month_policy: LeapMonthPolicy;
    nominal_age_rule: NominalAgeRule;
  };
  ages: {
    chronological_days?: {
      days: number;
    };
    gregorian_completed_years?: {
      years: number;
      next_birthday?: string;
    };
    chinese_lunar_completed_years?: {
      years: number;
      previous_birthday?: string;
      next_birthday?: string;
    };
    chinese_nominal_age?: {
      years: number;
      rule: NominalAgeRule;
      previous_increment?: string;
      next_increment?: string;
    };
  };
  warnings: WarningMessage[];
}

export interface BirthdayListResult {
  birthday_calendar: CalendarName;
  target_calendar: CalendarName;
  leap_month_policy: LeapMonthPolicy;
  items: Array<{
    calendar_year: number;
    target: CalendarDate;
    normalized_target: string;
  }>;
  count: number;
  has_more: boolean;
}

interface LunarBirthdayOccurrence {
  lunarDate: ChineseLunarDate;
  gregorianDate: GregorianDate;
}

export class BirthdayService {
  constructor(private readonly converter: CalendarConverter = calendarConverter) {}

  convertDate(
    input: CalendarDateInput,
    targetCalendar: string,
  ): CalendarConversionResult {
    const target = normalizeCalendarName(targetCalendar);
    const source = normalizeCalendarDate(input);
    const conversion = this.converter.convert(source, target);

    return {
      source,
      target: conversion.target,
      normalized_gregorian: conversion.normalizedGregorian,
      warnings: [],
    };
  }

  calculateAge(input: CalendarCalculateAgeInput): AgeCalculationResult {
    const birthInput = normalizeCalendarDate(input.birth_date);
    const birthGregorian = this.converter.toGregorian(birthInput);
    const timezone = this.normalizeTimezone(input.timezone ?? DEFAULT_TIMEZONE);
    const asOfGregorian = input.as_of_date
      ? this.converter.toGregorian(normalizeCalendarDate(input.as_of_date))
      : resolveToday(timezone);

    if (compareGregorianDates(asOfGregorian, birthGregorian) < 0) {
      throw new DomainError(
        ERROR_CODES.AS_OF_BEFORE_BIRTH,
        `As-of date ${formatGregorianDate(asOfGregorian)} precedes Gregorian birth date ${formatGregorianDate(birthGregorian)}.`,
        {
          birth: birthGregorian,
          as_of: asOfGregorian,
        },
      );
    }

    const requestedSystems = this.validateAgeSystems(input.age_systems);
    const warnings: WarningMessage[] = [];
    const ages: AgeCalculationResult["ages"] = {};
    const birthLunar = this.converter.toChineseLunar(birthGregorian);
    const asOfLunar = this.converter.toChineseLunar(asOfGregorian);

    for (const system of requestedSystems) {
      switch (system) {
        case "chronological_days":
          ages.chronological_days = {
            days: chronologicalElapsedDays(birthGregorian, asOfGregorian),
          };
          break;
        case "gregorian_completed_years": {
          const nextBirthday = nextGregorianBirthday(
            birthGregorian,
            asOfGregorian,
          );
          if (!nextBirthday) {
            warnings.push({
              code: "NEXT_BIRTHDAY_OUT_OF_RANGE",
              message:
                "The next Gregorian birthday is outside the supported range.",
            });
          }
          ages.gregorian_completed_years = {
            years: completedGregorianYears(birthGregorian, asOfGregorian),
            ...(nextBirthday
              ? { next_birthday: formatGregorianDate(nextBirthday) }
              : {}),
          };
          break;
        }
        case "chinese_lunar_completed_years": {
          const occurrences = this.collectLunarBirthdayOccurrences(
            birthLunar,
            asOfLunar.year,
            input.leap_month_policy,
          );
          const completed = occurrences.filter(
            (occurrence) =>
              compareGregorianDates(occurrence.gregorianDate, birthGregorian) >
                0 &&
              compareGregorianDates(
                occurrence.gregorianDate,
                asOfGregorian,
              ) <= 0,
          );
          const next = occurrences.find(
            (occurrence) =>
              compareGregorianDates(
                occurrence.gregorianDate,
                asOfGregorian,
              ) > 0,
          );
          const latest = occurrences
            .filter(
              (occurrence) =>
                compareGregorianDates(
                  occurrence.gregorianDate,
                  asOfGregorian,
                ) <= 0,
            )
            .at(-1);

          if (!next) {
            warnings.push({
              code: "NEXT_BIRTHDAY_OUT_OF_RANGE",
              message:
                "The next Chinese lunar birthday is outside the supported range.",
            });
          }

          const latestBirthday = latest?.gregorianDate ?? birthGregorian;
          ages.chinese_lunar_completed_years = {
            years: completed.length,
            ...(latestBirthday
              ? { previous_birthday: formatGregorianDate(latestBirthday) }
              : {}),
            ...(next
              ? { next_birthday: formatGregorianDate(next.gregorianDate) }
              : {}),
          };
          break;
        }
        case "chinese_nominal_age": {
          const currentNewYear = this.converter.toGregorian({
            calendar: "chinese_lunar",
            year: asOfLunar.year,
            month: 1,
            day: 1,
            is_leap_month: false,
          });
          const nextNewYear = this.tryConvertLunar({
            calendar: "chinese_lunar",
            year: asOfLunar.year + 1,
            month: 1,
            day: 1,
            is_leap_month: false,
          });
          const previousIncrement =
            compareGregorianDates(currentNewYear, birthGregorian) >= 0
              ? currentNewYear
              : birthGregorian;

          if (!nextNewYear) {
            warnings.push({
              code: "NEXT_INCREMENT_OUT_OF_RANGE",
              message:
                "The next Chinese New Year is outside the supported range.",
            });
          }

          ages.chinese_nominal_age = {
            years: asOfLunar.year - birthLunar.year + 1,
            rule: input.nominal_age_rule,
            previous_increment: formatGregorianDate(previousIncrement),
            ...(nextNewYear
              ? { next_increment: formatGregorianDate(nextNewYear) }
              : {}),
          };
          break;
        }
      }
    }

    return {
      birth: {
        input: birthInput,
        gregorian: birthGregorian,
        normalized_gregorian: formatGregorianDate(birthGregorian),
      },
      as_of: {
        gregorian: asOfGregorian,
        normalized_gregorian: formatGregorianDate(asOfGregorian),
        timezone,
      },
      rules: {
        leap_month_policy: input.leap_month_policy,
        nominal_age_rule: input.nominal_age_rule,
      },
      ages,
      warnings,
    };
  }

  listBirthdays(input: CalendarListBirthdaysInput): BirthdayListResult {
    const birth = normalizeCalendarDate(input.birth_date);
    const targetCalendar = normalizeCalendarName(input.target_calendar);
    this.validateBirthdayRange(input.start_year, input.end_year);

    const items: BirthdayListResult["items"] = [];

    for (
      let year = input.start_year;
      year <= input.end_year;
      year += 1
    ) {
      if (
        (birth.calendar === "gregorian" && year < birth.year) ||
        (birth.calendar === "chinese_lunar" && year < birth.year)
      ) {
        continue;
      }

      const occurrence = this.resolveBirthdayInCalendarYear(
        birth,
        year,
        input.leap_month_policy,
      );
      if (!occurrence) {
        continue;
      }

      const converted = this.converter.convert(occurrence, targetCalendar);
      items.push({
        calendar_year: year,
        target: converted.target,
        normalized_target: formatCalendarDate(converted.target),
      });
    }

    return {
      birthday_calendar: birth.calendar,
      target_calendar: targetCalendar,
      leap_month_policy: input.leap_month_policy,
      items,
      count: items.length,
      has_more: false,
    };
  }

  private collectLunarBirthdayOccurrences(
    birth: ChineseLunarDate,
    throughLunarYear: number,
    policy: LeapMonthPolicy,
  ): LunarBirthdayOccurrence[] {
    const occurrences: LunarBirthdayOccurrence[] = [];

    for (
      let year = birth.year + 1;
      year <= throughLunarYear + 1;
      year += 1
    ) {
      const lunarDate = this.resolveLunarBirthday(birth, year, policy);
      if (!lunarDate) {
        continue;
      }

      const gregorianDate = this.tryConvertLunar(lunarDate);
      if (!gregorianDate) {
        continue;
      }

      occurrences.push({ lunarDate, gregorianDate });
    }

    return occurrences;
  }

  private resolveBirthdayInCalendarYear(
    birth: CalendarDate,
    year: number,
    policy: LeapMonthPolicy,
  ): CalendarDate | undefined {
    if (birth.calendar === "gregorian") {
      return this.tryGregorianBirthday(birth, year);
    }

    return (
      this.resolveLunarBirthday(birth, year, policy) ?? undefined
    );
  }

  private resolveLunarBirthday(
    birth: ChineseLunarDate,
    year: number,
    policy: LeapMonthPolicy,
  ): ChineseLunarDate | null {
    if (!birth.is_leap_month) {
      return {
        calendar: "chinese_lunar",
        year,
        month: birth.month,
        day: birth.day,
        is_leap_month: false,
      };
    }

    const leapMonth = this.converter.getLeapMonth(year);
    if (leapMonth === birth.month) {
      return {
        calendar: "chinese_lunar",
        year,
        month: birth.month,
        day: birth.day,
        is_leap_month: true,
      };
    }

    if (policy === "strict") {
      throw new DomainError(
        ERROR_CODES.AMBIGUOUS_LEAP_BIRTHDAY,
        `Chinese lunar year ${year} does not have leap month ${birth.month}, so the leap-month birthday cannot be resolved under the strict policy.`,
        {
          year,
          month: birth.month,
          is_leap_month: true,
          leap_month: leapMonth,
          policy,
        },
      );
    }

    if (policy === "skip") {
      return null;
    }

    return {
      calendar: "chinese_lunar",
      year,
      month: birth.month,
      day: birth.day,
      is_leap_month: false,
    };
  }

  private tryConvertLunar(
    date: ChineseLunarDate,
  ): GregorianDate | undefined {
    try {
      return this.converter.toGregorian(date);
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === ERROR_CODES.DATE_OUT_OF_RANGE
      ) {
        return undefined;
      }

      throw error;
    }
  }

  private tryGregorianBirthday(
    birth: GregorianDate,
    year: number,
  ): GregorianDate | undefined {
    try {
      return this.converter.toGregorian({
        calendar: "gregorian",
        year,
        month: birth.month,
        day: birth.day,
      });
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === ERROR_CODES.INVALID_DATE
      ) {
        return undefined;
      }

      throw error;
    }
  }

  private validateAgeSystems(values: string[]): AgeSystem[] {
    if (values.length === 0) {
      throw new DomainError(
        ERROR_CODES.UNSUPPORTED_AGE_SYSTEM,
        "age_systems must contain at least one supported value.",
        { supported_age_systems: [...AGE_SYSTEMS] },
      );
    }

    const supported = new Set<string>(AGE_SYSTEMS);
    for (const value of values) {
      if (!supported.has(value)) {
        throw new DomainError(
          ERROR_CODES.UNSUPPORTED_AGE_SYSTEM,
          `Age system "${value}" is not supported.`,
          {
            age_system: value,
            supported_age_systems: [...AGE_SYSTEMS],
          },
        );
      }
    }

    return [...new Set(values)] as AgeSystem[];
  }

  private validateBirthdayRange(startYear: number, endYear: number): void {
    const inclusiveYears = endYear - startYear + 1;
    if (
      !Number.isInteger(startYear) ||
      !Number.isInteger(endYear) ||
      startYear > endYear
    ) {
      throw new DomainError(
        ERROR_CODES.INVALID_RANGE,
        "start_year must be less than or equal to end_year.",
        { start_year: startYear, end_year: endYear },
      );
    }

    if (inclusiveYears > MAX_BIRTHDAY_RANGE_YEARS) {
      throw new DomainError(
        ERROR_CODES.INVALID_RANGE,
        `Birthday ranges are limited to ${MAX_BIRTHDAY_RANGE_YEARS} calendar years.`,
        {
          start_year: startYear,
          end_year: endYear,
          requested_years: inclusiveYears,
          max_years: MAX_BIRTHDAY_RANGE_YEARS,
        },
      );
    }
  }

  private normalizeTimezone(timezone: string): string {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(
        new Date(0),
      );
      return timezone;
    } catch {
      throw new DomainError(
        ERROR_CODES.INVALID_DATE,
        `Timezone "${timezone}" is not a valid IANA time zone.`,
        { timezone },
      );
    }
  }
}

export function resolveToday(timezone: string): GregorianDate {
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const values = new Map(
    parts
      .filter(
        (part): part is Intl.DateTimeFormatPart & {
          type: "year" | "month" | "day";
        } => ["year", "month", "day"].includes(part.type),
      )
      .map((part) => [part.type, Number(part.value)]),
  );

  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (year === undefined || month === undefined || day === undefined) {
    throw new DomainError(
      ERROR_CODES.INVALID_DATE,
      `Could not resolve today's date in timezone ${timezone}.`,
      { timezone },
    );
  }

  return normalizeCalendarDate({
    calendar: "gregorian",
    year,
    month,
    day,
  }) as GregorianDate;
}

export const birthdayService = new BirthdayService();
