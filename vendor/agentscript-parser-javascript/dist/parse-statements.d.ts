import { CSTNode } from './cst-node.js';
import type { ParserContext } from './parser.js';
export declare function isStatementStart(ctx: ParserContext): boolean;
export declare function parseProcedure(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
export declare function parseStatement(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode | null;
export declare function parseIfStatement(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
export declare function parseRunStatement(ctx: ParserContext, parseTemplate?: (ctx: ParserContext) => CSTNode): CSTNode;
export declare function parseSetStatement(ctx: ParserContext): CSTNode;
export declare function parseTransitionStatement(ctx: ParserContext): CSTNode;
export declare function parseWithStatement(ctx: ParserContext): CSTNode;
export declare function parseAvailableWhenStatement(ctx: ParserContext): CSTNode;
export declare function tryParseWithToStatementList(ctx: ParserContext): CSTNode | null;
export declare function parseInlineWithStatement(ctx: ParserContext): CSTNode;
export declare function parseToStatement(ctx: ParserContext): CSTNode;
//# sourceMappingURL=parse-statements.d.ts.map