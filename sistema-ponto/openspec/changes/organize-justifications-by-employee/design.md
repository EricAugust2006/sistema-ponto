## Context

The admin page at `app/admin/justificativas/page.tsx` already fetches the complete manager-visible justification list, applies the status filter in the client, and owns the rendering and analysis actions. The API includes the employee identity, reference date, point type, status, reason, and analysis observation needed for grouping. See `proposal.md` and the capability spec for the motivation and observable contract.

## Goals / Non-Goals

**Goals:**

- Build employee groups from the already filtered client-side records.
- Add month sections and deterministic descending reference-date ordering within each employee.
- Keep existing record markup semantics, analysis actions, feedback, and API behavior intact.
- Make the grouping transformation independently testable without requiring a database or API change.

**Non-Goals:**

- No new endpoint, query parameter, database column, or migration.
- No change to status-filter meanings, authorization, deadline rules, or approval semantics.
- No new employee or month filter controls in this change.

## Decisions

- **Group in the admin page after status filtering.** The existing response is already sufficient and the grouping is a presentation concern. Keeping it client-side avoids changing the API contract and ensures the current status tabs continue to represent the exact records being displayed. A server-side grouped response was considered, but would couple the API to one UI layout and duplicate filter logic.
- **Use stable identity keys for groups and month buckets.** Group employees by `empregado_id` and month buckets by the `YYYY-MM` portion of the reference date, while displaying the supplied name, matrícula, and localized month/year label. This prevents employees with similar names from merging and keeps month grouping independent of the browser's timezone.
- **Sort by reference date descending with `id` as the tie-breaker.** The reference date is the business ordering requested by the screen; using the numeric record id for equal dates makes output deterministic without depending on fetch order or creation timestamps. Employee and month group order will also be deterministic, with most recent month first and a stable employee-name/id order for groups whose records have the same latest date.
- **Extract a pure grouping transformation.** Keep network and mutation state in the page, but place the grouping and sorting logic in a small pure helper or nearby typed utility. This makes cases for multiple employees, month boundaries, equal dates, and filtered records cheap to test and limits JSX complexity.
- **Preserve the existing record card actions.** Move the current item rendering under the new employee/month headings with minimal markup changes, so approval/refusal loading and feedback continue to use the same record ids and state.

## Risks / Trade-offs

- **[Risk]** A large number of employee/month headings increases vertical density. **Mitigation:** use compact headings and retain the existing item layout; do not duplicate full employee details on every record.
- **[Risk]** Parsing dates with `Date` can shift a date across a month in some timezones. **Mitigation:** derive the month bucket and sort key from the date's `YYYY-MM-DD` string rather than localizing it first; use localization only for display labels.
- **[Risk]** Existing UI coverage may be limited because the page currently has no visible component test beside the API tests. **Mitigation:** add focused tests for the pure grouping transformation, plus a targeted render/integration check if the project's test setup supports it.

## Migration Plan

No data or deployment migration is required. Ship the page/helper and focused tests together. Rollback consists of reverting the presentation change; the API and persisted justification records remain compatible in either direction.