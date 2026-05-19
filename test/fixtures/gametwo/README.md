# GameTwo fixtures

Trimmed snapshot from `~/projects/ArcFlareProductDefinition/spikes/gametwo`
(the posture-comparison spike that produced the v2 LOC categorization rule).

We mirror only what `sf agentpmd` exercises:

- `aiAuthoringBundles/GameTwo_Simple/GameTwo_Simple.agent` — default-in,
  flattened. Stresses the McCabe walker (5 `if` + 9 `and` + 4 `or`) and the
  reasoning_instructions_run reference context (`run @actions.pickRandomChoice`
  inside `instructions: ->`).
- `aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent` —
  default-out, flattened. CC stays low because branching moves to Apex.
- `classes/GameTwo_RandomChoice.cls` and `classes/GameTwo_PlayRound.cls` —
  the Apex backing logic referenced by the bundles. Reserved for the v2
  Apex-CC walker; not exercised by the v1 tests.

These files are copies, not symlinks, so the repo stays self-contained.
Resync from the spike with:

```
cp ~/projects/ArcFlareProductDefinition/spikes/gametwo/force-app/main/default/aiAuthoringBundles/GameTwo_Simple/GameTwo_Simple.agent \
   test/fixtures/gametwo/aiAuthoringBundles/GameTwo_Simple/
# (and so on for the other three files)
```
