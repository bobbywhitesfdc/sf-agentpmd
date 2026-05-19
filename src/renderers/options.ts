import type { AnalysisReport } from '../analyzer/types.js';

export type RenderFormat = 'text' | 'markdown' | 'sarif' | 'csv';

export interface RenderOptions {
  /** Force/disable color in text output. Default: auto (TTY + no NO_COLOR). */
  color?: boolean;
  /** Force ASCII-only output (no Unicode box chars, no emoji). Default: auto. */
  ascii?: boolean;
  /** Rule width for the text renderer. Default: 60. */
  width?: number;
  /**
   * SARIF severity thresholds. Methods/procedures with complexity at or above
   * `warning` are flagged `level: warning`; at or above `error` → `level: error`.
   * Default: warning=10, error=20 (matches PMD's methodReportLevel default).
   */
  sarifWarningThreshold?: number;
  sarifErrorThreshold?: number;
}

export interface Renderer {
  render(report: AnalysisReport, options?: RenderOptions): string;
}
