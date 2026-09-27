# Tasks: estandarizacion-de-workflow-sdd

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~255 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Not needed |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

**Important Justification**: The total change size is approximately 255 changed lines, well within the 400-line review budget. Furthermore, the design and spec strictly mandate a **single atomic commit** for all file operations (creations and deletion) so that no commit in history leaves contradicting rules. Therefore, this change **must NOT be split into chained PRs**, and any subsequent phase must respect this atomicity guarantee without second-guessing it.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | AI workflow documentation standardization | PR 1 | `git diff --cached --name-status` | N/A (no runtime code) | Complete single commit revert |

## Out of Scope (Hard Boundaries)

- No runtime code changes.
- No opportunistic `standalone` mass-fix of legacy occurrences.
- No new tests.
- No `gentle-ai install` in any scope.
- No unrelated documentation fixes.

## Phase 1: Implementation

- [x] 1.1 Create `AGENTS.md` at the repository root.
  - Follow the exact ordered section inventory from `openspec/changes/estandarizacion-de-workflow-sdd/design.md` (read-only).
  - Use the exact rule wording specified in `openspec/changes/estandarizacion-de-workflow-sdd/design.md` (read-only).
  - The language matrix MUST be exactly a 3-row table (Code in English, DTO/API in Spanish, UI copy in Spanish). Do NOT include a template comment language row.
  - Test-quality warnings must be present exactly as detailed in `openspec/changes/estandarizacion-de-workflow-sdd/spec.md` (read-only).
  - The `standalone` rule must state exactly: "omit the `standalone` key from `@Component`; never write `standalone: false`". It must forbid opportunistic cleanup and contain NO hard occurrence counts.
  - Do NOT reintroduce `@HostListener`, `NgOptimizedImage`, or AXE/WCAG AA rules.
  - Satisfies spec: "Root AGENTS.md exists as the single source of truth", "The standalone component rule is stated exactly", "Only measured conventions are stated as fact", "Test-quality warnings are present".
- [x] 1.2 Create `CLAUDE.md` at the repository root.
  - Content must be short prose pointing to `AGENTS.md`. Must NOT claim `@import` support.
  - Satisfies spec: "Robust pointer stubs for Claude and Gemini exist".
- [x] 1.3 Create `GEMINI.md` at the repository root.
  - Content must be short prose pointing to `AGENTS.md` AND include the `@AGENTS.md` import syntax.
  - Satisfies spec: "Robust pointer stubs for Claude and Gemini exist".
- [ ] 1.4 Delete `.github/copilot-instructions.md`.
  - Satisfies spec: "Obsolete copilot instructions".

## Phase 2: Verification

- [ ] 2.1 Run read-only verification plan.
  - Verify `AGENTS.md` (read-only), `CLAUDE.md` (read-only), and `GEMINI.md` (read-only) exist at the repository root.
  - Verify `.github/copilot-instructions.md` (read-only) does not exist.
  - Verify `AGENTS.md` (read-only) contains all mandated sections in the exact order specified.
  - Verify the three dropped rules (`@HostListener`, `NgOptimizedImage`, AXE/WCAG AA) are absent in `AGENTS.md` (read-only).
  - Verify the `standalone` rule in `AGENTS.md` (read-only) contains no hard occurrence counts.
  - Verify the language matrix in `AGENTS.md` (read-only) is exactly a three-row table and lacks template comment rules.
  - Verify the quoted CI chain in `AGENTS.md` (read-only) matches `.github/workflows/lint-format.yml` (read-only) exactly.
  - **Crucial**: A green test suite is NOT meaningful evidence for this documentation-only change and must not be cited as such.

## Phase 3: Delivery

- [ ] 3.1 Create the single atomic commit containing all four file operations.
  - Do NOT split into multiple commits.
  - Satisfies spec: "Atomic commit for documentation changes".
