# Working in this OpenSpec workspace

This repo uses the [OpenSpec](https://github.com/Fission-AI/OpenSpec) convention
for spec-driven change management. Read `project.md` first for product/stack
context. This file defines the folder layout and the exact authoring format.

## Folder layout

```
openspec/
├── project.md                     # product + stack + conventions (read first)
├── AGENTS.md                      # this file
├── specs/                         # the CURRENT, agreed truth of the system
│   └── <capability>/spec.md       # one capability per folder
└── changes/                       # proposed work (not yet folded into specs/)
    ├── <change-id>/               # kebab-case, verb-led (e.g. add-instant-quoting-engine)
    │   ├── proposal.md            # why + what changes + impact
    │   ├── design.md              # technical approach (optional for small changes)
    │   ├── tasks.md               # ordered, checkbox implementation plan
    │   └── specs/
    │       └── <capability>/spec.md   # DELTA: ADDED/MODIFIED/REMOVED requirements
    └── archive/
        └── YYYY-MM-DD-<change-id>/    # completed changes, after folding into specs/
```

- `specs/` describes the system **as it is today** (or as it will be once the
  current change set lands). It is updated by *archiving* a change, not by
  editing it directly during a change.
- `changes/<id>/specs/` contains only the **delta** for that change.

## Spec file format

```markdown
# <Capability> Specification

## Purpose
One short paragraph: what this capability is and who it serves.

## Requirements

### Requirement: <Short imperative name>
The system SHALL <behaviour>. (Use RFC 2119 keywords: MUST/SHALL, SHOULD, MAY.)

#### Scenario: <observable situation>
- GIVEN <starting context>
- WHEN <action/event>
- THEN <observable outcome>
- AND <additional outcome>
```

Every requirement needs at least one `#### Scenario:`. Scenarios are the
contract that tests assert against (one scenario → ≥1 test).

## Delta format (inside `changes/<id>/specs/<capability>/spec.md`)

```markdown
# <Capability> (delta for <change-id>)

## ADDED Requirements
### Requirement: <name>
... full requirement + scenarios ...

## MODIFIED Requirements
### Requirement: <existing name>
... full new text; note "(Previously: ...)" for the changed part ...

## REMOVED Requirements
### Requirement: <existing name>
(Reason for removal.)
```

## proposal.md sections

- `## Why` — the problem / motivation.
- `## What Changes` — bullet list of user-visible and structural changes.
- `## Impact` — affected specs/code/data, risks, out-of-scope.

## tasks.md format

Hierarchical numbered checkboxes grouped by phase, test-first per GOOS:

```markdown
## 1. <Phase>
- [ ] 1.1 <task>
- [ ] 1.2 <task>
```

## Process

1. Create `changes/<id>/` with `proposal.md`, `tasks.md`, and spec deltas
   (+ `design.md` if non-trivial). Do not touch `specs/`.
2. Implement test-first (see GOOS workflow in `project.md`).
3. When done and merged, move the folder to `changes/archive/YYYY-MM-DD-<id>/`
   and fold the deltas into `specs/`.
