import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectDeclarations,
  collectReferences,
} from '../../src/analyzer/action-references.js';
import { collectScopes, complexityForFile } from '../../src/analyzer/complexity.js';
import { parseAgentSource } from '../../src/analyzer/parse.js';

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
    expect(cc.total).to.equal(19);

    const inst = cc.procedures.find(p => p.kind === 'reasoning_instructions')!;
    expect(inst.complexity).to.equal(19);

    const breakdown = {
      ands: inst.contributors.filter(c => c.kind === 'short_circuit_and').length,
      ifs: inst.contributors.filter(c => c.kind === 'if_statement').length,
      ors: inst.contributors.filter(c => c.kind === 'short_circuit_or').length,
    };
    expect(breakdown).to.deep.equal({ ands: 9, ifs: 5, ors: 4 });

    const scopes = collectScopes(root);
    const decls = scopes.flatMap(s => collectDeclarations(s));
    expect(decls.map(d => d.name)).to.deep.equal(['pickRandomChoice']);
    expect(decls[0].target).to.equal('apex://GameTwo_RandomChoice');
    expect(decls[0].targetKind).to.equal('apex');

    const refs = scopes.flatMap(s => collectReferences(s));
    // `run @actions.pickRandomChoice` lives inside reasoning.instructions.
    const llmRefs = refs.filter(r => r.context === 'reasoning_instructions_run');
    expect(llmRefs).to.have.lengthOf(1);
    expect(llmRefs[0].name).to.equal('pickRandomChoice');
  });

  it('GameTwo_Out_Simple (default-out): CC drops to 2 because branching moves to Apex', () => {
    const root = parseAgentSource(readFileSync(GAMETWO_OUT_SIMPLE, 'utf8'));
    const cc = complexityForFile(root);
    expect(cc.total).to.equal(2);

    const inst = cc.procedures.find(p => p.kind === 'reasoning_instructions')!;
    expect(inst.complexity).to.equal(2);

    const scopes = collectScopes(root);
    const decls = scopes.flatMap(s => collectDeclarations(s));
    expect(decls.map(d => d.name)).to.deep.equal(['playRound']);
    expect(decls[0].targetKind).to.equal('apex');

    const refs = scopes.flatMap(s => collectReferences(s));
    // The reference lives in `reasoning.actions:`, not instructions:->.
    const reasoningRefs = refs.filter(r => r.context === 'reasoning_actions');
    expect(reasoningRefs).to.have.lengthOf(1);
  });
});
