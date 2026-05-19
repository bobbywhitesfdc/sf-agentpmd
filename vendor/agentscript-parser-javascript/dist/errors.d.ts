/**
 * Error recovery utilities for the parser.
 *
 * Core invariant: NEWLINE and DEDENT are unconditional synchronization points.
 * No error ever cascades past them.
 */
import { TokenKind, type Token } from './token.js';
import { CSTNode } from './cst-node.js';
/**
 * Create an ERROR node wrapping the given children.
 */
export declare function makeErrorNode(source: string, children: CSTNode[], startOffset: number, endOffset: number, startPosition: {
    row: number;
    column: number;
}, endPosition: {
    row: number;
    column: number;
}): CSTNode;
/**
 * Create a MISSING node — a node that was expected but not present in the source.
 */
export declare function makeMissingNode(type: string, source: string, position: {
    row: number;
    column: number;
}, offset: number): CSTNode;
/**
 * Create a leaf node from a token.
 */
export declare function tokenToLeaf(token: Token, source: string, isNamed: boolean, offset: number): CSTNode;
/** Create a leaf CST node from a token, auto-determining isNamed from its kind. */
export declare function tokenToAutoLeaf(token: Token, source: string, offset: number): CSTNode;
/** Check if a token kind is a synchronization point. */
export declare function isSyncPoint(kind: TokenKind): boolean;
//# sourceMappingURL=errors.d.ts.map