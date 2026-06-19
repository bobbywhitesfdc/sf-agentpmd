import pc from 'picocolors';

import type {
  AnalysisReport,
  ApexCCContributor,
  FileReport,
  ProcedureCC,
} from '../analyzer/types.js';
import type { RenderOptions } from './options.js';

const KIND_LABEL: Record<ProcedureCC['kind'], string> = {
  after_reasoning: 'after_reasoning',
  available_when: 'available_when',
  before_reasoning: 'before_reasoning',
  other: 'other',
  reasoning_instructions: 'reasoning.instructions',
};

interface Glyphs {
  agentFile: string;
  apexFile: string;
  ruleHeavy: string;
  ruleLight: string;
}

const UNICODE_GLYPHS: Glyphs = {
  agentFile: '📄',
  apexFile: '📜',
  ruleHeavy: '═',
  ruleLight: '─',
};

const ASCII_GLYPHS: Glyphs = {
  agentFile: '[agent]',
  apexFile: '[apex] ',
  ruleHeavy: '=',
  ruleLight: '-',
};

interface ResolvedOptions {
  ascii: boolean;
  color: boolean;
  width: number;
}

function resolveOptions(opts: RenderOptions | undefined): ResolvedOptions {
  // Auto-detect: text + emoji unless explicitly disabled, color on TTY only
  // and respecting the well-known NO_COLOR env var.
  const stdoutIsTty = Boolean(process.stdout.isTTY);
  const noColorEnv = Boolean(process.env.NO_COLOR);
  return {
    ascii: opts?.ascii ?? !stdoutIsTty,
    color: opts?.color ?? (stdoutIsTty && !noColorEnv),
    width: opts?.width ?? 60,
  };
}

export function renderText(report: AnalysisReport, opts?: RenderOptions): string {
  const r = resolveOptions(opts);
  const g = r.ascii ? ASCII_GLYPHS : UNICODE_GLYPHS;
  const c = colorize(r.color);
  const lines: string[] = [];

  lines.push(
    c.title('AgentForce PMD — Cyclomatic Complexity (McCabe)'),
    g.ruleHeavy.repeat(r.width),
  );

  if (report.files.length === 0) {
    lines.push('  (no .agent files found)');
    return lines.join('\n');
  }

  for (const f of report.files) {
    lines.push(
      '',
      `${g.agentFile} ${c.path(f.path)}   CC=${c.cc(f.fileComplexity)}`,
      g.ruleLight.repeat(r.width),
    );

    if (f.procedures.length === 0) {
      lines.push('  (no procedure-bearing scopes)');
    } else {
      const scopes = groupByScope(f.procedures);
      for (const [scope, procs] of scopes) {
        const scopeTotal = procs.reduce((a, p) => a + p.complexity, 0);
        lines.push(`  ${c.scope(scope)}   subtotal CC=${c.cc(scopeTotal)}`);
        for (const p of procs) {
          lines.push(
            `    ${pad(KIND_LABEL[p.kind], 24)} CC=${c.cc(p.complexity)}   ` +
              c.breakdown(breakdownProc(p)),
          );
        }
      }
    }

    if (f.declarations.length > 0 || f.references.length > 0) {
      lines.push(
        '',
        '  Action references',
        '  ' + g.ruleLight.repeat(Math.max(0, r.width - 2)),
      );
      const usage = countReferences(f);
      for (const d of f.declarations) {
        const used = usage.get(d.name) ?? 0;
        const tgt = d.target ?? '(no target)';
        lines.push(
          `    ${pad(d.name, 32)} [${pad(d.targetKind, 6)}] used ${used}x → ${tgt}`,
        );
      }

      const undeclared = listUndeclaredRefs(f);
      if (undeclared.length > 0) {
        lines.push('', '    Referenced but not declared in-file:');
        for (const u of undeclared) {
          lines.push(`      ${u}`);
        }
      }
    }
  }

  if (report.apexClasses.length > 0 || report.unresolvedApexTargets.length > 0) {
    lines.push(
      '',
      c.title('Apex backing logic (resolved via apex:// targets)'),
      g.ruleHeavy.repeat(r.width),
    );
    for (const cls of report.apexClasses) {
      lines.push(
        '',
        `${g.apexFile} ${c.path(cls.path)}   class CC=${c.cc(cls.classComplexity)}`,
        `   referenced by: ${cls.referencedBy.join(', ') || '(none)'}`,
        g.ruleLight.repeat(r.width),
      );
      if (cls.methods.length === 0) {
        lines.push('   (no methods with bodies)');
      } else {
        for (const m of cls.methods) {
          lines.push(
            `   ${pad(m.signature, 44)} CC=${c.cc(m.complexity)}   ${c.breakdown(breakdownApex(m.contributors))}`,
          );
        }
      }
    }

    if (report.unresolvedApexTargets.length > 0) {
      lines.push('', 'Unresolved apex:// targets:');
      for (const u of report.unresolvedApexTargets) {
        lines.push(
          `  - ${u}  (no matching .cls under source-dir or --apex-source)`,
        );
      }
    }
  }

  lines.push(
    '',
    g.ruleHeavy.repeat(r.width),
    c.title('CC by location (whitepaper § 7)'),
    `  AgentScript: ${c.cc(report.totalComplexity)}` +
      `   Apex: ${c.cc(report.totalApexComplexity)}` +
      `   Combined: ${c.cc(report.totalComplexity + report.totalApexComplexity)}`,
    `Action declarations: ${report.totalDeclarations}  ` +
      `(apex ${report.byTargetKind.apex}, flow ${report.byTargetKind.flow}, ` +
      `prompt ${report.byTargetKind.prompt}, unknown ${report.byTargetKind.unknown})`, `Action references:   ${report.totalReferences}`
  
  );
  return lines.join('\n');
}

