# Design: Estandarizacion de Workflow SDD

This document outlines the technical design for standardizing the AI workflow documentation, ensuring `AGENTS.md` acts as the single source of truth without runtime code changes.

## Technical Approach

Create a definitive `AGENTS.md` document at the repository root, providing verified rules and operational knowledge for AI agents. Add pointer stubs (`CLAUDE.md` and `GEMINI.md`) that forcefully route agents to `AGENTS.md`, and delete the obsolete and contradictory `.github/copilot-instructions.md`.

## Architecture Decisions

### Decision: AGENTS.md Section Inventory and Information Ordering

**Choice**: The `AGENTS.md` file will be ordered strictly by agent attention priority:
1. **Non-negotiables**: `pnpm` exclusively; `pnpm gen:api` required before compiling (`src/app/generated/` is gitignored); never hand-edit Orval output; never run `gentle-ai install --scope workspace` in this repo.
2. **Local language matrix**: A concrete table mapping artifact types to required languages.
3. **Code-forced conventions**: Rules verified by compiler and framework constraints.
4. **Test-quality traps**: Specific warnings about the current test suite's quality.
5. **CI command chain**: The exact commands run in CI.
6. **Commit conventions**: Commit message formatting rules.

**Alternatives considered**: Grouping by topic (e.g., all TypeScript rules together, all CI rules together) or alphabetical ordering.
**Rationale**: Place the most critical, build-breaking operational rules first so an agent's attention catches what is non-negotiable before getting to style, conventions, or testing. Topic grouping might bury the `pnpm gen:api` requirement.

### Decision: The Language Matrix as a Concrete Table

**Choice**: The matrix will be a three-row table with real repository examples:

| Artifact Type | Required Language | Example |
|---------------|-------------------|---------|
| Code identifiers / logic / comments | English | `interface User`, `getUserById()` |
| DTO and API contract field names | Spanish | `nombre_completo`, `id_usuario` |
| UI copy | Spanish | `Guardar Cambios`, `Confirmar` |

**A fourth row was considered and rejected: template comment language.** The earlier draft
claimed "inline template comments → Spanish". Measurement shows that claim is false on two
counts. First, templates are not inline: they live in 115 separate `.html` files, so an
"inline template" rule targets a code shape this project does not use. Second, comment
language is genuinely mixed — `src/app/features/operator/readings/lecturas.component.html`
contains `STEP 1: SEARCH / LIST` and `STEP 2: ACTIONS` in English alongside
`Novedad siempre visible (es independiente de las ordenes)` in Spanish. Across 512 unique
template comments only 137 carry Spanish diacritics. A rule the codebase contradicts is
unverifiable and unenforceable, so it is dropped for the same reason as `NgOptimizedImage`
and AXE/WCAG AA: we do not document conventions the project does not follow. **If the team
later wants to standardize template comment language, that is a separate change with its own
migration, not a rule appended to a documentation cleanup.**

**Alternatives considered**: Writing the matrix as a prose list or embedding it within other code conventions.
**Rationale**: The `AGENTS.md` prose itself is written in English because models read English rules more reliably. The matrix is a local convention that CANNOT be inferred from the code—which is exactly why it must be written down as a concrete table for instant recognition over recall.

### Decision: Stub Design for Claude and Gemini

**Choice**: 
- `GEMINI.md` and `CLAUDE.md` will contain explicit prose instructing the agent to read `AGENTS.md` before starting work.
- `GEMINI.md` will additionally use the `@AGENTS.md` import syntax.
- `CLAUDE.md` will NOT claim `@import` support.

**Alternatives considered**: Using empty files, files with only an `@import` statement, or assuming Claude Code supports `@import`.
**Rationale**: Both files require prose because a bare one-line mention can be trivially skipped. `GEMINI.md` uses `@import` because the installed Gemini CLI package supports it, making its pointer executable. `CLAUDE.md` omits `@import` because Claude Code is not installed on this machine, so support could not be verified; publishing an unverified rule is the exact failure mode this change aims to remove. This design prevents an agent from opening only the stub and never resolving the pointer.

## Conventions and Rule Wording

### Code-Forced Conventions

Conventions are strictly separated into "forced by the compiler or the framework" and "project convention chosen by this team", grounded in verified measurements:

