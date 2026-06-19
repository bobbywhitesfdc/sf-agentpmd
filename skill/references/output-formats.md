# Making sense of the output

The plugin emits one of five surfaces depending on flags. Pick by
downstream consumer.

## The five surfaces

| Surface | Triggered by | Audience |
| --- | --- | --- |
| Text | default | Terminal eyeballs |
| JSON envelope | `--json` | Other SF plugins / `jq` pipelines |
| Markdown | `--format markdown` | PR descriptions, gists, whitepaper appendices |
| SARIF | `--format sarif` | GitHub Code Scanning, IDE annotations |
| CSV | `--format csv` | Spreadsheet pivots |

`--json` is special: it wraps the data in the standard SF CLI envelope
(`{ status, result, warnings }`) and takes precedence over `--format`.
Use it whenever something other than a human is reading.

## Text output

```
Analyzing sfdx project /path/to/proj (1 package directory).
AgentForce PMD — Cyclomatic Complexity (McCabe)
============================================================

[agent] aiAuthoringBundles/Foo/Foo.agent   CC=19
------------------------------------------------------------
  start_agent play   subtotal CC=19
    reasoning.instructions   CC=19   if=5 and=9 or=4

  Action references
  ----------------------------------------------------------
    pickRandomChoice                 [apex  ] used 1x → apex://Foo_Random

Apex backing logic (resolved via apex:// targets)
============================================================

[apex]  classes/Foo_Random.cls   class CC=12
   referenced by: aiAuthoringBundles/Foo/Foo.agent
------------------------------------------------------------
   List<Result> execute(List<Request> requests) CC=8   ternary=2 ||=1 for=1 &&=2 catch=1
   String freshCookie()                         CC=1   (base only)
   String abbreviate(String s)                  CC=3   if=2

============================================================
CC by location (whitepaper § 7)
  AgentScript: 19   Apex: 12   Combined: 31
Action declarations: 1  (apex 1, flow 0, prompt 0, unknown 0)
Action references:   2
```

### How to read it

- **Header line** confirms what was analyzed (auto-discovered project or
  explicit `--source-dir`). If you see this when you didn't expect
  auto-discovery, you forgot `--source-dir`.
- **`[agent]` blocks**: one per `.agent` file. The bundle's CC and a
  per-scope breakdown (`start_agent` and each `topic`).
- Each procedure line:
  `<kind>  CC=<n>  <contributor breakdown>`
  where contributor breakdown is something like `if=3 and=1`. The CC
  number is the McCabe value (`1 + sum(contributors)`). `(base only)`
  means no control flow; CC = 1.
- **Action references** lists each declared action with its target kind
  (apex/flow/prompt/unknown) and a usage count (`used Nx`). A `used 0x`
  declaration means the action is defined but not invoked — usually a
  red flag (dead code) unless it's a planner-only action.
- **`[apex]` blocks**: one per `.cls` file resolved via `apex://`. Lists
  every method and constructor with its signature, CC, and contributor
  breakdown using Apex-flavored short names (`for`, `while`, `do-while`,
  `when`, `catch`, `ternary`, `&&`, `||`).
- **`CC by location`** is the headline number: `AgentScript`,
  `Apex`, `Combined`. This maps to the whitepaper § 7 framing — same
  agent measured in two different layers, summed for the gross posture.

### TTY-aware rendering

When stdout isn't a TTY (piped, redirected, captured by CI), the text
renderer auto-degrades:
- Emoji prefixes (`📄`, `📜`) become `[agent]` / `[apex]`.
- Unicode rules (`═`, `─`) become `=` / `-`.
- ANSI color is disabled.

Force ASCII even on a TTY with `--ascii`. Force color off with
`--no-color` or `NO_COLOR=1`.

## JSON envelope (`--json`)

Standard SF CLI shape:

