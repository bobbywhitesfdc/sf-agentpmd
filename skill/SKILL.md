---
name: agentforcepmd
description: Use this skill whenever working with the sf-agentpmd SF CLI plugin — discovering its commands, installing or upgrading it, running it against an Agentforce / AgentScript project, or interpreting its text / JSON / Markdown / SARIF / CSV outputs. Triggers on mentions of `sf agentpmd`, "AgentScript cyclomatic complexity", "Agent CC", "McCabe analysis of .agent files", "agent PMD", or any request to compute or report complexity / action-reference inventory for AgentScript bundles and the Apex backing logic they invoke.
metadata:
  type: skill
  version: "0.1.0"
  last_updated: "2026-05-19"
---

# sf-agentpmd

`sf-agentpmd` is an SF CLI plugin that computes **standard McCabe
cyclomatic complexity** for AgentScript (`.agent`) bundles and the Apex
classes they invoke through `apex://` action targets. It also inventories
action declarations and references, and emits a "CC by location"
roll-up (AgentScript vs. Apex vs. Combined) suitable for posture analysis
or static-analysis CI gates.

## What it does at a glance

- Walks every `.agent` file under a source directory (or auto-discovers
  `sfdx-project.json` and uses its `packageDirectories`).
- For each `before_reasoning:`, `after_reasoning:`, and
  `reasoning.instructions:` block, computes McCabe CC.
- For each `actions:` declaration, classifies the `target:` URI
  (`apex://`, `flow://`, `prompt://`).
- For every `apex://ClassName` target, resolves the `.cls` file and
  computes per-method McCabe CC with the same convention SonarQube / PMD
  use for Apex.
- Renders the result as **text** (TTY-aware), **JSON** (SF CLI envelope),
  **markdown** (with a Mermaid by-location chart), **SARIF** (for GitHub
  Code Scanning), or **CSV** (for spreadsheet pivots).

## Task domains

Identify which of the four common questions the user is asking and read
the matching reference file before answering.

### "What commands does this plugin offer?"

Read [`references/command-structure.md`](references/command-structure.md).
Covers the topic / command tree, every flag, defaults, and short aliases.

### "How do I install it?"

Read [`references/install.md`](references/install.md). Covers both:
- **Today (pre-publication):** clone + `npm install` + `npm run build` +
  `sf plugins link`.
- **Future (after npm publish):** `sf plugins install sf-agentpmd`.

### "How do I upgrade it?"

Read [`references/upgrade.md`](references/upgrade.md). Covers the
linked-checkout refresh path (`git pull && npm run build`) and the
published-plugin path (`sf plugins update` or
`sf plugins install <name>@latest`).

### "How do I make sense of the output?"

Read [`references/output-formats.md`](references/output-formats.md).
Covers every format the plugin emits, what each column / field means,
how to read the "CC by location" roll-up, and which format to pick for
which downstream consumer (terminal, PR comment, CI gate, spreadsheet).

## Rules that always apply

1. **Always include `--json`** when programmatically consuming output
   (CI, follow-on `jq` pipelines, another plugin). Non-JSON formats are
   for humans.
2. **Prefer auto-discovery.** When run from inside an sfdx project,
   omit `--source-dir`. The plugin will walk up to `sfdx-project.json`
   and use its `packageDirectories`. Print the resolved root from the
   header line to confirm.
3. **Apex CC follow-through happens for free.** Any `apex://` target
   referenced by an analyzed `.agent` file resolves to a sibling
   `classes/<ClassName>.cls` and gets walked automatically — no flag
   needed. Override with `--apex-source <dir>` only when the layout
   differs from the standard sfdx convention.
4. **`--fail-on N` thresholds on combined CC** (agent + Apex), not
   agent-only. This is intentional for CI gates: a posture that pushes
   complexity from AgentScript into Apex shouldn't slip past the gate.

## Common workflows

| You want to… | Run |
| --- | --- |
| Inspect a whole sfdx project | `sf agentpmd analyze` (inside the project) |
| Inspect a specific bundle | `sf agentpmd analyze -n <DeveloperName>` |
| Generate a PR / whitepaper appendix | `sf agentpmd analyze --format markdown > report.md` |
| Gate a PR in CI | `sf agentpmd analyze --format sarif > out.sarif` (upload to Code Scanning) or `--fail-on 50` |
| Pipe into another sf tool | `sf agentpmd analyze --json \| jq '.result.apexClasses[].classComplexity'` |

## When *not* to use this plugin

- **General Apex static analysis.** That's PMD / sfdx-scanner /
  `@salesforce/code-analyzer`. sf-agentpmd's Apex pass only walks classes
  reachable via `apex://` targets from an `.agent` file.
- **Old Bot Builder XML or GenAiPlannerBundle XML.** Currently unsupported
  (see the project's `TODO.md`). The plugin will skip them silently and
  may dramatically under-report the implementation surface of agents
  that store actions in a sibling planner bundle.
- **Flow CC.** Not implemented; tracked in `TODO.md` § 9 / Flow
  incorporation.
