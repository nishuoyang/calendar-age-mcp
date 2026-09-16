# Domain Rules

## Calendar Model

### Gregorian Date

```json
{
  "calendar": "gregorian",
  "year": 2026,
  "month": 9,
  "day": 16
}
```

### Chinese Lunar Date

```json
{
  "calendar": "chinese_lunar",
  "year": 2005,
  "month": 5,
  "day": 19,
  "is_leap_month": false
}
```

`is_leap_month` is required for Chinese lunar dates. It must not be inferred
from the month number.

## Supported Range

The v0.1 contract should declare a finite supported range and reject everything
else. The recommended initial range is Gregorian years 1900 through 2100,
subject to verifying the selected conversion library with boundary fixtures.

Do not return best-effort values outside the range. Return
`DATE_OUT_OF_RANGE` with the supported range in the error details.

## Date Interpretation

- A calendar date is a civil date, not an instant.
- The Chinese lunar calendar follows the modern PRC standard calendar.
- The `Asia/Shanghai` time zone is the default only when resolving "today".
- Date conversion itself does not need a time zone.
- Hour-level features such as 子时 boundaries are out of scope.

## Age Definitions

The server must never return one unlabelled age. Every age has a rule.

### Chronological Elapsed Days

The number of whole days between the Gregorian birth date and the as-of date.
This is the only age value that is not tied to a calendar-year convention.

For the reference scenario:

```text
2005-06-25 to 2026-09-16 = 7753 days
```

### Gregorian Completed Years

The number of Gregorian birthdays completed by the as-of date.

- At birth: 0.
- On the birthday: increment.
- After the birthday: increment.
- Before the birthday: do not increment yet.

The response should also include the next Gregorian birthday.

### Chinese Lunar Completed Years

The number of Chinese lunar birthdays completed by the as-of date. Each
lunar birthday is converted to its Gregorian date for the corresponding lunar
year.

The response should include:

- The birth Gregorian date.
- The most recent lunar birthday mapped to Gregorian.
- The next lunar birthday mapped to Gregorian.
- The leap-month policy that was applied.

### Chinese Nominal Age

The default rule is:

```text
current Chinese lunar year - birth Chinese lunar year + 1
```

Under this rule, the person is 1 at birth and gains one year at Chinese New
Year. The result should include:

- `rule: "lunar_new_year"`
- The Chinese New Year date that caused the most recent increment.
- The next Chinese New Year date.

Some traditional systems use 立春 instead of Chinese New Year. That is a
separate rule and must not be silently substituted. A future
`nominal_age_rule: "lichun"` option may support it.

### Calendar-Specific Completed Years

For any future supported calendar, define the age as the number of completed
birthdays in that target calendar. Do not approximate age by dividing elapsed
days by an average year length. The latter produces inconsistent results and
cannot be audited against calendar dates.

## Leap-Month Birthday Policy

A leap-month birthday is ambiguous in years without the same leap month.
Supported policies:

| Policy | Behavior |
| --- | --- |
| `regular_month` | Use the regular month and same day when no matching leap month exists. This is the default. |
| `skip` | Do not count a birthday in years without the matching leap month. |
| `strict` | Return `AMBIGUOUS_LEAP_BIRTHDAY` when no matching leap month exists. |

The response must echo the selected policy. Do not choose `skip` or `strict`
implicitly.

## Validation Rules

- Gregorian dates must be real civil dates.
- Chinese lunar years and month numbers must be in the supported range.
- Chinese lunar day 30 is valid only when that month has 30 days.
- `is_leap_month: true` is valid only when the target year has a leap month
  with that month number.
- If `as_of_date` is earlier than the Gregorian birth date, return
  `AS_OF_BEFORE_BIRTH`.
- Birthday ranges are capped to protect response size.

## Reference Scenario

Input:

```json
{
  "calendar": "chinese_lunar",
  "year": 2005,
  "month": 5,
  "day": 19,
  "is_leap_month": false
}
```

Known values:

| Property | Value |
| --- | --- |
| Gregorian birth date | 2005-06-25 |
| As-of date | 2026-09-16 |
| Gregorian completed years | 21 |
| Chinese lunar completed years | 21 |
| Chinese nominal age | 22 |
| 2026 lunar birthday mapped to Gregorian | 2026-07-03 |
| Chronological elapsed days | 7753 |

This scenario is a mandatory fixture. The conversion library must be checked
against a second trusted source before release.
