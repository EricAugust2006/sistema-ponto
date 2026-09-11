## Why

Employees can currently submit or replace a point justification for any past date, so the system has no monthly closing boundary for unresolved point issues. A deadline is needed to make the monthly process predictable and prevent late changes after the fifth day of the following month.

## What Changes

- Allow an employee to create or replace a point justification for a reference date through the end of the fifth calendar day of the following month.
- Reject new justifications and replacements submitted after that deadline with a clear client-facing error and an appropriate 4xx response.
- Preserve the existing behavior for future dates, validation, authentication, and manager/admin review of justifications submitted on time.
- Apply the rule in the server-side API so it is enforced consistently for UI and direct API clients.
- Treat the fifth day as inclusive; a request on the sixth day or later is late.

## Capabilities

### New Capabilities

- `justification-deadline`: Enforce the monthly deadline for submitting or replacing point justifications.

### Modified Capabilities


## Impact

- Affected API: `POST /api/v1/justificativas`.
- Affected integration coverage: justification creation tests, including boundary dates and late submissions.
- Affected employee experience: the point justification form will surface the API error when the monthly deadline has passed; no separate client-only enforcement is required for correctness.
- No database migration or change to manager/admin approval permissions is expected.