**Forced by Compiler/Framework**:
- **Strict TypeScript**: The compiler enforces `strict: true`, `strictTemplates: true`, and `noPropertyAccessFromIndexSignature: true`.
- **Standalone Components over NgModules**: Forced by the framework architecture (0 `NgModule` references exist in production code).

**Project Conventions Chosen by Team**:
- **`inject()` over constructor injection**: 398 `inject()` calls vs 0 constructor injections.
- **Native control flow**: 824 `@if` vs 0 `*ngIf`.
- **Signals for state management**: 0 `.mutate()` calls observed.
- **`input()` over `@Input`**: 52 `input()` usages vs 0 `@Input`.
- **OnPush change detection**: Present in 119 of 132 components (90%).
- **Lazy loading**: 77 `loadComponent` usages vs 0 `loadChildren`.

### `standalone` Rule Wording

The exact text in `AGENTS.md` will be:
> Omit the `standalone` key from `@Component`; never write `standalone: false` (as the project has zero NgModules).

The exact text explicitly forbidding opportunistic cleanup will be:
> Do not opportunistically clean up legacy `standalone: true` occurrences inside unrelated changes. The migration is in progress.

There are no hard counts of occurrences in the rule text to prevent the documentation from rotting. The rule is self-contained.

### Test-Quality Warnings

The `AGENTS.md` file will include a warning:
> **Warning**: A green test suite is not an excuse to skip tests. New features need real tests. 
> The current test suite has quality traps: 22 of 94 spec files hold a single tautological test (7 of them literally named "should be created"); `kpi-card.component.spec.ts` asserts `expect(validTones).toHaveLength(6)` against an array that the same spec file defines; `consulta-planilla`, `users`, and `profile` features have zero tests; and `distribution` and `water-sources` have zero source files.

## Deletion Audit for `.github/copilot-instructions.md`

| Rule | Action | Reason |
|------|--------|--------|
| Strict TypeScript, `inject()`, native control flow | Salvaged | Valid, code-verified conventions. |
| `@HostListener` | Dropped | Measured at 7 occurrences. It is a valid, used pattern. Forbidding it contradicts the codebase. |
| `NgOptimizedImage` | Dropped | Measured at 0 occurrences. We do not document conventions the codebase does not follow. |
| AXE/WCAG AA | Dropped | Unactionable. There is no axe dependency or tooling in the repo for an agent to verify against. |
| "Must NOT set `standalone: true`" | Dropped | Actively wrong (86 occurrences exist, 46 omit, 0 false). |
| "Do NOT use `ngClass`" | Dropped | Actively wrong (49 usages exist). |
| "Prefer Reactive forms" | Dropped | Actively wrong (177 `ngModel` usages exist; template-driven dominates). |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `/AGENTS.md` | Create | The single source of truth for AI instructions. |
| `/CLAUDE.md` | Create | Robust pointer stub for Claude Code. |
| `/GEMINI.md` | Create | Robust pointer stub for Gemini CLI, using `@import`. |
| `/.github/copilot-instructions.md` | Delete | Obsolete file with contradictory rules. |

## Verification Plan

Because this change produces no runtime code, verification consists of read-only assertions:
- `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` exist at the repository root.
- `.github/copilot-instructions.md` does not exist.
- `AGENTS.md` contains all mandated sections in the exact order specified.
- The three dropped rules (`@HostListener`, `NgOptimizedImage`, AXE/WCAG AA) are absent.
- The `standalone` rule contains no hard occurrence counts.
- The language matrix table is present with the correct four rows.
- The quoted CI chain matches `.github/workflows/lint-format.yml` exactly.
- **Crucial**: A green test suite is NOT meaningful evidence for this change and must not be cited as such.

## Commit and Delivery Plan

- All four file operations will be committed in a **single atomic commit** so no commit in history leaves contradicting rules.
- The total change is estimated at ~255 changed lines, which is well within the 400-line review budget. This is one reviewable unit and must NOT be split into chained PRs.
- **Reviewer Rejection Rule**: A reviewer seeing legacy `standalone: true` occurrences modified in an unrelated PR should reject it. The `AGENTS.md` rule makes this rejection obvious.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.
