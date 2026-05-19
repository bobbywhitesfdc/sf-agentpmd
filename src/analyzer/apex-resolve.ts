import { stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

const APEX_SCHEME = /^apex:\/\/(.+)$/;

export function extractApexClassName(uri: string): string | undefined {
  const m = APEX_SCHEME.exec(uri);
  if (!m) return undefined;
  // `apex://Foo` or `apex://namespace__Foo`; take the trailing simple name.
  const raw = m[1].trim();
  const dot = raw.lastIndexOf('.');
  return dot >= 0 ? raw.slice(dot + 1) : raw;
}

export interface ResolveOptions {
  /**
   * The .agent file that holds the apex:// reference. Used as the seed for
   * the upward walk.
   */
  agentFilePath: string;
  /**
   * The CLI `--source-dir` value. We never walk above this directory.
   */
  sourceDirRoot: string;
  /**
   * Optional `--apex-source` override. When set, classes are looked up here
   * before falling back to the upward walk.
   */
  apexSourceOverride?: string;
}

/**
 * Find `classes/<ClassName>.cls` by walking up from the .agent file. The walk
 * stops at the CLI's source-dir root so we never escape it. Returns the
 * absolute path or undefined.
 *
 * Path conventions covered:
 *   - sfdx default: <pkg>/main/default/classes/<X>.cls, with the .agent in
 *     <pkg>/main/default/aiAuthoringBundles/<Bundle>/<X>.agent
 *   - flat fixtures: <root>/classes/<X>.cls, with .agent under
 *     <root>/aiAuthoringBundles/<Bundle>/<X>.agent
 *   - explicit override: --apex-source <dir>/<X>.cls
 */
export async function resolveApexClassPath(
  className: string,
  opts: ResolveOptions,
): Promise<string | undefined> {
  const candidates: string[] = [];

  if (opts.apexSourceOverride) {
    const override = isAbsolute(opts.apexSourceOverride)
      ? opts.apexSourceOverride
      : resolve(opts.apexSourceOverride);
    candidates.push(join(override, `${className}.cls`));
    candidates.push(join(override, 'classes', `${className}.cls`));
  }

  const stop = resolve(opts.sourceDirRoot);
  let dir = dirname(resolve(opts.agentFilePath));
  while (true) {
    candidates.push(join(dir, 'classes', `${className}.cls`));
    if (dir === stop) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const c of candidates) {
    const s = await stat(c).catch(() => undefined);
    if (s?.isFile()) return c;
  }
  return undefined;
}

/** True if `child` is the same as or a subpath of `parent` (path-segment safe). */
export function isUnder(child: string, parent: string): boolean {
  const c = resolve(child);
  const p = resolve(parent);
  if (c === p) return true;
  return c.startsWith(p.endsWith(sep) ? p : p + sep);
}
