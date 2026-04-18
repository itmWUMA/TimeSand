---
type: spec
iteration: "0.0"
created: 2026-04-12
tags:
  - mvp
  - infrastructure
---

# Design Spec: Release Workflow (GitHub Actions)

## Overview

A GitHub Actions workflow for building, validating, and releasing TimeSand. Triggered manually via `workflow_dispatch`, it runs parallel validation jobs (frontend tests, backend tests, Docker build verification), then bumps version numbers in source files, creates a git tag, and publishes a GitHub Release with auto-generated release notes.

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
  1. Checkout code with `fetch-depth: 0` and `token: ${{ secrets.RELEASE_TOKEN }}`
     (PAT is required to push commits past branch protection)
  2. Configure git user (GitHub Actions bot: `github-actions[bot]`)
  3. Update version in `frontend/package.json` (field: `version`) using `jq` or `sed`
  4. Update version in `backend/pyproject.toml` (field: `version` under `[project]`) using `sed`
  5. Commit: `chore: bump version to {version}`
  6. Create annotated tag `v{version}` on the version bump commit
  7. Push commit and tag to `main`
  8. Create GitHub Release using `gh release create`:
     - Tag: `v{version}`
     - Title: `v{version}`
     - Body: auto-generated release notes (`--generate-notes`)
     - Flag: `--prerelease` if `release_type` is `pre-release`

## Authentication

The `release` job needs to push a version bump commit directly to `main`, which has branch protection. The default `GITHUB_TOKEN` cannot bypass this.

**Solution**: A fine-grained Personal Access Token (PAT) stored as repository secret `RELEASE_TOKEN`.

**PAT setup**:
1. Go to GitHub → Settings → Developer settings → Fine-grained personal access tokens
2. Create token scoped to the `itmWUMA/TimeSand` repository only
3. Grant permissions: **Contents: Read and write**
4. Save the token as a repository secret named `RELEASE_TOKEN`
   (Repository → Settings → Secrets and variables → Actions → New repository secret)

**Usage in workflow**:
- `actions/checkout` uses `token: ${{ secrets.RELEASE_TOKEN }}` so `git push` inherits the PAT
- `gh release create` uses `GITHUB_TOKEN` (sufficient for creating releases)

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
