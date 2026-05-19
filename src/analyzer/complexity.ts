import type { SyntaxNode } from '@agentscript/types';
import type { CCContributor, ProcedureCC, SourceLocation } from './types.js';
import { bodyOf, descendants, findMappingEntry, keyHeader, locOf } from './parse.js';

/**
 * Standard McCabe CC, applied to AgentScript control-flow nodes.
 *
 * Per the categorization whitepaper (§ 7) the convention mirrors
 * SonarQube/PMD/Checkstyle for the relevant language:
 *
 *   CC = 1
 *      + count(if_statement)
 *      + count(elif_clause)
 *      + count(ternary_expression)
 *      + count(binary_expression where operator ∈ {and, or})
 *
 * We do NOT count: else_clause, comparison_expression, set/run/transition,
 * try/catch (AgentScript has none), default branches.
 */
const SHORT_CIRCUIT_OPS = new Set(['and', 'or']);

export function complexityOf(body: SyntaxNode, scope: string, kind: ProcedureCC['kind']): ProcedureCC {
  const contributors: CCContributor[] = [];
  for (const n of descendants(body)) {
    switch (n.type) {
      case 'if_statement':
        contributors.push({ kind: 'if_statement', location: locOf(n) });
        break;
      case 'elif_clause':
        contributors.push({ kind: 'elif_clause', location: locOf(n) });
        break;
      case 'ternary_expression':
        contributors.push({ kind: 'ternary_expression', location: locOf(n) });
        break;
      case 'binary_expression': {
        const op = binaryOperator(n);
        if (op === 'and') contributors.push({ kind: 'short_circuit_and', location: locOf(n) });
        else if (op === 'or') contributors.push({ kind: 'short_circuit_or', location: locOf(n) });
        break;
      }
    }
  }
  return {
    scope,
    kind,
    complexity: 1 + contributors.length,
    contributors,
    location: locOf(body),
  };
}

function binaryOperator(n: SyntaxNode): string | undefined {
  for (const c of n.children) {
    if (!c.isNamed && SHORT_CIRCUIT_OPS.has(c.type)) return c.type;
    if (!c.isNamed && (c.type === '+' || c.type === '-' || c.type === '*' || c.type === '/')) return c.type;
  }
  return undefined;
}

/**
 * Identify the procedure-bearing blocks in a single topic / start_agent /
 * subagent scope. AgentScript's three control-flow surfaces are:
 *   • before_reasoning: <procedure>     (deterministic, pre-LLM)
 *   • after_reasoning:  <procedure>     (deterministic, post-LLM)
 *   • reasoning.instructions: -> <template body>  (LLM-evaluated)
 *
 * v1 walks all three for CC. (instructions: -> body holds Reasoning Logic per
 * whitepaper § 4 but the CC convention itself is language-neutral.)
 */
export function collectProcedures(scopeBody: SyntaxNode, scopeLabel: string): ProcedureCC[] {
  const out: ProcedureCC[] = [];

  const before = findMappingEntry(scopeBody, 'before_reasoning');
  if (before) out.push(complexityOf(before, scopeLabel, 'before_reasoning'));

  const after = findMappingEntry(scopeBody, 'after_reasoning');
  if (after) out.push(complexityOf(after, scopeLabel, 'after_reasoning'));

  const reasoning = findMappingEntry(scopeBody, 'reasoning');
  if (reasoning) {
    const instructions = findMappingEntry(reasoning, 'instructions');
    if (instructions) {
      out.push(complexityOf(instructions, scopeLabel, 'reasoning_instructions'));
    }
  }

  return out;
}

/** Scopes that contain procedure-bearing blocks. */
const PROCEDURE_SCOPES = new Set(['start_agent', 'topic', 'subagent']);

export interface AgentScope {
  body: SyntaxNode;
  label: string;
  kind: string;
}

/**
 * Find topic/start_agent/subagent scopes anywhere in the tree. They appear
 * at the source-file level as mapping_elements whose key kind matches.
 */
export function collectScopes(root: SyntaxNode): AgentScope[] {
  const scopes: AgentScope[] = [];
  // The source_file has a single top-level `mapping` child holding the agent
  // declarations (system, config, variables, start_agent X, topic Y, …).
  const topMapping = root.namedChildren.find(c => c.type === 'mapping') ?? root;
  for (const c of topMapping.namedChildren) {
    if (c.type !== 'mapping_element') continue;
    const keyNode = c.childForFieldName('key') ?? c.namedChildren.find(n => n.type === 'key');
    if (!keyNode) continue;
    const h = keyHeader(keyNode);
    if (!h || !PROCEDURE_SCOPES.has(h.kind)) continue;
    const body = bodyOf(keyNode);
    if (!body) continue;
    scopes.push({ body, label: `${h.kind} ${h.label ?? ''}`.trim(), kind: h.kind });
  }
  return scopes;
}

export interface FileComplexity {
  procedures: ProcedureCC[];
  total: number;
}

export function complexityForFile(root: SyntaxNode): FileComplexity {
  const procedures: ProcedureCC[] = [];
  for (const s of collectScopes(root)) {
    procedures.push(...collectProcedures(s.body, s.label));
  }
  const total = procedures.reduce((acc, p) => acc + p.complexity, 0);
  return { procedures, total };
}

export function dummyLoc(): SourceLocation {
  return { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
}
