## Context

The justification endpoint currently validates authentication, future dates, and request fields before inserting or upserting a record in `justificativas_ponto`. The existing upsert means a late request could currently replace an earlier justification and reset its status to pending. See proposal.md and `specs/justification-deadline/spec.md` for the requested behavior.

## Goals / Non-Goals

**Goals:**

- Enforce the cutoff at the server boundary for both inserts and conflict updates.
- Calculate the cutoff from the submitted reference date, including month and year rollover.
- Keep the existing response behavior for successful, unauthorized, future-date, and malformed requests.
- Make the deadline behavior deterministic and directly testable at the API boundary.

**Non-Goals:**

- No database schema or migration changes.
- No change to manager/admin approval or rejection after a justification has been submitted.
- No independent client-side deadline calculation required for correctness.
- No retroactive cleanup of justifications that were submitted before this change.

## Decisions

1. **Enforce in `POST /api/v1/justificativas` before the database write.**
   - This protects direct API consumers and prevents the existing `ON CONFLICT` update from changing a closed month's record.
   - A UI-only check was rejected because it is bypassable and would duplicate the business rule.

2. **Derive the deadline from the reference date, not from the month of submission.**
   - Compute the first day of the next calendar month and use its fifth calendar day as the inclusive cutoff.
   - This naturally handles December to January and avoids string-based month arithmetic.
   - A fixed number of elapsed days was rejected because calendar-month policy is the observable requirement and month lengths vary.

3. **Use the application's calendar/timezone convention for the current date.**
   - Keep the comparison at calendar-date precision, matching the existing future-date check and the `YYYY-MM-DD` request contract.
   - The implementation should centralize or isolate the date calculation so boundary tests can exercise the fifth and sixth days without relying on the real clock.

4. **Return a client error before touching the database.**
   - Use a 400 response consistent with the endpoint's existing business-rule and validation errors, with a Portuguese message that identifies the passed deadline.
   - Do not alter the existing record on a late upsert attempt.

## Risks / Trade-offs

- [Risk] Server timezone and user timezone can differ around midnight. -> Mitigation: compare calendar dates using the application's established date convention and cover boundary dates in integration tests; avoid time-of-day cutoffs.
- [Risk] Tests that use only the current date may become flaky as the real calendar advances. -> Mitigation: add a testable date source or controlled request-date mechanism at the narrowest backend boundary, while keeping production behavior tied to the current calendar date.
- [Risk] Existing old justifications may fall outside the new deadline immediately after deployment. -> Mitigation: apply the rule prospectively to new POST attempts and leave stored records and manager/admin workflows untouched.

## Migration Plan

No data migration is required. Deploy the API rule and its tests; rollback consists of reverting the endpoint change if operational issues are found. Existing rows remain valid and are not modified by deployment.
