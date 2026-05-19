/**
 * Recursive descent parser for AgentScript.
 *
 * Core invariant: NEWLINE and DEDENT are unconditional synchronization points.
 * Every parse function that encounters an unexpected token calls synchronize()
 * which skips to the next NEWLINE/DEDENT/EOF.
 */
import { TokenKind, type Token } from './token.js';
import { CSTNode } from './cst-node.js';
/**
 * Token consumption — peek, advance, and query the token stream.
 */
export interface TokenStream {
    source: string;
    peek(): Token;
    peekAt(offset: number): Token;
    peekAtIndex(idx: number): Token;
    peekKind(): TokenKind;
    consume(): Token;
    consumeKind<K extends TokenKind>(kind: K): Token<K>;
    currentOffset(): number;
    peekOffset(): number;
    isAtSyncPoint(): boolean;
}
/**
 * CST node construction — create, populate, and finalize nodes.
 */
export interface NodeBuilder {
    consumeNamed(type: string): CSTNode;
    startNode(type: string): CSTNode;
    startNodeAt(type: string, existingChild: CSTNode): CSTNode;
    finishNode(node: CSTNode, startTok: Token): void;
    addAnonymousChild(parent: CSTNode, token: Token): void;
}
/**
 * Combined interface used by expression parser to access parser state.
 * Avoids circular dependency between parser.ts and expressions.ts.
 */
export interface ParserContext extends TokenStream, NodeBuilder {
}
export declare class Parser implements ParserContext {
    source: string;
    private tokens;
    private pos;
    private _eof;
    constructor(source: string);
    parse(): CSTNode;
    peek(): Token;
    peekAt(offset: number): Token;
    peekAtIndex(idx: number): Token;
    peekKind(): TokenKind;
    consume(): Token;
    consumeKind<K extends TokenKind>(kind: K): Token<K>;
    consumeNamed(type: string): CSTNode;
    currentOffset(): number;
    peekOffset(): number;
    isAtSyncPoint(): boolean;
    startNode(type: string): CSTNode;
    startNodeAt(type: string, existingChild: CSTNode): CSTNode;
    finishNode(_node: CSTNode, _startTok: Token): void;
    addAnonymousChild(parent: CSTNode, token: Token): void;
    private parseSourceFile;
    private eofToken;
}
//# sourceMappingURL=parser.d.ts.map