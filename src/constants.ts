export const SERVER_NAME = "data-mcp-server";
export const SERVER_VERSION = "0.1.0";

export const SUPPORTED_GREGORIAN_MIN_YEAR = 1900;
export const SUPPORTED_GREGORIAN_MAX_YEAR = 2100;
// Gregorian 1900-01-01 falls in Chinese lunar year 1899 month 12.
export const SUPPORTED_LUNAR_MIN_YEAR = 1899;
export const SUPPORTED_LUNAR_MAX_YEAR = 2100;

export const DEFAULT_TIMEZONE = "Asia/Shanghai";
export const MAX_BIRTHDAY_RANGE_YEARS = 100;

export const SUPPORTED_CALENDARS = ["gregorian", "chinese_lunar"] as const;

export const DATE_RANGE_DETAILS = {
  gregorian: {
    min_year: SUPPORTED_GREGORIAN_MIN_YEAR,
    max_year: SUPPORTED_GREGORIAN_MAX_YEAR,
  },
  chinese_lunar: {
    min_year: SUPPORTED_LUNAR_MIN_YEAR,
    max_year: SUPPORTED_LUNAR_MAX_YEAR,
  },
} as const;
