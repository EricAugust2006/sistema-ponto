## Purpose

Provides an organized administrative review of point justifications by employee and reference month, so managers can inspect related records together without losing the existing review workflow.

## ADDED Requirements

### Requirement: Group administrative justifications by employee

The administrative justifications view MUST apply the selected status filter before grouping the results, then render the remaining records in one distinct group per employee. Each non-empty employee group MUST identify the employee by name and matrícula, and no justification from one employee may appear inside another employee's group.

#### Scenario: Multiple employees have matching justifications

- **WHEN** the selected status filter matches justifications belonging to multiple employees
- **THEN** the view renders a separate labeled group for each employee and renders every matching justification exactly once in the group for its employee

#### Scenario: A status filter excludes an employee's records

- **WHEN** the selected status filter excludes all justifications for an employee
- **THEN** that employee's group is not rendered

### Requirement: Organize each employee group by reference month and date

Within each employee group, the view MUST organize justifications by the calendar month of their reference date and MUST display the individual records in a deterministic date order. Month labels MUST identify the reference month and year, and the existing date, point type, reason, status, analysis observation, and available actions MUST remain visible for each record.

#### Scenario: An employee has justifications across months

- **WHEN** an employee has matching justifications with reference dates in more than one calendar month
- **THEN** the employee group renders separate month sections, ordered from the most recent reference month to the oldest, with each record under the month containing its reference date

#### Scenario: An employee has multiple records in one month

- **WHEN** an employee has multiple matching justifications in the same reference month
- **THEN** the records are ordered from the most recent reference date to the oldest, with a stable tie-breaker for records sharing a date

### Requirement: Preserve review workflow and empty states

The grouped view MUST preserve the existing status filter choices, pending count, approval and refusal actions, processing state, loading state, error/success feedback, authorization behavior, and empty-filter message. Grouping MUST NOT require a change to the justifications API response contract.

#### Scenario: A manager reviews a pending justification

- **WHEN** a manager approves or refuses a pending record inside an employee group
- **THEN** the existing analysis request and feedback behavior occur, and the refreshed result is regrouped using the active status filter

#### Scenario: No records match the active filter

- **WHEN** the active status filter matches no justifications
- **THEN** the view displays the existing empty-state message and does not render empty employee or month groups