interface Colorizer {
  breakdown: (s: string) => string;
  cc: (n: number) => string;
  path: (s: string) => string;
  scope: (s: string) => string;
  title: (s: string) => string;
}

function colorize(on: boolean): Colorizer {
  if (!on) {
    return {
      breakdown: s => s,
      cc: String,
      path: s => s,
      scope: s => s,
      title: s => s,
    };
  }

  return {
    breakdown: pc.gray,
    cc(n: number) {
      // Palette echoes whitepaper temperature: cool for low, hot for high.
      const s = String(n);
      if (n >= 20) return pc.red(s);
      if (n >= 10) return pc.yellow(s);
      if (n >= 5) return pc.green(s);
      return pc.gray(s);
    },
    path: pc.cyan,
    scope: pc.bold,
    title: pc.bold,
  };
}

function breakdownProc(p: ProcedureCC): string {
  if (p.contributors.length === 0) return '(base only)';
  const counts: Record<string, number> = {};
  for (const c of p.contributors) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
  return Object.entries(counts)
    .map(([k, n]) => `${shortKind(k)}=${n}`)
    .join(' ');
}

function breakdownApex(contributors: ApexCCContributor[]): string {
  if (contributors.length === 0) return '(base only)';
  const counts: Record<string, number> = {};
  for (const c of contributors) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
  return Object.entries(counts)
    .map(([k, n]) => `${shortApexKind(k)}=${n}`)
    .join(' ');
}

function shortKind(k: string): string {
  switch (k) {
    case 'elif_clause': {
      return 'elif';
    }

    case 'if_statement': {
      return 'if';
    }

    case 'short_circuit_and': {
      return 'and';
    }

    case 'short_circuit_or': {
      return 'or';
    }

    case 'ternary_expression': {
      return 'ternary';
    }

    default: {
      return k;
    }
  }
}

function shortApexKind(k: string): string {
  switch (k) {
    case 'catch_clause': {
      return 'catch';
    }

    case 'do_while_statement': {
      return 'do-while';
    }

    case 'for_statement': {
      return 'for';
    }

    case 'if_statement': {
      return 'if';
    }

    case 'short_circuit_and': {
      return '&&';
    }

    case 'short_circuit_or': {
      return '||';
    }

    case 'ternary': {
      return 'ternary';
    }

    case 'when_arm': {
      return 'when';
    }

    case 'while_statement': {
      return 'while';
    }

    default: {
      return k;
    }
  }
}

function groupByScope(procs: ProcedureCC[]): Map<string, ProcedureCC[]> {
  const m = new Map<string, ProcedureCC[]>();
  for (const p of procs) {
    let arr = m.get(p.scope);
    if (!arr) {
      arr = [];
      m.set(p.scope, arr);
    }

    arr.push(p);
  }

  return m;
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s;
  return s + ' '.repeat(n - s.length);
}

function countReferences(f: FileReport): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of f.references) m.set(r.name, (m.get(r.name) ?? 0) + 1);
  return m;
}

function listUndeclaredRefs(f: FileReport): string[] {
  const declared = new Set(f.declarations.map(d => d.name));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of f.references) {
    if (declared.has(r.name)) continue;
    if (seen.has(r.name)) continue;
    seen.add(r.name);
    out.push(r.name);
  }

  return out;
}
