import { parse as parseAgent } from '@agentscript/parser-javascript';
import type { SyntaxNode } from '@agentscript/types';

export function parseAgentSource(source: string): SyntaxNode {
  return parseAgent(source).rootNode;
}

export function locOf(n: SyntaxNode) {
  return {
    startRow: n.startRow,
    startCol: n.startCol,
    endRow: n.endRow,
    endCol: n.endCol,
  };
}

export function walk(node: SyntaxNode, visit: (n: SyntaxNode) => void): void {
  visit(node);
  for (const c of node.namedChildren) walk(c, visit);
}

export function* descendants(node: SyntaxNode): Generator<SyntaxNode> {
  yield node;
  for (const c of node.namedChildren) yield* descendants(c);
}

/**
 * The block header for a `key` node. AgentScript keys can be plain (`config`)
 * or named (`topic case_creation`, `start_agent customer_verification`).
 * We return the first whitespace-delimited token as the key kind, and the
 * remainder (if any) as the instance label.
 */
export function keyHeader(n: SyntaxNode): { kind: string; label?: string } | null {
  if (n.type !== 'key') return null;
  const head = n.text.split('\n', 1)[0];
  const colon = head.indexOf(':');
  const lhs = (colon >= 0 ? head.slice(0, colon) : head).trim();
  const parts = lhs.split(/\s+/);
  return { kind: parts[0], label: parts.length > 1 ? parts.slice(1).join(' ') : undefined };
}

/**
 * The CST shapes a key/value pair as `mapping_element { key, ':', value }`.
 * Given the mapping_element node, return its key kind + label.
 */
export function mappingKeyHeader(m: SyntaxNode): { kind: string; label?: string } | null {
  if (m.type !== 'mapping_element') return null;
  const keyNode = m.childForFieldName('key');
  if (!keyNode) {
    // Fall back: first namedChild of type 'key'.
    for (const c of m.namedChildren) {
      if (c.type === 'key') return keyHeader(c);
    }
    return null;
  }
  return keyHeader(keyNode);
}

/**
 * The value-bearing child of a mapping_element. Could be `mapping` (sub-block),
 * `expression_with_to` (scalar/expression), `colinear_value`, `procedure`,
 * `variable_declaration`, etc.
 *
 * A mapping_element can interleave leading `comment` nodes between the `:`/`->`
 * markers and the actual value-bearing child. Skip them so we don't return a
 * comment as the "value."
 */
const NON_VALUE_NAMED_TYPES = new Set(['key', 'comment']);

export function mappingValue(m: SyntaxNode): SyntaxNode | undefined {
  if (m.type !== 'mapping_element') return undefined;
  for (const c of m.namedChildren) {
    if (!NON_VALUE_NAMED_TYPES.has(c.type)) return c;
  }
  return undefined;
}

/**
 * Within a scope whose body is a `mapping` (the typical case for topic/
 * start_agent/subagent blocks), find the mapping_element whose key matches
 * `kind`, and return its value subtree.
 */
export function findMappingEntry(parentBody: SyntaxNode, kind: string): SyntaxNode | undefined {
  for (const c of parentBody.namedChildren) {
    if (c.type !== 'mapping_element') continue;
    const h = mappingKeyHeader(c);
    if (h && h.kind === kind) return mappingValue(c);
  }
  return undefined;
}

/**
 * Walk a scope-key node (topic / start_agent / subagent at top level) and
 * return its body — the `mapping` that holds before_reasoning, after_reasoning,
 * reasoning, actions, etc. The scope-key itself lives inside a mapping_element
 * at the source-file level; the body is the sibling value.
 */
export function bodyOf(scopeKey: SyntaxNode): SyntaxNode | undefined {
  const parent = scopeKey.parent;
  if (!parent) return undefined;
  return mappingValue(parent);
}

/** Convenience: extract a leaf string literal text (without surrounding quotes). */
export function extractStringLiteral(n: SyntaxNode): string | undefined {
  for (const d of descendants(n)) {
    if (d.type === 'string') {
      const t = d.text;
      if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
      if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
      return t;
    }
  }
  return undefined;
}
