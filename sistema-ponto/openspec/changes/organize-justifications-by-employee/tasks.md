## 1. Grouping and ordering logic

- [x] 1.1 Add a typed pure transformation for the status-filtered justification records that groups by `empregado_id`, creates `YYYY-MM` month buckets from the reference-date string, and applies deterministic employee, month, and record ordering; verify it with focused cases for multiple employees, month boundaries, same-date records, and excluded statuses.
- [x] 1.2 Add or update the localized month-label and date presentation helpers without deriving grouping keys through timezone-sensitive `Date` parsing; verify December/January and representative `pt-BR` labels render in the intended month.

## 2. Administrative view

- [x] 2.1 Update `app/admin/justificativas/page.tsx` to render employee sections and nested reference-month sections from the transformation while preserving the current justification fields, status badges, approval/refusal actions, and processing state; verify each matching record appears exactly once under the correct employee and month.
- [x] 2.2 Keep status filtering before grouping and preserve pending counts, loading, error/success feedback, authorization behavior, and the existing empty state; verify switching each status filter removes empty employee/month groups and refreshed analysis results use the active filter.

## 3. Validation

- [x] 3.1 Run the focused grouping/helper tests and the relevant lint/typecheck command; verify no API or database files require changes.
- [x] 3.2 Run `openspec validate "organize-justifications-by-employee" --type change --strict` and confirm all proposal, specification, design, and task artifacts are valid.