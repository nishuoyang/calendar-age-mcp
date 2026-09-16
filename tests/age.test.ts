import { describe, expect, it } from "vitest";
import { DomainError, ERROR_CODES } from "../src/domain/errors.js";
import { birthdayService } from "../src/services/birthday-service.js";
import {
  referenceReferenceAgeInput,
} from "./fixtures/calendar-cases.js";

describe("calendar age calculation", () => {
  it("matches the mandatory reference fixture", () => {
    const result = birthdayService.calculateAge(referenceReferenceAgeInput);

    expect(result.birth.normalized_gregorian).toBe("2005-06-25");
    expect(result.as_of.normalized_gregorian).toBe("2026-09-16");
    expect(result.ages.chronological_days).toEqual({ days: 7753 });
    expect(result.ages.gregorian_completed_years).toEqual({
      years: 21,
      next_birthday: "2027-06-25",
    });
    expect(result.ages.chinese_lunar_completed_years).toEqual({
      years: 21,
      previous_birthday: "2026-07-03",
      next_birthday: "2027-06-23",
    });
    expect(result.ages.chinese_nominal_age).toEqual({
      years: 22,
      rule: "lunar_new_year",
      previous_increment: "2026-02-17",
      next_increment: "2027-02-06",
    });
  });

  it("changes Gregorian completed years on the birthday", () => {
    const before = birthdayService.calculateAge({
      ...referenceReferenceAgeInput,
      as_of_date: {
        calendar: "gregorian",
        year: 2026,
        month: 6,
        day: 24,
      },
      age_systems: ["gregorian_completed_years"],
    });
    const onBirthday = birthdayService.calculateAge({
      ...referenceReferenceAgeInput,
      as_of_date: {
        calendar: "gregorian",
        year: 2026,
        month: 6,
        day: 25,
      },
      age_systems: ["gregorian_completed_years"],
    });

    expect(before.ages.gregorian_completed_years).toEqual({
      years: 20,
      next_birthday: "2026-06-25",
    });
    expect(onBirthday.ages.gregorian_completed_years).toEqual({
      years: 21,
      next_birthday: "2027-06-25",
    });
  });

  it("only increments a February 29 birthday in leap years", () => {
    const result = birthdayService.calculateAge({
      birth_date: {
        calendar: "gregorian",
        year: 2000,
        month: 2,
        day: 29,
      },
      as_of_date: {
        calendar: "gregorian",
        year: 2025,
        month: 3,
        day: 1,
      },
      timezone: "Asia/Shanghai",
      age_systems: ["gregorian_completed_years"],
      leap_month_policy: "regular_month",
      nominal_age_rule: "lunar_new_year",
      response_format: "json",
    });

    expect(result.ages.gregorian_completed_years).toEqual({
      years: 6,
      next_birthday: "2028-02-29",
    });
  });

  it("changes nominal age at Chinese New Year", () => {
    const before = birthdayService.calculateAge({
      ...referenceReferenceAgeInput,
      as_of_date: {
        calendar: "gregorian",
        year: 2026,
        month: 2,
        day: 16,
      },
      age_systems: ["chinese_nominal_age"],
    });
    const onNewYear = birthdayService.calculateAge({
      ...referenceReferenceAgeInput,
      as_of_date: {
        calendar: "gregorian",
        year: 2026,
        month: 2,
        day: 17,
      },
      age_systems: ["chinese_nominal_age"],
    });

    expect(before.ages.chinese_nominal_age?.years).toBe(21);
    expect(before.ages.chinese_nominal_age?.previous_increment).toBe(
      "2025-01-29",
    );
    expect(onNewYear.ages.chinese_nominal_age?.years).toBe(22);
    expect(onNewYear.ages.chinese_nominal_age?.previous_increment).toBe(
      "2026-02-17",
    );
  });

  it("applies regular-month fallback for a leap-month birthday", () => {
    const result = birthdayService.calculateAge({
      birth_date: {
        calendar: "chinese_lunar",
        year: 2023,
        month: 2,
        day: 15,
        is_leap_month: true,
      },
      as_of_date: {
        calendar: "gregorian",
        year: 2024,
        month: 3,
        day: 24,
      },
      timezone: "Asia/Shanghai",
      age_systems: ["chinese_lunar_completed_years"],
      leap_month_policy: "regular_month",
      nominal_age_rule: "lunar_new_year",
      response_format: "json",
    });

    expect(result.ages.chinese_lunar_completed_years).toEqual({
      years: 1,
      previous_birthday: "2024-03-24",
      next_birthday: "2025-03-14",
    });
  });

  it("skips missing leap-month years under the skip policy", () => {
    const result = birthdayService.calculateAge({
      birth_date: {
        calendar: "chinese_lunar",
        year: 2023,
        month: 2,
        day: 15,
        is_leap_month: true,
      },
      as_of_date: {
        calendar: "gregorian",
        year: 2024,
        month: 12,
        day: 31,
      },
      timezone: "Asia/Shanghai",
      age_systems: ["chinese_lunar_completed_years"],
      leap_month_policy: "skip",
      nominal_age_rule: "lunar_new_year",
      response_format: "json",
    });

    expect(result.ages.chinese_lunar_completed_years?.years).toBe(0);
  });

  it("rejects an ambiguous leap-month birthday under the strict policy", () => {
    expect(() =>
      birthdayService.calculateAge({
        birth_date: {
          calendar: "chinese_lunar",
          year: 2023,
          month: 2,
          day: 15,
          is_leap_month: true,
        },
        as_of_date: {
          calendar: "gregorian",
          year: 2024,
          month: 12,
          day: 31,
        },
        timezone: "Asia/Shanghai",
        age_systems: ["chinese_lunar_completed_years"],
        leap_month_policy: "strict",
        nominal_age_rule: "lunar_new_year",
        response_format: "json",
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: ERROR_CODES.AMBIGUOUS_LEAP_BIRTHDAY,
      }),
    );
  });

  it("rejects an unsupported age system with a stable code", () => {
    expect(() =>
      birthdayService.calculateAge({
        ...referenceReferenceAgeInput,
        age_systems: ["unknown"],
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: ERROR_CODES.UNSUPPORTED_AGE_SYSTEM,
      }),
    );
  });

  it("rejects an as-of date before birth", () => {
    expect(() =>
      birthdayService.calculateAge({
        ...referenceReferenceAgeInput,
        as_of_date: {
          calendar: "gregorian",
          year: 2005,
          month: 6,
          day: 24,
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: ERROR_CODES.AS_OF_BEFORE_BIRTH,
      }),
    );
  });
});
