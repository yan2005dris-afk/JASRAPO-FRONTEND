# Agent Instructions

<!-- Canonical spec bootstrapped from the archived change
     openspec/changes/archive/2026-09-27-estandarizacion-de-workflow-sdd/spec.md
     The 6 requirement bodies below are byte-identical to that delta. The
     delta REMOVED section was deliberately not carried over: it documented
     deleting a file, not a spec capability, so it has no canonical
     requirement to compose against. -->

## Requirements

### Requirement: Root AGENTS.md exists as the single source of truth

The system MUST contain an `AGENTS.md` file at the repository root. This file MUST be written in English prose and MUST contain the following individually verifiable sections:
- **Non-negotiables**: MUST state that `pnpm` is exclusively required. MUST state that `src/app/generated/` is gitignored so `pnpm gen:api` must run before compiling. MUST state to never hand-edit Orval output.
- **Local language matrix**: MUST contain a three-row table explicitly stating: code/identifiers/comments in English, DTO and API contract field names in Spanish, UI copy in Spanish. It MUST NOT contain a row prescribing template comment language — templates live in 115 separate `.html` files rather than inline, and comment language in this repository is measurably mixed (see the "Only measured conventions" requirement).
- **Code-forced conventions**: MUST document conventions genuinely forced by the codebase (e.g., Strict TypeScript, `inject()` over constructor injection). 
- **Test-quality traps**: MUST include specific warnings about the test suite (see test-quality requirement).
- **CI command chain**: MUST contain the exact CI command chain.
- **Commit conventions**: MUST contain commit conventions.
- **gentle-ai prohibition**: MUST explicitly forbid running `gentle-ai install --scope workspace` in this repository.

#### Scenario: Agent reads operational requirements

- GIVEN an agent begins work in the repository
- WHEN the agent reads `AGENTS.md`
- THEN the agent finds explicit instructions on package management, API generation, and language conventions.

### Requirement: The standalone component rule is stated exactly

The `AGENTS.md` file MUST state the `standalone` rule exactly as follows: omit the `standalone` key from `@Component`; never write `standalone: false` (as the project has zero NgModules). The rule MUST explicitly forbid opportunistically cleaning up legacy occurrences inside unrelated changes. The rule MUST state that the migration is in progress and MUST NOT pin a fragile hard count of occurrences.

#### Scenario: Agent creates a new component

- GIVEN an agent is creating a new Angular component
- WHEN generating the `@Component` decorator
- THEN the agent omits the `standalone` key entirely.

### Requirement: Only measured conventions are stated as fact

The `AGENTS.md` file MUST NOT contain the salvaged rules for `@HostListener`, `NgOptimizedImage`, and AXE/WCAG AA, and their absence MUST be maintained. The three were dropped for different reasons, which MUST NOT be conflated:

- `@HostListener` — dropped because it is measured at 7 occurrences and is a valid, used pattern. A rule forbidding it would contradict the codebase, and the modern `host` object alternative is not a project convention either.
- `NgOptimizedImage` — dropped because it has 0 occurrences. Do not document conventions the codebase does not follow.
- AXE/WCAG AA — dropped because there is no axe dependency and no WCAG reference in `docs/`, so the rule is unactionable: an agent cannot verify compliance with it.

#### Scenario: Agent reviews required conventions

- GIVEN an agent is reviewing `AGENTS.md`
- WHEN looking for image optimization or accessibility mandates
- THEN the agent does not find unactionable rules about `NgOptimizedImage` or AXE/WCAG AA.

### Requirement: Robust pointer stubs for Claude and Gemini exist

The system MUST contain `CLAUDE.md` and `GEMINI.md` at the repository root. Both files MUST be short and contain an explicit prose instruction to read `AGENTS.md` before starting work.
- `GEMINI.md` MUST additionally use the `@AGENTS.md` import syntax to degrade gracefully.
- `CLAUDE.md` MUST NOT claim `@import` support.

#### Scenario: Gemini CLI initializes

- GIVEN the Gemini CLI starts in the workspace
- WHEN it loads `GEMINI.md`
- THEN it executes the `@AGENTS.md` import to resolve the full instructions.

### Requirement: Test-quality warnings are present

The `AGENTS.md` file MUST warn that a green test suite proves little in this repository. It MUST cite the following measured evidence: 22 of 94 spec files hold a single tautological test, `kpi-card.component.spec.ts` asserts on an array defined within the spec itself, the `consulta-planilla`, `users`, and `profile` features have zero tests, and `distribution` and `water-sources` have zero source files. The section MUST explicitly state that new features need real tests.

#### Scenario: Agent evaluates test requirements

- GIVEN an agent is about to add a new feature
- WHEN checking testing expectations in `AGENTS.md`
- THEN the agent learns that existing green tests do not guarantee quality and that the new feature requires real tests.

### Requirement: Atomic commit for documentation changes

All four file operations (creation of `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`, plus the deletion of `.github/copilot-instructions.md`) MUST be committed in a single atomic commit so that no commit in history leaves contradicting rules.

#### Scenario: Repository history validation

- GIVEN the documentation changes are staged
- WHEN the changes are committed
- THEN all additions and the deletion appear together in exactly one commit.

