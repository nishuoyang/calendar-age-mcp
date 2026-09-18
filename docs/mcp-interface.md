# MCP Interface

## Server

- Display name: `data-mcp-server`
- Package name: `data-mcp-server`
- Initial transport: stateless Streamable HTTP
- Default endpoint: `http://127.0.0.1:3000/mcp`
- Initial capabilities: tools only

All v0.1 tools are read-only. They must not write files, call remote services,
or mutate state.

## Shared Response Rules

Every data tool supports:

```json
{
  "response_format": "json"
}
```

Allowed values:

- `json`: Machine-readable response with all fields.
- `markdown`: Concise human-readable response derived from the same structured
  result.

Modern MCP SDK handlers should return both:

- `structuredContent` for the complete result.
- `content` with the Markdown or JSON text representation.

## Tool: `calendar_convert_date`

Converts one validated date from one supported calendar to another.

### Input

```json
{
  "date": {
    "calendar": "chinese_lunar",
    "year": 2005,
    "month": 5,
    "day": 19,
    "is_leap_month": false
  },
  "target_calendar": "gregorian",
  "response_format": "json"
}
```

### Output

```json
{
  "source": {
    "calendar": "chinese_lunar",
    "year": 2005,
    "month": 5,
    "day": 19,
    "is_leap_month": false
  },
  "target": {
    "calendar": "gregorian",
    "year": 2005,
    "month": 6,
    "day": 25
  },
  "normalized_gregorian": "2005-06-25",
  "warnings": []
}
```

### Notes

- The tool validates the source date before conversion.
- The tool validates the converted target date as well.
- `normalized_gregorian` is included for every successful conversion.

## Tool: `calendar_calculate_age`

Calculates one or more explicitly requested age conventions.

### Input

```json
{
  "birth_date": {
    "calendar": "chinese_lunar",
    "year": 2005,
    "month": 5,
    "day": 19,
    "is_leap_month": false
  },
  "as_of_date": {
    "calendar": "gregorian",
    "year": 2026,
    "month": 9,
    "day": 16
  },
  "timezone": "Asia/Shanghai",
  "age_systems": [
    "chronological_days",
    "gregorian_completed_years",
    "chinese_lunar_completed_years",
    "chinese_nominal_age"
  ],
  "leap_month_policy": "regular_month",
  "nominal_age_rule": "lunar_new_year",
  "response_format": "json"
}
```

### Input Rules

- `age_systems` must contain at least one supported value.
- Unsupported values return `UNSUPPORTED_AGE_SYSTEM`.
- `leap_month_policy` defaults to `regular_month`.
- `nominal_age_rule` defaults to `lunar_new_year`.
- If `as_of_date` is omitted, resolve today's date in `timezone` and include
  the resolved date in the output.
- Reject an as-of date before the Gregorian birth date.

### Output

```json
{
  "birth": {
    "input": {
      "calendar": "chinese_lunar",
      "year": 2005,
      "month": 5,
      "day": 19,
      "is_leap_month": false
    },
    "gregorian": {
      "calendar": "gregorian",
      "year": 2005,
      "month": 6,
      "day": 25
    },
    "normalized_gregorian": "2005-06-25"
  },
  "as_of": {
    "gregorian": {
      "calendar": "gregorian",
      "year": 2026,
      "month": 9,
      "day": 16
    },
    "normalized_gregorian": "2026-09-16",
    "timezone": "Asia/Shanghai"
  },
  "rules": {
    "leap_month_policy": "regular_month",
    "nominal_age_rule": "lunar_new_year"
  },
  "ages": {
    "chronological_days": {
      "days": 7753
    },
    "gregorian_completed_years": {
      "years": 21,
      "next_birthday": "2027-06-25"
    },
    "chinese_lunar_completed_years": {
      "years": 21,
      "previous_birthday": "2026-07-03",
      "next_birthday": "2027-06-23"
    },
    "chinese_nominal_age": {
      "years": 22,
      "rule": "lunar_new_year",
      "previous_increment": "2026-02-17"
    }
  },
  "warnings": []
}
```

The exact next lunar birthday should be produced by the same conversion
service and covered by an integration test. The values above define the
expected reference fixture.

## Tool: `calendar_list_birthdays`

Lists recurring birthday dates mapped into a requested range.

### Input

```json
{
  "birth_date": {
    "calendar": "chinese_lunar",
    "year": 2005,
    "month": 5,
    "day": 19,
    "is_leap_month": false
  },
  "start_year": 2026,
  "end_year": 2030,
  "target_calendar": "gregorian",
  "leap_month_policy": "regular_month",
  "response_format": "json"
}
```

### Output

```json
{
  "birthday_calendar": "chinese_lunar",
  "target_calendar": "gregorian",
  "leap_month_policy": "regular_month",
  "items": [
    {
      "calendar_year": 2026,
      "target": {
        "calendar": "gregorian",
        "year": 2026,
        "month": 7,
        "day": 3
      },
      "normalized_target": "2026-07-03"
    }
  ],
  "count": 1,
  "has_more": false
}
```

### Limits

- Maximum requested range: 100 years.
- `start_year` must not exceed `end_year`.
- The tool must never load or return an unbounded result set.

## Tool Annotations

All tools use:

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

## Error Contract

Tool errors use a stable code plus an actionable message:

```json
{
  "code": "INVALID_LUNAR_DATE",
  "message": "Chinese lunar 2024 month 2 day 30 does not exist because that month has only 29 days.",
  "details": {
    "year": 2024,
    "month": 2,
    "day": 30,
    "is_leap_month": false,
    "month_days": 29
  }
}
```

Initial error codes:

| Code | Meaning |
| --- | --- |
| `INVALID_DATE` | The date is not a valid civil date. |
| `INVALID_LUNAR_DATE` | The Chinese lunar date does not exist. |
| `INVALID_LEAP_MONTH` | The leap-month flag conflicts with the year. |
| `AMBIGUOUS_LEAP_BIRTHDAY` | The strict leap-month birthday policy cannot resolve a year. |
| `DATE_OUT_OF_RANGE` | The date is outside the supported range. |
| `AS_OF_BEFORE_BIRTH` | The as-of date precedes the birth date. |
| `UNSUPPORTED_CALENDAR` | The requested calendar is not supported. |
| `UNSUPPORTED_AGE_SYSTEM` | The requested age convention is not supported. |
| `INVALID_RANGE` | A birthday list range is invalid or too large. |

## Transport Decision

Use stateless Streamable HTTP for v0.1. The server accepts JSON-RPC requests
through `POST /mcp` and returns JSON responses.

- Bind to `127.0.0.1` by default.
- Do not create or track MCP sessions.
- Create a request-scoped server and transport for each POST request.
- Validate both the `Host` and browser `Origin` headers.
- Allow requests without an `Origin` header for non-browser MCP clients.
- Return `405 Method Not Allowed` for `GET` and `DELETE`.
- Keep request handlers free of shared mutable session state.

The default port is `3000` and can be changed with `MCP_PORT`. Browser origins
can be explicitly allowed with the comma-separated `MCP_ALLOWED_ORIGINS`
environment variable.

This local-only transport has no authentication. Adding remote exposure
requires a separate authentication and TLS design.
