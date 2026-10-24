import { expect } from 'chai';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { analyzeSource } from '../../src/analyzer/analyze.js';
import { privateFixturesDir } from './private-fixtures.js';

describe('privateFixturesDir() helper', () => {
  const originalEnv = process.env.AGENTPMD_PRIVATE_FIXTURES;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AGENTPMD_PRIVATE_FIXTURES;
    } else {
      process.env.AGENTPMD_PRIVATE_FIXTURES = originalEnv;
    }
  });

  it('returns undefined when AGENTPMD_PRIVATE_FIXTURES points at a non-existent path', () => {
    process.env.AGENTPMD_PRIVATE_FIXTURES = '/nonexistent/path/here';
    expect(privateFixturesDir()).to.equal(undefined);
  });

  it('returns undefined when the override dir exists but only contains the convention README', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'agentpmd-private-'));
    writeFileSync(join(tmp, 'README.md'), '# convention');
    process.env.AGENTPMD_PRIVATE_FIXTURES = tmp;
    try {
      expect(privateFixturesDir()).to.equal(undefined);
    } finally {
      rmSync(tmp, { recursive: true });
    }
  });

  it('returns the absolute path when the override dir contains real content', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'agentpmd-private-'));
    writeFileSync(join(tmp, 'README.md'), '# convention');
    writeFileSync(join(tmp, 'something.agent'), 'system:\n');
    process.env.AGENTPMD_PRIVATE_FIXTURES = tmp;
    try {
      expect(privateFixturesDir()).to.equal(tmp);
    } finally {
      rmSync(tmp, { recursive: true });
    }
  });
});

// Example consumer — the skip happens automatically when no private
// fixtures are present, so this spec is a no-op on CI and a real test
// when developers drop content under test/fixtures/private/.
//
// Mocha has no `describe.skipIf`; replicate vitest's semantics with the
// `(cond ? describe.skip : describe)` idiom, preserving the original
// `!privateFixturesDir()` skip condition exactly.
const describePrivate = privateFixturesDir() ? describe : describe.skip;
describePrivate('private-fixture analysis (skipped when empty)', () => {
  it('analyzes whatever has been dropped into the private dir', async () => {
    const dir = privateFixturesDir()!;
    const report = await analyzeSource(dir);
    expect(report.files.length).to.be.at.least(0);
  });

  it('produces CC > 0 across private fixtures (base64 decode regression)', async () => {
    // Guards against the issue-7 regression: base64-encoded .agent files being
    // read as raw bytes, producing CC = 0 for every bundle. Any real-world
    // fixture set that contains AgentScript content should yield totalComplexity > 0.
    const dir = privateFixturesDir()!;
    const report = await analyzeSource(dir);
    if (report.files.length === 0) return; // empty dir — nothing to assert
    expect(report.totalComplexity).to.be.greaterThan(
      0,
      `All ${report.files.length} bundle(s) returned CC = 0 — likely a base64 decode failure`,
    );
  });
});
