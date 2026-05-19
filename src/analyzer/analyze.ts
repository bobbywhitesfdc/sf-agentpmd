import { readFile } from 'node:fs/promises';
import { readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type {
  ActionDeclaration,
  ActionReference,
  ActionTargetKind,
  AnalysisReport,
  FileReport,
  ProcedureCC,
} from './types.js';
import { parseAgentSource } from './parse.js';
import { collectScopes, complexityForFile } from './complexity.js';
import { collectDeclarations, collectReferences } from './action-references.js';
import { analyzeReferencedApex } from './apex-analyze.js';

export interface AnalyzeOptions {
  /** Override location for apex:// resolution. Optional. */
  apexSourceOverride?: string;
}

export async function analyzeSource(
  rootPath: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisReport> {
  const absRoot = resolve(rootPath);
  const files = await findAgentFiles(absRoot);

  const fileReports: FileReport[] = [];
  for (const file of files) {
    fileReports.push(await analyzeFile(file, absRoot));
  }

  const apex = await analyzeReferencedApex({
    fileReports,
    sourceDirRoot: absRoot,
    apexSourceOverride: options.apexSourceOverride,
    agentAbsPaths: files,
  });

  const report: AnalysisReport = {
    files: fileReports,
    totalComplexity: fileReports.reduce((acc, f) => acc + f.fileComplexity, 0),
    totalDeclarations: fileReports.reduce((acc, f) => acc + f.declarations.length, 0),
    totalReferences: fileReports.reduce((acc, f) => acc + f.references.length, 0),
    byTargetKind: tallyTargets(fileReports),
    apexClasses: apex.classes,
    totalApexComplexity: apex.classes.reduce((acc, c) => acc + c.classComplexity, 0),
    unresolvedApexTargets: apex.unresolved,
  };
  return report;
}

export async function analyzeFile(absPath: string, base: string): Promise<FileReport> {
  const source = await readFile(absPath, 'utf8');
  const root = parseAgentSource(source);

  const cc = complexityForFile(root);
  const procedures: ProcedureCC[] = cc.procedures;

  const scopes = collectScopes(root);
  const declarations: ActionDeclaration[] = [];
  const references: ActionReference[] = [];
  for (const s of scopes) {
    declarations.push(...collectDeclarations(s));
    references.push(...collectReferences(s));
  }

  return {
    path: relative(base, absPath),
    procedures,
    fileComplexity: cc.total,
    declarations,
    references,
    parseErrors: [], // CST is error-tolerant; surface diagnostics in a later iteration.
  };
}

async function findAgentFiles(root: string): Promise<string[]> {
  const s = await stat(root).catch(() => undefined);
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
    utils: 0,
    unknown: 0,
  };
  for (const f of files) for (const d of f.declarations) acc[d.targetKind]++;
  return acc;
}
