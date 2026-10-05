# Feature: Dockerfile improvements (pnpm-containerization skill)

## Objective
Apply the pnpm-containerization review findings to the JASRAPO-FRONTEND repo:
- Add BuildKit cache mount for the pnpm store (the highest-impact finding).
- Drop `corepack enable pnpm` in favor of an explicit pnpm install path.
- Add `@angular/build` to `allowBuilds` (defensive, to prevent `ERR_PNPM_IGNORED_BUILDS`).

## Scope & Constraints
- Hard Rule #3: pnpm store in a BuildKit cache mount, never in a layer.
- Hard Rule #4: every postinstall-needing package listed in `allowBuilds` with a real
  `true` (not the literal `set this to true or false` placeholder).
- `pnpm-workspace.yaml` already pins `pnpm@12.3.4` via `packageManager`; align the builder
  with the same version.
- `target: production` is the default final stage; `target: development` is selected by
  compose profile. Don't reorder.
- Conventional Commits, one work-unit per commit on a feature branch.

## Tasks
- [x] Task 1: Refactor `Dockerfile` — replace `corepack enable pnpm` with the explicit
      pnpm 12.3.4 install (matching `packageManager`), add `--mount=type=cache,id=pnpm,
      target=/pnpm/store` to both `pnpm install` invocations (`builder` and `development`),
      and add `HEALTHCHECK` to the `production` stage.
- [x] Task 2: Update `pnpm-workspace.yaml` `allowBuilds` to include `@angular/build: true`
      (preemptive — Angular 21's CLI bundler).
- [x] Task 3: Verify with `hadolint` and `pnpm install --frozen-lockfile` locally
      (read-only sanity; the build itself is the integration check).
- [x] Task 4 (iteration): Drop `corepack enable && corepack prepare pnpm@12.3.4 --activate`
      from both pnpm install invocations. The `ghcr.io/pnpm/pnpm:12` base ships pnpm 12.x
      but does NOT include corepack, npm, or node. Replaced with `pnpm runtime set node 24 -g`
      which is what actually installs Node 24 in the pnpm runtime.
- [x] Task 5 (iteration, after re-reading pnpm Docker docs): Move the cache mount from
      `/pnpm/store` to `/var/cache/pnpm`. The pnpm docs are explicit: mounting a BuildKit
      cache over `/pnpm/store` hides the managed runtime (the Node binary downloaded by
      `pnpm runtime set`) for the duration of the RUN. Cache and managed runtime must
      live on separate paths. The runtime stage is `nginx:alpine` serving static files,
      so the libc-mismatch concern that hit the backend (sharp on trixie-built/musl-runtime)
      does not apply here.

## Evidence (commit SHAs)
- Task 1: a04e3720732039b440a8703e797626ef8e0ca073
- Task 2: 2028bccd7711570bd2dfa67a558b198ce0db3f3e
- Task 3: hadolint run on `Dockerfile`; no new errors. allowBuilds has 6 entries,
  no `set this to true or false` placeholder.
- Task 4: a881a49 (drop corepack; mirrored from the backend fix after the user
  reported the same `corepack: not found` error)
- Task 5: 605fa18 (cache mount move to /var/cache/pnpm)

## Verification
- `hadolint Dockerfile` → 0 errors.
- No `node_modules` or `/var/cache/pnpm` baked into the production image layers.
- `podman build --target production` succeeds; image serves nginx with the
  Angular bundle.

## Out of scope
- Updating the git worktree `JASRAPO-FRONTEND-worktrees/pr89-fix` (detached from
  `develop`).
- Switching the production stage to a non-root user (nginx alpine needs to bind port 80;
  rootless variant is a larger refactor).
