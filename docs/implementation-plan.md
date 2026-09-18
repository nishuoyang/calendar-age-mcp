# Implementation Plan

## Recommended Stack

| Area | Choice |
| --- | --- |
| Language | TypeScript |
| Runtime | Node.js 22 LTS or newer supported LTS |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Validation | Zod |
| Chinese calendar conversion | `lunar-javascript`, subject to range verification |
| Tests | Vitest |
| Transport | stateless Streamable HTTP |

Use the official modern MCP APIs:

- `McpServer`
- `server.registerTool`
- Zod input schemas
- `outputSchema` where supported
- `structuredContent` plus text content

Do not use deprecated MCP registration APIs.

## Initial Repository Structure

```text
data-mcp/
├── docs/
├── src/
│   ├── index.ts
│   ├── constants.ts
│   ├── http-server.ts
│   ├── server.ts
│   ├── schemas/
│   │   └── calendar.ts
│   ├── domain/
│   │   ├── age.ts
│   │   ├── calendar-date.ts
│   │   ├── errors.ts
│   │   └── leap-month-policy.ts
│   ├── services/
│   │   ├── calendar-converter.ts
│   │   ├── birthday-service.ts
│   │   └── formatters.ts
│   └── tools/
│       └── calendar.ts
├── tests/
│   ├── fixtures/
│   │   └── calendar-cases.ts
│   ├── conversion.test.ts
│   ├── age.test.ts
│   └── validation.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

Keep MCP registration thin. Calendar and age logic must live in domain or
service modules that can be unit tested without starting the server.

## Dependency Policy

- Do not implement Chinese lunar rules by hand.
- Pin the conversion library through `package-lock.json`.
- Document the library version and supported range in the project README.
- Verify critical fixtures against a second trusted source.
- Do not add a network call for conversion.

## Milestones

### M0: Scaffold

- Create package metadata and strict TypeScript configuration.
- Add MCP SDK, Zod, and test tooling.
- Create the Streamable HTTP entry point.
- Add lint/build/test scripts.

Exit criteria:

- `npm run build` succeeds.
- The empty server starts and exposes no tools without crashing.

### M1: Calendar Conversion

- Implement calendar date schemas.
- Implement Gregorian and Chinese lunar conversion.
- Validate leap months and month lengths.
- Add stable error mapping.
- Register `calendar_convert_date`.

Exit criteria:

- Chinese lunar 2005-05-19 converts to Gregorian 2005-06-25.
- Invalid leap-month and day-30 fixtures fail with stable codes.
- Boundary fixtures inside the declared range pass.

### M2: Age Calculation

- Implement chronological elapsed days.
- Implement Gregorian completed years.
- Implement Chinese lunar completed years.
- Implement Chinese nominal age.
- Implement leap-month birthday policies.
- Register `calendar_calculate_age`.

Exit criteria:

- The reference scenario returns 21 Gregorian years, 21 lunar years, 22
  nominal years, and 7753 elapsed days as of 2026-09-16.
- Before-birthday and after-birthday cases pass.
- Before and after Chinese New Year nominal-age cases pass.

### M3: Birthday Listing and MCP Verification

- Register `calendar_list_birthdays`.
- Add bounded year-range validation.
- Test the server in MCP Inspector.
- Add a concise README with client configuration.

Exit criteria:

- A client can discover all tools and their schemas.
- JSON and Markdown responses agree on the same values.
- Tool errors remain inside tool results and do not crash the server.

### M4: Expanded Calendars

Only start after the Gregorian and Chinese lunar contracts are stable.

- Add conversion adapters for one target calendar at a time.
- Preserve the calendar-specific completed-birthday age model.
- Add calendar-specific leap-month and leap-year policies.
- Do not expose a generic `age` field without a named rule.

Candidate calendars:

- Islamic civil and Islamic observational calendars.
- Hebrew calendar.
- Persian calendar.

## Mandatory Test Fixtures

### Conversion

- Chinese New Year for multiple years.
- Chinese lunar 2005-05-19 to Gregorian 2005-06-25.
- Years with and without leap months.
- A leap-month date converted in its own leap month.
- Chinese lunar day 30 in a 29-day month rejected.
- `is_leap_month: true` rejected for a year without that leap month.
- Declared minimum and maximum supported dates.

### Age

- As-of date before the birthday.
- As-of date on the birthday.
- As-of date after the birthday.
- As-of date before Chinese New Year.
- As-of date on Chinese New Year.
- As-of date after Chinese New Year.
- Leap-month birth with each supported policy.

### MCP Contract

- Valid JSON response.
- Valid Markdown response.
- Unknown age system rejected.
- As-of date before birth rejected.
- Birthday listing range over 100 years rejected.
- Tool annotations are read-only, non-destructive, idempotent, and closed-world.

## Verification Commands

```powershell
npm install
npm run build
npm test
npm start
npx @modelcontextprotocol/inspector --url http://127.0.0.1:3000/mcp
```

The exact test command will be fixed when the scaffold is created. The build
and test commands must be runnable from the repository root.

## Open Decisions

1. Supported range: recommended 1900 through 2100 until wider range fixtures
   are validated.
2. Leap-month birthday default: recommended `regular_month`.
3. Nominal age boundary: recommended Chinese New Year, with 立春 reserved for
   a separate rule.
4. Whether other calendars are planned for v0.2 or later.
These decisions should be recorded in a short ADR before the public interface
is frozen.

## Definition of Done

- Implementation is committed in small, reviewable changes.
- Build, unit tests, and MCP Inspector verification pass.
- README documents installation, supported range, tool examples, and known
  limitations.
- No runtime network dependency.
- No unlabelled age values.
- No silent fallback for leap-month dates or unsupported calendars.
