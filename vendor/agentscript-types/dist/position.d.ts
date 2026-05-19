import type { SyntaxNode } from './syntax-node.js';
export interface Position {
    line: number;
    character: number;
}
export interface Range {
    start: Position;
    end: Position;
}
export declare function toRange(node: SyntaxNode): Range;
//# sourceMappingURL=position.d.ts.map