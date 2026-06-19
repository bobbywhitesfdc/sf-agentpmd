import { expect } from 'chai';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeSource } from '../../src/analyzer/analyze.js';
import {
  render,
  renderCsv,
  renderMarkdown,
  renderSarif,
  renderText,
} from '../../src/renderers/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const gametwo = resolve(here, '..', 'fixtures', 'gametwo');

describe('renderers — gametwo end-to-end', () => {
  it('text renderer: ASCII mode drops emoji and Unicode box chars', async () => {
    const report = await analyzeSource(gametwo);
    const out = renderText(report, { ascii: true, color: false, width: 60 });
    expect(out).to.not.include('📄');
    expect(out).to.not.include('📜');
    expect(out).to.not.include('═');
    expect(out).to.not.include('─');
    expect(out).to.include('[agent]');
    expect(out).to.include('[apex]');
    expect(out).to.include('CC by location (whitepaper § 7)');
    expect(out).to.include('AgentScript: 21');
    expect(out).to.include('Apex: 30');
    expect(out).to.include('Combined: 51');
  });

  it('text renderer: --width changes rule length', async () => {
    const report = await analyzeSource(gametwo);
    const narrow = renderText(report, { ascii: true, color: false, width: 40 });
    const wide = renderText(report, { ascii: true, color: false, width: 80 });
    expect(narrow).to.include('='.repeat(40));
    expect(narrow).to.not.include('='.repeat(41));
    expect(wide).to.include('='.repeat(80));
  });

  it('markdown renderer: emits Mermaid xychart-beta + per-bundle + per-class tables', async () => {
    const report = await analyzeSource(gametwo);
    const md = renderMarkdown(report);

    // Mermaid block with palette-aligned colors
    expect(md).to.include('```mermaid');
    expect(md).to.include('xychart-beta');
    expect(md).to.include('#a82820'); // Reasoning red
    expect(md).to.include('#6b8c52'); // Deterministic green

    // Header + tables present
    expect(md).to.include('# AgentForce PMD');
    expect(md).to.include('## CC by location');
    expect(md).to.include('| **Totals** | 21 | 30 | 51 |');
    expect(md).to.include('## Per-bundle');
    expect(md).to.include('## Apex backing logic');

    // Cell-pipe escaping: the GameTwo_PlayRound `||` contributor must be
    // escaped so it doesn't break the row.
    expect(md).to.include(String.raw`\|\|`);
  });

  it('sarif renderer: valid 2.1.0 shape with one result per procedure + per method', async () => {
    const report = await analyzeSource(gametwo);
    const sarif = JSON.parse(renderSarif(report));
    expect(sarif.version).to.equal('2.1.0');
    expect(sarif.runs).to.have.lengthOf(1);
    expect(sarif.runs[0].tool.driver.name).to.equal('sf-agentpmd');

    const results = sarif.runs[0].results as Array<{
      level: string;
      properties: { complexity: number };
      ruleId: string;
    }>;
    // 2 procedures + 6 Apex methods = 8 results
    expect(results).to.have.lengthOf(8);

    // Threshold-driven level
    const playOne = results.find(r =>
      r.properties.complexity === 10 &&
      r.ruleId === 'AGENTPMD.ApexCyclomaticComplexity',
    );
    expect(playOne?.level).to.equal('warning'); // >= 10 default

    const gametwoSimpleProc = results.find(r =>
      r.properties.complexity === 19 &&
      r.ruleId === 'AGENTPMD.AgentScriptCyclomaticComplexity',
    );
    expect(gametwoSimpleProc?.level).to.equal('warning'); // 19 ≥ 10
  });

  it('sarif renderer: custom thresholds promote to error level', async () => {
    const report = await analyzeSource(gametwo);
    const sarif = JSON.parse(
      renderSarif(report, { sarifErrorThreshold: 10, sarifWarningThreshold: 5 }),
    );
    const results = sarif.runs[0].results as Array<{
      level: string;
      properties: { complexity: number };
    }>;
    const playOne = results.find(r => r.properties.complexity === 10);
    expect(playOne?.level).to.equal('error'); // bumped above lowered threshold
  });

  it('csv renderer: RFC-4180-quoted, header + row-per-procedure-and-method', async () => {
    const report = await analyzeSource(gametwo);
    const csv = renderCsv(report);
    const lines = csv.split('\n');
    expect(lines[0]).to.equal(
      '"type","file","scope_or_class","name","complexity","start_row","start_col","contributors"',
    );
    // 2 procedures + 6 Apex methods = 8 data rows + 1 header
    expect(lines).to.have.lengthOf(9);
    expect(lines.some(l => l.startsWith('"agent_procedure"'))).to.equal(true);
    expect(lines.some(l => l.startsWith('"apex_method"'))).to.equal(true);
  });

  it('dispatcher routes by format', async () => {
    const report = await analyzeSource(gametwo);
    expect(render('text', report, { ascii: true, color: false, width: 60 })).to.include('AgentScript: 21');
    expect(render('markdown', report)).to.include('```mermaid');
    expect(render('csv', report).split('\n')[0]).to.match(/^"type"/);
    const sarif = JSON.parse(render('sarif', report));
    expect(sarif.version).to.equal('2.1.0');
  });
});
