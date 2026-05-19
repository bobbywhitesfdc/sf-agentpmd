import {
  ApexParserFactory,
  CompilationUnitContext,
} from '@apexdevtools/apex-parser';
import type { ParserRuleContext } from 'antlr4';

export function parseApexSource(source: string): CompilationUnitContext {
  const parser = ApexParserFactory.createParser(source);
  return parser.compilationUnit();
}

export function locOfCtx(ctx: ParserRuleContext) {
  const start = ctx.start;
  const stop = ctx.stop ?? ctx.start;
  return {
    startRow: start?.line ?? 0,
    startCol: start?.column ?? 0,
    endRow: stop?.line ?? 0,
    endCol: (stop?.column ?? 0) + (stop?.text?.length ?? 0),
  };
}

/**
 * Walk an ANTLR parse-tree node depth-first, invoking the visitor on every
 * descendant (including the start node). Terminal/error nodes have no
 * children and are visited like any other node — caller filters by type.
 */
export function walkParseTree(
  node: ParserRuleContext,
  visit: (n: ParserRuleContext) => void,
): void {
  visit(node);
  const childCount =
    typeof node.getChildCount === 'function' ? node.getChildCount() : 0;
  for (let i = 0; i < childCount; i++) {
    const c = node.getChild(i);
    // Filter to ParserRuleContext children only — terminals don't carry rules.
    if (c && typeof (c as ParserRuleContext).getChildCount === 'function') {
      walkParseTree(c as ParserRuleContext, visit);
    }
  }
}
