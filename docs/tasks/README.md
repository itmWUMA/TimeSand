# Task Planning Documents

This directory contains task planning documents that decompose design specs into independent sub-tasks for parallel development.

## Workflow

1. Claude Code creates task planning documents from design specs
2. Each sub-task is implemented on its own `feat/<task-slug>` branch
3. Codex reads the task document and implements each sub-task independently
4. Each branch creates a PR to `main` via `gh pr create`

## Task Document Format

Each task document follows this structure:

```markdown
# Task Plan: <Feature Name>

## Overview
Brief description of the feature being decomposed.

## Dependency Graph
Visual representation of task dependencies and execution order.

## Sub-tasks

### Task N: <task-slug>
- **Branch**: `feat/<task-slug>`
- **Scope**: What this task implements
- **Files**:
  - `path/to/file.py` (create)
  - `path/to/existing.py` (modify)
- **API Contracts** (if applicable):
  - `POST /api/foo` — request/response schema
- **Acceptance Criteria**:
  - [ ] Criterion 1
  - [ ] Criterion 2
- **Dependencies**: None | Task X must be merged first
- **Tests**:
  - Backend: describe what to test
  - Frontend: describe what to test
```

## Key Rules

- Each sub-task must be self-contained and implementable in isolation
- Branch naming: `feat/<task-slug>` matching the task document
- Dependencies must be merged before dependent tasks start
- All code and comments in English
