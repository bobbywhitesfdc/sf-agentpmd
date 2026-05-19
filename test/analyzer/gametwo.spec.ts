import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseAgentSource } from '../../src/analyzer/parse.js';
import { collectScopes, complexityForFile } from '../../src/analyzer/complexity.js';
import {
  collectDeclarations,
  collectReferences,
} from '../../src/analyzer/action-references.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (relPath: string) =>
  resolve(here, '..', 'fixtures', 'gametwo', relPath);

const GAMETWO_SIMPLE = fixture(
  'aiAuthoringBundles/GameTwo_Simple/GameTwo_Simple.agent',
);
const GAMETWO_OUT_SIMPLE = fixture(
  'aiAuthoringBundles/GameTwo_Out_Simple/GameTwo_Out_Simple.agent',
);

describe('GameTwo posture-comparison fixtures', () => {
  it('GameTwo_Simple (default-in): CC=19, references include reasoning_instructions_run', () => {
    const root = parseAgentSource(readFileSync(GAMETWO_SIMPLE, 'utf8'));
    const cc = complexityForFile(root);
    expect(cc.total).toBe(19);

    const inst = cc.procedures.find(p => p.kind === 'reasoning_instructions')!;
    expect(inst.complexity).toBe(19);

    const breakdown = {
      ifs: inst.contributors.filter(c => c.kind === 'if_statement').length,
      ands: inst.contributors.filter(c => c.kind === 'short_circuit_and').length,
      ors: inst.contributors.filter(c => c.kind === 'short_circuit_or').length,
    };
    expect(breakdown).toEqual({ ifs: 5, ands: 9, ors: 4 });

    const scopes = collectScopes(root);
    const decls = scopes.flatMap(s => collectDeclarations(s));
    expect(decls.map(d => d.name)).toEqual(['pickRandomChoice']);
    expect(decls[0].target).toBe('apex://GameTwo_RandomChoice');
    expect(decls[0].targetKind).toBe('apex');

    const refs = scopes.flatMap(s => collectReferences(s));
    // `run @actions.pickRandomChoice` lives inside reasoning.instructions.
    const llmRefs = refs.filter(r => r.context === 'reasoning_instructions_run');
    expect(llmRefs).toHaveLength(1);
    expect(llmRefs[0].name).toBe('pickRandomChoice');
  });

  it('GameTwo_Out_Simple (default-out): CC drops to 2 because branching moves to Apex', () => {
    const root = parseAgentSource(readFileSync(GAMETWO_OUT_SIMPLE, 'utf8'));
    const cc = complexityForFile(root);
    expect(cc.total).toBe(2);

    const inst = cc.procedures.find(p => p.kind === 'reasoning_instructions')!;
    expect(inst.complexity).toBe(2);

    const scopes = collectScopes(root);
    const decls = scopes.flatMap(s => collectDeclarations(s));
    expect(decls.map(d => d.name)).toEqual(['playRound']);
    expect(decls[0].targetKind).toBe('apex');

    const refs = scopes.flatMap(s => collectReferences(s));
    // The reference lives in `reasoning.actions:`, not instructions:->.
    const reasoningRefs = refs.filter(r => r.context === 'reasoning_actions');
    expect(reasoningRefs).toHaveLength(1);
  });
});
