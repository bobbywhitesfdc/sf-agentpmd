/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * For full license text, see the LICENSE file in the repo root or https://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * @agentscript/parser-javascript — Hand-written TypeScript parser for AgentScript.
 *
 * Error-tolerant: NEWLINE and DEDENT are unconditional recovery points.
 */
export { CSTNode } from './cst-node.js';
export { TokenKind } from './token.js';
export { highlight } from './highlighter.js';
import { Parser } from './parser.js';
import { highlight } from './highlighter.js';
/**
 * Parse AgentScript source code and return a CST.
 * The returned rootNode implements the SyntaxNode interface
 * used by all consumers (dialect, LSP, monaco, agentforce).
 */
export function parse(source) {
    const parser = new Parser(source);
    return { rootNode: parser.parse() };
}
/**
 * Parse and highlight source code in one call.
 * Returns captures compatible with the QueryCapture format
 * used by LSP semantic tokens.
 */
export function parseAndHighlight(source) {
    const { rootNode } = parse(source);
    return highlight(rootNode);
}
//# sourceMappingURL=index.js.map