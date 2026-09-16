import {
  Lunar,
  LunarMonth,
  LunarYear,
  Solar,
  type LunarMonthValue,
} from "lunar-javascript";
import {
  DATE_RANGE_DETAILS,
  SUPPORTED_LUNAR_MAX_YEAR,
  SUPPORTED_LUNAR_MIN_YEAR,
} from "../constants.js";
import {
  type CalendarDate,
  type CalendarName,
  type ChineseLunarDate,
  type GregorianDate,
  formatGregorianDate,
  isChineseLunarDate,
  normalizeCalendarDate,
} from "../domain/calendar-date.js";
import { DomainError, ERROR_CODES } from "../domain/errors.js";

export interface CalendarConversion {
  source: CalendarDate;
  target: CalendarDate;
  normalizedGregorian: string;
  isLeapMonth: boolean;
}

export class CalendarConverter {
  convert(sourceInput: CalendarDate, targetCalendar: CalendarName): CalendarConversion {
    const source = normalizeCalendarDate(sourceInput);

    if (source.calendar === targetCalendar) {
      const gregorian = this.toGregorian(source);
      return {
        source,
        target: source,
        normalizedGregorian: formatGregorianDate(gregorian),
        isLeapMonth: isChineseLunarDate(source) && source.is_leap_month,
      };
    }

    if (targetCalendar === "gregorian") {
      const gregorian = this.toGregorian(source);
      return {
        source,
        target: gregorian,
        normalizedGregorian: formatGregorianDate(gregorian),
        isLeapMonth: isChineseLunarDate(source) && source.is_leap_month,
      };
    }

    const lunar = this.toChineseLunar(source);
    const gregorian = this.toGregorian(lunar);
    return {
      source,
      target: lunar,
      normalizedGregorian: formatGregorianDate(gregorian),
      isLeapMonth: lunar.is_leap_month,
    };
  }

  toGregorian(input: CalendarDate): GregorianDate {
    const source = normalizeCalendarDate(input);

    if (source.calendar === "gregorian") {
      return source;
    }

    this.assertValidLunarDate(source);
    const signedMonth = source.is_leap_month ? -source.month : source.month;
    const solar = Lunar.fromYmd(source.year, signedMonth, source.day).getSolar();
    const target: GregorianDate = {
      calendar: "gregorian",
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
    };

    return normalizeCalendarDate(target) as GregorianDate;
  }

  toChineseLunar(input: CalendarDate): ChineseLunarDate {
    const source = normalizeCalendarDate(input);

    if (source.calendar === "chinese_lunar") {
      this.assertValidLunarDate(source);
      return source;
    }

    const lunar = Solar.fromYmd(source.year, source.month, source.day).getLunar();
    const rawMonth = lunar.getMonth();
    const target: ChineseLunarDate = {
      calendar: "chinese_lunar",
      year: lunar.getYear(),
      month: Math.abs(rawMonth),
      day: lunar.getDay(),
      is_leap_month: rawMonth < 0,
    };

    this.assertValidLunarDate(target);
    return target;
  }

  getLeapMonth(lunarYear: number): number {
    if (
      !Number.isInteger(lunarYear) ||
      lunarYear < SUPPORTED_LUNAR_MIN_YEAR ||
      lunarYear > SUPPORTED_LUNAR_MAX_YEAR
    ) {
      throw new DomainError(
        ERROR_CODES.DATE_OUT_OF_RANGE,
        `Chinese lunar year must be between ${SUPPORTED_LUNAR_MIN_YEAR} and ${SUPPORTED_LUNAR_MAX_YEAR}.`,
        { year: lunarYear, supported_range: DATE_RANGE_DETAILS.chinese_lunar },
      );
    }

    return LunarYear.fromYear(lunarYear).getLeapMonth();
  }

  getLunarMonth(lunarYear: number, month: number, isLeapMonth: boolean): LunarMonthValue {
    if (
      !Number.isInteger(lunarYear) ||
      lunarYear < SUPPORTED_LUNAR_MIN_YEAR ||
      lunarYear > SUPPORTED_LUNAR_MAX_YEAR
    ) {
      throw new DomainError(
        ERROR_CODES.DATE_OUT_OF_RANGE,
        `Chinese lunar year must be between ${SUPPORTED_LUNAR_MIN_YEAR} and ${SUPPORTED_LUNAR_MAX_YEAR}.`,
        { year: lunarYear, supported_range: DATE_RANGE_DETAILS.chinese_lunar },
      );
    }

    const signedMonth = isLeapMonth ? -month : month;
    const lunarMonth = LunarMonth.fromYm(lunarYear, signedMonth);
    if (lunarMonth === null) {
      throw new DomainError(
        ERROR_CODES.INVALID_LUNAR_DATE,
        `Chinese lunar ${lunarYear} month ${month} does not exist.`,
        { year: lunarYear, month, is_leap_month: isLeapMonth },
      );
    }

    return lunarMonth;
  }

  assertValidLunarDate(input: ChineseLunarDate): void {
    if (
      !Number.isInteger(input.year) ||
      !Number.isInteger(input.month) ||
      !Number.isInteger(input.day)
    ) {
      throw new DomainError(
        ERROR_CODES.INVALID_LUNAR_DATE,
        "Chinese lunar year, month, and day must be integers.",
        { ...input },
      );
    }

    if (
      input.year < SUPPORTED_LUNAR_MIN_YEAR ||
      input.year > SUPPORTED_LUNAR_MAX_YEAR
    ) {
      throw new DomainError(
        ERROR_CODES.DATE_OUT_OF_RANGE,
        `Chinese lunar year must be between ${SUPPORTED_LUNAR_MIN_YEAR} and ${SUPPORTED_LUNAR_MAX_YEAR}.`,
        { ...input, supported_range: DATE_RANGE_DETAILS.chinese_lunar },
      );
    }

    if (input.month < 1 || input.month > 12) {
      throw new DomainError(
        ERROR_CODES.INVALID_LUNAR_DATE,
        `Chinese lunar month must be between 1 and 12; received ${input.month}.`,
        { ...input },
      );
    }

    const leapMonth = this.getLeapMonth(input.year);
    if (input.is_leap_month && leapMonth !== input.month) {
      throw new DomainError(
        ERROR_CODES.INVALID_LEAP_MONTH,
        `Chinese lunar year ${input.year} does not have a leap month ${input.month}.`,
        { ...input, leap_month: leapMonth },
      );
    }

    const lunarMonth = this.getLunarMonth(
      input.year,
      input.month,
      input.is_leap_month,
    );

    if (input.day < 1 || input.day > lunarMonth.getDayCount()) {
      throw new DomainError(
        ERROR_CODES.INVALID_LUNAR_DATE,
        `Chinese lunar ${input.year} month ${input.month}${input.is_leap_month ? " (leap)" : ""} day ${input.day} does not exist because that month has only ${lunarMonth.getDayCount()} days.`,
        { ...input, month_days: lunarMonth.getDayCount() },
      );
    }
  }
}

export const calendarConverter = new CalendarConverter();
