import { expect } from 'chai';

import { decodeAgentSource } from '../../src/analyzer/parse.js';

// Minimal AgentScript snippet used as the canonical payload across all cases.
const PLAIN_YAML = `config:
    developer_name: "test_agent"

start_agent router:
    reasoning:
        instructions: ->
            | Route the request.
`;

function b64(s: string): string {
  return Buffer.from(s).toString('base64');
}

describe('decodeAgentSource', () => {
  it('passes plain-text AgentScript through unchanged', () => {
    expect(decodeAgentSource(PLAIN_YAML)).to.equal(PLAIN_YAML);
  });

  it('decodes a single-encoded blob', () => {
    const encoded = b64(PLAIN_YAML);
    const result = decodeAgentSource(encoded);
    expect(result).to.equal(PLAIN_YAML);
  });

  it('decodes a double-encoded blob', () => {
    const doubleEncoded = b64(b64(PLAIN_YAML));
    const result = decodeAgentSource(doubleEncoded);
    expect(result).to.equal(PLAIN_YAML);
  });

  it('falls back to raw when decoded content has no AgentScript markers', () => {
    // A base64 blob whose decoded content is not AgentScript
    const nonAgent = b64('{"some":"json","without":"markers"}');
    expect(decodeAgentSource(nonAgent)).to.equal(nonAgent);
  });

  it('falls back to raw for double-encode where neither level has markers', () => {
    const nonAgent = b64(b64('no markers here'));
    expect(decodeAgentSource(nonAgent)).to.equal(nonAgent);
  });

  it('handles leading/trailing whitespace around the blob', () => {
    const encoded = `  ${b64(PLAIN_YAML)}\n`;
    expect(decodeAgentSource(encoded)).to.equal(PLAIN_YAML);
  });

  it('recognises all four AgentScript marker prefixes', () => {
    for (const prefix of ['system:', 'start_agent', 'subagent', 'config:']) {
      const yaml = `${prefix}\n    key: val\n`;
      expect(decodeAgentSource(b64(yaml))).to.equal(yaml);
    }
  });
});
