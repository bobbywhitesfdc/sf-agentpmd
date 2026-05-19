import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeSource } from '../../src/analyzer/analyze.js';
import {
  render,
  renderText,
  renderMarkdown,
  renderSarif,
  renderCsv,
} from '../../src/renderers/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const gametwo = resolve(here, '..', 'fixtures', 'gametwo');

describe('renderers — gametwo end-to-end', () => {
  it('text renderer: ASCII mode drops emoji and Unicode box chars', async () => {
    const report = await analyzeSource(gametwo);
    const out = renderText(report, { ascii: true, color: false, width: 60 });
    expect(out).not.toContain('📄');
    expect(out).not.toContain('📜');
    expect(out).not.toContain('═');
    expect(out).not.toContain('─');
    expect(out).toContain('[agent]');
    expect(out).toContain('[apex]');
    expect(out).toContain('CC by location (whitepaper § 7)');
    expect(out).toContain('AgentScript: 21');
    expect(out).toContain('Apex: 30');
    expect(out).toContain('Combined: 51');
  });

  it('text renderer: --width changes rule length', async () => {
    const report = await analyzeSource(gametwo);
    const narrow = renderText(report, { ascii: true, color: false, width: 40 });
    const wide = renderText(report, { ascii: true, color: false, width: 80 });
    expect(narrow).toContain('='.repeat(40));
    expect(narrow).not.toContain('='.repeat(41));
    expect(wide).toContain('='.repeat(80));
  });

  it('markdown renderer: emits Mermaid xychart-beta + per-bundle + per-class tables', async () => {
    const report = await analyzeSource(gametwo);
    const md = renderMarkdown(report);

    // Mermaid block with palette-aligned colors
    expect(md).toContain('```mermaid');
    expect(md).toContain('xychart-beta');
    expect(md).toContain('#a82820'); // Reasoning red
    expect(md).toContain('#6b8c52'); // Deterministic green

    // Header + tables present
    expect(md).toContain('# AgentForce PMD');
    expect(md).toContain('## CC by location');
    expect(md).toContain('| **Totals** | 21 | 30 | 51 |');
    expect(md).toContain('## Per-bundle');
    expect(md).toContain('## Apex backing logic');

    // Cell-pipe escaping: the GameTwo_PlayRound `||` contributor must be
    // escaped so it doesn't break the row.
    expect(md).toContain('\\|\\|');
  });

  it('sarif renderer: valid 2.1.0 shape with one result per procedure + per method', async () => {
    const report = await analyzeSource(gametwo);
    const sarif = JSON.parse(renderSarif(report));
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('sf-agentpmd');

    const results = sarif.runs[0].results as Array<{
      ruleId: string;
      level: string;
      properties: { complexity: number };
    }>;
    // 2 procedures + 6 Apex methods = 8 results
    expect(results).toHaveLength(8);

    // Threshold-driven level
    const playOne = results.find(r =>
      r.properties.complexity === 10 &&
      r.ruleId === 'AGENTPMD.ApexCyclomaticComplexity',
    );
    expect(playOne?.level).toBe('warning'); // >= 10 default

    const gametwoSimpleProc = results.find(r =>
      r.properties.complexity === 19 &&
      r.ruleId === 'AGENTPMD.AgentScriptCyclomaticComplexity',
    );
    expect(gametwoSimpleProc?.level).toBe('warning'); // 19 ≥ 10
  });

  it('sarif renderer: custom thresholds promote to error level', async () => {
    const report = await analyzeSource(gametwo);
    const sarif = JSON.parse(
      renderSarif(report, { sarifWarningThreshold: 5, sarifErrorThreshold: 10 }),
    );
    const results = sarif.runs[0].results as Array<{
      level: string;
      properties: { complexity: number };
    }>;
    const playOne = results.find(r => r.properties.complexity === 10);
    expect(playOne?.level).toBe('error'); // bumped above lowered threshold
  });

  it('csv renderer: RFC-4180-quoted, header + row-per-procedure-and-method', async () => {
    const report = await analyzeSource(gametwo);
    const csv = renderCsv(report);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      '"type","file","scope_or_class","name","complexity","start_row","start_col","contributors"',
    );
    // 2 procedures + 6 Apex methods = 8 data rows + 1 header
    expect(lines).toHaveLength(9);
    expect(lines.some(l => l.startsWith('"agent_procedure"'))).toBe(true);
    expect(lines.some(l => l.startsWith('"apex_method"'))).toBe(true);
  });

  it('dispatcher routes by format', async () => {
    const report = await analyzeSource(gametwo);
    expect(render('text', report, { color: false, ascii: true, width: 60 })).toContain('AgentScript: 21');
    expect(render('markdown', report)).toContain('```mermaid');
    expect(render('csv', report).split('\n')[0]).toMatch(/^"type"/);
    const sarif = JSON.parse(render('sarif', report));
    expect(sarif.version).toBe('2.1.0');
  });
});
