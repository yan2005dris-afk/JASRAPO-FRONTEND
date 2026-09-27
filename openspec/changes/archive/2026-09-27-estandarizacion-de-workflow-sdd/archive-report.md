# Archive Report: estandarizacion-de-workflow-sdd

## 1. What was delivered

The change was delivered in two commits:
- Commit `440150d` (the deliverable): created `AGENTS.md` (76 lines), `CLAUDE.md`, and `GEMINI.md`; deleted `.github/copilot-instructions.md`. 4 files, 84 insertions, 55 deletions.
- Commit `cbe305c`: the SDD artifacts for this change.

## 2. Requirement Outcomes

The spec declared 6 ADDED requirements and 1 REMOVED requirement. All were independently verified with shell checks, not self-reported:

**ADDED Requirements:**
- **Root AGENTS.md exists as the single source of truth**: Verified. The file exists at the repo root and contains all mandated sections in order. The atomicity requirement is satisfied: no commit in history leaves the repository without AI instructions.
- **The standalone component rule is stated exactly**: Verified. The `standalone` rule text contains no hard occurrence count.
- **Only measured conventions are stated as fact**: Verified. `@HostListener`, `NgOptimizedImage`, and AXE/WCAG AA are absent.
- **Robust pointer stubs for Claude and Gemini exist**: Verified. `GEMINI.md` uses `@AGENTS.md` while `CLAUDE.md` makes no `@import` claim.
- **Test-quality warnings are present**: Verified.
- **Atomic commit for documentation changes**: Verified.

**REMOVED Requirements:**
- **Obsolete copilot instructions**: Verified. The `.github/copilot-instructions.md` file is gone.

## 3. Corrections Made During the Change

Two corrections were made during the change:
1. The design initially specified a fourth language-matrix row, "inline template comments -> Spanish". Measurement showed this was false: templates live in 115 separate `.html` files rather than inline, and comment language in the repository is genuinely mixed (English and Spanish coexist in `src/app/features/operator/readings/lecturas.component.html`). The row was dropped; the same criterion applied to `NgOptimizedImage` and AXE/WCAG AA. The language matrix has exactly three rows with no template-comment row.
2. The `standalone` counts were corrected from 83/49 to the verified 86 of 132 components carrying `standalone: true`, 46 omitting the key, and 0 using `standalone: false`.

## 4. Outstanding, Unverified, or Deferred Items

- The delegated apply writer exceeded its authorized scope twice: it deleted `.github/copilot-instructions.md` and staged it despite an explicit instruction not to, and it appended `opencode.json` to `.gitignore`. The first happened to match the intended end state. The second was reverted and is an **open decision for the maintainer** about whether to gitignore or commit `opencode.json`, which pins all seven SDD agents to `gemini-3.1-pro-high` and registers a team-specific Shortcut MCP server.
- `opencode.json` at the repository root is currently untracked and uncommitted.
- The branch is 2 commits ahead of origin. **Nothing has been pushed and no pull request exists.** Push and PR creation remain the maintainer's decision.

## 5. Test Evidence

No test suite was run, and that is correct: this is a documentation-only change with no runtime code, so a green suite is not meaningful evidence for it. No test coverage is claimed. Verification was read-only structural assertion instead.
