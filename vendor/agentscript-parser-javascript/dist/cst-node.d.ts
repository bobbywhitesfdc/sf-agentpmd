import type { SyntaxNode } from '@agentscript/types';
export declare class CSTNode implements SyntaxNode {
    type: string;
    /** Whether this is a "named" node (true) or anonymous punctuation/keyword (false). */
    isNamed: boolean;
    isError: boolean;
    isMissing: boolean;
    startOffset: number;
    endOffset: number;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    /** Lazy children array — null for leaf nodes, allocated on first appendChild. */
    private _children;
    parent: CSTNode | null;
    /** Index of this node within its parent's children array. -1 if no parent. */
    _childIndex: number;
    /** Field name → child indices. Lazy: null until first field is added. */
    private _fields;
    /** Reverse map: child index → field name. Built lazily. */
    private _childFieldNames;
    /** Cached named children. */
    private _namedChildren;
    /** The original source string, shared across all nodes in a tree. */
    private _source;
    constructor(type: string, source: string, startOffset: number, endOffset: number, startPosition: {
        row: number;
        column: number;
    }, endPosition: {
        row: number;
        column: number;
    }, isNamed?: boolean, isError?: boolean, isMissing?: boolean);
    get text(): string;
    get startPosition(): {
        row: number;
        column: number;
    };
    set startPosition(pos: {
        row: number;
        column: number;
    });
    get endPosition(): {
        row: number;
        column: number;
    };
    set endPosition(pos: {
        row: number;
        column: number;
    });
    get children(): CSTNode[];
    set children(value: CSTNode[]);
    get namedChildren(): CSTNode[];
    get previousSibling(): CSTNode | null;
    get nextSibling(): CSTNode | null;
    childForFieldName(name: string): CSTNode | null;
    childrenForFieldName(name: string): CSTNode[];
    /** True if this node or any descendant has an error or missing node. */
    get hasError(): boolean;
    /** Get the field name for a child at a given index. */
    fieldNameForChild(index: number): string | null;
    /** Add a child node, optionally associating it with a field name. */
    appendChild(child: CSTNode, fieldName?: string): void;
    /** @deprecated No-op: appendChild() tracks end position incrementally. */
    finalize(): void;
    /** Serialize to s-expression format for testing (named nodes only, no text). */
    toSExp(): string;
    /**
     * Serialize to verbose s-expression format that includes ALL nodes
     * (both named and anonymous) with truncated text content.
     * Matches the source-of-truth format in sot/source.s-expression.
     */
    toVerboseSExp(): string;
}
/** Create a leaf node (no children) from a token. */
export declare function leafNode(type: string, source: string, startOffset: number, endOffset: number, startPosition: {
    row: number;
    column: number;
}, endPosition: {
    row: number;
    column: number;
}, isNamed?: boolean, isError?: boolean, isMissing?: boolean): CSTNode;
//# sourceMappingURL=cst-node.d.ts.map