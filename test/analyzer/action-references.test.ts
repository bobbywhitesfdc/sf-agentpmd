import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectDeclarations,
  collectReferences,
} from '../../src/analyzer/action-references.js';
import { collectScopes } from '../../src/analyzer/complexity.js';
import { parseAgentSource } from '../../src/analyzer/parse.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = (name: string) =>
  resolve(here, '..', 'fixtures', name);

describe('action declarations & references', () => {
  it('finds 8 flow:// declarations in case_escalation_bot.agent', () => {
    const src = readFileSync(fixturePath('case_escalation_bot.agent'), 'utf8');
    const root = parseAgentSource(src);
    const scopes = collectScopes(root);

    const decls = scopes.flatMap(s => collectDeclarations(s));
    expect(decls).to.have.lengthOf(8);
    expect(decls.every(d => d.targetKind === 'flow')).to.equal(true);

    const names = decls.map(d => d.name).sort();
    expect(names).to.deep.equal([
      'Calculate_Escalation_Score',
      'Close_Case',
      'Create_Support_Case',
      'Get_Customer_Case_History',
      'Initiate_Escalation',
      'Notify_Customer',
      'Provide_Solution',
      'Verify_Customer_Identity',
    ]);

    const cc = decls.find(d => d.name === 'Verify_Customer_Identity');
    expect(cc?.target).to.equal('flow://VerifyCustomerIdentity');
  });

  it('finds 16 references in case_escalation_bot.agent (2× each)', () => {
    const src = readFileSync(fixturePath('case_escalation_bot.agent'), 'utf8');
    const root = parseAgentSource(src);
    const scopes = collectScopes(root);

    const refs = scopes.flatMap(s => collectReferences(s));
    expect(refs).to.have.lengthOf(16);

    const byName = new Map<string, number>();
    for (const r of refs) byName.set(r.name, (byName.get(r.name) ?? 0) + 1);
    expect(byName.get('Verify_Customer_Identity')).to.equal(2);
    expect(byName.get('Close_Case')).to.equal(2);

    // Split by context. 16 refs = 8 in reasoning.actions + 1 in
    // before_reasoning (case_resolution invokes Provide_Solution there) +
    // 7 in after_reasoning.
    const inReasoning = refs.filter(r => r.context === 'reasoning_actions');
    const inBefore = refs.filter(r => r.context === 'before_reasoning_run');
    const inAfter = refs.filter(r => r.context === 'after_reasoning_run');
    expect(inReasoning).to.have.lengthOf(8);
    expect(inBefore).to.have.lengthOf(1);
    expect(inAfter).to.have.lengthOf(7);
  });
});
