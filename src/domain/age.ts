import {
  type GregorianDate,
  compareGregorianDates,
  daysBetween,
  formatGregorianDate,
  isRealGregorianDate,
} from "./calendar-date.js";

export const AGE_SYSTEMS = [
  "chronological_days",
  "gregorian_completed_years",
  "chinese_lunar_completed_years",
  "chinese_nominal_age",
] as const;

export type AgeSystem = (typeof AGE_SYSTEMS)[number];

export interface WarningMessage {
  code: string;
  message: string;
}

export interface CompletedYears {
  years: number;
  previousBirthday?: GregorianDate;
  nextBirthday?: GregorianDate;
}

export function chronologicalElapsedDays(
  birth: GregorianDate,
  asOf: GregorianDate,
): number {
  return daysBetween(birth, asOf);
}

export function completedGregorianYears(
  birth: GregorianDate,
  asOf: GregorianDate,
): number {
  let years = 0;
  for (let year = birth.year + 1; year <= asOf.year; year += 1) {
    const candidate = gregorianBirthdayInYear(birth, year);
    if (candidate && compareGregorianDates(candidate, asOf) <= 0) {
      years += 1;
    }
  }

  return years;
}

export function previousGregorianBirthday(
  birth: GregorianDate,
  asOf: GregorianDate,
): GregorianDate | undefined {
  for (let year = asOf.year; year >= birth.year; year -= 1) {
    const candidate = gregorianBirthdayInYear(birth, year);
    if (candidate && compareGregorianDates(candidate, birth) >= 0 &&
        compareGregorianDates(candidate, asOf) <= 0) {
      return candidate;
    }
  }

  return undefined;
}

export function nextGregorianBirthday(
  birth: GregorianDate,
  asOf: GregorianDate,
): GregorianDate | undefined {
  for (let offset = 0; offset <= 8; offset += 1) {
    const year = asOf.year + offset;
    const candidate = gregorianBirthdayInYear(birth, year);
    if (candidate && compareGregorianDates(candidate, asOf) > 0) {
      return candidate;
    }
  }

  return undefined;
}

function gregorianBirthdayInYear(
  birth: GregorianDate,
  year: number,
): GregorianDate | undefined {
  if (!isRealGregorianDate(year, birth.month, birth.day)) {
    return undefined;
  }

  return {
    calendar: "gregorian",
    year,
    month: birth.month,
    day: birth.day,
  };
}

export function formatOptionalGregorian(
  date: GregorianDate | undefined,
): string | undefined {
  return date ? formatGregorianDate(date) : undefined;
}
