import { expect } from 'chai';

import { CC_HIGH, CC_MODERATE, ccBand, ccLevel } from '../../src/renderers/cc-thresholds.js';

describe('cc-thresholds — SEI/McCabe risk bands', () => {
  it('exposes the canonical language-agnostic boundary constants', () => {
    expect(CC_MODERATE).to.equal(11);
    expect(CC_HIGH).to.equal(21);
  });

  it('classifies boundary values per 1–10 low / 11–20 moderate / ≥21 high', () => {
    expect(ccLevel(1)).to.equal('low');
    expect(ccLevel(10)).to.equal('low');
    expect(ccLevel(11)).to.equal('moderate');
    expect(ccLevel(20)).to.equal('moderate');
    expect(ccLevel(21)).to.equal('high');
    expect(ccLevel(500)).to.equal('high');
  });

  it('maps each band to its stoplight emoji', () => {
    expect(ccBand(10)).to.equal('🟢');
    expect(ccBand(11)).to.equal('🟡');
    expect(ccBand(20)).to.equal('🟡');
    expect(ccBand(21)).to.equal('🔴');
  });
});
