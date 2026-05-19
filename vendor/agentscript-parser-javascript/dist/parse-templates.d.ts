import { CSTNode } from './cst-node.js';
import type { ParserContext } from './parser.js';
/**
 * Parse a template starting with `|`.
 * Consumes tokens from the lexer stream, treating everything as template content
 * except `{!...}` breaks which are parsed as template expressions.
 */
export declare function parseTemplate(ctx: ParserContext): CSTNode;
/**
 * Parse a template in colinear position (after a colon on the same line).
 * Currently identical to parseTemplate; kept as a separate entry point
 * for semantic clarity and potential future divergence.
 */
export declare function parseTemplateAsColinear(ctx: ParserContext): CSTNode;
//# sourceMappingURL=parse-templates.d.ts.map