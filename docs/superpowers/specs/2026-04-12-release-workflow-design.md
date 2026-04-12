# Design Spec: Release Workflow (GitHub Actions)

## Overview

A GitHub Actions workflow for building, validating, and releasing TimeSand. Triggered manually via `workflow_dispatch`, it runs parallel validation jobs (frontend tests, backend tests, Docker build verification), then creates a git tag and GitHub Release with auto-generated release notes.

## Trigger

- **Type**: `workflow_dispatch` (manual trigger from Actions tab)
- **Branch restriction**: `main` only
- **Inputs**:
  - `version` (string, required): SemVer version number without `v` prefix (e.g., `1.0.0`, `0.2.0-beta.1`)
  - `release_type` (choice, required): `release` or `pre-release`, default `release`

## Job Structure

```
workflow_dispatch (version, release_type)
  │
  ├── validate           — format check + tag uniqueness
  │     │
  │     ├── test-frontend    — bun install + vitest
  │     ├── test-backend     — uv sync + pytest
  │     └── docker-verify    — docker build (no push)
  │           │
  │           └── release    — tag + GitHub Release + version bump commit
```

5 jobs total. `test-frontend`, `test-backend`, and `docker-verify` run in parallel after `validate`. `release` runs only after all three pass.

## Job Details

### 1. validate

- **Runs on**: `ubuntu-latest`
- **Steps**:
  1. Checkout code
  2. Validate `version` input matches SemVer regex: `^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[a-zA-Z0-9.]+)?$`
  3. Check that tag `v{version}` does not already exist via `git ls-remote --tags origin`
  4. Fail fast with clear error message if either check fails

### 2. test-frontend

- **Runs on**: `ubuntu-latest`
- **Needs**: `validate`
- **Steps**:
  1. Checkout code
  2. Setup Bun (use `oven-sh/setup-bun@v2`)
  3. `cd frontend && bun install --frozen-lockfile`
  4. `bun run test`

### 3. test-backend

- **Runs on**: `ubuntu-latest`
- **Needs**: `validate`
- **Steps**:
  1. Checkout code
  2. Setup Python 3.12 (use `actions/setup-python@v5`)
  3. Install uv (`pip install uv`)
  4. `cd backend && uv sync`
  5. `uv run pytest`

### 4. docker-verify

- **Runs on**: `ubuntu-latest`
- **Needs**: `validate`
- **Steps**:
  1. Checkout code
  2. `docker build .` — verify the multi-stage Dockerfile builds successfully
  3. No image push; build verification only

### 5. release

- **Runs on**: `ubuntu-latest`
- **Needs**: `test-frontend`, `test-backend`, `docker-verify`
- **Steps**:
  1. Checkout code
  2. Create lightweight tag `v{version}` on current HEAD
  3. Push tag to origin
  4. Create GitHub Release using `gh release create`:
     - Tag: `v{version}`
     - Title: `v{version}`
     - Body: auto-generated release notes (`--generate-notes`)
     - Flag: `--prerelease` if `release_type` is `pre-release`

**Note on version bump**: The workflow does NOT commit version changes to `frontend/package.json` or `backend/pyproject.toml` because `main` has branch protection (requires PR + review). Version numbers in source files should be updated as part of the normal development workflow before the release is triggered. The git tag is the authoritative version identifier.

## Permissions

```yaml
permissions:
  contents: write   # create tags, releases, push version bump commit
```

## File Changes

| File | Action |
|------|--------|
| `.github/workflows/release.yml` | Create |

## Runner Environment

All jobs run on `ubuntu-latest`. No self-hosted runners required.

## Docker Build Args

The existing Dockerfile uses `ARG IMAGE_REGISTRY=docker.m.daocloud.io/` for China mirror. In GitHub Actions (running outside China), the workflow should override this to use Docker Hub directly:

```
docker build --build-arg IMAGE_REGISTRY="" .
```

## Error Handling

- **Invalid version format**: `validate` job fails with descriptive error
- **Duplicate tag**: `validate` job fails, user must choose a new version
- **Test failure**: Parallel jobs fail independently; `release` job is skipped
- **Docker build failure**: `release` job is skipped; user investigates Dockerfile issues

## Non-Goals

- Docker image push to any registry (GHCR, Docker Hub)
- Automated changelog beyond GitHub's auto-generated notes
- Slack/Discord notifications
- Automated rollback
