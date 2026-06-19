# Private fixtures

Drop real-world agent metadata here to validate the plugin against richer or
customer-derived examples without committing them. The directory itself is
gitignored (see project `.gitignore`); only this README survives `git add`.

## What goes here

- Full `.agent` files copied verbatim from customer engagements.
- `bots/<Name>/v*.botVersion-meta.xml` retrieve outputs.
- `genAiPlannerBundles/<Name>/...` in either decomposed or self-contained
  shape.
- `classes/*.cls` backing logic referenced by any of the above.
- Whole sfdx-project layouts if it helps — drop the project under
  `test/fixtures/private/<some-name>/` and let the plugin's
  sfdx-project autodetection do its thing.

No anonymization is required, because nothing here ever leaves your machine.
This is the validation tier for material that **can't** be made public.

## What stays in the public tier

`test/fixtures/gametwo/` and any other top-level fixtures under
`test/fixtures/` are the public, committable tier. Their contents either
originate from the author's own published work (e.g. the GameTwo
posture-comparison spike) or from Salesforce-published reference material
(e.g. agentscript example agents). Customer-derived content does **not**
belong here — see the project memory entry on customer names for the rule.

## How tests pick it up

The helper at `test/utils/private-fixtures.ts` returns the absolute path
of this directory when at least one private fixture is present, or
`undefined` when only this README lives here. It also honors the
`AGENTPMD_PRIVATE_FIXTURES` environment variable so the dir can live
outside the repo entirely:

```bash
AGENTPMD_PRIVATE_FIXTURES=~/private-fixtures/agentforce npm test
```

Specs that depend on private content select `describe` vs `describe.skip`
at load time so they're transparently skipped when the dir is empty
(default CI behavior) and exercised locally when fixtures are present.

```ts
import { expect } from 'chai';
import { privateFixturesDir } from '../utils/private-fixtures.js';

const describePrivate = privateFixturesDir() ? describe : describe.skip;

describePrivate('private validation', () => {
  it('analyzes whatever is under test/fixtures/private/', async () => {
    const report = await analyzeSource(privateFixturesDir()!);
    expect(report.files.length).to.be.greaterThan(0);
  });
});
```

## Hygiene

- Don't commit anything from here — the `.gitignore` rule prevents it,
  but `git status` still shows untracked content. Resist temptation.
- If you ever distill an interesting structural observation from private
  data, generalize it (vocabulary, shape, edge case) and record the
  observation in `TODO.md` or code comments. Never name the source.
