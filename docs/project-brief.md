# Project Brief

## Goal

Build an MCP server that performs deterministic calendar conversion and
calendar-aware age calculation. The server must make its assumptions explicit
and return auditable intermediate dates so that an LLM does not have to infer
calendar rules.

The first target scenario is:

> A user provides a Chinese lunar birth date, such as Chinese lunar year 2005,
> month 5, day 19, and asks for their age under different calendar conventions.

## Product Principles

1. Calendar conversion and age calculation are pure, deterministic operations.
2. A single `age` number is not sufficient. The convention must always be
   named.
3. Leap months, time zones, and year boundaries must be represented explicitly.
4. Return intermediate dates and applied rules for verification.
5. Do not infer religious, regional, or family-specific age conventions.
6. Do not fetch date data from the network at request time.

## In Scope for v0.1

- Gregorian date to Chinese lunar date conversion.
- Chinese lunar date to Gregorian date conversion.
- Validation of Chinese lunar dates, including leap-month rules.
- Gregorian completed years.
- Chinese lunar completed years.
- Chinese nominal age using the lunar-new-year rule.
- Chronological elapsed days.
- A configurable leap-month birthday policy.
- Structured JSON output and a concise Markdown representation.
- Local stdio transport.

## Out of Scope for v0.1

- BaZi, Ten Gods, luck cycles, or fortune telling.
- Auspicious date and time selection.
- Hour-level Chinese calendar boundaries.
- Historical calendar research outside the declared supported range.
- Islamic, Hebrew, Persian, and other calendar conversion.
- Remote multi-user deployment and authentication.

The domain model should leave room for additional calendars without changing
the public age-calculation model.

## Functional Requirements

### Calendar Conversion

- Convert a validated Gregorian date to a Chinese lunar date.
- Convert a validated Chinese lunar date to a Gregorian date.
- Preserve `is_leap_month` in every Chinese lunar value.
- Reject dates outside the supported range.
- Reject nonexistent lunar dates, such as day 30 in a 29-day month.
- Reject a leap-month flag when the requested month is not a leap month.

### Age Calculation

- Convert the birth date to a Gregorian date once and expose it in the result.
- Calculate the requested age conventions as of an explicit date.
- Resolve recurring Chinese lunar birthdays through calendar conversion.
- Apply a documented policy when a leap-month birthday has no matching leap
  month in the target year.
- Return next or recent birthday dates when requested.
- Resolve "today" from an IANA time zone when `as_of_date` is omitted, and
  include the resolved date in the response.

## Non-Functional Requirements

- TypeScript strict mode.
- Runtime input validation with Zod.
- No use of `any`.
- Stable snake_case JSON fields and snake_case MCP tool names.
- All date tools are read-only, non-destructive, and idempotent.
- Invalid input returns an actionable MCP tool error, not a protocol crash.
- Unit tests cover leap months, month lengths, year boundaries, and age
  conventions.

## Acceptance Criteria

v0.1 is complete when:

1. `calendar_convert_date` converts between Gregorian and Chinese lunar dates
   for the documented supported range.
2. `calendar_calculate_age` returns the reference scenario correctly:
   Chinese lunar 2005-05-19 becomes Gregorian 2005-06-25, Gregorian completed
   years is 21 as of 2026-09-16, Chinese lunar completed years is 21, and
   Chinese nominal age is 22.
3. `calendar_list_birthdays` returns the correct Gregorian date for a lunar
   birthday in each requested year.
4. Invalid leap-month and invalid month-length cases return stable error codes.
5. `npm run build` succeeds.
6. The server starts over stdio and works in MCP Inspector.
7. Unit tests pass in the documented Node.js version.
