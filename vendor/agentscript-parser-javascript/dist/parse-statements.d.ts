import { CSTNode } from './cst-node.js';
import type { ParserContext } from './parser.js';
export declare function isStatementStart(ctx: ParserContext): boolean;
export declare function parseProcedure(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
export declare function parseStatement(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode | null;
export declare function parseIfStatement(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
export declare function parseRunStatement(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
/**
 * Parse `ask for @variables.X <INDENT> instructions: "..." <DEDENT>`.
 *
 * Produces a `collect_statement` node with a `target` field (the variable
 * expression) and a `body` field holding a `mapping` (with the `instructions:`
 * element). Mirrors the tree-sitter grammar's collect_statement rule: `ask for`
 * is a two-word operator (like `available when`), so there is no colon after the
 * target. (The CST node retains its internal `collect_statement` name.)
 */
export declare function parseCollectStatement(ctx: ParserContext, _parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
export declare function parseSetStatement(ctx: ParserContext): CSTNode;
/** Parse a workflow `say "..."` directive with direct reference interpolation. */
export declare function parseSayStatement(ctx: ParserContext): CSTNode;
export declare function parseTransitionStatement(ctx: ParserContext): CSTNode;
export declare function parseEscalateStatement(ctx: ParserContext): CSTNode;
export declare function parseEndSessionStatement(ctx: ParserContext): CSTNode;
export declare function parseWithStatement(ctx: ParserContext): CSTNode;
export declare function parseWhenStatement(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
export declare function parseRenderStatement(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
export declare function parseShowAndReturnStatement(ctx: ParserContext): CSTNode;
export declare function parseAvailableWhenStatement(ctx: ParserContext): CSTNode;
export declare function tryParseWithToStatementList(ctx: ParserContext): CSTNode | null;
export declare function parseInlineWithStatement(ctx: ParserContext): CSTNode;
export declare function parseToStatement(ctx: ParserContext): CSTNode;
//# sourceMappingURL=parse-statements.d.ts.map