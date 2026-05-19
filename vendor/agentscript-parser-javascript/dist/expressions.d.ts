/**
 * Pratt expression parser for AgentScript.
 *
 * Precedence levels (matching grammar.js):
 *  0: ternary (X if C else Y) — right-associative
 *  1: or
 *  2: and
 *  3: not (prefix)
 *  4: ==, !=, <, >, <=, >=, is, is not, = (comparison)
 *  5: +, - (binary)
 *  6: *, /
 *  7: +, - (unary prefix)
 *  8: call, member, subscript (postfix)
 *  9: parenthesized (atomic)
 */
import { TokenKind } from './token.js';
import { CSTNode } from './cst-node.js';
import type { ParserContext } from './parser.js';
export declare function parseExpression(ctx: ParserContext, minPrec?: number): CSTNode | null;
export declare function parseString(ctx: ParserContext): CSTNode;
/**
 * Leaf/literal types that need an intermediate `atom` wrapper before the `expression` wrapper.
 */
export declare const ATOM_TYPES: Set<string>;
/**
 * Wrap an expression in an `expression` supertype node if it isn't already one.
 * Tree-sitter wraps most expression children in an (expression ...) wrapper.
 */
export declare function wrapExpression(ctx: ParserContext, inner: CSTNode): CSTNode;
export declare function isKeyStart(ctx: ParserContext): boolean;
/** Can this token kind begin a key? (ID, STRING, or NUMBER for digit-prefixed keys like `3var`) */
export declare function isKeyTokenStart(kind: TokenKind): boolean;
/** Can this token kind appear within a multi-part key? (key-start tokens plus MINUS/DOT for `my-var`, `a.b`) */
export declare function isKeyTokenContinuation(kind: TokenKind): boolean;
export declare function parseKey(ctx: ParserContext): CSTNode | null;
//# sourceMappingURL=expressions.d.ts.map