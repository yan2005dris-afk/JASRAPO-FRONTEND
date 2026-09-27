# Exploration: estandarizacion-de-workflow-sdd

## Measurement provenance

Every count in this document was verified by the orchestrator against
`src/` excluding `src/app/generated/` and excluding `*.spec.ts`, unless a
different scope is stated inline. Counts are **production code only** —
test files are never included in a convention figure, because a
convention document must describe what application code looks like.

Where a claim comes from documentation rather than code, it is labelled
**documented, not code-verified**. Do not promote a documented claim into a
measured one.

## Current State

The repository currently has **no** `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` at the root. The only AI instruction file is `.github/copilot-instructions.md` (55 lines), which contains several rules that contradict the actual codebase:

| Copilot Rule | Reality (measured) |
|--------------|-------------------|
| "Must NOT set `standalone: true`" | 83 of 132 components declare `standalone: true`; 0 declare `standalone: false`; 49 omit the key entirely |
| "Do NOT use `ngClass`" | 49 usages (48 in `.html` templates, 1 in an inline template) |
| "Do NOT use `ngStyle`" | 0 usages (this rule is vacuously true) |
| "Prefer Reactive forms instead of Template-driven ones" | 177 `ngModel` usages (166 in `.html`, 11 in inline templates) — template-driven dominates |
| "Use `input()` and `output()` functions instead of decorators" | 52 `input()` usages, 0 `output()` usages |

The copilot file also omits critical operational knowledge:
- `src/app/generated/` is gitignored; `pnpm gen:api` must run before compiling
- pnpm-only (engines enforce `pnpm >= 12.3.4`, `npm >= 999.0.0`)
- Exact CI chain: `pnpm run format:check && pnpm run lint && pnpm run build && pnpm test` + `pnpm audit --prod --audit-level=high` + Docker build smoke test
- No commit hooks exist
- E2E requires backend at `127.0.0.1:3000` with 5 logins/min rate limit
- Test quality issues: 22/94 spec files have only `should be created` tautologies; `kpi-card.component.spec.ts` asserts on self-defined data; 3 features have zero tests; 2 features have zero source files

