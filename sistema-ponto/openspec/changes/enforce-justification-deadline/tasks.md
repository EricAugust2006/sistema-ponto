## 1. Deadline calculation

- [x] 1.1 Add a server-side calendar-date helper for the justification cutoff that derives the fifth day of the next month from a `YYYY-MM-DD` reference date, handles December-to-January rollover, and can be evaluated deterministically; verify it with unit-level cases for ordinary months, the fifth/sixth-day boundary, and December.
- [x] 1.2 Integrate the cutoff check into `POST /api/v1/justificativas` after existing authentication, payload, and future-date validation but before the insert/upsert; verify late requests return the agreed 400 error without issuing a write.

## 2. API behavior coverage

- [x] 2.1 Extend justification API tests to cover acceptance on the fifth day and rejection from the sixth day, including a late replacement that leaves the existing reason/status unchanged; verify the response status and database state.
- [x] 2.2 Add coverage for a December reference date crossing into January 5/6 and confirm existing unauthorized, future-date, and malformed-payload behavior remains unchanged by running the justification integration suite.

## 3. Validation

- [x] 3.1 Run the focused unit/integration tests for justification deadline behavior and the project's relevant typecheck/lint command; verify all new and existing checks pass.
- [x] 3.2 Run `openspec validate --change "enforce-justification-deadline" --strict` and confirm the change artifacts and requirement scenarios are valid.
