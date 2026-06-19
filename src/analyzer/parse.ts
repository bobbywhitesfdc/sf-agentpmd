import type { SyntaxNode } from '@agentscript/types';

import { parse as parseAgent } from '@agentscript/parser-javascript';

export function parseAgentSource(source: string): SyntaxNode {
  return parseAgent(source).rootNode;
}

export function locOf(n: SyntaxNode) {
  return {
    endCol: n.endCol,
    endRow: n.endRow,
    startCol: n.startCol,
    startRow: n.startRow,
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
export function keyHeader(n: SyntaxNode): null | { kind: string; label?: string } {
  if (n.type !== 'key') return null;
  const head = n.text.split('\n', 1)[0];
  const colon = head.indexOf(':');
  const lhs = (colon === -1 ? head : head.slice(0, colon)).trim();
  const parts = lhs.split(/\s+/);
  return { kind: parts[0], label: parts.length > 1 ? parts.slice(1).join(' ') : undefined };
}

/**
 * The CST shapes a key/value pair as `mapping_element { key, ':', value }`.
 * Given the mapping_element node, return its key kind + label.
 */
export function mappingKeyHeader(m: SyntaxNode): null | { kind: string; label?: string } {
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
const NON_VALUE_NAMED_TYPES = new Set(['comment', 'key']);

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
  const {parent} = scopeKey;
  if (!parent) return undefined;
  return mappingValue(parent);
}

/**
 * Read the `developer_name:` value from the `config:` block of a parsed
 * .agent file. This is the canonical API name of the agent (matches what
 * `sf agent generate authoring-bundle --api-name X` produces). Returns
 * undefined when the field is absent or empty.
 */
export function extractDeveloperName(root: SyntaxNode): string | undefined {
  const topMapping = root.namedChildren.find(c => c.type === 'mapping') ?? root;
  for (const c of topMapping.namedChildren) {
    if (c.type !== 'mapping_element') continue;
    const keyNode =
      c.childForFieldName('key') ?? c.namedChildren.find(n => n.type === 'key');
    if (!keyNode) continue;
    const h = keyHeader(keyNode);
    if (!h || h.kind !== 'config') continue;
    const body = mappingValue(c);
    if (!body) return undefined;
    const devNameVal = findMappingEntry(body, 'developer_name');
    if (!devNameVal) return undefined;
    return extractStringLiteral(devNameVal);
  }

  return undefined;
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
