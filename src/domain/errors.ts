export const ERROR_CODES = {
  INVALID_DATE: "INVALID_DATE",
  INVALID_LUNAR_DATE: "INVALID_LUNAR_DATE",
  INVALID_LEAP_MONTH: "INVALID_LEAP_MONTH",
  AMBIGUOUS_LEAP_BIRTHDAY: "AMBIGUOUS_LEAP_BIRTHDAY",
  DATE_OUT_OF_RANGE: "DATE_OUT_OF_RANGE",
  AS_OF_BEFORE_BIRTH: "AS_OF_BEFORE_BIRTH",
  UNSUPPORTED_CALENDAR: "UNSUPPORTED_CALENDAR",
  UNSUPPORTED_AGE_SYSTEM: "UNSUPPORTED_AGE_SYSTEM",
  INVALID_RANGE: "INVALID_RANGE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ErrorDetails = Record<string, unknown>;

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details: ErrorDetails;

  constructor(code: ErrorCode, message: string, details: ErrorDetails = {}) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export function serializeError(error: unknown): {
  code: string;
  message: string;
  details: ErrorDetails;
} {
  if (isDomainError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "An unknown error occurred.",
    details: {},
  };
}

