import { CSTNode } from './cst-node.js';
import type { ParserContext } from './parser.js';
/** Callback type for parseSequence to break circular dependency. */
export type ParseSequenceFn = (ctx: ParserContext) => CSTNode;
/**
 * Parse a mapping-or-expression at the top level.
 * If the current position starts a mapping, delegates to parseMapping;
 * otherwise parses an expression (possibly an assignment).
 */
export declare function parseMappingOrExpression(ctx: ParserContext, parseSequence: ParseSequenceFn): CSTNode | null;
/**
 * Lookahead to determine if the current position starts a mapping (key-value
 * pairs) rather than an expression.
 *
 * Keys are at most a few tokens (1-3 words, possibly with hyphens/dots), so
 * we only need a small lookahead window. The limit exists as a safety cap —
 * it should never be reached on valid input.
 */
export declare function isMappingStart(ctx: ParserContext): boolean;
/**
 * Parse a mapping (sequence of key-value pairs).
 */
export declare function parseMapping(ctx: ParserContext, parseSequence: ParseSequenceFn): CSTNode;
/**
 * Parse a single mapping item (statement, template, comment, or key:value element).
 */
export declare function parseMappingItem(ctx: ParserContext, parseSequence: ParseSequenceFn): CSTNode | null;
/**
 * Check if the current position starts a colinear mapping element (key: value
 * on same line after "- ").
 */
export declare function isColinearMappingElement(ctx: ParserContext): boolean;
/**
 * Parse a colinear mapping element (key: value on the same line as "- ").
 */
export declare function parseColinearMappingElement(ctx: ParserContext): CSTNode;
/**
 * Try to parse a colinear value (template, variable declaration, or expression).
 * Returns the parsed value node and optional error prefix, or null if nothing
 * can be parsed.
 */
export declare function tryParseColinearValue(ctx: ParserContext): {
    value: CSTNode;
    errorPrefix?: CSTNode;
} | null;
//# sourceMappingURL=parse-mapping.d.ts.map