# TODO

## Status

The plugin is published to npm as the unscoped **`sf-agentpmd`** and its
conventions are aligned with the sibling plugin `sf-bulk-analyzer`
(oclif scaffold, `dist/` build output, eslint + prettier + mocha/chai,
`@oclif/plugin-help`, a bundled Claude Code skill installed via
`sf agentpmd install-skill`).

Releases are automated via GitHub Actions:

- `.github/workflows/test.yml` — lint + build + test on every non-main push.
- `.github/workflows/release.yml` — on push to `main`, if `package.json`
  `version` has no matching `vX.Y.Z` release yet, it builds + tests +
  `npm publish` (via `NPM_TOKEN`) and records a GitHub Release — all in ONE
  job. No PAT needed: because nothing chains across workflows, the built-in
  `GITHUB_TOKEN` suffices for the release, and `NPM_TOKEN` (automation token,
  bypasses 2FA) does the publish.
- `.github/workflows/deprecate.yml` — manual `workflow_dispatch` to
  deprecate/un-deprecate a version via `NPM_TOKEN` (no local 2FA).

**To cut a release:** bump `version` in `package.json` AND the
`pluginVersion()` string in `src/renderers/sarif.ts`, then push to `main`.
That's it — the release workflow publishes and tags. Pushing to `main`
without a version bump is a safe no-op (the version-check skips).

Only repo secret required: `NPM_TOKEN`. (Publishing through the GitHub
Release UI is intentionally NOT wired up — publish is tied to the push, not
a release event.)

---

## Vendored AgentScript — upstream sync (revisit next iteration)

The upstream `@agentscript/*` packages are **not published to npm**, so we
vendor them under `vendor/` as `file:` **devDependencies** and **inline**
them into the published bundle with esbuild (`esbuild.config.mjs`). Shipping
`file:` deps in the published package is what broke `sf update` in 0.1.0
(npm arborist crashed rebuilding the bundled `file:` link nodes during a
multi-package install) — do **not** reintroduce a `file:` entry into
runtime `dependencies`.

Currently pinned (copied from `~/projects/agentscript` `dist/`):
- `@agentscript/types@0.2.1` → `vendor/agentscript-types/`
- `@agentscript/parser-javascript@2.4.0` → `vendor/agentscript-parser-javascript/`

**The drift risk:** we vendor compiled `dist/`, not source, with no
automatic link to upstream. If AgentScript's parser/types evolve, our copy
silently falls behind. Before the next feature iteration:

- [ ] **Check upstream for changes.** `git -C ~/projects/agentscript pull`
      and diff the `packages/types` + `packages/parser-javascript` versions
      against the pins above. Note any grammar/AST changes that affect CC
      counting.
- [ ] **Design a refresh procedure that won't fall behind.** Options to
      evaluate: (a) a `scripts/vendor-refresh.mjs` that copies upstream
      `dist/` + records the source commit SHA in a `vendor/VERSIONS.md`;
      (b) consume upstream as a git dependency / git submodule pinned to a
      SHA instead of a hand-copied `dist/`; (c) ask upstream to publish to
      npm (then drop vendoring + bundling entirely — simplest end state).
      Whatever we pick, capture the upstream **commit SHA** so drift is
      detectable, and keep the esbuild inlining so no `file:` dep ever
      ships.

## Roadmap — deferred features

