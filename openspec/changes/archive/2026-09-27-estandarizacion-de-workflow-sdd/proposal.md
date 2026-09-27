# Proposal: estandarizacion-de-workflow-sdd

## Intent

An agent opening this repository today gets either nothing (no `AGENTS.md`) or actively wrong rules (from the obsolete `.github/copilot-instructions.md`), and misses critical operational knowledge that actually blocks work. For example, `src/app/generated/` is gitignored so `pnpm gen:api` must run before compiling; pnpm is exclusively required; the exact CI chain must be followed; and E2E requires a real backend at `127.0.0.1:3000` with a 5-logins/minute rate limit. We need a single, correct, and code-verified source of truth (`AGENTS.md`) and robust pointer stubs for agents that look for specific file names.

## Scope

### In Scope
- Create a new `AGENTS.md` at the repository root as the single source of truth for AI instructions.
- Document the pnpm requirement, API generation step, CI command chain, test quality traps, and the E2E backend dependency.
- Include the project's local language matrix as a table: code (identifiers, logic, comments) in English, DTO/API contract field names in Spanish, UI copy in Spanish. The `AGENTS.md` prose itself is English, because models read it better. The matrix goes in as a table because it is a local convention that cannot be inferred from the code. A row prescribing template comment language was considered and rejected: templates are 115 separate `.html` files, not inline, and comment language in the repository is measurably mixed, so such a rule would be unenforceable.
- Define the correct `standalone` component rule: omit the key, never write `standalone: false`, and explicitly forbid opportunistic cleanup of the legacy occurrences.
- Create robust pointer stubs (`CLAUDE.md` and `GEMINI.md`) that explicitly direct the agent to read `AGENTS.md`.
- Delete the obsolete `.github/copilot-instructions.md`.

### Out of Scope
- No runtime code changes.
- No unrelated documentation-drift fixes.
- No mass-fix of the legacy `standalone: true` occurrences (currently in 86 of 132 components across `src/app/features/` and `src/app/shared/`; 46 omit the key and 0 use `standalone: false`).
- No new test coverage.
- No running `gentle-ai install` in any scope.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

We will execute this change atomically in a single commit containing all three new files plus the `.github/copilot-instructions.md` deletion. This ensures no commit in history leaves contradicting rules.

**Documentation Judgements on Salvaged Rules:**
- **`@HostListener`**: Removed from AI rules. There are 7 occurrences in the codebase. It is a valid pattern and not banned.
- **`NgOptimizedImage`**: Removed from AI rules. There are 0 occurrences. We will not document non-existent conventions.
- **AXE/WCAG AA**: Removed from AI rules. While it may be a product goal, there is no axe dependency or tooling in the repo for an agent to verify against, making the rule unactionable for AI.

**Test Quality Warnings:**
`AGENTS.md` will explicitly warn that a green test suite proves little in this repo (e.g., 22/94 spec files have only "should be created" tautologies, some assert on self-defined data, and several features lack tests). Agents will be instructed that new features need real tests.

**Stub Robustness:**
`CLAUDE.md` and `GEMINI.md` will not just be empty files. They will contain prose explicitly instructing the agent to read `AGENTS.md` before starting work. `GEMINI.md` will also include the `@AGENTS.md` import syntax to make the pointer executable for the Gemini CLI. This ensures the stub cannot be trivially ignored by an agent.

**Size Estimate:**
The change is estimated at approximately 200 lines added and 55 lines removed (255 changed lines). This comfortably fits within the 400-line review budget and will be delivered as one reviewable unit (a single atomic commit).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `AGENTS.md` | New | Single source of truth for AI instructions. |
| `CLAUDE.md` | New | Pointer stub for Claude Code. |
| `GEMINI.md` | New | Pointer stub for Gemini CLI. |
| `.github/copilot-instructions.md` | Removed | Obsolete and contradictory rules. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stub ignorance by agent | Low | Stubs use explicit prose and tool-specific syntax (e.g., `@AGENTS.md`) to force resolution. |
| gentle-ai workspace-scope collision | Low | `AGENTS.md` explicitly prohibits running `gentle-ai install --scope workspace` in this repo. |

## Rollback Plan

Revert the single commit. Since there are no runtime code changes, a git revert carries zero risk of breaking the application or deployment pipeline.

## Dependencies

- None

## Success Criteria

- [ ] `AGENTS.md` exists and contains correct, code-verified rules.
- [ ] `CLAUDE.md` and `GEMINI.md` exist and robustly point to `AGENTS.md`.
- [ ] `.github/copilot-instructions.md` is deleted.
- [ ] All changes are contained within a single atomic commit.
