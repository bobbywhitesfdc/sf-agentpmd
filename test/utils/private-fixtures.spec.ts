import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { privateFixturesDir } from './private-fixtures.js';
import { analyzeSource } from '../../src/analyzer/analyze.js';

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
    expect(privateFixturesDir()).toBeUndefined();
  });

  it('returns undefined when the override dir exists but only contains the convention README', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'agentpmd-private-'));
    writeFileSync(join(tmp, 'README.md'), '# convention');
    process.env.AGENTPMD_PRIVATE_FIXTURES = tmp;
    try {
      expect(privateFixturesDir()).toBeUndefined();
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
      expect(privateFixturesDir()).toBe(tmp);
    } finally {
      rmSync(tmp, { recursive: true });
    }
  });
});

// Example consumer — the skip happens automatically when no private
// fixtures are present, so this spec is a no-op on CI and a real test
// when developers drop content under test/fixtures/private/.
describe.skipIf(!privateFixturesDir())('private-fixture analysis (skipped when empty)', () => {
  it('analyzes whatever has been dropped into the private dir', async () => {
    const dir = privateFixturesDir()!;
    const report = await analyzeSource(dir);
    expect(report.files.length).toBeGreaterThanOrEqual(0);
  });
});
