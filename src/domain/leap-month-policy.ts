export const LEAP_MONTH_POLICIES = [
  "regular_month",
  "skip",
  "strict",
] as const;

export type LeapMonthPolicy = (typeof LEAP_MONTH_POLICIES)[number];

export const NOMINAL_AGE_RULES = ["lunar_new_year"] as const;

export type NominalAgeRule = (typeof NOMINAL_AGE_RULES)[number];

