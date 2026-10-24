import { type Token } from './token.js';
export declare class Lexer {
    private source;
    private offset;
    private row;
    private col;
    private tokens;
    private indentStack;
    /** True when the current line started with `|` (template line). */
    private onTemplateLine;
    /** Indent level of the line containing `|`. Content deeper than this is template content. */
    private templateBaseIndent;
    /** Nested brace depth inside a template expression (for `{` inside `{!...}`). -1 means not inside a template expression. */
    private templateExprBraceDepth;
    private get inTemplateExpr();
    constructor(source: string);
    tokenize(): Token[];
    private tokenizeLine;
    private emitIndentation;
    private tokenizeToken;
    private tokenizeId;
    private tokenizeNumber;
    private tryDatetime;
    private tokenizeString;
    private tokenizeComment;
    /**
     * Consume template content as a single TEMPLATE_CONTENT token — the
     * Python-tokenizer-style atomic-text pattern, mirroring scanner.c's
     * TEMPLATE_CONTENT handler. Breaks at `{!` (opens a template expression)
     * or end of line. Returns true when the caller's line is done (newline
     * consumed or EOF); false to loop back through tokenizeLine's inner loop
     * (we just emitted a TEMPLATE_EXPR_START and need to switch to code mode).
     *
     * Parens, braces, hashes, and quotes inside template text never reach
     * tokenizeToken(), so they can't accidentally open strings or start
     * comments.
     */
    private tokenizeTemplateContent;
    private flushTemplateContent;
    private consumeIndentation;
    /**
     * Scan ahead (without advancing) past comment/blank lines to find the indent
     * of the next line with real (non-comment) content. Returns -1 if only
     * comments, blanks, or EOF remain. Matches tree-sitter scanner behavior which
     * skips past comment-only lines when computing INDENT/DEDENT.
     */
    private peekNextContentIndent;
    private peekCharCode;
    private get hasMore();
    /**
     * Attempt to advance n characters.
     * @returns how many characters were advanced.
     */
    private advance;
    /**
     * Attempt to consume a newline.
     * @returns whether a newline was consumed.
     */
    private consumeNewline;
    /**
     * Checks if the current position is at a newline.
     * @param additiveOffset
     * @returns 0 if not at a newline, 1 if at an LF newline, 2 if at a CR LF newline.
     */
    private atNewline;
    private get position();
    private emitSpan;
    private emit;
    private emitVirtual;
    private makeToken;
}
//# sourceMappingURL=lexer.d.ts.map