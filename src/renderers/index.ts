import type { AnalysisReport } from '../analyzer/types.js';
import type { RenderFormat, RenderOptions } from './options.js';

import { renderCsv } from './csv.js';
import { renderMarkdown } from './markdown.js';
import { renderSarif } from './sarif.js';
import { renderText } from './text.js';

export function render(
  format: RenderFormat,
  report: AnalysisReport,
  options?: RenderOptions,
): string {
  switch (format) {
    case 'csv': {
      return renderCsv(report);
    }

    case 'markdown': {
      return renderMarkdown(report);
    }

    case 'sarif': {
      return renderSarif(report, options);
    }

    case 'text': {
      return renderText(report, options);
    }
  }
}

export { renderCsv } from './csv.js';
export { renderMarkdown } from './markdown.js';
export type { RenderFormat, RenderOptions } from './options.js';
export { renderSarif } from './sarif.js';
export { renderText } from './text.js';
