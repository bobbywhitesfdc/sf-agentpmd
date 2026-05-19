import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { analyzeSource } from '../../analyzer/analyze.js';
import { renderText } from '../../analyzer/report.js';
import type { AnalysisReport } from '../../analyzer/types.js';

export default class AgentpmdAnalyze extends SfCommand<AnalysisReport> {
  public static readonly summary =
    'Compute McCabe cyclomatic complexity and action-reference inventory for AgentScript bundles.';

  public static readonly description = `Walks .agent source files under --source-dir and emits per-procedure
cyclomatic complexity totals (before_reasoning, after_reasoning, and
reasoning.instructions blocks), plus an inventory of declared and used
@actions.X targets (apex://, flow://).

Default output is human-readable. Use --json for a machine-readable report.`;

  public static readonly examples = [
    '<%= config.bin %> <%= command.id %> --source-dir force-app/main/default/aiAuthoringBundles',
    '<%= config.bin %> <%= command.id %> --source-dir ./bundle.agent --json',
  ];

  public static readonly flags = {
    'source-dir': Flags.string({
      char: 'd',
      summary: 'Directory or single .agent file to analyze.',
      required: true,
    }),
    'fail-on': Flags.integer({
      summary: 'Exit non-zero if total CC meets or exceeds this threshold.',
      min: 1,
    }),
  };

  public async run(): Promise<AnalysisReport> {
    const { flags } = await this.parse(AgentpmdAnalyze);
    const report = await analyzeSource(flags['source-dir']);

    if (!this.jsonEnabled()) {
      this.log(renderText(report));
    }

    if (flags['fail-on'] !== undefined && report.totalComplexity >= flags['fail-on']) {
      // SfCommand surfaces errors as nonzero exit codes.
      this.error(
        `Total cyclomatic complexity ${report.totalComplexity} ≥ threshold ${flags['fail-on']}`,
        { exit: 2 },
      );
    }

    return report;
  }
}
