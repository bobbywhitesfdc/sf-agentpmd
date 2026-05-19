# Command structure

`sf-agentpmd` registers the topic `agentpmd` with one command:

```
sf agentpmd analyze [flags]
```

Discover the command surface yourself with `sf agentpmd --help` or
`sf agentpmd analyze --help`.

## The one command — `sf agentpmd analyze`

Compute McCabe cyclomatic complexity and action-reference inventory for
AgentScript bundles and their Apex backing logic.

### Flags

| Flag | Short | Type | Default | Purpose |
| --- | --- | --- | --- | --- |
| `--source-dir` | `-d` | path | _auto_ | Directory or single `.agent` file to analyze. When omitted, walks up from cwd looking for `sfdx-project.json` and uses its `packageDirectories`. |
| `--api-name` | `-n` | string (repeatable) | _all_ | Filter to specific bundles by api-name. Matches against the bundle directory name **or** `config.developer_name` inside the `.agent`. Pass multiple times to union: `-n A -n B`. |
| `--apex-source` | — | path | _auto_ | Override directory for resolving `apex://` targets. Default: walks up from each `.agent` looking for a sibling `classes/` directory. |
| `--format` | — | enum | `text` | Non-JSON output: `text`, `markdown`, `sarif`, `csv`. Ignored when `--json` is set. |
| `--width` | — | integer | `60` | Rule width for the text renderer. |
| `--ascii` | — | boolean | _auto_ | Force ASCII-only output (no emoji / Unicode box chars). Auto-enabled when stdout isn't a TTY (e.g. piped). |
| `--no-color` | — | boolean | `false` | Disable ANSI color in the text renderer. `NO_COLOR` env var also disables. |
| `--sarif-warning` | — | integer | `10` | SARIF "warning" level threshold (per-method/per-procedure CC). |
| `--sarif-error` | — | integer | `20` | SARIF "error" level threshold. |
| `--fail-on` | — | integer | _off_ | Exit non-zero (code 2) if **combined** (agent + Apex) CC ≥ N. CI gate. |
| `--json` | — | boolean | `false` | Emit SF CLI JSON envelope. Takes precedence over `--format`. |
| `--flags-dir` | — | path | — | Standard SF CLI flag — import flag values from a directory. Inherited from `@salesforce/sf-plugins-core`. |

### Auto-discovery rules

When `--source-dir` is omitted, the plugin walks up from `process.cwd()`
looking for `sfdx-project.json`. If found, it uses the project's
`packageDirectories` as source roots and prints
`Analyzing sfdx project <root> (N package director{y|ies}).` as the
first line of human output. If no project file is found, it errors with
`No --source-dir was provided and no sfdx-project.json was found …`.

This matches the standard SF CLI ergonomics (`sf project deploy start`,
`sf project retrieve start`, etc.).

### Filter semantics for `--api-name`

A bundle matches a `-n <X>` value if **either**:

1. The bundle's directory name equals `<X>` (fast path, no parse).
2. The bundle's `config.developer_name:` value equals `<X>` (slow path,
   used only when (1) misses).

If multiple `-n` values are supplied, the union is included. When none
match anything discovered, the command errors with the list of
available bundle names so the user can correct.

The slow path means `--api-name` works even when the bundle's developer
name has been edited away from the directory name — common after a
manual rename.

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success. Report rendered to stdout. |
| 1 | Standard usage / configuration error (missing flag, unknown bundle, no project found, invalid path). |
| 2 | `--fail-on N` was set and combined CC reached or exceeded N. |

### What "combined CC" includes

- Sum of CC of every analyzed `.agent` procedure body
  (`before_reasoning`, `after_reasoning`, `reasoning.instructions:->`).
- Sum of CC of every method/constructor body in every Apex class reached
  through an `apex://` action target.
- Apex classes referenced by multiple bundles are counted **once** in the
  combined total (de-duplicated by class path).

### What the plugin does NOT count

- `else` clauses, `when else` arms, `finally` blocks, `try` itself
  (per standard McCabe).
- AgentScript constructs the language doesn't have (loops, switch on AS
  side — the AS grammar has no `for`/`while`/`case`).
- Methods without a body (interface methods, abstract methods).
- Apex methods reachable only through `flow://` or `prompt://` targets
  (those URIs aren't followed yet).
- Old-style Bot dialogs or GenAiPlannerBundle action declarations
  (tracked as TODO).
