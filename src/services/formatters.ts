import {
  type CalendarDate,
  isChineseLunarDate,
  isGregorianDate,
} from "../domain/calendar-date.js";
import type {
  AgeCalculationResult,
  BirthdayListResult,
  CalendarConversionResult,
} from "./birthday-service.js";

export function formatConversionResult(
  result: CalendarConversionResult,
  format: "json" | "markdown",
): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  const lines = [
    "# Calendar Conversion",
    "",
    `- Source: ${formatCalendarLabel(result.source)}`,
    `- Target: ${formatCalendarLabel(result.target)}`,
    `- Normalized Gregorian: \`${result.normalized_gregorian}\``,
  ];

  appendWarnings(lines, result.warnings);
  return lines.join("\n");
}

export function formatAgeResult(
  result: AgeCalculationResult,
  format: "json" | "markdown",
): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  const lines = [
    "# Age Calculation",
    "",
    `- Birth: ${formatCalendarLabel(result.birth.input)} (Gregorian \`${result.birth.normalized_gregorian}\`)`,
    `- As of: \`${result.as_of.normalized_gregorian}\` in \`${result.as_of.timezone}\``,
    `- Leap month policy: \`${result.rules.leap_month_policy}\``,
    `- Nominal age rule: \`${result.rules.nominal_age_rule}\``,
    "",
    "## Results",
    "",
  ];

  const { ages } = result;
  if (ages.chronological_days) {
    lines.push(
      `- Chronological elapsed days: ${ages.chronological_days.days}`,
    );
  }
  if (ages.gregorian_completed_years) {
    lines.push(
      `- Gregorian completed years: ${ages.gregorian_completed_years.years}`,
    );
    if (ages.gregorian_completed_years.next_birthday) {
      lines.push(
        `- Next Gregorian birthday: \`${ages.gregorian_completed_years.next_birthday}\``,
      );
    }
  }
  if (ages.chinese_lunar_completed_years) {
    lines.push(
      `- Chinese lunar completed years: ${ages.chinese_lunar_completed_years.years}`,
    );
    if (ages.chinese_lunar_completed_years.previous_birthday) {
      lines.push(
        `- Previous Chinese lunar birthday: \`${ages.chinese_lunar_completed_years.previous_birthday}\``,
      );
    }
    if (ages.chinese_lunar_completed_years.next_birthday) {
      lines.push(
        `- Next Chinese lunar birthday: \`${ages.chinese_lunar_completed_years.next_birthday}\``,
      );
    }
  }
  if (ages.chinese_nominal_age) {
    lines.push(
      `- Chinese nominal age: ${ages.chinese_nominal_age.years} (\`${ages.chinese_nominal_age.rule}\`)`,
    );
    if (ages.chinese_nominal_age.previous_increment) {
      lines.push(
        `- Previous nominal-age increment: \`${ages.chinese_nominal_age.previous_increment}\``,
      );
    }
    if (ages.chinese_nominal_age.next_increment) {
      lines.push(
        `- Next nominal-age increment: \`${ages.chinese_nominal_age.next_increment}\``,
      );
    }
  }

  appendWarnings(lines, result.warnings);
  return lines.join("\n");
}

export function formatBirthdayListResult(
  result: BirthdayListResult,
  format: "json" | "markdown",
): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  const lines = [
    "# Birthday List",
    "",
    `- Birthday calendar: \`${result.birthday_calendar}\``,
    `- Target calendar: \`${result.target_calendar}\``,
    `- Leap month policy: \`${result.leap_month_policy}\``,
    `- Count: ${result.count}`,
    "",
    "| Calendar year | Target |",
    "| ---: | --- |",
  ];

  for (const item of result.items) {
    lines.push(
      `| ${item.calendar_year} | ${formatCalendarLabel(item.target)} |`,
    );
  }

  return lines.join("\n");
}

function formatCalendarLabel(date: CalendarDate): string {
  if (isGregorianDate(date)) {
    return `Gregorian \`${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}\``;
  }

  if (isChineseLunarDate(date)) {
    const leap = date.is_leap_month ? " leap" : "";
    return `Chinese lunar${leap} \`${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}\``;
  }

  return "Unknown date";
}

function appendWarnings(
  lines: string[],
  warnings: Array<{ code: string; message: string }>,
): void {
  if (warnings.length === 0) {
    return;
  }

  lines.push("", "## Warnings", "");
  for (const warning of warnings) {
    lines.push(`- \`${warning.code}\`: ${warning.message}`);
  }
}
