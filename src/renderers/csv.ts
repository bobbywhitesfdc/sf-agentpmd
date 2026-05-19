import type {
  AnalysisReport,
  ApexCCContributor,
  CCContributor,
} from '../analyzer/types.js';

/**
 * Single CSV with all per-procedure and per-method rows so a spreadsheet
 * can pivot on `type` and `file`. RFC 4180-quoted; first row is the header.
 */
export function renderCsv(report: AnalysisReport): string {
  const lines: string[] = [];
  lines.push(
    [
      'type',
      'file',
      'scope_or_class',
      'name',
      'complexity',
      'start_row',
      'start_col',
      'contributors',
    ]
      .map(csvCell)
      .join(','),
  );

  for (const f of report.files) {
    for (const p of f.procedures) {
      lines.push(
        [
          'agent_procedure',
          f.path,
          p.scope,
          p.kind,
          String(p.complexity),
          String(p.location.startRow),
          String(p.location.startCol),
          breakdownProc(p.contributors),
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }

  for (const cls of report.apexClasses) {
    for (const m of cls.methods) {
      lines.push(
        [
          'apex_method',
          cls.path,
          cls.className,
          m.signature,
          String(m.complexity),
          String(m.location.startRow),
          String(m.location.startCol),
          breakdownApex(m.contributors),
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }

  return lines.join('\n');
}

function csvCell(v: string): string {
  // Always quote — keeps the output uniform and lets cells contain
  // commas, quotes, and newlines without per-cell branching.
  return `"${v.replace(/"/g, '""')}"`;
}

function breakdownProc(contributors: CCContributor[]): string {
  if (contributors.length === 0) return 'base';
  const counts: Record<string, number> = {};
  for (const c of contributors) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
  return Object.entries(counts)
    .map(([k, n]) => `${k}=${n}`)
    .join(';');
}

function breakdownApex(contributors: ApexCCContributor[]): string {
  if (contributors.length === 0) return 'base';
  const counts: Record<string, number> = {};
  for (const c of contributors) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
  return Object.entries(counts)
    .map(([k, n]) => `${k}=${n}`)
    .join(';');
}
