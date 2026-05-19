# TODO

## Decision: publish to npm now, or polish more first?

The plugin is functionally complete enough to be useful (CC + action references
for AgentScript, follow-through to Apex CC, four output formats, sfdx-project
autodetection, `--api-name` filter, 29 passing tests). Whether to publish now
is a timing call.

**Reasons to publish soon**
- Teammates / external users can `sf plugins install` instead of `git clone`.
- Surfaces real-world feedback before the API stabilizes.
- Establishes the package name on npm before someone else claims it.

**Reasons to wait**
- v3 (four-category LOC categorizer, per `docs/agent-loc-categorization-skill-v2.md`)
  is still unimplemented. A pre-v3 publish means a v0.x → v0.next bump shortly after.
- The "publishable" prep itself (below) is a half-day of mechanical work that's
  cheaper to do once, when we're sure we want it.
- Plugin name once published is awkward to change.
- No real consumers asking for an npm install path yet.

---

## Phase 1 — Pre-publish prep (when ready)

### 1. Pick a name
- [ ] `@bobbywhitesfdc/sf-agentpmd` (scoped — **recommended**) vs `sf-agentpmd` (unscoped)
- Both names are currently free on npm (verified 2026-05-18).
- Scoped avoids reading as an official Salesforce plugin and reserves the
  namespace; install command becomes `sf plugins install @bobbywhitesfdc/sf-agentpmd`.
- Whichever you pick, update `"name"` in `package.json`.

### 2. Add publish-required metadata to `package.json`
- [ ] `"author"` field
- [ ] `"repository": { "type": "git", "url": "..." }`
- [ ] `"bugs": { "url": "..." }`
- [ ] `"homepage"`
- [ ] `"keywords"` (salesforce, sf-plugin, oclif, agentforce, agentscript,
      cyclomatic-complexity, pmd, static-analysis, …)

### 3. Fix the `files` whitelist — **the real blocker**
Current state:
```json
"files": ["/lib", "/messages", "/oclif.manifest.json"]
```
This silently omits `bin/` (so the `"bin": "./bin/run.js"` entry points
nowhere) and `vendor/` (so `file:./vendor/agentscript-*` deps resolve to
empty dirs). Published as-is the plugin installs but does not run.

Needs to be:
```json
"files": ["/lib", "/bin", "/vendor", "/messages", "/oclif.manifest.json", "/LICENSE", "/NOTICE"]
```
- [ ] Add `/bin`, `/vendor`, `/LICENSE`, `/NOTICE` to `files`.
- [ ] Verify via `npm pack --dry-run` that all expected entries appear.

### 4. Apache-2.0 attribution for vendored AgentScript
- [ ] Add `LICENSE` (copy from upstream `agentscript/LICENSE.txt`).
- [ ] Add `NOTICE` crediting `salesforce/agentscript` and listing the
      vendored paths (`vendor/agentscript-types/`,
      `vendor/agentscript-parser-javascript/`).

### 5. Generate `oclif.manifest.json` at pack time
- [ ] `npm install --save-dev oclif`
- [ ] Add `prepack` script: `npm run clean && npm run build && oclif manifest`
- [ ] Add `postpack` script: `rm -f oclif.manifest.json`

### 6. Fix the SARIF `informationUri`
- [ ] `src/renderers/sarif.ts` currently points at the placeholder
      `https://github.com/anthropics/AgentForcePMD`. Repoint to the real
      GitHub URL before publish — SARIF consumers (GitHub Code Scanning)
      hyperlink that value.

---

## Phase 2 — Pre-flight test (before `npm publish`)
- [ ] `npm pack` — produce a real tarball.
- [ ] `tar tzf sf-agentpmd-*.tgz | sort` — eyeball the contents.
- [ ] `sf plugins unlink sf-agentpmd` — drop the dev link.
- [ ] `sf plugins install $(pwd)/sf-agentpmd-*.tgz` — install as an end user.
- [ ] `cd ~/projects/ArcFlareProductDefinition/spikes/gametwo && sf agentpmd analyze` — full smoke test.
- [ ] Repeat if anything's missing from the tarball.

---

## Phase 3 — First publish (touches credentials, manual step)
```bash
npm login                                  # one-time
npm whoami                                 # confirm
npm publish --access public                # scoped first publish needs --access public
npm view sf-agentpmd                       # confirm it's live
sf plugins install sf-agentpmd             # end-user install path
```

---

## Phase 4 — Subsequent publishes
- `npm version {patch|minor|major}` bumps package.json + creates a git tag.
- `git push --follow-tags`
- `npm publish`
- End users update via `sf plugins update`.

---

## Phase 5 — CI automation (later)
- GitHub Actions workflow on tag push.
- `npm ci && npm test && npm run build && npm publish --access public`.
- `NODE_AUTH_TOKEN` from an npm automation token stored in repo secrets.

---

## Other polish candidates (not blocking publish)

These came up during build-out and are deferred:

- **Multi-format agent analysis** (`bots/`, `genAiPlannerBundles/`). The
  current plugin only sees one of three coordinated layers that make up a
  Salesforce agent. Surfaced by `myAgentSpike` where the .agent file is
  near-empty (CC ≈ 1 per topic) but the real implementation lives in
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
        - *Decomposed* (e.g. `~/projects/myAgentSpike/.../genAiPlannerBundles/Bertie/`):
          subdirs `agentGraph/`, `plannerActions/`, `localActions/` with
          one file per item.
        - *Self-contained* (e.g. `~/projects/mm-fsc-main/.../genAiPlannerBundles/MassMutual_Voice_Assistant_v2/`):
          single `.genAiPlannerBundle` file with everything inline; only
          plannerActions/<X>/input|output/schema.json sidecars for
          JSON-Schema documentation of action signatures.
      Both are valid retrieve outputs; the layout depends on API version
      and the sf CLI retrieve flags used.
    - **BotVersion (`v*.botVersion-meta.xml`) parser**. Compute a McCabe
      analog over `<botDialogs>`/`<botSteps>`/`<intentDecision>` step
      types. Inventory flow/apex/intent invocations. Bot Builder's
      conversational graph is the closest thing to "old-style" agent
      implementation; pre-AgentScript orgs live entirely here.
    - **Layer correlation**. An agent named `Bertie` may have a `.agent`
      file, a `Bertie.bot-meta.xml` + `v1/v2/...` versions, AND a
      `Bertie_v2.genAiPlannerBundle`. The report should join these by
      api-name + version so one `--api-name Bertie` summary covers the
      full implementation surface.
    - **Open design questions**: CC convention for BotVersion XML
      (dialogs, intent decisions, conditional steps?); how to report
      version-over-version drift; whether to treat each Bot version
      separately or roll them up.
  Concrete fixture available: `~/projects/myAgentSpike/force-app/main/default/`
  contains Bertie/BertieVoice/BertieVoiceNext across all three formats,
  plus an Agentforce_Service_Agent and a MassMutual_Voice_Assistant.

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
- **Source-map fix for vendored agentscript-parser-javascript**. Vitest
  emits sourcemap warnings ("Sourcemap … points to missing source files")
  because we copied `dist/*.js.map` but not the original `src/`. Either
  strip the `.js.map` files from `vendor/` or copy `src/` too. Cosmetic,
  not blocking.
