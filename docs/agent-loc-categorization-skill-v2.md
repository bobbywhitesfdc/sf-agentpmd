---
name: agent-loc-categorization
version: 2.0
status: locked
locked_date: 2026-05-17
supersedes: 1.0
description: |
  A reproducible rule for categorizing lines of code in an Agentforce
  agent implementation (AgentScript + supporting Apex/Flow) into four
  categories: Scaffolding, Deterministic Logic, Reasoning Logic, and
  Conversation Surface.

  Use this skill whenever measuring or comparing agent implementations
  — particularly when comparing architectural postures (Prompt-Driven
  vs. Contract-Driven) or when producing artifacts (analyses,
  whitepapers, internal comparisons) where defensible LOC categorization
  matters.

  This skill does NOT compute cyclomatic complexity. CC is measured
  by the standard McCabe convention used in SonarQube/PMD/Checkstyle
  for the relevant language; see § 7 for how CC and this rule
  interoperate.

  v2.0 changes (from v1.0):
  - Split the prior "Business Logic" category into two: Deterministic
    Logic and Reasoning Logic, on the basis that they have fundamentally
    different risk profiles, tooling support, and cost models.
  - Introduced a temperature semantics for the four categories,
    reflecting the risk gradient from coldest (Scaffolding) to hottest
    (Reasoning Logic).
  - Added the canonical color palette for visualizations.
  - Folded in Apex-measurement clarifications surfaced during the
    GameTwo Phase 2 measurement (Logger/instrumentation, multi-line
    @InvocableVariable, static constants).
---

# Agent LOC Categorization — Rule v2.0

## Purpose

A whitepaper or analytical claim of the form *"these two agent architectures distribute risk differently, even when they do comparable amounts of work"* requires a counting rule that distinguishes high-risk code from low-risk code defensibly. This skill defines that rule.

The rule is designed to be:

- **Reproducible** — two people applying it to the same files should land on the same numbers (within a small margin attributable to edge-case judgment).
- **Defensible** — when challenged by a senior reviewer, the categorization can be justified from first principles rather than from convenience.
- **Consistent with standard practice** — comments and blank lines are excluded, in line with how mainstream static analyzers (SonarQube, PMD, Checkstyle) count code in Apex/Java/C#.
- **Risk-aware** — the categories map to a temperature gradient that reflects the actual risk profile of each kind of code.

## When to use this skill

Use whenever producing measurements that compare:

- Two implementations of the same agentic process (e.g., Prompt-Driven vs. Contract-Driven)
- An agent before and after a refactor
- An agent against a reference architecture
- Multiple candidate designs during architectural decision-making

Use whenever the measurement will appear in an artifact intended to be read by an external audience — whitepapers, blog posts, customer-facing comparisons, LinkedIn long-form articles, analyst briefings.

Do NOT use this skill for:

- Rough internal estimation where exact counts don't matter
- Performance profiling (this is a structural metric, not a runtime one)
- Code review for individual pull requests (use standard CC and lint tools for that)

## The organizing principle

The four categories follow from a refined version of the v1.0 principle, now sharpened by the deterministic / non-deterministic distinction:

> **Scaffolding** is code you'd write for *any* agent in this language.
> **Deterministic Logic** is what compiled code is being asked to do.
> **Reasoning Logic** is what the LLM is being asked to do.
> **Conversation Surface** is how the agent talks — to users *and* to itself.

When applying the rule, this principle is the tiebreaker. The two most important boundaries:

1. *Scaffolding vs. Logic.* Did this line have to be written, in this form, because of choices this implementation made? If yes → logic. If it would exist in any implementation of this kind of agent → scaffolding.

2. *Deterministic Logic vs. Reasoning Logic.* Is this code executed by a compiler (Apex, Flow) or evaluated by the LLM reasoning engine (the body of `instructions: ->`)? Pre/post deterministic blocks within AgentScript execute deterministically and count as Deterministic Logic, even though they live in the agent file.

If neither — if the line shapes how the system talks rather than what it does — it's Conversation Surface.

---

## § 1 — The temperature gradient

The four categories sit on a risk gradient. Visualizations should reinforce this with color temperature.

| Temperature | Category | What it is | Risk profile |
|---|---|---|---|
| Cold | **Scaffolding** | Plumbing every agent needs | Compiler catches mistakes; mechanical |
| Cool | **Deterministic Logic** | Compiled code that runs the same way every time | Static analysis catches bugs; tests cover branches; failures are reproducible |
| Warm | **Conversation Surface** | LLM-facing or user-facing text | Failures usually visible; "looks wrong" not "computes wrong" |
| Hot | **Reasoning Logic** | Code the LLM evaluates as instructions | No static analysis; no unit tests; non-deterministic; model-version-dependent; the surface where production incidents come from |

### Canonical color palette

For all visualizations:

| Category | Hex | Description |
|---|---|---|
| Scaffolding | `#9aa5ad` | Cool gray, medium-light |
| Deterministic Logic | `#6b8c52` | Forest green, medium |
| Conversation Surface | `#c4942a` | Amber, medium-dark |
| Reasoning Logic | `#a82820` | Deep red, dark |

