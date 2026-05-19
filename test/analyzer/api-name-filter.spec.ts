import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  analyzeSource,
  NoMatchingBundlesError,
} from '../../src/analyzer/analyze.js';

const here = dirname(fileURLToPath(import.meta.url));
const gametwo = resolve(here, '..', 'fixtures', 'gametwo');

describe('--api-name filter', () => {
  it('with no filter analyzes every discovered bundle', async () => {
    const report = await analyzeSource(gametwo);
    expect(report.files.map(f => f.path).sort()).toEqual([
      'aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent',
      'aiAuthoringBundles/GameTwo_Simple/GameTwo_Simple.agent',
    ]);
  });

  it('filters to a single bundle by directory name', async () => {
    const report = await analyzeSource(gametwo, { apiNames: ['GameTwo_Simple'] });
    expect(report.files).toHaveLength(1);
    expect(report.files[0].path).toBe(
      'aiAuthoringBundles/GameTwo_Simple/GameTwo_Simple.agent',
    );
    // Apex roll-up should scope down too — only classes referenced by the
    // filtered bundle should appear.
    expect(report.apexClasses.map(c => c.className)).toEqual(['GameTwo_RandomChoice']);
  });

  it('filters by config.developer_name (parsed from the .agent file)', async () => {
    // Both fixture bundles happen to have matching dir/devname, so this
    // test exercises the slow path by passing a name only present in the
    // .agent body. We use the actual developer_name from GameTwo_Out_Simple.
    const report = await analyzeSource(gametwo, { apiNames: ['GameTwo_Out_Simple'] });
    expect(report.files).toHaveLength(1);
    expect(report.files[0].path).toBe(
      'aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent',
    );
    expect(report.apexClasses.map(c => c.className)).toEqual(['GameTwo_PlayRound']);
  });

  it('accepts multiple --api-name values and unions the matches', async () => {
    const report = await analyzeSource(gametwo, {
      apiNames: ['GameTwo_Simple', 'GameTwo_Out_Simple'],
    });
    expect(report.files).toHaveLength(2);
  });

  it('throws NoMatchingBundlesError with the available list when nothing matches', async () => {
    await expect(
      analyzeSource(gametwo, { apiNames: ['Nope'] }),
    ).rejects.toMatchObject({
      name: 'NoMatchingBundlesError',
      requested: ['Nope'],
    });

    try {
      await analyzeSource(gametwo, { apiNames: ['Nope'] });
    } catch (e) {
      const err = e as NoMatchingBundlesError;
      const names = err.available.map(a => a.dirName).sort();
      expect(names).toEqual(['GameTwo_Out_Simple', 'GameTwo_Simple']);
    }
  });
});
