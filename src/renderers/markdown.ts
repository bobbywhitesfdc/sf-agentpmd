import type {
  AnalysisReport,
  ApexCCContributor,
  
  CCContributor,
  FileReport,
  ProcedureCC,
} from '../analyzer/types.js';

const KIND_LABEL: Record<ProcedureCC['kind'], string> = {
  after_reasoning: 'after_reasoning',
  available_when: 'available_when',
  before_reasoning: 'before_reasoning',
  other: 'other',
  reasoning_instructions: 'reasoning.instructions',
};

/**
 * Renders a GFM Markdown report with a Mermaid bar chart at the top
 * (agent CC vs Apex CC per bundle) followed by per-bundle and per-class
 * drilldown tables. Designed to be portable into PR descriptions, gists,
 * Slack snippets, and whitepaper appendices.
 *
 * Palette is whitepaper § 1: Reasoning hot (#a82820), Conversation amber
 * (#c4942a), Deterministic green (#6b8c52), Scaffolding cool gray (#9aa5ad).
 */
export function renderMarkdown(report: AnalysisReport): string {
  const lines: string[] = [];
  lines.push('# AgentForce PMD — Cyclomatic Complexity (McCabe)', '', 
    'Per the categorization rule § 7, CC is reported by the standard ' +
      'McCabe convention used in SonarQube / PMD / Checkstyle for the ' +
      'relevant language.', ''
  );

  if (report.files.length === 0) {
    lines.push('_(no `.agent` files found)_');
    return lines.join('\n');
  }

  // ── CC by location chart ──────────────────────────────────────────
  lines.push('## CC by location', '',
    renderMermaid(report), '',
    `| | AgentScript | Apex | Combined |\n` +
      `| --- | ---: | ---: | ---: |\n` +
      `| **Totals** | ${report.totalComplexity} | ${report.totalApexComplexity} | ${report.totalComplexity + report.totalApexComplexity} |`, ''
  , '## Per-bundle (`.agent` files)', '');
  for (const f of report.files) {
    lines.push(`### \`${f.path}\` — CC = ${f.fileComplexity}`, '');
    if (f.procedures.length === 0) {
      lines.push('_(no procedure-bearing scopes)_');
    } else {
      lines.push('| Scope | Procedure | CC | Contributors |', '| --- | --- | ---: | --- |');
      for (const p of f.procedures) {
        lines.push(
          `| ${escapeCell(p.scope)} | ${KIND_LABEL[p.kind]} | ${p.complexity} | ${escapeCell(breakdownProc(p.contributors))} |`,
        );
      }
    }

    lines.push('');

    if (f.declarations.length > 0) {
      lines.push('**Action references**', '', '| Action | Target kind | Target | Uses |', '| --- | --- | --- | ---: |');
      const usage = countReferences(f);
      for (const d of f.declarations) {
        const used = usage.get(d.name) ?? 0;
        lines.push(
          `| \`${d.name}\` | ${d.targetKind} | ${d.target ?? '_n/a_'} | ${used} |`,
        );
      }

      const undeclared = listUndeclaredRefs(f);
      if (undeclared.length > 0) {
        lines.push(
          '',
          'Referenced but not declared in-file: ' + undeclared.map(u => `\`${u}\``).join(', '),
        );
      }

      lines.push('');
    }
  }

  // ── Apex backing logic ────────────────────────────────────────────
  if (report.apexClasses.length > 0 || report.unresolvedApexTargets.length > 0) {
    lines.push('## Apex backing logic', '');
    for (const cls of report.apexClasses) {
      lines.push(
        `### \`${cls.path}\` — class CC = ${cls.classComplexity}`, '',
        `Referenced by: ${cls.referencedBy.map(r => `\`${r}\``).join(', ') || '_none_'}`, '',
      );
      if (cls.methods.length === 0) {
        lines.push('_(no methods with bodies)_');
      } else {
        lines.push('| Method | CC | Contributors |', '| --- | ---: | --- |');
        for (const m of cls.methods) {
          lines.push(
            `| \`${escapeCell(m.signature)}\` | ${m.complexity} | ${escapeCell(breakdownApex(m.contributors))} |`,
          );
        }
      }

      lines.push('');
    }

    if (report.unresolvedApexTargets.length > 0) {
      lines.push('### Unresolved `apex://` targets', '');
      for (const u of report.unresolvedApexTargets) {
        lines.push(`- \`${u}\` — no matching \`.cls\` under \`--source-dir\` or \`--apex-source\``);
      }

      lines.push('');
    }
  }

  // ── Footer ────────────────────────────────────────────────────────
  lines.push('---', '', 
    `Action declarations: **${report.totalDeclarations}** ` +
      `(apex ${report.byTargetKind.apex}, flow ${report.byTargetKind.flow}, ` +
      `prompt ${report.byTargetKind.prompt}, unknown ${report.byTargetKind.unknown}). ` +
      `Action references: **${report.totalReferences}**.`,
  );

  return lines.join('\n');
}