**Agent filename resolution (verified):**
- **Codex**: loads `AGENTS.md` natively — no stub needed
- **Claude Code**: reads `CLAUDE.md` ONLY; does NOT auto-load `AGENTS.md` (open issue anthropics/claude-code#34235)
- **Gemini CLI**: default `contextFileName` is `GEMINI.md`; `AGENTS.md` silently not loaded (google-gemini/gemini-cli#28227); 227 `GEMINI.md` refs vs 1 `AGENTS.md` in installed package

**gentle-ai workspace-scope collision resolved:** gentle-ai 3.7.0 manages `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` via delimiter-bounded regions with ownership tracking and pre-write snapshots. **Operational rule: never run `gentle-ai install --scope workspace` in this repo.** Global scope already covers the project.

**Language matrix (local convention, cannot be inferred from code):**
| Layer | Language |
|-------|----------|
| Code (identifiers, logic, comments) | English |
| DTO / API contract field names | Spanish |
| UI copy (user-facing strings) | Spanish |
| Inline comments in templates | Spanish |

## Affected Areas

Paths are relative to the repository root.

- `AGENTS.md` — **new**, single source of truth
- `CLAUDE.md` — **new**, one-line pointer stub
- `GEMINI.md` — **new**, one-line pointer stub
- `.github/copilot-instructions.md` — **delete**, obsolete

## Approaches

### 1. Single commit: create three files + delete copilot (RECOMMENDED)
- **Description**: One atomic commit adds `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` and deletes `.github/copilot-instructions.md`
- **Pros**: No commit in history leaves contradicting rules; reviewers see the full transition; git blame on new files points to the intentional change
- **Cons**: Larger diff (~200 lines added, 55 removed); but all three files are simple
- **Effort**: Low

### 2. Split commits: AGENTS.md first, then stubs, then delete
- **Description**: Separate commits for each artifact
- **Pros**: Smaller individual diffs
- **Cons**: Intermediate commits leave the repo with contradicting rules (copilot says one thing, AGENTS.md says another); reviewers must mentally stack the changes
- **Effort**: Low

### 3. Keep copilot + add AGENTS.md (rejected by user)
- **Description**: Delta design where both files coexist
- **Pros**: None — user explicitly rejected this
- **Cons**: Two sources cannot be resolved by weaker agents; copilot rules are actively wrong
- **Effort**: N/A

## Recommendation

**Approach 1 (single commit)** is correct. The three new files are small and related; the deletion is the cleanup. Keeping them atomic prevents any window where an agent could read contradicting instructions.

### Exact stub wording

**CLAUDE.md** (2 lines):
```markdown
# AI Instructions
Before starting work, read and follow AGENTS.md in this repository root.
```

**GEMINI.md** (2 lines):
```markdown
# AI Instructions
Before starting work, read and follow AGENTS.md in this repository root. @AGENTS.md
```
*Rationale*: Gemini CLI supports `@file.md` import syntax; adding it makes the pointer executable, not just documentary. Prose fallback works if import syntax changes.

## Salvage from copilot-instructions.md

#### The `standalone` reality (corrected — this is load-bearing)

The earlier claim of "86/86, 100% consistent" was **wrong**. Verified state:

| Pattern | Count | Share of 132 |
|---------|-------|--------------|
| `standalone: true` (legacy scaffold) | 83 | 63% |
| key omitted entirely (modern style) | 49 | 37% |
| `standalone: false` | 0 | 0% |

The migration is **in progress, not complete**:

| Area | with key | without key |
|------|-----------|-------------|
| `features/` | 67 | 39 |
| `shared/`  | 16 | 12 |

This strengthens the rule rather than weakening it. The 49 components that
omit the key prove the target convention is already in real use — they are
not hypothetical. The 83 that carry it are legacy scaffold, and nobody
chooses `standalone: true` by hand because Angular has defaulted standalone
since v19 and emits the key only for backward compatibility.

The rule is therefore: **omit the key; never write `standalone: false`.**
New code follows the 49. The trailing clause must explicitly forbid
opportunistically "fixing" the 83 inside unrelated changes, because an agent
that sees 63% inconsistency will otherwise feel obliged to sweep it.

#### Keep (code-verified, from copilot-instructions.md)

Each item below was re-measured. Claims that could not be verified in code
are moved to the separate documented list.

- Strict TypeScript — compiler enforces `strict`, `strictTemplates`, `noPropertyAccessFromIndexSignature` (code-verified)
- Standalone components over NgModules — 0 `NgModule` references in production code (code-verified)
- Signals for state management, `update`/`set` over `mutate` — 0 `.mutate(` calls (code-verified)
- Lazy loading for feature routes via `loadComponent` — 77 `loadComponent` uses, 0 `loadChildren`; `app.routes.ts` uses dynamic `import()` throughout (code-verified)
- `inject()` over constructor injection — 398 `inject()` calls, 0 constructor injection (code-verified)
- Native control flow `@if`/`@for`/`@switch` — 824 `@if`, 0 `*ngIf` (code-verified)
- `input()` over `@Input` decorators — 52 `input()` vs 0 `@Input` (code-verified)
- OnPush change detection — 119 of 132 components (90%) (code-verified)

#### Discard (contradicted by codebase)

- "Must NOT set `standalone: true`" — inverted. 83 components carry it as legacy scaffold; the correct rule is to omit the key.
- "Do NOT use `ngClass`" — 49 usages. `class` bindings are preferred, but `ngClass` is not banned.
- "Prefer Reactive forms" — 177 `ngModel` proves template-driven dominates. Both coexist.
- "Do NOT use `ngStyle`" — 0 usages. Vacuously true, but stating a rule for a pattern nobody uses is noise.

#### Documented, not code-verified — do not present as observed

These came from documentation, not from the code. They may still be worth
keeping, but the final document must not claim the codebase demonstrates them.

- `@HostListener` — **7 occurrences**, so the copilot claim of "0 occurrences"
  is false. The rule is not "never use it"; it is simply not a project convention.
- `NgOptimizedImage` for static images — **0 occurrences**. There is no image
  optimization convention in this codebase today. Either drop the rule or
  reframe it as a forward-looking recommendation, clearly labelled as such.
- Accessibility via AXE and WCAG AA — documented requirement, not code-verified.
  No axe dependency was confirmed in `package.json`.

**Missing from copilot (must add to AGENTS.md):**
- pnpm only (engines enforce it)
- `src/app/generated/` gitignored → `pnpm gen:api` before compile
- Never hand-edit Orval output
- Language matrix table
- Conventional commits, no hooks
- Exact CI command chain
- Test quality traps (tautologies, self-asserting specs, uncovered features)
- E2E backend dependency + rate limit
- Standalone flag rule: omit entirely, never write `standalone: false`
- Gentle-ai workspace-scope prohibition

## Open Questions for User

None. All product decisions are settled:
1. Single source `AGENTS.md` — confirmed
2. Stub filenames per agent — verified against installed packages and upstream issues
3. Standalone flag rule — resolved with Angular 21.2.20 reality
4. Gentle-ai collision — resolved via binary inspection
5. OpenSpec vs gentle-ai — clarified, not adopting standalone CLI
6. Language of doc — English (models read it better), local matrix as table
7. Copilot deletion — confirmed, team doesn't use it

## Ordering and Commit Strategy

**Single commit** containing:
1. `AGENTS.md` (new, ~150 lines)
2. `CLAUDE.md` (new, 2 lines)
3. `GEMINI.md` (new, 2 lines)
4. Delete `.github/copilot-instructions.md`

Commit message:
```
chore: standardize AI agent workflow with AGENTS.md as single source

- Add root AGENTS.md with non-negotiables, language matrix, forced conventions,
  test-quality traps, CI chain, commit rules, and gentle-ai workspace prohibition
- Add CLAUDE.md stub pointing to AGENTS.md (Claude Code reads CLAUDE.md only)
- Add GEMINI.md stub with @AGENTS.md import (Gemini CLI defaults to GEMINI.md)
- Remove .github/copilot-instructions.md (obsolete, contradicts codebase)

No functional code changes. Instructions only.
```

## Risks

1. **Stub effectiveness**: If Claude Code or Gemini CLI changes their file resolution, stubs may need updates. Mitigation: stubs are trivial to fix.
2. **gentle-ai future versions**: If gentle-ai changes its managed-file list or workspace-scope behavior, the prohibition may need revisiting. Mitigation: documented in AGENTS.md with version context.
3. **Team adoption**: Agents only follow instructions they actually load. Verified filename matrix reduces this risk.
4. **Copilot deletion loss**: No team member uses Copilot; the file was dead weight. Zero risk.

## Ready for Proposal

Yes. The exploration is complete. The orchestrator should proceed to the proposal phase with the above analysis.