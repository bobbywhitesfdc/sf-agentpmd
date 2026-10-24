import type { CSTNode } from './cst-node.js';
export interface HighlightCapture {
    name: string;
    text: string;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}
/**
 * Walk the CST and produce highlight captures matching highlights.scm.
 *
 * Tree-sitter query priority: later patterns override earlier ones.
 * We replicate this by first assigning generic captures, then overriding
 * with contextual ones (e.g., id → variable, then key > id → property).
 */
export declare function highlight(root: CSTNode): HighlightCapture[];
//# sourceMappingURL=highlighter.d.ts.map