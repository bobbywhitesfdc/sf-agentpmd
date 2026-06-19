import {
  ApexParserFactory,
  CompilationUnitContext,
} from '@apexdevtools/apex-parser';

/**
 * Structural view of an ANTLR parse-tree node covering only the members this
 * analyzer touches. `@apexdevtools/apex-parser` 5.x ships generated context
 * types that extend antlr4's `ParserRuleContext`, but antlr4 4.13.x does not
 * surface `ParserRuleContext` (nor its inherited `getText`/`getChild`) through
 * its NodeNext `.d.cts` re-export chain, so importing it directly fails to
 * resolve. We model the contract locally instead — the runtime objects carry
 * all of these methods.
 */
export interface ApexRuleNode {
  getChild(i: number): unknown;
  getChildCount(): number;
  getText(): string;
  parentCtx?: ApexRuleNode | undefined;
  start?: { column?: number; line?: number; text?: string };
  stop?: { column?: number; line?: number; text?: string };
}

export function parseApexSource(source: string): CompilationUnitContext {
  const parser = ApexParserFactory.createParser(source);
  return parser.compilationUnit();
}

export function locOfCtx(ctx: ApexRuleNode) {
  const {start} = ctx;
  const stop = ctx.stop ?? ctx.start;
  return {
    endCol: (stop?.column ?? 0) + (stop?.text?.length ?? 0),
    endRow: stop?.line ?? 0,
    startCol: start?.column ?? 0,
    startRow: start?.line ?? 0,
  };
}

/**
 * Walk an ANTLR parse-tree node depth-first, invoking the visitor on every
 * descendant (including the start node). Terminal/error nodes have no
 * children and are visited like any other node — caller filters by type.
 */
export function walkParseTree(
  node: ApexRuleNode,
  visit: (n: ApexRuleNode) => void,
): void {
  visit(node);
  const childCount =
    typeof node.getChildCount === 'function' ? node.getChildCount() : 0;
  for (let i = 0; i < childCount; i++) {
    const c = node.getChild(i);
    // Filter to ParserRuleContext children only — terminals don't carry rules.
    if (c && typeof (c as ApexRuleNode).getChildCount === 'function') {
      walkParseTree(c as ApexRuleNode, visit);
    }
  }
}
