# data-mcp-server

`data-mcp-server` is a deterministic MCP server for Gregorian and Chinese
lunar calendar conversion and calendar-aware age calculation.

## Scope

Supported calendars:

- Gregorian
- Chinese lunar, using modern PRC calendar rules through `lunar-javascript`

Supported age conventions:

- Chronological elapsed days
- Gregorian completed years
- Chinese lunar completed years
- Chinese nominal age using Chinese New Year

The v0.1 transport is local stdio. Runtime tool calls are read-only,
idempotent, deterministic, and perform no network access.

## Supported Range

The normalized Gregorian date must be between `1900-01-01` and `2100-12-31`.
The corresponding Chinese lunar boundary months are `1899-12` and `2100-12`.
All other dates return `DATE_OUT_OF_RANGE`.

The conversion engine is `lunar-javascript` `1.7.7`, pinned through
`package-lock.json`.

## Install

Requires Node.js 22 or newer.

```powershell
npm install
npm run build
npm test
```

## MCP Client Configuration

Build the server first, then point the client at the emitted entry point:

```json
{
  "mcpServers": {
    "data-mcp-server": {
      "command": "node",
      "args": [
        "E:\\AiProject\\data-mcp\\dist\\index.js"
      ]
    }
  }
}
```

## Tools

### `calendar_convert_date`

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

The result includes the normalized Gregorian date.

### `calendar_calculate_age`

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

For the example above, the result is 21 Gregorian completed years, 21 Chinese
lunar completed years, 22 nominal years, and 7753 chronological days.

### `calendar_list_birthdays`

Lists recurring birthdays for a bounded range of at most 100 inclusive
calendar years.

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

## Leap-Month Policy

- `regular_month`: use the leap month when it exists; otherwise use the regular
  month and same day.
- `skip`: omit birthdays in years without the matching leap month.
- `strict`: return `AMBIGUOUS_LEAP_BIRTHDAY` when no matching leap month
  exists.

## Known Limitations

- Hour-level Chinese calendar boundaries are out of scope.
- The default timezone is `Asia/Shanghai` only when resolving "today".
- Gregorian February 29 birthdays are only recognized in Gregorian leap years;
  no regional February 28 versus March 1 policy is inferred.
- The declared range can be extended only after additional boundary fixtures
  are validated against an independent calendar implementation.

See [docs/adr/0001-v0.1-contract-decisions.md](docs/adr/0001-v0.1-contract-decisions.md)
for the frozen v0.1 decisions.

