import {
  MethodDeclarationContext,
  ConstructorDeclarationContext,
  IfStatementContext,
  ForStatementContext,
  WhileStatementContext,
  DoWhileStatementContext,
  WhenControlContext,
  CatchClauseContext,
  CondExpressionContext,
  LogAndExpressionContext,
  LogOrExpressionContext,
  type CompilationUnitContext,
} from '@apexdevtools/apex-parser';
import type { ParserRuleContext } from 'antlr4';
import type {
  ApexCCContributor,
  ApexCCContributorKind,
  ApexMethodCC,
} from './types.js';
import { locOfCtx, walkParseTree } from './apex-parse.js';

/**
 * Standard McCabe Cyclomatic Complexity for Apex, per the SonarQube /
 * PMD CyclomaticComplexity convention used in the categorization
 * whitepaper § 7:
 *
 *   CC = 1
 *      + count(if)
 *      + count(for)        // includes enhanced-for (for-each)
 *      + count(while)
 *      + count(do-while)
 *      + count(when arm)   // each switch `when X { ... }`; `when else` excluded
 *      + count(catch)      // each catch clause
 *      + count(ternary ?:)
 *      + count(&&)
 *      + count(||)
 *
 * Not counted: else, when else, finally, try itself.
 */
export function complexityOfMethod(
  methodCtx: MethodDeclarationContext | ConstructorDeclarationContext,
): ApexMethodCC {
  const body = methodCtx.block();
  const contributors: ApexCCContributor[] = [];

  if (body) {
    walkParseTree(body, node => {
      // Don't descend into nested methods/constructors — they have their
      // own CC counted separately.
      if (
        node !== methodCtx &&
        (node instanceof MethodDeclarationContext ||
          node instanceof ConstructorDeclarationContext)
      ) {
        // walkParseTree will still recurse into this node's subtree.
        // We can't easily prune, so we filter by parentage: skip
        // contributors whose nearest enclosing method/ctor is not us.
        return;
      }

      const kind = classifyContributor(node);
      if (kind !== undefined && enclosingMethod(node) === methodCtx) {
        contributors.push({ kind, location: locOfCtx(node) });
      }
    });
  }

  const name =
    methodCtx instanceof ConstructorDeclarationContext
      ? methodCtx.qualifiedName()?.getText() ?? '<ctor>'
      : (methodCtx as MethodDeclarationContext).id()?.getText() ?? '<anon>';

  const signature = renderSignature(methodCtx, name);

  return {
    name,
    kind: methodCtx instanceof ConstructorDeclarationContext ? 'constructor' : 'method',
    signature,
    complexity: 1 + contributors.length,
    contributors,
    location: locOfCtx(methodCtx),
  };
}

function classifyContributor(node: ParserRuleContext): ApexCCContributorKind | undefined {
  if (node instanceof IfStatementContext) return 'if_statement';
  if (node instanceof ForStatementContext) return 'for_statement';
  if (node instanceof WhileStatementContext) return 'while_statement';
  if (node instanceof DoWhileStatementContext) return 'do_while_statement';
  if (node instanceof WhenControlContext) {
    // `when else { ... }` is the default arm → don't count it.
    const wv = node.whenValue();
    const elseTok = wv && typeof wv.ELSE === 'function' ? wv.ELSE() : undefined;
    return elseTok ? undefined : 'when_arm';
  }
  if (node instanceof CatchClauseContext) return 'catch_clause';
  if (node instanceof CondExpressionContext) return 'ternary';
  if (node instanceof LogAndExpressionContext) return 'short_circuit_and';
  if (node instanceof LogOrExpressionContext) return 'short_circuit_or';
  return undefined;
}

function enclosingMethod(
  node: ParserRuleContext,
): MethodDeclarationContext | ConstructorDeclarationContext | undefined {
  let p: ParserRuleContext | undefined = node.parentCtx as ParserRuleContext | undefined;
  while (p) {
    if (p instanceof MethodDeclarationContext || p instanceof ConstructorDeclarationContext) {
      return p;
    }
    p = p.parentCtx as ParserRuleContext | undefined;
  }
  return undefined;
}

function renderSignature(
  ctx: MethodDeclarationContext | ConstructorDeclarationContext,
  name: string,
): string {
  const params = ctx.formalParameters();
  const paramsText = params ? params.getText() : '()';
  if (ctx instanceof MethodDeclarationContext) {
    const retType = ctx.typeRef()?.getText() ?? (ctx.VOID() ? 'void' : '');
    return `${retType ? retType + ' ' : ''}${name}${paramsText}`;
  }
  return `${name}${paramsText}`;
}

/**
 * Enumerate every method and constructor in a compilation unit, including
 * those nested inside inner classes. Each gets its own CC entry per the
 * v2 scope ("all methods in any class touched by apex://").
 */
export function methodsInCompilationUnit(cu: CompilationUnitContext): Array<
  MethodDeclarationContext | ConstructorDeclarationContext
> {
  const out: Array<MethodDeclarationContext | ConstructorDeclarationContext> = [];
  walkParseTree(cu, node => {
    if (
      (node instanceof MethodDeclarationContext ||
        node instanceof ConstructorDeclarationContext) &&
      node.block()
    ) {
      out.push(node);
    }
  });
  return out;
}
