# data-mcp Documentation

This directory contains the design baseline for the calendar date and age MCP
server.

## Documents

- `project-brief.md`: Product goal, scope, principles, and acceptance criteria.
- `domain-rules.md`: Calendar models, age definitions, boundary rules, and
  reference examples.
- `mcp-interface.md`: MCP tools, input/output contracts, errors, and transport.
- `implementation-plan.md`: Recommended stack, project structure, milestones,
  tests, and open decisions.

## Current Baseline

- Primary scenario: convert a Chinese lunar birth date and calculate ages under
  explicit calendar conventions.
- Initial calendars: Gregorian and Chinese lunar.
- Initial age systems: Gregorian completed years, Chinese lunar completed
  years, Chinese nominal age, and chronological elapsed days.
- Initial transport: stateless Streamable HTTP at `POST /mcp`.
- Recommended language: TypeScript.
- Runtime behavior: deterministic and offline after dependencies are installed.

## Reference Scenario

For a birth date of Chinese lunar 2005-05-19 (not a leap month), the Gregorian
birth date is 2005-06-25. As of 2026-09-16:

| Convention | Result |
| --- | --- |
| Gregorian completed years | 21 |
| Chinese lunar completed years | 21 |
| Chinese nominal age | 22 |
| Chronological elapsed days | 7753 |

The exact returned structure and rule names are defined in `mcp-interface.md`.
