import { CSTNode } from './cst-node.js';
import type { ParserContext } from './parser.js';
/**
 * Parse a YAML-style sequence (list of `- item` entries).
 *
 * Exported for use by parser.ts dispatch and by parse-mapping.ts
 * via ParseSequenceFn callback.
 */
export declare function parseSequence(ctx: ParserContext): CSTNode;
//# sourceMappingURL=parse-sequence.d.ts.map