import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseAgentSource } from '../../src/analyzer/parse.js';
import { complexityForFile } from '../../src/analyzer/complexity.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = (name: string) => resolve(here, '..', 'fixtures', name);

describe('McCabe CC for AgentScript', () => {
  it('matches hand-counted CC on case_escalation_bot.agent', () => {
    const src = readFileSync(fixturePath('case_escalation_bot.agent'), 'utf8');
    const root = parseAgentSource(src);
    const cc = complexityForFile(root);

    // 4 scopes × 3 procedure kinds = 12 procedure CC entries
    expect(cc.procedures).toHaveLength(12);
    expect(cc.total).toBe(31);

    // Spot-check a procedure with a short-circuit `and`
    const afterCustomerVerification = cc.procedures.find(
      p =>
        p.scope === 'start_agent customer_verification' &&
        p.kind === 'after_reasoning',
    );
    expect(afterCustomerVerification?.complexity).toBe(5);
    const andContribs = afterCustomerVerification!.contributors.filter(
      c => c.kind === 'short_circuit_and',
    );
    expect(andContribs).toHaveLength(1);
  });

  it('counts and/or short-circuit operators correctly', () => {
    const src = readFileSync(fixturePath('short_circuit.agent'), 'utf8');
    const root = parseAgentSource(src);
    const cc = complexityForFile(root);

    // root scope, three procedures: before, reasoning.instructions, after
    const before = cc.procedures.find(p => p.kind === 'before_reasoning')!;
    // 3 if_statements (one nested inside another) + 1 `and` + 2 `or` = 6 contributors
    // CC = 1 + 4 if_statements? — let's compute:
    //   if a and b:        → if=1, and=1
    //     set ...
    //   if c or d or e:    → if=1, or=2  (a or b or c is 2 binary_expressions, both 'or')
    //     set ...
    //   if f:              → if=1
    //     if g:            → if=1
    //       set ...
    // Total contributors: 4 if + 1 and + 2 or = 7 → CC = 8
    expect(before.contributors.filter(c => c.kind === 'if_statement')).toHaveLength(4);
    expect(before.contributors.filter(c => c.kind === 'short_circuit_and')).toHaveLength(1);
    expect(before.contributors.filter(c => c.kind === 'short_circuit_or')).toHaveLength(2);
    expect(before.complexity).toBe(8);

    const after = cc.procedures.find(p => p.kind === 'after_reasoning')!;
    expect(after.complexity).toBe(2); // 1 if

    const reasoning = cc.procedures.find(p => p.kind === 'reasoning_instructions')!;
    expect(reasoning.complexity).toBe(1); // pure template
  });
});
