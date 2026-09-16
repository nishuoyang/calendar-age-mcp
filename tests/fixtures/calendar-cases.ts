import type {
  CalendarCalculateAgeInput,
  CalendarListBirthdaysInput,
} from "../../src/schemas/calendar.js";

export const referenceBirthDate = {
  calendar: "chinese_lunar",
  year: 2005,
  month: 5,
  day: 19,
  is_leap_month: false,
} as const;

export const referenceReferenceAgeInput: CalendarCalculateAgeInput = {
  birth_date: referenceBirthDate,
  as_of_date: {
    calendar: "gregorian",
    year: 2026,
    month: 9,
    day: 16,
  },
  timezone: "Asia/Shanghai",
  age_systems: [
    "chronological_days",
    "gregorian_completed_years",
    "chinese_lunar_completed_years",
    "chinese_nominal_age",
  ],
  leap_month_policy: "regular_month",
  nominal_age_rule: "lunar_new_year",
  response_format: "json",
};

export const referenceBirthdayListInput: CalendarListBirthdaysInput = {
  birth_date: referenceBirthDate,
  start_year: 2026,
  end_year: 2030,
  target_calendar: "gregorian",
  leap_month_policy: "regular_month",
  response_format: "json",
};

