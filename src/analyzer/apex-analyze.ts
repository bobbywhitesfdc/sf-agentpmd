import { readFile } from 'node:fs/promises';
import { relative, basename } from 'node:path';
import type {
  ApexClassReport,
  ApexMethodCC,
  FileReport,
} from './types.js';
import { parseApexSource } from './apex-parse.js';
import { complexityOfMethod, methodsInCompilationUnit } from './apex-complexity.js';
import {
  extractApexClassName,
  resolveApexClassPath,
} from './apex-resolve.js';

/** Inputs needed to resolve and analyze every apex:// target in the bundle. */
export interface ApexAnalyzeInputs {
  fileReports: FileReport[];
  sourceDirRoot: string;
  apexSourceOverride?: string;
  /** Absolute paths of every .agent file analyzed, parallel to fileReports. */
  agentAbsPaths: string[];
}

export interface ApexAnalyzeOutputs {
  classes: ApexClassReport[];
  unresolved: string[];
}

export async function analyzeReferencedApex(
  inputs: ApexAnalyzeInputs,
): Promise<ApexAnalyzeOutputs> {
  const byPath = new Map<string, ApexClassReport>();
  const unresolved = new Set<string>();

  for (let i = 0; i < inputs.fileReports.length; i++) {
    const fr = inputs.fileReports[i];
    const agentAbs = inputs.agentAbsPaths[i];
    for (const decl of fr.declarations) {
      if (decl.targetKind !== 'apex' || !decl.target) continue;
      const className = extractApexClassName(decl.target);
      if (!className) {
        unresolved.add(decl.target);
        continue;
      }
      const path = await resolveApexClassPath(className, {
        agentFilePath: agentAbs,
        sourceDirRoot: inputs.sourceDirRoot,
        apexSourceOverride: inputs.apexSourceOverride,
      });
      if (!path) {
        unresolved.add(decl.target);
        continue;
      }

      const existing = byPath.get(path);
      if (existing) {
        if (!existing.referencedBy.includes(fr.path)) {
          existing.referencedBy.push(fr.path);
        }
        continue;
      }

      const report = await analyzeApexClass(path, className, [fr.path], inputs.sourceDirRoot);
      byPath.set(path, report);
    }
  }

  return {
    classes: Array.from(byPath.values()).sort((a, b) => a.className.localeCompare(b.className)),
    unresolved: Array.from(unresolved).sort(),
  };
}

async function analyzeApexClass(
  absPath: string,
  className: string,
  referencedBy: string[],
  sourceDirRoot: string,
): Promise<ApexClassReport> {
  const source = await readFile(absPath, 'utf8');
  const cu = parseApexSource(source);
  const methodCtxs = methodsInCompilationUnit(cu);
  const methods: ApexMethodCC[] = methodCtxs.map(complexityOfMethod);
  const classComplexity = methods.reduce((acc, m) => acc + m.complexity, 0);

  return {
    className: className || basename(absPath, '.cls'),
    path: relative(sourceDirRoot, absPath),
    referencedBy,
    methods,
    classComplexity,
    parseErrors: [],
  };
}
