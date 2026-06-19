import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

import type { AnalysisReport } from '../../analyzer/types.js';
import type { RenderFormat } from '../../renderers/index.js';

import { analyzeSource } from '../../analyzer/analyze.js';
import { discoverSfdxProject } from '../../analyzer/project.js';
import { render } from '../../renderers/index.js';

const FORMATS: ReadonlyArray<RenderFormat> = ['text', 'markdown', 'sarif', 'csv'];

export default class AgentpmdAnalyze extends SfCommand<AnalysisReport> {
  public static readonly description = `Walks .agent source files under --source-dir and emits per-procedure
cyclomatic complexity totals (before_reasoning, after_reasoning, and
reasoning.instructions blocks), plus an inventory of declared and used
@actions.X targets. For every apex:// target, resolves the .cls file
and computes per-method Apex CC.

Default output is human-readable text. --json emits the SF CLI envelope
with the full structured report. --format <markdown|sarif|csv> emits the
named format on stdout for piping into PR comments, GitHub Code Scanning,
or spreadsheet pivots.`;
public static readonly examples = [
    '<%= config.bin %> <%= command.id %> --source-dir force-app/main/default',
    '<%= config.bin %> <%= command.id %> --source-dir force-app/main/default --json',
    '<%= config.bin %> <%= command.id %> --source-dir force-app/main/default --format markdown > report.md',
    '<%= config.bin %> <%= command.id %> --source-dir force-app/main/default --format sarif > report.sarif',
  ];
public static readonly flags = {
    'apex-source': Flags.string({
      summary:
        'Override directory to look up apex:// targets. By default we walk up from each .agent file looking for a sibling classes/ folder.',
    }),
    'api-name': Flags.string({
      char: 'n',
      multiple: true,
      summary:
        'Filter to specific agent bundles. Matched against the bundle directory name and the config.developer_name field. Repeatable.',
    }),
    ascii: Flags.boolean({
      default: false,
      summary:
        'Force ASCII-only output in the text renderer (no Unicode box chars, no emoji).',
    }),
    'fail-on': Flags.integer({
      min: 1,
      summary:
        'Exit non-zero if combined agent+Apex CC meets or exceeds this threshold.',
    }),
    format: Flags.string({
      default: 'text',
      options: [...FORMATS],
      summary:
        'Non-JSON output format. --json takes precedence per SF CLI convention.',
    }),
    'no-color': Flags.boolean({
      default: false,
      summary: 'Disable ANSI color in the text renderer. NO_COLOR env also disables.',
    }),
    'sarif-error': Flags.integer({
      min: 1,
      summary: 'SARIF "error" level threshold. Default 20.',
    }),
    'sarif-warning': Flags.integer({
      min: 1,
      summary: 'SARIF "warning" level threshold. Default 10.',
    }),
    'source-dir': Flags.string({
      char: 'd',
      summary:
        'Directory or single .agent file to analyze. Defaults to the packageDirectories of the nearest sfdx-project.json.',
    }),
    width: Flags.integer({
      default: 60,
      min: 20,
      summary: 'Rule width for the text renderer.',
    }),
  };
public static readonly summary =
    'Compute McCabe cyclomatic complexity and action-reference inventory for AgentScript bundles and their Apex backing logic.';

  public async run(): Promise<AnalysisReport> {
    const { flags } = await this.parse(AgentpmdAnalyze);

    const { reportBase, roots, sourceDescription } = await resolveSources(
      flags['source-dir'],
    );
    if (!this.jsonEnabled() && sourceDescription) {
      this.log(sourceDescription);
    }

    const report = await analyzeSource(roots, {
      apexSourceOverride: flags['apex-source'],
      apiNames: flags['api-name'],
      reportBase,
    });

    if (!this.jsonEnabled()) {
      const format = flags.format as RenderFormat;
      const text = render(format, report, {
        ascii: flags.ascii || undefined,
        color: flags['no-color'] ? false : undefined,
        sarifErrorThreshold: flags['sarif-error'],
        sarifWarningThreshold: flags['sarif-warning'],
        width: flags.width,
      });
      this.log(text);
    }

    const combined = report.totalComplexity + report.totalApexComplexity;
    if (flags['fail-on'] !== undefined && combined >= flags['fail-on']) {
      this.error(
        `Combined cyclomatic complexity ${combined} (agent ${report.totalComplexity} + apex ${report.totalApexComplexity}) ≥ threshold ${flags['fail-on']}`,
        { exit: 2 },
      );
    }

    return report;
  }
}

interface ResolvedSources {
  reportBase: string | undefined;
  roots: string[];
  /** Optional human-readable note about where sources came from. */
  sourceDescription?: string;
}

/**
 * Resolve the directories we should scan. Explicit `--source-dir` wins.
 * Otherwise, walk up from cwd looking for `sfdx-project.json` and use its
 * `packageDirectories`. If neither is available, fail with a clear message.
 */
async function resolveSources(
  sourceDirFlag: string | undefined,
): Promise<ResolvedSources> {
  if (sourceDirFlag) {
    return { reportBase: undefined, roots: [sourceDirFlag] };
  }

  const project = await discoverSfdxProject(process.cwd());
  if (!project) {
    throw new Error(
      'No --source-dir was provided and no sfdx-project.json was found in the ' +
        'current directory or any ancestor. Pass --source-dir <path> or run from ' +
        'inside an sfdx project.',
    );
  }

  if (project.packageDirectories.length === 0) {
    throw new Error(
      `sfdx-project.json at ${project.root} declares no packageDirectories. ` +
        'Pass --source-dir <path> explicitly.',
    );
  }

  return {
    reportBase: project.root,
    roots: project.packageDirectories,
    sourceDescription: `Analyzing sfdx project ${project.root} (${project.packageDirectories.length} package director${project.packageDirectories.length === 1 ? 'y' : 'ies'}).`,
  };
}