- **Multi-format agent analysis** (`bots/`, `genAiPlannerBundles/`). The
  current plugin only sees one of three coordinated layers that make up a
  Salesforce agent. Surfaced where the `.agent` file is near-empty
  (CC ≈ 1 per topic) but the real implementation lives in
  `genAiPlannerBundles/<Name>/plannerActions/*.xml` and
  `bots/<Name>/v*.botVersion-meta.xml`. To be useful as an org-wide review
  tool we need:
    - **GenAiPlannerBundle parser**. Walk the `.genAiPlannerBundle` XML
      and `plannerActions/`, `localActions/` subdirs. Extract action
      declarations, their target type (apex/flow/prompt), attribute
      mappings (variable plumbing). Roll these up alongside the AgentScript
      action inventory. Concrete vocabulary observed in fixtures:
        - `<localTopics>` — each is a routing destination (≈ AgentScript
          `topic`). Holds `<scope>`, `<genAiPluginInstructions>` (multiple,
          sortOrder'd), `<localActions>`, `<localActionLinks>`.
        - `<plannerActions>` — top-level (planner-shared) actions.
        - `<localActions>` (inline inside a topic) — each has
          `<invocationTarget>` + `<invocationTargetType>` (values seen:
          `apex`, `generatePromptResponse`, `standardInvocableAction`;
          `flow` and `flowInvocation` also live in the schema).
          Direct parallel to AgentScript's `target: "apex://X"` lines —
          same Apex follow-through pass would work here.
        - `<attributeMappings>` — variable plumbing (action I/O ↔ planner
          variable). Count is a "wiring complexity" metric, not branching.
        - `<ruleExpressions>` + `<conditions>` (`<leftOperand>`,
          `<operator>`, `<rightOperandValue>`) — **this is where
          conditional logic actually lives** in planner bundles, not in
          dialog steps. Each rule expression is a branch.
        - `<plannerSurfaces>` — channel surfaces (Messaging,
          CustomerWebClient, Telephony). Not CC-relevant but worth
          inventorying for posture analysis.
        - `<genAiPluginInstructions>` per topic — natural-language
          directives. Count + total length maps to the whitepaper's
          Reasoning Logic / Conversation Surface categories.
      **Two distinct on-disk shapes observed** — the parser needs both:
        - *Decomposed*: bundle directory contains `agentGraph/`,
          `plannerActions/`, `localActions/` subdirs with one XML file
          per item.
        - *Self-contained*: bundle directory contains a single
          `.genAiPlannerBundle` file with everything inline; only
          `plannerActions/<X>/input|output/schema.json` sidecars for
          JSON-Schema documentation of action signatures.
      Both are valid retrieve outputs; the layout depends on API version
      and the sf CLI retrieve flags used. Reference fixtures live outside
      this repo in private workspaces — when implementing, copy minimal
      anonymized samples into `test/fixtures/` rather than referencing
      the live paths.
    - **BotVersion (`v*.botVersion-meta.xml`) parser**. Compute a McCabe
      analog over `<botDialogs>`/`<botSteps>`/`<intentDecision>` step
      types. Inventory flow/apex/intent invocations. Bot Builder's
      conversational graph is the closest thing to "old-style" agent
      implementation; pre-AgentScript orgs live entirely here.
    - **Layer correlation**. An agent with the same api-name may have a
      `.agent` file under `aiAuthoringBundles/`, a `<name>.bot-meta.xml`
      + `v1/v2/...` versions under `bots/`, and a `<name>_vN.genAiPlannerBundle`
      under `genAiPlannerBundles/`. The report should join these by
      api-name + version so one `--api-name X` summary covers the full
      implementation surface.
    - **Open design questions**: CC convention for BotVersion XML
      (dialogs, intent decisions, conditional steps?); how to report
      version-over-version drift; whether to treat each Bot version
      separately or roll them up.

- **v3 — four-category LOC categorizer**. Implement
  `docs/agent-loc-categorization-skill-v2.md`'s rule as
  `sf agentpmd categorize-loc`. Largest remaining feature on the AgentScript
  side.
- **`--out <file>` flag**. Write report directly to a file instead of stdout.
  Useful for `sf agentpmd analyze --format markdown --out report.md`.
- **`--include-class <regex>`**. Filter Apex side of the analysis.
- **`--rule-thresholds <file>`**. External config for `--fail-on`,
  `--sarif-warning`, `--sarif-error`.
- **Flow incorporation**. Per whitepaper § 9; deferred until a CC analog
  for Flow elements is settled.
- **`renderText` complexity**. The text renderer trips the eslint
  `complexity` warning (CC 22 > 20) — ironic for a complexity tool.
  Refactor into smaller section helpers.
- **Source-map fix for vendored agentscript-parser-javascript**. Mocha/
  ts-node may emit sourcemap warnings ("Sourcemap … points to missing
  source files") because we copied `dist/*.js.map` but not the original
  `src/`. Either strip the `.js.map` files from `vendor/` or copy `src/`
  too. Cosmetic, not blocking.
