import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeSource } from '../../src/analyzer/analyze.js';

const here = dirname(fileURLToPath(import.meta.url));
const gametwo = resolve(here, '..', 'fixtures', 'gametwo');

describe('analyzeSource — end-to-end on gametwo fixtures', () => {
  it('reports both AgentScript and Apex CC, resolved via apex:// upward walk', async () => {
    const report = await analyzeSource(gametwo);

    // AgentScript side
    expect(report.files.map(f => f.path).sort()).toEqual([
      'aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent',
      'aiAuthoringBundles/GameTwo_Simple/GameTwo_Simple.agent',
    ]);
    expect(report.totalComplexity).toBe(19 + 2); // 21
    expect(report.totalDeclarations).toBe(2);
    expect(report.byTargetKind.apex).toBe(2);

    // Apex side — two distinct classes resolve, one per bundle.
    expect(report.apexClasses.map(c => c.className).sort()).toEqual([
      'GameTwo_PlayRound',
      'GameTwo_RandomChoice',
    ]);
    expect(report.unresolvedApexTargets).toEqual([]);

    const playRound = report.apexClasses.find(c => c.className === 'GameTwo_PlayRound')!;
    expect(playRound.classComplexity).toBe(5 + 10 + 3); // 18
    expect(playRound.referencedBy).toEqual([
      'aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent',
    ]);

    const randomChoice = report.apexClasses.find(c => c.className === 'GameTwo_RandomChoice')!;
    expect(randomChoice.classComplexity).toBe(8 + 1 + 3); // 12

    expect(report.totalApexComplexity).toBe(30);
  });

  it('records unresolved apex:// targets when no .cls is reachable', async () => {
    // Point at the bundles dir alone — no sibling classes/ folder accessible.
    const bundlesOnly = resolve(gametwo, 'aiAuthoringBundles');
    const report = await analyzeSource(bundlesOnly);
    expect(report.unresolvedApexTargets).toEqual(
      expect.arrayContaining([
        'apex://GameTwo_PlayRound',
        'apex://GameTwo_RandomChoice',
      ]),
    );
    expect(report.apexClasses).toEqual([]);
    expect(report.totalApexComplexity).toBe(0);
  });

  it('honors --apex-source override', async () => {
    const bundlesOnly = resolve(gametwo, 'aiAuthoringBundles');
    const apexDir = resolve(gametwo, 'classes');
    const report = await analyzeSource(bundlesOnly, { apexSourceOverride: apexDir });
    expect(report.apexClasses.map(c => c.className).sort()).toEqual([
      'GameTwo_PlayRound',
      'GameTwo_RandomChoice',
    ]);
    expect(report.unresolvedApexTargets).toEqual([]);
  });
});
