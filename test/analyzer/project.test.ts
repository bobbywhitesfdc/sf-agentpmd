import { expect } from 'chai';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeSource } from '../../src/analyzer/analyze.js';
import { discoverSfdxProject } from '../../src/analyzer/project.js';

const here = dirname(fileURLToPath(import.meta.url));
const gametwo = resolve(here, '..', 'fixtures', 'gametwo');

describe('sfdx project discovery', () => {
  it('finds sfdx-project.json by walking up from a nested directory', async () => {
    const fromBundle = resolve(
      gametwo,
      'aiAuthoringBundles/GameTwo_Simple',
    );
    const project = await discoverSfdxProject(fromBundle);
    expect(project).to.not.equal(undefined);
    expect(project!.root).to.equal(gametwo);
    expect(project!.packageDirectories).to.deep.equal([
      resolve(gametwo, 'aiAuthoringBundles'),
      resolve(gametwo, 'classes'),
    ]);
  });

  it('returns undefined when no sfdx-project.json exists above the start dir', async () => {
    // /tmp is highly unlikely to contain an sfdx-project.json.
    const project = await discoverSfdxProject('/tmp');
    expect(project).to.equal(undefined);
  });
});

describe('analyzeSource — multi-root', () => {
  it('accepts an array of source roots and uses reportBase for relative paths', async () => {
    const project = await discoverSfdxProject(gametwo);
    expect(project).to.not.equal(undefined);
    const report = await analyzeSource(project!.packageDirectories, {
      reportBase: project!.root,
    });
    // Paths in the report are relative to the project root, not to a single
    // package directory.
    expect(report.files.map(f => f.path).sort()).to.deep.equal([
      'aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent',
      'aiAuthoringBundles/GameTwo_Simple/GameTwo_Simple.agent',
    ]);
    // Apex resolution should still work because the upward walk reaches the
    // project root, which has `classes/` as a sibling of `aiAuthoringBundles/`.
    expect(report.apexClasses.map(c => c.className).sort()).to.deep.equal([
      'GameTwo_PlayRound',
      'GameTwo_RandomChoice',
    ]);
    expect(report.unresolvedApexTargets).to.deep.equal([]);
    expect(report.totalComplexity).to.equal(21);
    expect(report.totalApexComplexity).to.equal(30);
  });

  it('still accepts a single string root (back-compat)', async () => {
    const report = await analyzeSource(gametwo);
    expect(report.totalComplexity).to.equal(21);
    expect(report.totalApexComplexity).to.equal(30);
  });
});
