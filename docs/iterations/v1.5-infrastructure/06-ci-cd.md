---
type: task
iteration: "1.5"
status: pending
branch: feat/ci-cd
pr:
completed: 2026-05-10
tags:
  - v1.5
  - infrastructure
  - ci-cd
  - github-actions
---

# Task 6: CI/CD Enhancement

- **Branch**: `feat/ci-cd`
- **Scope**: New PR CI workflow for automated quality gates; enhance release workflow with GHCR Docker image push
- **Dependencies**: None (only modifies workflow files)

## Files

### CI/CD

- `.github/workflows/ci.yml` (create — PR quality gate workflow)
- `.github/workflows/release.yml` (modify — add Docker image publish job)

## Design Details

### PR CI Workflow (`.github/workflows/ci.yml`)

**Trigger**: `pull_request` targeting `dev` (types: opened, synchronize, reopened)

**Jobs** (all run in parallel on `ubuntu-latest`):

```yaml
jobs:
  lint-frontend:
    # Checkout → Setup Bun → bun install --frozen-lockfile → bun run lint

  typecheck-frontend:
    # Checkout → Setup Bun → bun install --frozen-lockfile → bun run type-check

  test-frontend:
    # Checkout → Setup Bun → bun install --frozen-lockfile → bun run test

  lint-backend:
    # Checkout → Setup Python 3.12 → pip install uv → cd backend && uv sync → uv run ruff check .

  test-backend:
    # Checkout → Setup Python 3.12 → pip install uv → cd backend && uv sync → uv run pytest

  docker-build:
    # Checkout → docker build --build-arg IMAGE_REGISTRY="" .
```

**Notes**:
- All 6 jobs run in parallel for faster feedback.
- `--frozen-lockfile` ensures CI uses the exact lockfile versions.
- `--build-arg IMAGE_REGISTRY=""` overrides the China mirror in Dockerfile for GitHub Actions runners.
- No artifacts or caching in v1 — can be optimized later.

### Release Workflow Enhancement (`.github/workflows/release.yml`)

Add a `docker-publish` job after the existing `release` job:

```yaml
  docker-publish:
    runs-on: ubuntu-latest
    needs: release
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout code at tag
        uses: actions/checkout@v5
        with:
          ref: v${{ inputs.version }}

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          build-args: IMAGE_REGISTRY=
          tags: |
            ghcr.io/itmwuma/timesand:${{ inputs.version }}
            ${{ inputs.release_type == 'release' && format('ghcr.io/itmwuma/timesand:latest', '') || '' }}
```

**Workflow-level permissions**: Add `packages: write` alongside existing `contents: write`.

**Tagging strategy**:
- Version tag: `ghcr.io/itmwuma/timesand:<version>` (always)
- `latest` tag: only for non-prerelease builds

## Acceptance Criteria

- [ ] PR to `dev` triggers CI workflow automatically
- [ ] CI runs lint, type-check, and tests for both frontend and backend
- [ ] CI verifies Docker build succeeds
- [ ] All 6 CI jobs run in parallel
- [ ] CI status is visible on the PR page (pass/fail checks)
- [ ] Release workflow builds and pushes Docker image to GHCR
- [ ] Image tagged with version number (e.g., `ghcr.io/itmwuma/timesand:0.1.0`)
- [ ] Non-prerelease also tagged as `latest`
- [ ] Existing release workflow functionality (tag, GitHub Release) still works
- [ ] Image is pullable: `docker pull ghcr.io/itmwuma/timesand:<version>`

## Tests

### Manual Verification

- Create a test PR to `dev` and verify CI workflow triggers and all jobs pass
- Run the release workflow (with a test pre-release version) and verify Docker image appears in GHCR
- Pull the published image and verify it starts correctly: `docker run -p 8080:8080 ghcr.io/itmwuma/timesand:<version>`
