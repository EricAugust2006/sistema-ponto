## Why

The admin justifications screen currently renders every record in one flat list, so reviewing a month's point issues for a specific employee requires scanning unrelated employees and dates. Grouping the records by employee will make approval work easier to scan while retaining the existing status filters and actions.

## What Changes

- Organize the admin justifications view into employee sections, with each employee's justifications shown together.
- Present each employee's records in a deterministic date-oriented order within the existing status filter.
- Preserve the existing justification details, approval/refusal actions, loading, empty, success, and error states.
- Keep the existing API response and authorization behavior unchanged; grouping is a consumer-side presentation change.

## Capabilities

### New Capabilities

- `admin-justifications-by-employee`: Organize the administrative justification review view by employee and provide predictable ordering for each employee's records.

### Modified Capabilities

<!-- No existing requirement changes. The justification deadline capability remains unchanged. -->

## Impact

- `app/admin/justificativas/page.tsx`: transform the filtered records into employee groups and render group headings with their records.
- Admin justification UI tests or focused component checks: cover grouping, ordering, filtering, and empty behavior.
- `/api/v1/justificativas`: no contract or query behavior change is required.