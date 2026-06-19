# TODO

## Status

The plugin is published to npm as the unscoped **`sf-agentpmd`** and its
conventions are aligned with the sibling plugin `sf-bulk-analyzer`
(oclif scaffold, `dist/` build output, eslint + prettier + mocha/chai,
`@oclif/plugin-help`, a bundled Claude Code skill installed via
`sf agentpmd install-skill`).

Releases are automated via GitHub Actions:

- `.github/workflows/test.yml` — lint + build + test on every non-main push.
- `.github/workflows/onPushToMain.yml` — on push to `main`, if
  `package.json` `version` has no matching `vX.Y.Z` release yet, regenerates
  the oclif README, tags, and creates a GitHub Release.
- `.github/workflows/onRelease.yml` — on a published Release, builds and
  runs `npm publish` using the `NPM_TOKEN` repo secret.

**To cut a release:** bump `version` in `package.json`, push to `main`
(the workflow chain tags → releases → publishes). Keep the
`pluginVersion()` string in `src/renderers/sarif.ts` in sync with the
package version.

Required repo secrets: `NPM_TOKEN` (npm automation token). For the
auto-release-on-version-bump chain to fire `onRelease`, `onPushToMain`
also needs a PAT in `GH_TOKEN` (plus `GH_EMAIL` / `GH_USERNAME`) —
releases created with the default `GITHUB_TOKEN` do not trigger the
publish workflow. A release created manually with `gh release create`
(local PAT) triggers `onRelease` without those extra secrets.

---

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
