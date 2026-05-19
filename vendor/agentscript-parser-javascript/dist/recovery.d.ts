/**
 * Recovery and utility functions extracted from parser.ts.
 *
 * All functions take a ParserContext as their first argument,
 * following the free-function pattern established by expressions.ts.
 */
import { TokenKind } from './token.js';
import { CSTNode } from './cst-node.js';
import type { ParserContext } from './parser.js';
/** Create an empty ERROR node at the current position. */
export declare function makeEmptyError(ctx: ParserContext): CSTNode;
/** Insert a missing target: `target: (expression (atom (ERROR)))` */
export declare function addMissingTarget(ctx: ParserContext, node: CSTNode): void;
/** Create a MISSING node — an expected token/node that wasn't found in source. */
export declare function makeMissing(ctx: ParserContext, type: string): CSTNode;
/**
 * Parse a standalone else/elif/for (without a preceding if, or unsupported).
 * Wraps the entire block in an ERROR node, preserving parsed statements inside.
 *
 * @param parseProcedure - callback to parse procedure bodies, avoiding circular
 *   dependency with parse-statements.ts
 */
export declare function parseOrphanBlock(ctx: ParserContext, parseProcedure: (ctx: ParserContext) => CSTNode): CSTNode;
/**
 * Consume any leftover tokens in an indented block (before DEDENT) as ERROR
 * nodes. Prevents cascading failures when parseBlockValue() only partially
 * consumes the block content (e.g., unquoted multi-word text).
 */
export declare function recoverToBlockEnd(ctx: ParserContext, parent: CSTNode): void;
/**
 * Synchronize: skip tokens until a stopping condition is met.
 * Returns an ERROR node wrapping the skipped content, or null if
 * nothing was consumed.
 *
 * @param extraStop - optional predicate for additional stop conditions
 *   beyond the default sync points (NEWLINE/DEDENT/EOF)
 */
export declare function synchronizeUntil(ctx: ParserContext, extraStop?: (kind: TokenKind, row: number) => boolean): CSTNode | null;
/** Skip tokens on the given row until a sync point, INDENT, or COLON. */
export declare function synchronizeRowUntilColon(ctx: ParserContext, row: number): CSTNode | null;
/** Skip tokens on the given row until a sync point or INDENT. */
export declare function synchronizeRow(ctx: ParserContext, row: number): CSTNode | null;
/** Skip tokens until the next sync point (NEWLINE/DEDENT/EOF). */
export declare function synchronize(ctx: ParserContext): CSTNode | null;
export declare function skipNewlines(ctx: ParserContext): void;
/** Consume comment and newline tokens and attach to parent node. */
export declare function consumeCommentsAndSkipNewlines(ctx: ParserContext, parent: CSTNode): void;
export declare function isAtEnd(ctx: ParserContext): boolean;
/** Check if from current position, there are only comments, newlines, and then EOF/DEDENT. */
export declare function isTrailingCommentOnly(ctx: ParserContext): boolean;
//# sourceMappingURL=recovery.d.ts.map