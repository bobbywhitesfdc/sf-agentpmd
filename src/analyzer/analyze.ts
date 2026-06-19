import { readdir , readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

import type {
  ActionDeclaration,
  ActionReference,
  ActionTargetKind,
  AnalysisReport,
  FileReport,
} from './types.js';

import { collectDeclarations, collectReferences } from './action-references.js';
import { analyzeReferencedApex } from './apex-analyze.js';
import { collectScopes, complexityForFile } from './complexity.js';
import { extractDeveloperName, parseAgentSource } from './parse.js';

export interface AnalyzeOptions {
  /** Override location for apex:// resolution. Optional. */
  apexSourceOverride?: string;
  /**
   * Filter to specific agent bundles by API name. Each entry is matched
   * against (a) the bundle directory name and (b) `config.developer_name`
   * inside the .agent file. When omitted or empty, all discovered bundles
   * are analyzed.
   */
  apiNames?: string[];
  /**
   * Base directory for relative paths in the report. Defaults to the source
   * root (or, when multiple roots are supplied, the longest common ancestor).
   */
  reportBase?: string;
}

/**
 * Error thrown when --api-name filters produce no matches. Carries the
 * candidate list so callers can show a useful hint.
 */
export class NoMatchingBundlesError extends Error {
  constructor(
    public readonly requested: string[],
    public readonly available: BundleIdentity[],
  ) {
    super(
      `No agent bundle matched ${requested.map(n => `'${n}'`).join(', ')}. ` +
        `Available: ${available.map((b) => formatBundleIdentity(b)).join(', ')}`,
    );
    this.name = 'NoMatchingBundlesError';
  }
}

export interface BundleIdentity {
  /** The config.developer_name value, if present. */
  developerName: string | undefined;
  /** The bundle's directory name (parent of the .agent file). */
  dirName: string;
  /** Absolute path of the .agent file. */
  path: string;
}

function formatBundleIdentity(b: BundleIdentity): string {
  if (b.developerName && b.developerName !== b.dirName) {
    return `${b.developerName} (dir: ${b.dirName})`;
  }

  return b.dirName;
}

/**
 * Analyze AgentScript bundles under one or more source roots.
 *
 * Backward-compatible: pass a single path (string) for the legacy
 * single-root case. Pass an array of paths for multi-root analysis
 * (e.g. multiple `packageDirectories` in an sfdx project).
 */
export async function analyzeSource(
  rootPathOrPaths: string | string[],
  options: AnalyzeOptions = {},
): Promise<AnalysisReport> {
  const rawRoots = Array.isArray(rootPathOrPaths)
    ? rootPathOrPaths
    : [rootPathOrPaths];
  if (rawRoots.length === 0) {
    throw new Error('analyzeSource requires at least one source path');
  }

  const absRoots = rawRoots.map(p => resolve(p));
  const reportBase = options.reportBase
    ? resolve(options.reportBase)
    : absRoots.length === 1
      ? absRoots[0]
      : longestCommonAncestor(absRoots);

  const allFiles: string[] = [];
  for (const root of absRoots) {
    const files = await findAgentFiles(root);
    for (const f of files) if (!allFiles.includes(f)) allFiles.push(f);
  }

  allFiles.sort();

  const filteredFiles = await filterByApiNames(allFiles, options.apiNames);

  const fileReports: FileReport[] = [];
  for (const file of filteredFiles) {
    fileReports.push(await analyzeFile(file, reportBase));
  }

  const apex = await analyzeReferencedApex({
    agentAbsPaths: filteredFiles,
    apexSourceOverride: options.apexSourceOverride,
    fileReports,
    sourceDirRoot: reportBase,
  });

  const report: AnalysisReport = {
    apexClasses: apex.classes,
    byTargetKind: tallyTargets(fileReports),
    files: fileReports,
    totalApexComplexity: apex.classes.reduce((acc, c) => acc + c.classComplexity, 0),
    totalComplexity: fileReports.reduce((acc, f) => acc + f.fileComplexity, 0),
    totalDeclarations: fileReports.reduce((acc, f) => acc + f.declarations.length, 0),
    totalReferences: fileReports.reduce((acc, f) => acc + f.references.length, 0),
    unresolvedApexTargets: apex.unresolved,
  };
  return report;
}

export async function analyzeFile(absPath: string, base: string): Promise<FileReport> {
  const source = await readFile(absPath, 'utf8');
  const root = parseAgentSource(source);

  const cc = complexityForFile(root);
  const {procedures} = cc;

  const scopes = collectScopes(root);
  const declarations: ActionDeclaration[] = [];
  const references: ActionReference[] = [];
  for (const s of scopes) {
    declarations.push(...collectDeclarations(s));
    references.push(...collectReferences(s));
  }

  return {
    declarations,
    fileComplexity: cc.total,
    parseErrors: [], // CST is error-tolerant; surface diagnostics in a later iteration.
    path: relative(base, absPath),
    procedures,
    references,
  };
}

async function findAgentFiles(root: string): Promise<string[]> {
  const s = await stat(root).catch(() => {});
  if (!s) throw new Error(`source path does not exist: ${root}`);
  if (s.isFile()) return root.endsWith('.agent') ? [root] : [];

  const out: string[] = [];
  const visit = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      if (e.name === 'node_modules' || e.name === 'vendor' || e.name === 'lib') continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) await visit(full);
      else if (e.isFile() && e.name.endsWith('.agent')) out.push(full);
    }
  };

  await visit(root);
  out.sort();
  return out;
}