These four colors satisfy:
- Distinct hue (each occupies a different position on the color wheel)
- Distinct value (light-to-dark progression matching the temperature)
- Grayscale-distinguishable (a colorblind reader or a printed-in-grayscale handout retains the hierarchy)

Background tints (for use in tables, code blocks, etc.) should be created by lightening these to ~85% L for legibility.

---

## § 2 — Scaffolding

Code that exists to make the agent runnable, structurally valid, or framework-compliant. The plumbing every agent of this kind needs.

### Counted as scaffolding

**In `.agent` files:**

- Top-level structural keywords: `system:`, `config:`, `language:`, `variables:`, `actions:`, `reasoning:`, `start_agent <name>:`
- Variable declarations (e.g., `player_wins: mutable number = 0`) and their immediately-following `description:` lines
- The `messages:` keyword itself (not its content)
- Inside `config:`: `developer_name`, `agent_label`, `description` (of the agent as a whole), `agent_type`
- Inside `language:`: `default_locale`, `additional_locales`, `all_additional_locales`
- Action contract metadata: the action name, `target:`, `label:`, `description:`
- Action `inputs:` and `outputs:` keyword headers and the typed parameter declarations plus their metadata (`description:`, `label:`, `is_required:`, `is_displayable:`, `filter_from_agent:`)
- The `actions:` keyword inside a `reasoning:` block
- Action-contract `with X = ...` lines where `...` is LLM-fillable (not live-wired)

**In Apex files:**

- Class declaration line, `public`/`global` modifiers, `with sharing` clauses
- `import` statements
- `@InvocableMethod`, `@InvocableVariable`, `@AuraEnabled`, and similar annotations (including their multi-line `label='...'` / `description='...'` / `required=...` content)
- Pure-type inner classes (request/response DTOs that contain only `@InvocableVariable` field declarations and no methods)
- Field declarations inside DTOs
- Class-level static constants (e.g., `private static final List<String> CHOICES = ...`) — data tables, not logic
- Logger / instrumentation calls (`Logger.debug()`, `Logger.error()`, `Logger.saveLog()`) and the `try`/`catch`/`finally` wrappers that exist to support them
- Helpers that exist purely to serve instrumentation (e.g., `abbreviate()` for log readability)

---

## § 3 — Deterministic Logic

Code that exists because of architectural choices this implementation made, AND that executes deterministically — meaning the same inputs produce the same outputs every time, the behavior is reproducible, and standard static analysis or testing tooling can verify it.

### Counted as Deterministic Logic

**In `.agent` files:**

- Pre/post deterministic blocks (`before_reasoning:`, `after_reasoning:`): every conditional, set, and computation inside them
- Inside the reasoning `actions:` block: `with X = @variables.Y` lines (live variable wiring) and `set @variables.X = @outputs.Y` lines (return-value handling). These wire live state into action invocations and out of them, executing deterministically regardless of LLM behavior.

**In Apex files:**

- Method declarations (signature lines) of methods that implement domain rules, including the `@InvocableMethod`-annotated entry point
- Method bodies of all non-pure-DTO methods, including:
    - Conditionals and their bodies
    - Loops
    - Variable declarations inside methods
    - Arithmetic, string operations, comparisons
    - `try`/`catch` blocks that exist for domain reasons (not instrumentation)
    - `return` statements
- Helper methods that exist because of architectural choices, including platform-accommodation helpers (`parseCount`, `freshCookie`, etc.)

**In Flow files** (forward-looking — see § 9):

- Decision elements and their criteria
- Loop elements
- Assignment elements (variable mutations)
- Subflow invocations with live data flow
- Fault paths that handle domain-specific failures (not generic logging)

---

## § 4 — Reasoning Logic

Code that lives inside an `instructions: ->` block in the agent file. This is the body the LLM reasoning engine reads and evaluates as natural-language-augmented instructions on every relevant turn.

### Counted as Reasoning Logic

Inside `instructions: ->`:

- Every conditional and its predicate
- Every `set @variables.X = ...` statement
- Every `run @actions.X` invocation
- Every `with parameter = value` binding line inside a `run` invocation
- Every `set @variables.X = @outputs.Y` line following a `run` invocation (return-value binding from within the instructions body)

### Why this distinction matters

A reader of v1.0 might ask: aren't the conditionals in `instructions: ->` literally the same syntax as conditionals in `before_reasoning:`? Why split them?

Because they execute differently:
- `instructions: ->` is *read by the LLM* as part of the prompt. The LLM evaluates the conditions against context. The LLM produces the side-effects. The execution is non-deterministic, model-version-dependent, and consumes tokens on every invocation.
- `before_reasoning:` and `after_reasoning:` blocks are executed by the platform's deterministic interpreter. Same inputs, same outputs, no LLM in the path.

The line is the same syntactically. The execution model is fundamentally different. v1.0 collapsed this; v2.0 splits it.

---

## § 5 — Conversation Surface