```json
{
  "status": 0,
  "result": {
    "files": [ { "path": "...", "procedures": [...], "fileComplexity": 19, ... } ],
    "totalComplexity": 19,
    "totalDeclarations": 1,
    "totalReferences": 2,
    "byTargetKind": { "apex": 1, "flow": 0, "prompt": 0, "utils": 0, "unknown": 0 },
    "apexClasses": [ { "className": "...", "path": "...", "methods": [...], "classComplexity": 12, ... } ],
    "totalApexComplexity": 12,
    "unresolvedApexTargets": []
  },
  "warnings": []
}
```

Useful `jq` recipes:

```bash
# Combined CC for a CI gate
sf agentpmd analyze --json | jq '.result.totalComplexity + .result.totalApexComplexity'

# List apex:// targets that couldn't be resolved
sf agentpmd analyze --json | jq -r '.result.unresolvedApexTargets[]'

# Per-bundle CC table
sf agentpmd analyze --json | jq -r '.result.files[] | "\(.fileComplexity)\t\(.path)"'

# Methods exceeding CC 10
sf agentpmd analyze --json \
  | jq -r '.result.apexClasses[].methods[] | select(.complexity >= 10) | "\(.complexity)\t\(.signature)"'
```

## Markdown (`--format markdown`)

Designed for embedding in PR descriptions, gists, Slack snippets,
whitepaper appendices.

- Top: a Mermaid `xychart-beta` bar chart with one bar per `.agent`
  bundle, split into AgentScript CC (red — whitepaper "Reasoning
  Logic") and Apex CC (green — "Deterministic Logic"). Renders
  natively in GitHub, GitLab, and most modern markdown previewers.
- Followed by a per-bundle table (procedure-by-procedure).
- Followed by a per-Apex-class table (method-by-method).
- Final "CC by location" totals row.

GFM pipe escaping is applied automatically — `||` short-circuit
operators in the Apex breakdown render as `\|\|` in cells so they don't
break the row.

Typical use:

```bash
sf agentpmd analyze --format markdown > report.md
gh pr comment <pr-number> --body-file report.md
```

## SARIF (`--format sarif`)

SARIF 2.1.0. One result per procedure + per Apex method. Severity
driven by `--sarif-warning` (default 10) and `--sarif-error` (default
20), matching PMD's `methodReportLevel` convention.

Upload to GitHub Code Scanning:

```yaml
# .github/workflows/agentpmd.yml
- name: Analyze
  run: sf agentpmd analyze --format sarif > agentpmd.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: agentpmd.sarif
```

Each result carries `properties.complexity` (numeric) and
`properties.kind` (`method` / `constructor` for Apex, `before_reasoning`
/ `after_reasoning` / `reasoning_instructions` for AgentScript) so
follow-on tooling can re-band severity without re-running.

Row origins are normalized to 1-based in SARIF regardless of source
parser (AgentScript CST is 0-based; ANTLR is 1-based for line, 0-based
for column — the renderer adjusts).

## CSV (`--format csv`)

RFC-4180 quoted. One header row + one row per procedure / per Apex
method.

Columns:

```
type, file, scope_or_class, name, complexity, start_row, start_col, contributors
```

`type` is either `agent_procedure` or `apex_method`. `contributors`
is a semicolon-separated `kind=count` list (e.g.
`if_statement=3;short_circuit_and=1`).

Pivot in your favorite spreadsheet on `type` × `file` for a posture
matrix, or on `kind` (parsed from `contributors`) for a contributor
breakdown.

## Picking a format — the cheat sheet

| Question | Best surface |
| --- | --- |
| "What's the CC of this file right now in my terminal?" | text |
| "I want to gate the PR if combined CC ≥ 80." | `--fail-on 80` (uses text or `--json` for visibility) |
| "I want PR annotations on the specific high-CC methods." | sarif |
| "I want to drop a CC table into a PR description." | markdown |
| "I want to share the numbers in a quick gist." | markdown |
| "I want to feed the per-method numbers into a spreadsheet." | csv |
| "I want another tool / script to consume the output." | `--json` |