function renderMermaid(report: AnalysisReport): string {
  // Per-bundle agent CC + the sum of Apex CC for classes that bundle
  // references. We compute that mapping rather than counting classes
  // globally so each bundle's bar reflects its full "implementation
  // CC" footprint.
  const apexByBundle = new Map<string, number>();
  for (const cls of report.apexClasses) {
    for (const ref of cls.referencedBy) {
      apexByBundle.set(ref, (apexByBundle.get(ref) ?? 0) + cls.classComplexity);
    }
  }

  const labels: string[] = [];
  const agentVals: number[] = [];
  const apexVals: number[] = [];
  for (const f of report.files) {
    labels.push(shortBundleLabel(f.path));
    agentVals.push(f.fileComplexity);
    apexVals.push(apexByBundle.get(f.path) ?? 0);
  }

  // Mermaid xychart-beta supports stacked-bar style via two series.
  // Palette: AgentScript = Reasoning red (#a82820); Apex = Deterministic green (#6b8c52).
  return [
    '```mermaid',
    '%%{init: {"theme":"base","themeVariables":{"xyChart":{"plotColorPalette":"#a82820, #6b8c52"}}}}%%',
    'xychart-beta',
    '    title "CC by location, per .agent bundle"',
    `    x-axis [${labels.map(l => `"${l}"`).join(', ')}]`,
    `    y-axis "Cyclomatic complexity"`,
    `    bar [${agentVals.join(', ')}]`,
    `    bar [${apexVals.join(', ')}]`,
    '```',
    '',
    '<sub>Series: **AgentScript CC** (red, whitepaper "Reasoning Logic") · **Apex CC** (green, whitepaper "Deterministic Logic"). Apex CC per bundle is the sum of the CC of every `apex://` class that bundle references; classes referenced by multiple bundles contribute to each.</sub>',
  ].join('\n');
}

function shortBundleLabel(path: string): string {
  // Strip "aiAuthoringBundles/" and the trailing ".agent" to keep x-axis tight.
  const stripped = path
    .replace(/^.*aiAuthoringBundles\//, '')
    .replace(/\.agent$/, '');
  // Use only the basename if it appears twice (Bundle/Bundle.agent → Bundle).
  const parts = stripped.split('/');
  if (parts.length === 2 && parts[0] === parts[1]) return parts[0];
  return parts.join('/');
}

function breakdownProc(contributors: CCContributor[]): string {
  if (contributors.length === 0) return '(base only)';
  const counts: Record<string, number> = {};
  for (const c of contributors) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
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

function escapeCell(s: string): string {
  // GFM table cells: escape pipes and turn embedded newlines into <br>.
  return s.replaceAll('|', String.raw`\|`).replaceAll('\n', '<br>');
}

// re-export for tree-shaking unused warnings; ApexClassReport is referenced
// indirectly via report.apexClasses[number].


export {type ApexClassReport} from '../analyzer/types.js';