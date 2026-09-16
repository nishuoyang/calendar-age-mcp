import { describe, expect, it } from "vitest";
import { DomainError, ERROR_CODES } from "../src/domain/errors.js";
import { birthdayService } from "../src/services/birthday-service.js";
import { referenceBirthdayListInput } from "./fixtures/calendar-cases.js";

describe("birthday listing", () => {
  it("maps the reference lunar birthday to Gregorian birthdays", () => {
    const result = birthdayService.listBirthdays(referenceBirthdayListInput);

    expect(result.count).toBe(5);
    expect(result.items.map((item) => item.normalized_target)).toEqual([
      "2026-07-03",
      "2027-06-23",
      "2028-06-11",
      "2029-06-30",
      "2030-06-19",
    ]);
  });

  it("omits non-matching leap-month years under the skip policy", () => {
    const result = birthdayService.listBirthdays({
      birth_date: {
        calendar: "chinese_lunar",
        year: 2023,
        month: 2,
        day: 15,
        is_leap_month: true,
      },
      start_year: 2023,
      end_year: 2025,
      target_calendar: "gregorian",
      leap_month_policy: "skip",
      response_format: "json",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.normalized_target).toBe("2023-04-05");
  });

  it("rejects a range longer than 100 years", () => {
    expect(() =>
      birthdayService.listBirthdays({
        ...referenceBirthdayListInput,
        start_year: 1900,
        end_year: 2000,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: ERROR_CODES.INVALID_RANGE,
      }),
    );
  });

  it("supports a Gregorian birth mapped into the Chinese lunar calendar", () => {
    const result = birthdayService.listBirthdays({
      birth_date: {
        calendar: "gregorian",
        year: 2005,
        month: 6,
        day: 25,
      },
      start_year: 2026,
      end_year: 2026,
      target_calendar: "chinese_lunar",
      leap_month_policy: "regular_month",
      response_format: "json",
    });

    expect(result.items[0]?.target).toEqual({
      calendar: "chinese_lunar",
      year: 2026,
      month: 5,
      day: 11,
      is_leap_month: false,
    });
  });
});
