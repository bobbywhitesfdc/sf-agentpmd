import { expect } from 'chai';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeSource } from '../../src/analyzer/analyze.js';

const here = dirname(fileURLToPath(import.meta.url));
const gametwo = resolve(here, '..', 'fixtures', 'gametwo');

describe('analyzeSource — end-to-end on gametwo fixtures', () => {
  it('reports both AgentScript and Apex CC, resolved via apex:// upward walk', async () => {
    const report = await analyzeSource(gametwo);

    // AgentScript side
    expect(report.files.map(f => f.path).sort()).to.deep.equal([
      'aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent',
      'aiAuthoringBundles/GameTwo_Simple/GameTwo_Simple.agent',
    ]);
    expect(report.totalComplexity).to.equal(19 + 2); // 21
    expect(report.totalDeclarations).to.equal(2);
    expect(report.byTargetKind.apex).to.equal(2);

    // Apex side — two distinct classes resolve, one per bundle.
    expect(report.apexClasses.map(c => c.className).sort()).to.deep.equal([
      'GameTwo_PlayRound',
      'GameTwo_RandomChoice',
    ]);
    expect(report.unresolvedApexTargets).to.deep.equal([]);

    const playRound = report.apexClasses.find(c => c.className === 'GameTwo_PlayRound')!;
    expect(playRound.classComplexity).to.equal(5 + 10 + 3); // 18
    expect(playRound.referencedBy).to.deep.equal([
      'aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent',
    ]);

    const randomChoice = report.apexClasses.find(c => c.className === 'GameTwo_RandomChoice')!;
    expect(randomChoice.classComplexity).to.equal(8 + 1 + 3); // 12

    expect(report.totalApexComplexity).to.equal(30);
  });

  it('records unresolved apex:// targets when no .cls is reachable', async () => {
    // Point at the bundles dir alone — no sibling classes/ folder accessible.
    const bundlesOnly = resolve(gametwo, 'aiAuthoringBundles');
    const report = await analyzeSource(bundlesOnly);
    expect(report.unresolvedApexTargets).to.include.members([
      'apex://GameTwo_PlayRound',
      'apex://GameTwo_RandomChoice',
    ]);
    expect(report.apexClasses).to.deep.equal([]);
    expect(report.totalApexComplexity).to.equal(0);
  });

  it('honors --apex-source override', async () => {
    const bundlesOnly = resolve(gametwo, 'aiAuthoringBundles');
    const apexDir = resolve(gametwo, 'classes');
    const report = await analyzeSource(bundlesOnly, { apexSourceOverride: apexDir });
    expect(report.apexClasses.map(c => c.className).sort()).to.deep.equal([
      'GameTwo_PlayRound',
      'GameTwo_RandomChoice',
    ]);
    expect(report.unresolvedApexTargets).to.deep.equal([]);
  });
});
