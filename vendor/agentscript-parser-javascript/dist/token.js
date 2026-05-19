/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * For full license text, see the LICENSE file in the repo root or https://www.apache.org/licenses/LICENSE-2.0
 */
/** Token kinds produced by the lexer. */
export var TokenKind;
(function (TokenKind) {
    // Synthetic indentation tokens
    TokenKind["NEWLINE"] = "NEWLINE";
    TokenKind["INDENT"] = "INDENT";
    TokenKind["DEDENT"] = "DEDENT";
    TokenKind["EOF"] = "EOF";
    // Identifiers & literals
    TokenKind["ID"] = "ID";
    TokenKind["NUMBER"] = "NUMBER";
    TokenKind["STRING"] = "STRING";
    TokenKind["STRING_CONTENT"] = "STRING_CONTENT";
    TokenKind["ESCAPE_SEQUENCE"] = "ESCAPE_SEQUENCE";
    TokenKind["DATETIME"] = "DATETIME";
    TokenKind["TEMPLATE_CONTENT"] = "TEMPLATE_CONTENT";
    // Operators
    TokenKind["PLUS"] = "PLUS";
    TokenKind["MINUS"] = "MINUS";
    TokenKind["STAR"] = "STAR";
    TokenKind["SLASH"] = "SLASH";
    TokenKind["DOT"] = "DOT";
    TokenKind["COMMA"] = "COMMA";
    TokenKind["COLON"] = "COLON";
    TokenKind["EQ"] = "EQ";
    TokenKind["EQEQ"] = "EQEQ";
    TokenKind["NEQ"] = "NEQ";
    TokenKind["LT"] = "LT";
    TokenKind["GT"] = "GT";
    TokenKind["LTE"] = "LTE";
    TokenKind["GTE"] = "GTE";
    TokenKind["ARROW"] = "ARROW";
    TokenKind["ELLIPSIS"] = "ELLIPSIS";
    TokenKind["PERCENT"] = "PERCENT";
    TokenKind["PIPE"] = "PIPE";
    TokenKind["AT"] = "AT";
    // Delimiters
    TokenKind["LPAREN"] = "LPAREN";
    TokenKind["RPAREN"] = "RPAREN";
    TokenKind["LBRACKET"] = "LBRACKET";
    TokenKind["RBRACKET"] = "RBRACKET";
    TokenKind["LBRACE"] = "LBRACE";
    TokenKind["RBRACE"] = "RBRACE";
    TokenKind["TEMPLATE_EXPR_START"] = "TEMPLATE_EXPR_START";
    // Sequence
    TokenKind["DASH_SPACE"] = "DASH_SPACE";
    // Quote characters (for CST fidelity)
    TokenKind["DQUOTE"] = "DQUOTE";
    // Special
    TokenKind["COMMENT"] = "COMMENT";
    TokenKind["ERROR_TOKEN"] = "ERROR_TOKEN";
})(TokenKind || (TokenKind = {}));
export function isTokenKind(token, kind) {
    return token.kind === kind;
}
//# sourceMappingURL=token.js.map