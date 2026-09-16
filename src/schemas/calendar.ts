import { z } from "zod";
import { DEFAULT_TIMEZONE } from "../constants.js";
import {
  LEAP_MONTH_POLICIES,
  NOMINAL_AGE_RULES,
} from "../domain/leap-month-policy.js";

export const responseFormatSchema = z
  .enum(["json", "markdown"])
  .default("json");

export const leapMonthPolicySchema = z
  .enum(LEAP_MONTH_POLICIES)
  .default("regular_month");

export const nominalAgeRuleSchema = z
  .enum(NOMINAL_AGE_RULES)
  .default("lunar_new_year");

export const calendarDateInputSchema = z.object({
  calendar: z.string().describe("Calendar name: gregorian or chinese_lunar."),
  year: z.number().int(),
  month: z.number().int(),
  day: z.number().int(),
  is_leap_month: z
    .boolean()
    .optional()
    .describe("Required for Chinese lunar dates; ignored for Gregorian dates."),
});

export const calendarConvertInputSchema = z.object({
  date: calendarDateInputSchema,
  target_calendar: z
    .string()
    .describe("Target calendar: gregorian or chinese_lunar."),
  response_format: responseFormatSchema,
});

export const calendarCalculateAgeInputSchema = z.object({
  birth_date: calendarDateInputSchema,
  as_of_date: calendarDateInputSchema.optional(),
  timezone: z.string().default(DEFAULT_TIMEZONE),
  age_systems: z.array(z.string()),
  leap_month_policy: leapMonthPolicySchema,
  nominal_age_rule: nominalAgeRuleSchema,
  response_format: responseFormatSchema,
});

export const calendarListBirthdaysInputSchema = z.object({
  birth_date: calendarDateInputSchema,
  start_year: z.number().int(),
  end_year: z.number().int(),
  target_calendar: z
    .string()
    .describe("Target calendar: gregorian or chinese_lunar."),
  leap_month_policy: leapMonthPolicySchema,
  response_format: responseFormatSchema,
});

const warningSchema = z.object({
  code: z.string(),
  message: z.string(),
});

const gregorianDateSchema = z.object({
  calendar: z.literal("gregorian"),
  year: z.number().int(),
  month: z.number().int(),
  day: z.number().int(),
});

const chineseLunarDateSchema = z.object({
  calendar: z.literal("chinese_lunar"),
  year: z.number().int(),
  month: z.number().int(),
  day: z.number().int(),
  is_leap_month: z.boolean(),
});

const calendarDateSchema = z.union([
  gregorianDateSchema,
  chineseLunarDateSchema,
]);

export const calendarConvertOutputSchema = z.object({
  source: calendarDateSchema,
  target: calendarDateSchema,
  normalized_gregorian: z.string(),
  warnings: z.array(warningSchema),
});

export const calendarCalculateAgeOutputSchema = z.object({
  birth: z.object({
    input: calendarDateSchema,
    gregorian: gregorianDateSchema,
    normalized_gregorian: z.string(),
  }),
  as_of: z.object({
    gregorian: gregorianDateSchema,
    normalized_gregorian: z.string(),
    timezone: z.string(),
  }),
  rules: z.object({
    leap_month_policy: z.enum(LEAP_MONTH_POLICIES),
    nominal_age_rule: z.enum(NOMINAL_AGE_RULES),
  }),
  ages: z.object({
    chronological_days: z
      .object({
        days: z.number().int(),
      })
      .optional(),
    gregorian_completed_years: z
      .object({
        years: z.number().int(),
        next_birthday: z.string().optional(),
      })
      .optional(),
    chinese_lunar_completed_years: z
      .object({
        years: z.number().int(),
        previous_birthday: z.string().optional(),
        next_birthday: z.string().optional(),
      })
      .optional(),
    chinese_nominal_age: z
      .object({
        years: z.number().int(),
        rule: z.enum(NOMINAL_AGE_RULES),
        previous_increment: z.string().optional(),
        next_increment: z.string().optional(),
      })
      .optional(),
  }),
  warnings: z.array(warningSchema),
});

export const calendarListBirthdaysOutputSchema = z.object({
  birthday_calendar: z.enum(["gregorian", "chinese_lunar"]),
  target_calendar: z.enum(["gregorian", "chinese_lunar"]),
  leap_month_policy: z.enum(LEAP_MONTH_POLICIES),
  items: z.array(
    z.object({
      calendar_year: z.number().int(),
      target: calendarDateSchema,
      normalized_target: z.string(),
    }),
  ),
  count: z.number().int(),
  has_more: z.boolean(),
});

export type CalendarConvertInput = z.infer<typeof calendarConvertInputSchema>;
export type CalendarCalculateAgeInput = z.infer<
  typeof calendarCalculateAgeInputSchema
>;
export type CalendarListBirthdaysInput = z.infer<
  typeof calendarListBirthdaysInputSchema
>;
