import type { AnalysisReport } from '../analyzer/types.js';

export type RenderFormat = 'csv' | 'markdown' | 'sarif' | 'text';

export interface RenderOptions {
  /** Force ASCII-only output (no Unicode box chars, no emoji). Default: auto. */
  ascii?: boolean;
  /** Force/disable color in text output. Default: auto (TTY + no NO_COLOR). */
  color?: boolean;
  sarifErrorThreshold?: number;
  /**
   * SARIF severity thresholds. Methods/procedures with complexity at or above
   * `warning` are flagged `level: warning`; at or above `error` → `level: error`.
   * Default: warning=11, error=21 (McCabe/SEI risk bands: moderate 11–20, high ≥21).
   */
  sarifWarningThreshold?: number;
  /** Rule width for the text renderer. Default: 60. */
  width?: number;
}

export interface Renderer {
  render(report: AnalysisReport, options?: RenderOptions): string;
}
