/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * For full license text, see the LICENSE file in the repo root or https://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Error recovery utilities for the parser.
 *
 * Core invariant: NEWLINE and DEDENT are unconditional synchronization points.
 * No error ever cascades past them.
 */
import { TokenKind } from './token.js';
import { CSTNode } from './cst-node.js';
/**
 * Create an ERROR node wrapping the given children.
 */
export function makeErrorNode(source, children, startOffset, endOffset, startPosition, endPosition) {
    const node = new CSTNode('ERROR', source, startOffset, endOffset, startPosition, endPosition, true, true);
    for (const child of children) {
        node.appendChild(child);
    }
    return node;
}
/**
 * Create a MISSING node — a node that was expected but not present in the source.
 */
export function makeMissingNode(type, source, position, offset) {
    return new CSTNode(type, source, offset, offset, position, position, true, false, true);
}
/**
 * Create a leaf node from a token.
 */
export function tokenToLeaf(token, source, isNamed, offset) {
    return new CSTNode(tokenTypeToNodeType(token), source, offset, offset + token.text.length, token.start, token.end, isNamed);
}
/** Named token kinds — tokens that become named CST children. */
const NAMED_TOKEN_KINDS = new Set([
    TokenKind.ID,
    TokenKind.NUMBER,
    TokenKind.STRING,
    TokenKind.DATETIME,
    TokenKind.COMMENT,
    TokenKind.ELLIPSIS,
]);
/** Create a leaf CST node from a token, auto-determining isNamed from its kind. */
export function tokenToAutoLeaf(token, source, offset) {
    return tokenToLeaf(token, source, NAMED_TOKEN_KINDS.has(token.kind), offset);
}
function tokenTypeToNodeType(token) {
    switch (token.kind) {
        case TokenKind.ID:
            return 'id';
        case TokenKind.NUMBER:
            return 'number';
        case TokenKind.STRING:
            return 'string';
        case TokenKind.DATETIME:
            return 'datetime_literal';
        case TokenKind.COMMENT:
            return 'comment';
        case TokenKind.ELLIPSIS:
            return 'ellipsis';
        default:
            return token.text;
    }
}
/** Check if a token kind is a synchronization point. */
export function isSyncPoint(kind) {
    return (kind === TokenKind.NEWLINE ||
        kind === TokenKind.DEDENT ||
        kind === TokenKind.EOF);
}
//# sourceMappingURL=errors.js.map