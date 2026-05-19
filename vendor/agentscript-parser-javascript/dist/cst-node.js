/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * For full license text, see the LICENSE file in the repo root or https://www.apache.org/licenses/LICENSE-2.0
 */
/** Shared empty array for leaf nodes — avoids allocating [] per node. */
const EMPTY_CHILDREN = Object.freeze([]);
export class CSTNode {
    type;
    /** Whether this is a "named" node (true) or anonymous punctuation/keyword (false). */
    isNamed;
    isError;
    isMissing;
    startOffset;
    endOffset;
    // Flat position storage — avoids object allocations per node.
    // Also exposed as startPosition/endPosition getters for compat.
    startRow;
    startCol;
    endRow;
    endCol;
    /** Lazy children array — null for leaf nodes, allocated on first appendChild. */
    _children = null;
    parent = null;
    /** Index of this node within its parent's children array. -1 if no parent. */
    _childIndex = -1;
    /** Field name → child indices. Lazy: null until first field is added. */
    _fields = null;
    /** Reverse map: child index → field name. Built lazily. */
    _childFieldNames = null;
    /** Cached named children. */
    _namedChildren = null;
    /** The original source string, shared across all nodes in a tree. */
    _source;
    constructor(type, source, startOffset, endOffset, startPosition, endPosition, isNamed = true, isError = false, isMissing = false) {
        this.type = type;
        this._source = source;
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.startRow = startPosition.row;
        this.startCol = startPosition.column;
        this.endRow = endPosition.row;
        this.endCol = endPosition.column;
        this.isNamed = isNamed;
        this.isError = isError;
        this.isMissing = isMissing;
    }
    get text() {
        return this._source.slice(this.startOffset, this.endOffset);
    }
    get startPosition() {
        return { row: this.startRow, column: this.startCol };
    }
    set startPosition(pos) {
        this.startRow = pos.row;
        this.startCol = pos.column;
    }
    get endPosition() {
        return { row: this.endRow, column: this.endCol };
    }
    set endPosition(pos) {
        this.endRow = pos.row;
        this.endCol = pos.column;
    }
    get children() {
        return (this._children ?? EMPTY_CHILDREN);
    }
    set children(value) {
        this._children = value;
    }
    get namedChildren() {
        if (!this._namedChildren) {
            this._namedChildren = this.children.filter(c => c.isNamed);
        }
        return this._namedChildren;
    }
    get previousSibling() {
        if (!this.parent || this._childIndex <= 0)
            return null;
        return this.parent.children[this._childIndex - 1];
    }
    get nextSibling() {
        if (!this.parent)
            return null;
        const siblings = this.parent.children;
        return this._childIndex < siblings.length - 1
            ? siblings[this._childIndex + 1]
            : null;
    }
    childForFieldName(name) {
        if (!this._fields)
            return null;
        const indices = this._fields.get(name);
        if (!indices || indices.length === 0)
            return null;
        return this.children[indices[0]] ?? null;
    }
    childrenForFieldName(name) {
        if (!this._fields)
            return [];
        const indices = this._fields.get(name);
        if (!indices)
            return [];
        return indices.map(i => this.children[i]).filter(Boolean);
    }
    /** True if this node or any descendant has an error or missing node. */
    get hasError() {
        if (this.isError || this.isMissing)
            return true;
        return this.children.some(c => c.hasError);
    }
    /** Get the field name for a child at a given index. */
    fieldNameForChild(index) {
        if (!this._fields)
            return null;
        if (!this._childFieldNames) {
            this._childFieldNames = new Map();
            for (const [fieldName, indices] of this._fields) {
                for (const idx of indices) {
                    this._childFieldNames.set(idx, fieldName);
                }
            }
        }
        return this._childFieldNames.get(index) ?? null;
    }
    /** Add a child node, optionally associating it with a field name. */
    appendChild(child, fieldName) {
        if (!this._children)
            this._children = [];
        const idx = this._children.length;
        child.parent = this;
        child._childIndex = idx;
        this._children.push(child);
        // Track end position incrementally
        this.endRow = child.endRow;
        this.endCol = child.endCol;
        this.endOffset = child.endOffset;
        if (fieldName) {
            if (!this._fields)
                this._fields = new Map();
            let arr = this._fields.get(fieldName);
            if (!arr) {
                arr = [];
                this._fields.set(fieldName, arr);
            }
            arr.push(idx);
        }
    }
    /** @deprecated No-op: appendChild() tracks end position incrementally. */
    finalize() {
        // No-op — appendChild() updates endOffset/endPosition incrementally.
    }
    /** Serialize to s-expression format for testing (named nodes only, no text). */
    toSExp() {
        return nodeToSExp(this);
    }
    /**
     * Serialize to verbose s-expression format that includes ALL nodes
     * (both named and anonymous) with truncated text content.
     * Matches the source-of-truth format in sot/source.s-expression.
     */
    toVerboseSExp() {
        return nodeToVerboseSExp(this, 0);
    }
}
/** Create a leaf node (no children) from a token. */
export function leafNode(type, source, startOffset, endOffset, startPosition, endPosition, isNamed = true, isError = false, isMissing = false) {
    return new CSTNode(type, source, startOffset, endOffset, startPosition, endPosition, isNamed, isError, isMissing);
}
/**
 * Serialize a CST to s-expression format matching tree-sitter output.
 * Only named nodes appear; anonymous nodes (punctuation, keywords) are hidden.
 * Field names appear as `field: (node)`.
 */
function nodeToSExp(node) {
    const parts = [];
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (!child.isNamed && !child.isError && !child.isMissing)
            continue; // Skip anonymous tokens
        const fieldName = node.fieldNameForChild(i);
        const childStr = child.children.length > 0 || child.isError
            ? nodeToSExp(child)
            : child.isMissing
                ? `(MISSING ${child.type})`
                : `(${child.type})`;
        if (fieldName) {
            parts.push(`${fieldName}: ${childStr}`);
        }
        else {
            parts.push(childStr);
        }
    }
    if (node.isError) {
        if (parts.length === 0) {
            return `(ERROR)`;
        }
        return `(ERROR ${parts.join(' ')})`;
    }
    if (node.isMissing) {
        return `(MISSING ${node.type})`;
    }
    if (parts.length === 0) {
        return `(${node.type})`;
    }
    return `(${node.type} ${parts.join(' ')})`;
}
/**
 * Verbose s-expression: includes ALL nodes (named + anonymous) with text.
 * Leaf text is truncated to 20 chars with `…`.
 * Format: (type "text") for leaves, (type children...) for branches.
 */
function nodeToVerboseSExp(node, depth) {
    const indent = '  '.repeat(depth);
    // MISSING nodes always render as (MISSING "type")
    if (node.isMissing) {
        return `${indent}(MISSING ${JSON.stringify(node.type)})`;
    }
    // ERROR nodes
    if (node.isError && node.children.length === 0) {
        return `${indent}(ERROR)`;
    }
    if (node.children.length === 0) {
        // Leaf node — show text
        const rawText = node.text;
        const truncated = rawText.length > 20 ? rawText.slice(0, 20) + '…' : rawText;
        const escaped = JSON.stringify(truncated);
        return `${indent}(${node.type} ${escaped})`;
    }
    // Branch node — recurse
    const childLines = [];
    for (const child of node.children) {
        childLines.push(nodeToVerboseSExp(child, depth + 1));
    }
    return `${indent}(${node.type}\n${childLines.join('\n')})`;
}
//# sourceMappingURL=cst-node.js.map