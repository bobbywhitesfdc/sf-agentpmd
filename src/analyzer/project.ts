import { readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export interface SfdxProject {
  /** Absolute paths of every `packageDirectories[].path`, in declaration order. */
  packageDirectories: string[];
  /** Absolute path of the project root (the directory containing sfdx-project.json). */
  root: string;
}

/**
 * Walk up from `startDir` until we find a directory containing
 * `sfdx-project.json`, then return its root + resolved package directories.
 * Returns undefined when no project is found.
 */
export async function discoverSfdxProject(
  startDir: string,
): Promise<SfdxProject | undefined> {
  let dir = resolve(startDir);
  while (true) {
    const candidate = join(dir, 'sfdx-project.json');
    const s = await stat(candidate).catch(() => {});
    if (s?.isFile()) {
      return readProject(dir, candidate);
    }

    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

async function readProject(root: string, jsonPath: string): Promise<SfdxProject> {
  const raw = await readFile(jsonPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `failed to parse ${jsonPath}: ${(error as Error).message}`,
    );
  }

  const pkgs = extractPackageDirectories(parsed, root);
  return { packageDirectories: pkgs, root };
}

function extractPackageDirectories(parsed: unknown, root: string): string[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const obj = parsed as { packageDirectories?: unknown };
  if (!Array.isArray(obj.packageDirectories)) return [];
  const out: string[] = [];
  for (const entry of obj.packageDirectories) {
    if (!entry || typeof entry !== 'object') continue;
    const pathField = (entry as { path?: unknown }).path;
    if (typeof pathField !== 'string' || pathField.length === 0) continue;
    out.push(isAbsolute(pathField) ? pathField : resolve(root, pathField));
  }

  return out;
}
