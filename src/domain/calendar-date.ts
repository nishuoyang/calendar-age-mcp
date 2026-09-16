import {
  DATE_RANGE_DETAILS,
  SUPPORTED_CALENDARS,
  SUPPORTED_GREGORIAN_MAX_YEAR,
  SUPPORTED_GREGORIAN_MIN_YEAR,
} from "../constants.js";
import { DomainError, ERROR_CODES } from "./errors.js";

export type CalendarName = (typeof SUPPORTED_CALENDARS)[number];

export interface GregorianDate {
  calendar: "gregorian";
  year: number;
  month: number;
  day: number;
}

export interface ChineseLunarDate {
  calendar: "chinese_lunar";
  year: number;
  month: number;
  day: number;
  is_leap_month: boolean;
}

export type CalendarDate = GregorianDate | ChineseLunarDate;

export interface CalendarDateInput {
  calendar: string;
  year: number;
  month: number;
  day: number;
  is_leap_month?: boolean | undefined;
}

const MS_PER_DAY = 86_400_000;

export function isSupportedCalendar(value: string): value is CalendarName {
  return SUPPORTED_CALENDARS.some((calendar) => calendar === value);
}

export function normalizeCalendarName(value: string): CalendarName {
  if (!isSupportedCalendar(value)) {
    throw new DomainError(
      ERROR_CODES.UNSUPPORTED_CALENDAR,
      `Calendar "${value}" is not supported.`,
      { calendar: value, supported_calendars: [...SUPPORTED_CALENDARS] },
    );
  }

  return value;
}

export function isGregorianDate(date: CalendarDate): date is GregorianDate {
  return date.calendar === "gregorian";
}

export function isChineseLunarDate(date: CalendarDate): date is ChineseLunarDate {
  return date.calendar === "chinese_lunar";
}

export function normalizeCalendarDate(input: CalendarDateInput): CalendarDate {
  normalizeCalendarName(input.calendar);

  if (input.calendar === "gregorian") {
    return normalizeGregorianDate(input);
  }

  if (typeof input.is_leap_month !== "boolean") {
    throw new DomainError(
      ERROR_CODES.INVALID_DATE,
      "Chinese lunar dates require is_leap_month to be a boolean.",
      { ...input },
    );
  }

  return {
    calendar: "chinese_lunar",
    year: input.year,
    month: input.month,
    day: input.day,
    is_leap_month: input.is_leap_month,
  };
}

function normalizeGregorianDate(input: CalendarDateInput): GregorianDate {
  if (input.is_leap_month !== undefined && input.is_leap_month !== false) {
    throw new DomainError(
      ERROR_CODES.INVALID_DATE,
      "is_leap_month is only valid for Chinese lunar dates.",
      { ...input },
    );
  }

  if (
    !Number.isInteger(input.year) ||
    !Number.isInteger(input.month) ||
    !Number.isInteger(input.day)
  ) {
    throw new DomainError(
      ERROR_CODES.INVALID_DATE,
      "Gregorian year, month, and day must be integers.",
      { ...input },
    );
  }

  if (
    input.year < SUPPORTED_GREGORIAN_MIN_YEAR ||
    input.year > SUPPORTED_GREGORIAN_MAX_YEAR
  ) {
    throw new DomainError(
      ERROR_CODES.DATE_OUT_OF_RANGE,
      `Gregorian year must be between ${SUPPORTED_GREGORIAN_MIN_YEAR} and ${SUPPORTED_GREGORIAN_MAX_YEAR}.`,
      { ...input, supported_range: DATE_RANGE_DETAILS.gregorian },
    );
  }

  if (!isRealGregorianDate(input.year, input.month, input.day)) {
    throw new DomainError(
      ERROR_CODES.INVALID_DATE,
      `Gregorian date ${input.year}-${input.month}-${input.day} is not a real civil date.`,
      { ...input },
    );
  }

  return {
    calendar: "gregorian",
    year: input.year,
    month: input.month,
    day: input.day,
  };
}

export function isRealGregorianDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  return day <= daysInGregorianMonth(year, month);
}

export function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) {
    return isGregorianLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function formatGregorianDate(date: GregorianDate): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function formatCalendarDate(date: CalendarDate): string {
  if (isGregorianDate(date)) {
    return formatGregorianDate(date);
  }

  const leapSuffix = date.is_leap_month ? "-leap" : "";
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}${leapSuffix}`;
}

export function compareGregorianDates(
  left: GregorianDate,
  right: GregorianDate,
): number {
  return formatGregorianDate(left).localeCompare(formatGregorianDate(right));
}

export function daysBetween(start: GregorianDate, end: GregorianDate): number {
  return Math.round(
    (toUtcTimestamp(end) - toUtcTimestamp(start)) / MS_PER_DAY,
  );
}

export function toUtcTimestamp(date: GregorianDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}
