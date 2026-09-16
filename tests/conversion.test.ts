import { describe, expect, it } from "vitest";
import { DomainError, ERROR_CODES } from "../src/domain/errors.js";
import { calendarConverter } from "../src/services/calendar-converter.js";

describe("calendar conversion", () => {
  it("converts the reference Chinese lunar date to Gregorian", () => {
    const result = calendarConverter.convert(
      {
        calendar: "chinese_lunar",
        year: 2005,
        month: 5,
        day: 19,
        is_leap_month: false,
      },
      "gregorian",
    );

    expect(result.target).toEqual({
      calendar: "gregorian",
      year: 2005,
      month: 6,
      day: 25,
    });
    expect(result.normalizedGregorian).toBe("2005-06-25");
  });

  it("converts the reference Gregorian date back to Chinese lunar", () => {
    const result = calendarConverter.convert(
      {
        calendar: "gregorian",
        year: 2005,
        month: 6,
        day: 25,
      },
      "chinese_lunar",
    );

    expect(result.target).toEqual({
      calendar: "chinese_lunar",
      year: 2005,
      month: 5,
      day: 19,
      is_leap_month: false,
    });
  });

  it("preserves leap-month state", () => {
    const result = calendarConverter.convert(
      {
        calendar: "chinese_lunar",
        year: 2023,
        month: 2,
        day: 15,
        is_leap_month: true,
      },
      "gregorian",
    );

    expect(result.target).toEqual({
      calendar: "gregorian",
      year: 2023,
      month: 4,
      day: 5,
    });
  });

  it("supports the declared Gregorian boundaries", () => {
    expect(
      calendarConverter.toChineseLunar({
        calendar: "gregorian",
        year: 1900,
        month: 1,
        day: 1,
      }),
    ).toMatchObject({ year: 1899, month: 12, day: 1 });

    expect(
      calendarConverter.toGregorian({
        calendar: "chinese_lunar",
        year: 1900,
        month: 1,
        day: 1,
        is_leap_month: false,
      }),
    ).toMatchObject({ year: 1900, month: 1, day: 31 });

    expect(
      calendarConverter.toChineseLunar({
        calendar: "gregorian",
        year: 2100,
        month: 12,
        day: 31,
      }),
    ).toMatchObject({ year: 2100, month: 12, day: 1 });
  });

  it("rejects day 30 in a 29-day month", () => {
    expect(() =>
      calendarConverter.toGregorian({
        calendar: "chinese_lunar",
        year: 2024,
        month: 1,
        day: 30,
        is_leap_month: false,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: ERROR_CODES.INVALID_LUNAR_DATE,
      }),
    );
  });

  it("rejects a leap-month flag when that leap month does not exist", () => {
    expect(() =>
      calendarConverter.toGregorian({
        calendar: "chinese_lunar",
        year: 2024,
        month: 2,
        day: 15,
        is_leap_month: true,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: ERROR_CODES.INVALID_LEAP_MONTH,
      }),
    );
  });

  it("rejects dates outside the supported Gregorian range", () => {
    expect(() =>
      calendarConverter.toGregorian({
        calendar: "gregorian",
        year: 1899,
        month: 12,
        day: 31,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: ERROR_CODES.DATE_OUT_OF_RANGE,
      }),
    );
  });
});
