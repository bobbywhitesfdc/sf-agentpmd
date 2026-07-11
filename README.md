# sf-agentpmd

SF CLI plugin that computes **standard McCabe cyclomatic complexity** for
[AgentScript](https://github.com/salesforce/agentscript) (`.agent`) files,
along with an inventory of declared and referenced agent actions.

The intent (per `docs/agent-loc-categorization-skill-v2.md` § 7) is the
by-the-book number a SonarQube / PMD / Checkstyle run would produce — but
applied to the AgentScript surface that those tools don't cover today.

## Install

```bash
sf plugins trust allowlist add -n sf-agentpmd
sf plugins install sf-agentpmd
```

Then activate the bundled Claude Code skill (optional):

```bash
sf agentpmd install-skill
```

See [install details and troubleshooting](#install-details) below.

## Current scope (v2)

`sf agentpmd analyze [--source-dir <dir|file>] [--apex-source <dir>] [--fail-on N]`

If `--source-dir` is omitted, the plugin walks up from cwd looking for
`sfdx-project.json` and uses its `packageDirectories` as the source roots.
Run it from anywhere inside an sfdx project and it just works.

- Walks every `.agent` file under the resolved source roots.
- For each `before_reasoning:`, `after_reasoning:`, and
  `reasoning.instructions:` block, computes McCabe CC:

  ```
  CC = 1
     + count(if_statement)
     + count(elif_clause)
     + count(ternary_expression)
     + count(binary_expression where operator ∈ {and, or})
  ```

- Reports CC per procedure, per scope (`topic` / `start_agent` / `subagent`),
  per file, and a total across files.
- Collects all `actions:` declarations and classifies their `target:` URI
  (`apex://`, `flow://`, `prompt://`, …).
- Counts how many times each declared action is referenced from
  `reasoning.actions`, `reasoning.instructions`, `before_reasoning`,
  `after_reasoning`, and `transition` statements.
- For every `apex://ClassName` target, resolves the `.cls` file by walking
  up from the `.agent` location looking for a sibling `classes/` directory
  (or honors `--apex-source <dir>`), parses it with
  `@apexdevtools/apex-parser`, and computes per-method McCabe CC for every
  method and constructor with a body:

  ```
  CC = 1
     + count(if)
     + count(for)         // includes enhanced-for
     + count(while)
     + count(do-while)
     + count(when arm)    // each switch `when X { ... }`; `when else` excluded
     + count(catch)
     + count(ternary ?:)
     + count(&&)
     + count(||)
  ```

- Emits a **CC by location** rollup (AgentScript vs. Apex vs. Combined),
  matching the whitepaper § 7 framing.

### Flags

| Flag | Purpose |
| --- | --- |
| `-d, --source-dir <path>` | Directory or single `.agent` file. Optional. Defaults to the `packageDirectories` of the nearest `sfdx-project.json`. |
| `-n, --api-name <X>` | Filter to a specific bundle. Matches the bundle directory name **or** `config.developer_name:` inside the `.agent`. Repeat for multiple bundles. |
| `--apex-source <path>` | Override directory for resolving `apex://` targets. Default: walk up from each `.agent` looking for a `classes/` sibling. |
| `--format <fmt>` | Non-JSON output format: `text` (default), `markdown`, `sarif`, `csv`. Ignored when `--json` is set. |
| `--width <N>` | Rule width for the text renderer. Default 60. |
| `--ascii` | Force ASCII-only output in the text renderer (no emoji / box chars). Auto-enabled on non-TTY stdout. |
| `--no-color` | Disable ANSI color. `NO_COLOR` env var also disables. |
| `--sarif-warning <N>` / `--sarif-error <N>` | Override the SARIF level thresholds. Defaults 10 / 20. |
| `--fail-on <N>` | Exit non-zero (code 2) if **combined** (agent + Apex) CC ≥ N. Useful in CI. |
| `--json` | Machine-readable SF CLI envelope on stdout. Takes precedence over `--format`. |

### Output formats at a glance

| Format | When to use | Surface |
| --- | --- | --- |
| `text` (default) | Terminal eyeballs. | Color-coded, palette-aligned (red/yellow/green/gray by CC band). Auto-degrades to ASCII on non-TTY. |
| `markdown` | PR descriptions, gists, whitepaper appendices. | Mermaid `xychart-beta` bar chart at top (AgentScript red vs Apex green) + per-bundle and per-class tables. |
| `sarif` | GitHub Code Scanning / IDE annotations / CI. | SARIF 2.1.0 with one result per procedure / per method. Level driven by complexity thresholds. |
| `csv` | Spreadsheet pivots, posture-comparison matrices. | One row per procedure or Apex method. RFC-4180 quoted. |
| `--json` | Machine consumers (e.g. another sf plugin). | SF CLI envelope around the full `AnalysisReport`. |

### Examples

See [`examples/voice-agent-posture-comparison.md`](examples/voice-agent-posture-comparison.md)
for a full rendered report comparing two voice agents — one MCP-backed, one mixed
Apex/MCP — including the CC-by-location heatmap and a walkthrough of the MCP
complexity gap.

### Quick terminal example

```
$ sf agentpmd analyze -d ./force-app/main/default/aiAuthoringBundles
AgentForce PMD — Cyclomatic Complexity (McCabe)
════════════════════════════════════════════════════════════

📄 case_escalation_bot.agent   CC=31
────────────────────────────────────────────────────────────
  start_agent customer_verification   subtotal CC=8
    before_reasoning         CC=2   if=1
    after_reasoning          CC=5   if=3 and=1
    reasoning.instructions   CC=1   (base only)
  …
```

## Roadmap

- **v3** — implement the four-category LOC rule from
  `docs/agent-loc-categorization-skill-v2.md` (Scaffolding, Deterministic
  Logic, Reasoning Logic, Conversation Surface) as a separate sub-command
  (`sf agentpmd categorize-loc`).
- **future** — MCP server introspection: resolve `mcpTool://` targets via
  the MCP protocol's `tools/list` endpoint and compute schema-level
  complexity (JSON Schema branch count) as a proxy for implementation depth.
  When MCP server source is available, optionally walk it for true McCabe CC.
  Goal: a complete combined CC number that accounts for complexity on both
  sides of the `mcpTool://` boundary.
- **future** — Flow incorporation (§ 9 of the whitepaper) once a CC analog
  for Flow elements is settled.

## Install details

### Standard install (npm)

```bash
sf plugins trust allowlist add -n sf-agentpmd
sf plugins install sf-agentpmd
```

The `trust allowlist` step is a one-time acknowledgement that lets the SF CLI
install plugins from publishers outside the Salesforce-signed core. Required
once per machine.

### Claude Code skill

```bash
sf agentpmd install-skill
```

Copies the bundled skill tree to `~/.claude/skills/agentforcepmd/`. Restart
Claude Code to activate. The skill auto-triggers on mentions of
`sf agentpmd`, "AgentScript cyclomatic complexity", "Agent CC", and related
phrases.

### Local dev / contributor install

```bash
git clone https://github.com/bobbywhitesfdc/sf-agentpmd
cd sf-agentpmd
npm install
npm run build
sf plugins link "$(pwd)"
```

Symlink the skill for live edits:

```bash
ln -sfn "$(pwd)/skill" ~/.claude/skills/agentforcepmd
```

## How it parses

We do **not** use heuristic regex scanners. Two real parsers do the work:

- **AgentScript** — the hand-written TypeScript parser in
  [`@agentscript/parser-javascript`](https://github.com/salesforce/agentscript/tree/main/packages/parser-javascript),
  vendored under `vendor/` because the upstream package isn't published to
  npm yet.
- **Apex** — [`@apexdevtools/apex-parser`](https://github.com/apex-dev-tools/apex-parser)
  v5.0.0, an actively-maintained ANTLR4 TypeScript port. Pure-Node, no JVM.

To resync the vendor copies after pulling new upstream commits:

```
./scripts/sync-vendor.sh
```

That copies the freshly-built `dist/` from
`$AGENTSCRIPT_REPO/packages/{types,parser-javascript}` into
`vendor/agentscript-{types,parser-javascript}/dist/`.

## Layout

```
src/
  commands/agentpmd/analyze.ts   # sf agentpmd analyze
  analyzer/
    parse.ts                     # AgentScript CST helpers
    complexity.ts                # AgentScript McCabe CC walker
    action-references.ts         # @actions.X declarations & references
    apex-parse.ts                # @apexdevtools/apex-parser wrappers
    apex-complexity.ts           # Apex McCabe CC walker
    apex-resolve.ts              # apex://ClassName → .cls path resolver
    apex-analyze.ts              # orchestrator for the Apex pass
    analyze.ts                   # file discovery + top-level orchestrator
    report.ts                    # text/json rendering (incl. § 7 split)
    types.ts                     # public types
  index.ts                       # programmatic entry
test/
  fixtures/                      # synthetic + gametwo fixtures
  analyzer/*.spec.ts             # vitest unit + integration tests
vendor/
  agentscript-types/             # vendored from agentscript monorepo
  agentscript-parser-javascript/
scripts/
  sync-vendor.sh
docs/
  agent-loc-categorization-skill-v2.md   # the categorization rule
```

## Development

```
npm install
npm run build
npm test
node bin/dev.js agentpmd analyze --source-dir test/fixtures
```

The plugin uses ESM throughout and targets Node ≥ 20.

## Claude Code skill

The plugin ships with a bundled Claude Code skill (at `skill/` in the repo)
that wraps the plugin from an adopter's point of view — discovery,
install, upgrade, and output interpretation. It auto-triggers when a
Claude session mentions `sf agentpmd`, "AgentScript cyclomatic
complexity", or related phrases.

**Activate the skill.** After installing the plugin, run:

```bash
sf agentpmd install-skill
```

This recursively copies the bundled skill tree to
`~/.claude/skills/agentforcepmd/`. Restart Claude Code (or reload skills)
to activate it.

Local-dev contributors can instead symlink the in-repo `skill/` directory
(it moved from `.claude/skills/agentforcepmd/` to `skill/`) so edits show
up live:

```bash
ln -sfn "$(pwd)/skill" ~/.claude/skills/agentforcepmd
```

The skill's `SKILL.md` indexes four reference pages:

- `references/command-structure.md` — every flag, defaults, exit codes
- `references/install.md` — both pre- and post-publication install paths
- `references/upgrade.md` — refresh dance for a linked checkout, plus
  `sf plugins update` for the published case
- `references/output-formats.md` — text / JSON / markdown / SARIF / CSV
  surface with examples, plus a "pick a format" cheat sheet
