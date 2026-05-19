import type { AnalysisReport } from '../analyzer/types.js';
import type { RenderFormat, RenderOptions } from './options.js';
import { renderText } from './text.js';
import { renderMarkdown } from './markdown.js';
import { renderSarif } from './sarif.js';
import { renderCsv } from './csv.js';

export function render(
  format: RenderFormat,
  report: AnalysisReport,
  options?: RenderOptions,
): string {
  switch (format) {
    case 'text':
      return renderText(report, options);
    case 'markdown':
      return renderMarkdown(report);
    case 'sarif':
      return renderSarif(report, options);
    case 'csv':
      return renderCsv(report);
  }
}

export type { RenderFormat, RenderOptions } from './options.js';
export { renderText } from './text.js';
export { renderMarkdown } from './markdown.js';
export { renderSarif } from './sarif.js';
export { renderCsv } from './csv.js';
