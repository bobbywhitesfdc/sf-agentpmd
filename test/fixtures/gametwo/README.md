# GameTwo fixtures

Trimmed snapshot from a private posture-comparison spike (the work that
produced the v2 LOC categorization rule). Source paths are local-only; the
files below are committed copies so the repo stays self-contained.

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
Resync from the source spike by copying the four files
(`GameTwo_Simple.agent`, `GameTwo_Out_Simple.agent`, `GameTwo_RandomChoice.cls`,
`GameTwo_PlayRound.cls`) back into the matching subdirectories here.
