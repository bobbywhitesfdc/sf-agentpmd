import type { AnalysisReport, FileReport, ProcedureCC } from './types.js';

const KIND_LABEL: Record<ProcedureCC['kind'], string> = {
  before_reasoning: 'before_reasoning',
  after_reasoning: 'after_reasoning',
  reasoning_instructions: 'reasoning.instructions',
  available_when: 'available_when',
  other: 'other',
};

export function renderText(report: AnalysisReport): string {
  const lines: string[] = [];
  lines.push('AgentForce PMD — Cyclomatic Complexity (McCabe)');
  lines.push('═'.repeat(60));

  if (report.files.length === 0) {
    lines.push('  (no .agent files found)');
    return lines.join('\n');
  }

  for (const f of report.files) {
    lines.push('');
    lines.push(`📄 ${f.path}   CC=${f.fileComplexity}`);
    lines.push('─'.repeat(60));

    if (f.procedures.length === 0) {
      lines.push('  (no procedure-bearing scopes)');
    } else {
      const scopes = groupByScope(f.procedures);
      for (const [scope, procs] of scopes) {
        const scopeTotal = procs.reduce((a, p) => a + p.complexity, 0);
        lines.push(`  ${scope}   subtotal CC=${scopeTotal}`);
        for (const p of procs) {
          lines.push(
            `    ${pad(KIND_LABEL[p.kind], 24)} CC=${p.complexity}   ` +
              breakdown(p),
          );
        }
      }
    }

    if (f.declarations.length || f.references.length) {
      lines.push('');
      lines.push('  Action references');
      lines.push('  ' + '─'.repeat(58));
      const usage = countReferences(f);
      for (const d of f.declarations) {
        const used = usage.get(d.name) ?? 0;
        const tgt = d.target ?? '(no target)';
        lines.push(
          `    ${pad(d.name, 32)} [${pad(d.targetKind, 6)}] used ${used}x → ${tgt}`,
        );
      }
      const undeclared = listUndeclaredRefs(f);
      if (undeclared.length) {
        lines.push('');
        lines.push('    Referenced but not declared in-file:');
        for (const u of undeclared) {
          lines.push(`      ${u}`);
        }
      }
    }
  }

  if (report.apexClasses.length || report.unresolvedApexTargets.length) {
    lines.push('');
    lines.push('Apex backing logic (resolved via apex:// targets)');
    lines.push('═'.repeat(60));
    for (const c of report.apexClasses) {
      lines.push('');
      lines.push(`📜 ${c.path}   class CC=${c.classComplexity}`);
      lines.push(`   referenced by: ${c.referencedBy.join(', ') || '(none)'}`);
      lines.push('─'.repeat(60));
      if (c.methods.length === 0) {
        lines.push('   (no methods with bodies)');
      } else {
        for (const m of c.methods) {
          lines.push(
            `   ${pad(m.signature, 44)} CC=${m.complexity}   ${apexBreakdown(m.contributors)}`,
          );
        }
      }
    }
    if (report.unresolvedApexTargets.length) {
      lines.push('');
      lines.push('Unresolved apex:// targets:');
      for (const u of report.unresolvedApexTargets) {
        lines.push(`  - ${u}  (no matching .cls under source-dir or --apex-source)`);
      }
    }
  }

  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('CC by location (whitepaper § 7)');
  lines.push(
    `  AgentScript: ${report.totalComplexity}` +
      `   Apex: ${report.totalApexComplexity}` +
      `   Combined: ${report.totalComplexity + report.totalApexComplexity}`,
  );
  lines.push(
    `Action declarations: ${report.totalDeclarations}  ` +
      `(apex ${report.byTargetKind.apex}, flow ${report.byTargetKind.flow}, ` +
      `prompt ${report.byTargetKind.prompt}, unknown ${report.byTargetKind.unknown})`,
  );
  lines.push(`Action references:   ${report.totalReferences}`);
  return lines.join('\n');
}

function apexBreakdown(contributors: AnalysisReport['apexClasses'][number]['methods'][number]['contributors']): string {
  if (contributors.length === 0) return '(base only)';
  const counts: Record<string, number> = {};
  for (const c of contributors) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
  return Object.entries(counts)
    .map(([k, n]) => `${shortApexKind(k)}=${n}`)
    .join(' ');
}

function shortApexKind(k: string): string {
  switch (k) {
    case 'if_statement':
      return 'if';
    case 'for_statement':
      return 'for';
    case 'while_statement':
      return 'while';
    case 'do_while_statement':
      return 'do-while';
    case 'when_arm':
      return 'when';
    case 'catch_clause':
      return 'catch';
    case 'ternary':
      return 'ternary';
    case 'short_circuit_and':
      return '&&';
    case 'short_circuit_or':
      return '||';
    default:
      return k;
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

function breakdown(p: ProcedureCC): string {
  if (p.contributors.length === 0) return '(base only)';
  const counts: Record<string, number> = {};
  for (const c of p.contributors) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
  return Object.entries(counts)
    .map(([k, n]) => `${shortKind(k)}=${n}`)
    .join(' ');
}

function shortKind(k: string): string {
  switch (k) {
    case 'if_statement':
      return 'if';
    case 'elif_clause':
      return 'elif';
    case 'ternary_expression':
      return 'ternary';
    case 'short_circuit_and':
      return 'and';
    case 'short_circuit_or':
      return 'or';
    default:
      return k;
  }
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
