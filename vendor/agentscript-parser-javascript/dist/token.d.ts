/** Token kinds produced by the lexer. */
export declare enum TokenKind {
    NEWLINE = "NEWLINE",
    INDENT = "INDENT",
    DEDENT = "DEDENT",
    EOF = "EOF",
    ID = "ID",
    NUMBER = "NUMBER",
    STRING = "STRING",
    STRING_CONTENT = "STRING_CONTENT",
    ESCAPE_SEQUENCE = "ESCAPE_SEQUENCE",
    DATETIME = "DATETIME",
    TEMPLATE_CONTENT = "TEMPLATE_CONTENT",
    PLUS = "PLUS",
    MINUS = "MINUS",
    STAR = "STAR",
    SLASH = "SLASH",
    DOT = "DOT",
    COMMA = "COMMA",
    COLON = "COLON",
    EQ = "EQ",
    EQEQ = "EQEQ",
    NEQ = "NEQ",
    LT = "LT",
    GT = "GT",
    LTE = "LTE",
    GTE = "GTE",
    ARROW = "ARROW",
    ELLIPSIS = "ELLIPSIS",
    PERCENT = "PERCENT",
    PIPE = "PIPE",
    AT = "AT",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    LBRACKET = "LBRACKET",
    RBRACKET = "RBRACKET",
    LBRACE = "LBRACE",
    RBRACE = "RBRACE",
    TEMPLATE_EXPR_START = "TEMPLATE_EXPR_START",// {!
    DASH_SPACE = "DASH_SPACE",// "- " at start of line
    DQUOTE = "DQUOTE",
    COMMENT = "COMMENT",
    ERROR_TOKEN = "ERROR_TOKEN"
}
export interface Position {
    row: number;
    column: number;
}
export interface Token<K extends TokenKind = TokenKind> {
    readonly kind: K;
    text: string;
    start: Position;
    end: Position;
    /** Byte offset into the source string where this token starts. */
    startOffset: number;
}
export declare function isTokenKind<K extends TokenKind>(token: Token, kind: K): token is Token<K>;
//# sourceMappingURL=token.d.ts.map