How the agent talks — to its human users and to its own LLM. The verbal and behavioral surface that shapes the interaction.

### Counted as Conversation Surface

**In `.agent` files:**

- Every pipe-emit line (any line beginning with `|`) — these are the things the agent says
- The content of `welcome:` and `error:` messages inside `messages:` (the strings, not the keys)
- The `instructions:` string immediately under `system:` (the agent's overall persona and behavioral framing)
- The `label:` and `description:` lines on `start_agent` and on topics within an agent (LLM-facing routing hints)
- Operating-rules and anti-fabrication blocks (multi-line `|` blocks that instruct the LLM about tool-calling discipline, what to refuse, what not to fabricate)

**In Apex files:**

- String literals that are returned to the agent for relay to the user (if the action returns formatted narrative rather than structured data)
- Any prompt-template strings constructed inside Apex (rare)

---

## § 6 — Excluded From the Count

Consistent with standard practice in Apex/Java static analyzers (SonarQube, PMD, Checkstyle):

- **Comments** — single-line (`#`, `//`) and multi-line (`/* */`)
- **Blank lines** — including whitespace-only lines

Excluding these keeps the measurement reproducible by anyone running a standard tool over the same files.

---

## § 7 — Cyclomatic Complexity

This rule governs LOC categorization. It does not govern CC.

Cyclomatic complexity is measured by the standard McCabe convention used in mainstream Java/Apex static analyzers (SonarQube, PMD, Checkstyle):

- Start with 1 (base path)
- Add 1 for each: `if`, `else if`, ternary (`?:`), `case` label, `for`, `while`, `do-while`, `catch`, and each short-circuit operator (`&&`, `||`, `and`, `or`)
- Do NOT count: `else`, `default`, `finally`, `try` itself

CC is reported:

- **Total per architecture** (the by-the-book number a SonarQube run would produce)
- **By location** (agent-script CC vs. Apex CC) — this is where the architectural argument typically lives

CC is **not** subdivided by the four LOC categories. The rule and the metric serve different purposes and stay independent. If CC is recategorized, it stops being CC.

---

## § 8 — Application Procedure

When measuring a pair of agent files:

1. **Read all files end-to-end** before classifying anything. The pattern across the architectures matters.
2. **Apply categories to every non-comment, non-blank line.** Each line gets exactly one category.
3. **For ambiguous lines, apply the organizing principle.** Most ambiguity is at the scaffolding/logic boundary or the deterministic/reasoning boundary.
4. **Document ambiguous lines.** If a line genuinely required judgment, note it. The whitepaper should be able to defend any ambiguous call.
5. **Tally per category, per file, per architecture.** Present:
    - LOC counts in each of the four categories
    - LOC counts by source file
    - Total LOC (sum of all four categories, excluding comments/blanks)
6. **Consistency check.** A single person should perform the measurement on both architectures in one sitting. If split, do a calibration pass on 20 sample lines first.

---

## § 9 — Flow as a Measurable Surface (Forward-Looking)

The rule as written handles AgentScript and Apex. Flow remains to be incorporated formally. Open questions:

- **Flow's "LOC analog."** Lines aren't the right unit. Elements (decision elements, assignment elements, loop elements, subflows, screen flows) are more appropriate, possibly with weighting.
- **Flow's CC analog.** McCabe maps reasonably onto Flow's decision and loop elements; prior art in BPMN complexity metrics is translatable.
- **Posture coverage.** A Contract-Driven agent using Flow as its deterministic substrate has a different measurement profile than one using Apex. Both should be supported.
- **Mixed-substrate architectures.** Real agents commonly use both Apex and Flow. The rule should handle the combination.

A Phase 1.5 measurement rule extension for Flow is scoped as future work; the current GameTwo whitepaper does not exercise Flow.

---

## § 10 — Future Evolution

Anticipated revision paths beyond v2.0:

- **Translation to a parser.** A PMD-style static analyzer for AgentScript could mechanically apply this rule, producing category counts as build-time output. This is the default-out treatment applied to the methodology itself — the rule is the contract; the implementation is interchangeable.
- **Flow incorporation** (see § 9).
- **Test code categorization.** If test code is included in future measurements, it likely warrants its own category or sub-categorization within scaffolding.

Rule revisions are versioned. Any change bumps the version. Artifacts citing this rule should cite the version (e.g., "categorized per AgentForcePMD LOC Rule v2.0").

---

## § 11 — Provenance

This rule emerged from the GameTwo spike (May 2026), specifically from the architectural cost analysis comparing `GameTwo_Simple.agent` (Prompt-Driven posture) and `GameTwo_Out_Simple.agent` (Contract-Driven posture).

v1.0 lock: 2026-05-17 (three-category)
v2.0 lock: 2026-05-17 (four-category, post-Apex-measurement refinement)

The split of Business Logic into Deterministic and Reasoning was driven by the observation that the framework's central architectural argument is about the risk difference between these two kinds of work. A categorization that collapsed them required the reader to do mental translation work; the four-category split lets the framework's terminology align with its argument.
