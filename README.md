# sf-agentpmd

SF CLI plugin that computes **standard McCabe cyclomatic complexity** for
[AgentScript](https://github.com/salesforce/agentscript) (`.agent`) files,
along with an inventory of declared and referenced agent actions.

The intent (per `docs/agent-loc-categorization-skill-v2.md` § 7) is the
by-the-book number a SonarQube / PMD / Checkstyle run would produce — but
applied to the AgentScript surface that those tools don't cover today.

## v1 scope

`sf agentpmd analyze --source-dir <dir|file>`

- Walks every `.agent` file under the given path.
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
  `reasoning.actions`, `before_reasoning`, `after_reasoning`, and
  `transition` statements.

### Flags

| Flag | Purpose |
| --- | --- |
| `-d, --source-dir <path>` | Directory or single `.agent` file. Required. |
| `--fail-on <N>` | Exit non-zero (code 2) if total CC ≥ N. Useful in CI. |
| `--json` | Machine-readable report on stdout. |

### Example

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

The plugin is built so v2 / v3 can grow inward without restructuring:

- **v2** — follow `apex://` action targets into Apex classes; compute CC for
  invocable methods using a SonarQube-equivalent rule set; emit the
  "CC by location" split (agent-script vs. Apex) called out in the
  whitepaper.
- **v3** — implement the four-category LOC rule from
  `docs/agent-loc-categorization-skill-v2.md` (Scaffolding, Deterministic
  Logic, Reasoning Logic, Conversation Surface) as a separate sub-command
  (`sf agentpmd categorize-loc`).

## How it parses AgentScript

We do **not** use a heuristic regex scanner. The CST comes from the
hand-written TypeScript parser in
[`@agentscript/parser-javascript`](https://github.com/salesforce/agentscript/tree/main/packages/parser-javascript),
vendored under `vendor/` because the upstream package isn't published to
npm yet.

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
    parse.ts                     # parser wrappers + CST helpers
    complexity.ts                # McCabe CC walker
    action-references.ts         # @actions.X declarations & references
    analyze.ts                   # file discovery + orchestrator
    report.ts                    # text/json rendering
    types.ts                     # public types
  index.ts                       # programmatic entry
test/
  fixtures/*.agent               # CST fixtures
  analyzer/*.spec.ts             # vitest unit tests
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