function tallyTargets(files: FileReport[]): Record<ActionTargetKind, number> {
  const acc: Record<ActionTargetKind, number> = {
    apex: 0,
    flow: 0,
    prompt: 0,
    unknown: 0,
    utils: 0,
  };
  for (const f of files) for (const d of f.declarations) acc[d.targetKind]++;
  return acc;
}

/**
 * Filter the discovered .agent file list by the supplied `--api-name`
 * values. A bundle matches if (a) its directory name equals a requested
 * name, or (b) its `config.developer_name` equals one. Bundles whose dir
 * name already matches are kept without parsing; only the remainder are
 * parsed for `developer_name` resolution.
 *
 * Throws NoMatchingBundlesError when filters were supplied but nothing
 * matched, so callers can show the available list.
 */
async function filterByApiNames(
  files: string[],
  apiNames: string[] | undefined,
): Promise<string[]> {
  if (!apiNames || apiNames.length === 0) return files;
  const wanted = new Set(apiNames);

  const matches: string[] = [];
  const unmatched: string[] = [];
  for (const file of files) {
    const dirName = basename(dirname(file));
    if (wanted.has(dirName)) {
      matches.push(file);
    } else {
      unmatched.push(file);
    }
  }

  if (matches.length === files.length || unmatched.length === 0) {
    return matches;
  }

  // Slow path: parse the still-unmatched files to read developer_name.
  const identities: BundleIdentity[] = [];
  for (const file of unmatched) {
    const dirName = basename(dirname(file));
    const developerName = await readDeveloperName(file);
    identities.push({ developerName, dirName, path: file });
    if (developerName && wanted.has(developerName)) {
      matches.push(file);
    }
  }

  if (matches.length === 0) {
    // Build the full candidate list (matched dirs + parsed unmatched) for
    // the error message.
    const all: BundleIdentity[] = [];
    for (const file of files) {
      const existing = identities.find(i => i.path === file);
      if (existing) {
        all.push(existing);
      } else {
        all.push({
          developerName: await readDeveloperName(file),
          dirName: basename(dirname(file)),
          path: file,
        });
      }
    }

    all.sort((a, b) => a.dirName.localeCompare(b.dirName));
    throw new NoMatchingBundlesError(apiNames, all);
  }

  matches.sort();
  return matches;
}

async function readDeveloperName(file: string): Promise<string | undefined> {
  const source = await readFile(file, 'utf8');
  const root = parseAgentSource(source);
  return extractDeveloperName(root);
}

function longestCommonAncestor(paths: string[]): string {
  if (paths.length === 0) return process.cwd();
  if (paths.length === 1) return paths[0];
  const split = paths.map(p => p.split('/'));
  const minLen = Math.min(...split.map(s => s.length));
  const common: string[] = [];
  for (let i = 0; i < minLen; i++) {
    const seg = split[0][i];
    if (split.every(s => s[i] === seg)) common.push(seg);
    else break;
  }

  const joined = common.join('/') || '/';
  return joined;
}
