import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PRIVATE_DIR = resolve(here, '..', 'fixtures', 'private');

/**
 * Resolve the directory of private (uncommitted) fixtures. Honors the
 * `AGENTPMD_PRIVATE_FIXTURES` env var as an override; otherwise falls back
 * to `test/fixtures/private/` inside the repo. Returns the absolute path
 * **only when the directory exists and contains something other than the
 * convention README**. Otherwise returns undefined so tests can skip
 * cleanly.
 */
export function privateFixturesDir(): string | undefined {
  const envOverride = process.env.AGENTPMD_PRIVATE_FIXTURES;
  const dir = envOverride
    ? isAbsolute(envOverride)
      ? envOverride
      : resolve(envOverride)
    : DEFAULT_PRIVATE_DIR;

  if (!existsSync(dir)) return undefined;
  if (!statSync(dir).isDirectory()) return undefined;

  const entries = readdirSync(dir).filter(name => {
    if (name.startsWith('.')) return false;
    // The committed README documents the convention; it shouldn't satisfy
    // "has content" on its own.
    if (name.toLowerCase() === 'readme.md') return false;
    return true;
  });
  return entries.length > 0 ? dir : undefined;
}
