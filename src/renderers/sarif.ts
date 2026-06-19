import type {
  AnalysisReport,
  ApexClassReport,
  ApexMethodCC,
  FileReport,
  ProcedureCC,
} from '../analyzer/types.js';
import type { RenderOptions } from './options.js';

interface SarifLog {
  $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json';
  runs: SarifRun[];
  version: '2.1.0';
}

interface SarifRun {
  results: SarifResult[];
  tool: { driver: SarifDriver };
}

interface SarifDriver {
  informationUri: string;
  name: 'sf-agentpmd';
  rules: SarifRule[];
  semanticVersion: string;
}

interface SarifRule {
  defaultConfiguration?: { level: 'error' | 'note' | 'warning' };
  fullDescription: { text: string };
  helpUri?: string;
  id: string;
  name: string;
  shortDescription: { text: string };
}

interface SarifResult {
  level: 'error' | 'note' | 'warning';
  locations: SarifLocation[];
  message: { text: string };
  properties: { complexity: number; kind: string };
  ruleId: string;
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region: { endColumn: number; endLine: number; startColumn: number; startLine: number; };
  };
}

const DEFAULT_WARNING = 10;
const DEFAULT_ERROR = 20;

const RULE_AGENT_CC: SarifRule = {
  defaultConfiguration: { level: 'note' },
  fullDescription: {
    text:
      'Reports cyclomatic complexity (McCabe) of an AgentScript before_reasoning, ' +
      'after_reasoning, or reasoning.instructions block. Computed as 1 + ' +
      'count(if) + count(elif) + count(ternary) + count(and) + count(or).',
  },
  helpUri:
    'https://github.com/bobbywhitesfdc/sf-agentpmd/blob/main/docs/agent-loc-categorization-skill-v2.md#-7--cyclomatic-complexity',
  id: 'AGENTPMD.AgentScriptCyclomaticComplexity',
  name: 'AgentScriptCyclomaticComplexity',
  shortDescription: {
    text: 'McCabe cyclomatic complexity of an AgentScript procedure.',
  },
};

const RULE_APEX_CC: SarifRule = {
  defaultConfiguration: { level: 'note' },
  fullDescription: {
    text:
      'Reports cyclomatic complexity (McCabe) of an Apex method or ' +
      'constructor body, mirroring SonarQube / PMD CyclomaticComplexity.',
  },
  helpUri:
    'https://github.com/bobbywhitesfdc/sf-agentpmd/blob/main/docs/agent-loc-categorization-skill-v2.md#-7--cyclomatic-complexity',
  id: 'AGENTPMD.ApexCyclomaticComplexity',
  name: 'ApexCyclomaticComplexity',
  shortDescription: {
    text: 'McCabe cyclomatic complexity of an Apex method or constructor.',
  },
};

export function renderSarif(report: AnalysisReport, opts?: RenderOptions): string {
  const warn = opts?.sarifWarningThreshold ?? DEFAULT_WARNING;
  const err = opts?.sarifErrorThreshold ?? DEFAULT_ERROR;

  const results: SarifResult[] = [];
  for (const f of report.files) {
    for (const p of f.procedures) {
      results.push(buildAgentResult(f, p, warn, err));
    }
  }

  for (const cls of report.apexClasses) {
    for (const m of cls.methods) {
      results.push(buildApexResult(cls, m, warn, err));
    }
  }

  const log: SarifLog = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        results,
        tool: {
          driver: {
            informationUri: 'https://github.com/bobbywhitesfdc/sf-agentpmd',
            name: 'sf-agentpmd',
            rules: [RULE_AGENT_CC, RULE_APEX_CC],
            semanticVersion: pluginVersion(),
          },
        },
      },
    ],
    version: '2.1.0',
  };

  return JSON.stringify(log, null, 2);
}

function buildAgentResult(
  f: FileReport,
  p: ProcedureCC,
  warn: number,
  err: number,
): SarifResult {
  return {
    level: levelFor(p.complexity, warn, err),
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: f.path },
          // AgentScript CST locations are 0-based — bump to SARIF 1-based.
          region: regionFromZeroBased(p.location),
        },
      },
    ],
    message: {
      text:
        `Procedure '${p.kind}' in '${p.scope}' has cyclomatic complexity ` +
        `${p.complexity}.`,
    },
    properties: { complexity: p.complexity, kind: p.kind },
    ruleId: RULE_AGENT_CC.id,
  };
}

function buildApexResult(
  cls: ApexClassReport,
  m: ApexMethodCC,
  warn: number,
  err: number,
): SarifResult {
  return {
    level: levelFor(m.complexity, warn, err),
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: cls.path },
          // ANTLR token positions are 1-based for line, 0-based for column;
          // SARIF wants 1-based for both.
          region: regionFromAntlr(m.location),
        },
      },
    ],
    message: {
      text: `${m.kind} '${m.name}' has cyclomatic complexity ${m.complexity}.`,
    },
    properties: { complexity: m.complexity, kind: m.kind },
    ruleId: RULE_APEX_CC.id,
  };
}

function levelFor(cc: number, warn: number, err: number): SarifResult['level'] {
  if (cc >= err) return 'error';
  if (cc >= warn) return 'warning';
  return 'note';
}

function regionFromZeroBased(loc: ProcedureCC['location']) {
  return {
    endColumn: loc.endCol + 1,
    endLine: loc.endRow + 1,
    startColumn: loc.startCol + 1,
    startLine: loc.startRow + 1,
  };
}

function regionFromAntlr(loc: ProcedureCC['location']) {
  return {
    endColumn: loc.endCol + 1,
    endLine: Math.max(1, loc.endRow),
    startColumn: loc.startCol + 1,
    startLine: Math.max(1, loc.startRow),
  };
}

function pluginVersion(): string {
  // Avoid a JSON-file dep at runtime; this stays in sync with package.json
  // manually. Bumping the plugin should bump this string.
  return '0.1.0';
}
