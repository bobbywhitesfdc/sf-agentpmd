import type { SyntaxNode } from '@agentscript/types';
import type { ActionDeclaration, ActionReference, ActionTargetKind } from './types.js';
import {
  bodyOf,
  descendants,
  extractStringLiteral,
  findMappingEntry,
  keyHeader,
  locOf,
  mappingKeyHeader,
  mappingValue,
} from './parse.js';
import type { AgentScope } from './complexity.js';

const TARGET_SCHEME = /^([a-z][a-z0-9+.\-]*):\/\//i;

function classifyTarget(uri: string | undefined): ActionTargetKind {
  if (!uri) return 'unknown';
  const m = TARGET_SCHEME.exec(uri);
  if (!m) return 'unknown';
  const scheme = m[1].toLowerCase();
  if (scheme === 'apex') return 'apex';
  if (scheme === 'flow') return 'flow';
  if (scheme.startsWith('prompt')) return 'prompt';
  return 'unknown';
}

/**
 * Within a scope body (the value of a `topic` or `start_agent`/`subagent`
 * mapping_element), the `actions:` entry holds a mapping of named action
 * declarations. Each declaration is itself a mapping with metadata fields
 * like `target:`, `label:`, `inputs:`, `outputs:`.
 */
export function collectDeclarations(scope: AgentScope): ActionDeclaration[] {
  const decls: ActionDeclaration[] = [];
  const actionsBlock = findMappingEntry(scope.body, 'actions');
  if (!actionsBlock) return decls;
  for (const child of actionsBlock.namedChildren) {
    if (child.type !== 'mapping_element') continue;
    const h = mappingKeyHeader(child);
    if (!h) continue;
    const declName = h.kind;
    const declBody = mappingValue(child);
    if (!declBody) {
      decls.push({
        name: declName,
        scope: scope.label,
        target: undefined,
        targetKind: 'unknown',
        location: locOf(child),
      });
      continue;
    }
    const targetVal = findMappingEntry(declBody, 'target');
    const targetStr = targetVal ? extractStringLiteral(targetVal) : undefined;
    decls.push({
      name: declName,
      scope: scope.label,
      target: targetStr,
      targetKind: classifyTarget(targetStr),
      location: locOf(child),
    });
  }
  return decls;
}

interface ScopedNode {
  node: SyntaxNode;
  scope: AgentScope;
  context: ActionReference['context'];
}

/**
 * Collect every member_expression of the form `@actions.X` *outside* the
 * `actions:` declaration block. We treat them as references — i.e. usages of
 * the declared actions in reasoning / before / after blocks.
 *
 * Context discrimination:
 *   • inside reasoning > actions  → 'reasoning_actions'
 *   • inside after_reasoning      → 'after_reasoning_run'
 *   • inside before_reasoning     → 'before_reasoning_run'
 *   • inside transition_statement → 'transition'
 */
export function collectReferences(scope: AgentScope): ActionReference[] {
  const refs: ActionReference[] = [];

  const explore = (body: SyntaxNode | undefined, context: ActionReference['context']) => {
    if (!body) return;
    for (const n of descendants(body)) {
      if (n.type !== 'member_expression') continue;
      // member_expression text is the full chain ("@actions.Foo[.Bar]");
      // text matching is more robust than peeking through the wrapper
      // chain (expression → atom → at_id).
      if (!n.text.startsWith('@actions.')) continue;
      const name = actionNameFromMember(n);
      if (!name) continue;
      // Differentiate when we're inside a transition_statement.
      const ctx = isInsideTransition(n) ? 'transition' : context;
      refs.push({
        name,
        scope: scope.label,
        context: ctx,
        location: locOf(n),
      });
    }
  };

  explore(findMappingEntry(scope.body, 'before_reasoning'), 'before_reasoning_run');
  explore(findMappingEntry(scope.body, 'after_reasoning'), 'after_reasoning_run');
  const reasoning = findMappingEntry(scope.body, 'reasoning');
  if (reasoning) explore(findMappingEntry(reasoning, 'actions'), 'reasoning_actions');

  return refs;
}

function actionNameFromMember(n: SyntaxNode): string | undefined {
  // member_expression text is "@actions.Foo_Bar" — strip the prefix.
  const t = n.text;
  const dot = t.indexOf('.');
  if (dot < 0) return undefined;
  const rest = t.slice(dot + 1);
  // Take the leading identifier, in case of further chained access.
  const m = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
  return m?.[1];
}

function isInsideTransition(n: SyntaxNode): boolean {
  let p = n.parent;
  while (p) {
    if (p.type === 'transition_statement') return true;
    p = p.parent;
  }
  return false;
}
