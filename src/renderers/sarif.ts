import type {
  AnalysisReport,
  ApexClassReport,
  ApexMethodCC,
  FileReport,
  ProcedureCC,
} from '../analyzer/types.js';
import type { RenderOptions } from './options.js';

interface SarifLog {
  version: '2.1.0';
  $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json';
  runs: SarifRun[];
}

interface SarifRun {
  tool: { driver: SarifDriver };
  results: SarifResult[];
}

interface SarifDriver {
  name: 'sf-agentpmd';
  semanticVersion: string;
  informationUri: string;
  rules: SarifRule[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri?: string;
  defaultConfiguration?: { level: 'note' | 'warning' | 'error' };
}

interface SarifResult {
  ruleId: string;
  level: 'note' | 'warning' | 'error';
  message: { text: string };
  locations: SarifLocation[];
  properties: { complexity: number; kind: string };
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  };
}

const DEFAULT_WARNING = 10;
const DEFAULT_ERROR = 20;

const RULE_AGENT_CC: SarifRule = {
  id: 'AGENTPMD.AgentScriptCyclomaticComplexity',
  name: 'AgentScriptCyclomaticComplexity',
  shortDescription: {
    text: 'McCabe cyclomatic complexity of an AgentScript procedure.',
  },
  fullDescription: {
    text:
      'Reports cyclomatic complexity (McCabe) of an AgentScript before_reasoning, ' +
      'after_reasoning, or reasoning.instructions block. Computed as 1 + ' +
      'count(if) + count(elif) + count(ternary) + count(and) + count(or).',
  },
  helpUri:
    'https://github.com/anthropics/AgentForcePMD/blob/main/docs/agent-loc-categorization-skill-v2.md#-7--cyclomatic-complexity',
  defaultConfiguration: { level: 'note' },
};

const RULE_APEX_CC: SarifRule = {
  id: 'AGENTPMD.ApexCyclomaticComplexity',
  name: 'ApexCyclomaticComplexity',
  shortDescription: {
    text: 'McCabe cyclomatic complexity of an Apex method or constructor.',
  },
  fullDescription: {
    text:
      'Reports cyclomatic complexity (McCabe) of an Apex method or ' +
      'constructor body, mirroring SonarQube / PMD CyclomaticComplexity.',
  },
  helpUri:
    'https://github.com/anthropics/AgentForcePMD/blob/main/docs/agent-loc-categorization-skill-v2.md#-7--cyclomatic-complexity',
  defaultConfiguration: { level: 'note' },
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
    version: '2.1.0',
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'sf-agentpmd',
            semanticVersion: pluginVersion(),
            informationUri: 'https://github.com/anthropics/AgentForcePMD',
            rules: [RULE_AGENT_CC, RULE_APEX_CC],
          },
        },
        results,
      },
    ],
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
    ruleId: RULE_AGENT_CC.id,
    level: levelFor(p.complexity, warn, err),
    message: {
      text:
        `Procedure '${p.kind}' in '${p.scope}' has cyclomatic complexity ` +
        `${p.complexity}.`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: f.path },
          // AgentScript CST locations are 0-based — bump to SARIF 1-based.
          region: regionFromZeroBased(p.location),
        },
      },
    ],
    properties: { complexity: p.complexity, kind: p.kind },
  };
}

function buildApexResult(
  cls: ApexClassReport,
  m: ApexMethodCC,
  warn: number,
  err: number,
): SarifResult {
  return {
    ruleId: RULE_APEX_CC.id,
    level: levelFor(m.complexity, warn, err),
    message: {
      text: `${m.kind} '${m.name}' has cyclomatic complexity ${m.complexity}.`,
    },
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
    properties: { complexity: m.complexity, kind: m.kind },
  };
}

function levelFor(cc: number, warn: number, err: number): SarifResult['level'] {
  if (cc >= err) return 'error';
  if (cc >= warn) return 'warning';
  return 'note';
}

function regionFromZeroBased(loc: ProcedureCC['location']) {
  return {
    startLine: loc.startRow + 1,
    startColumn: loc.startCol + 1,
    endLine: loc.endRow + 1,
    endColumn: loc.endCol + 1,
  };
}

function regionFromAntlr(loc: ProcedureCC['location']) {
  return {
    startLine: Math.max(1, loc.startRow),
    startColumn: loc.startCol + 1,
    endLine: Math.max(1, loc.endRow),
    endColumn: loc.endCol + 1,
  };
}

function pluginVersion(): string {
  // Avoid a JSON-file dep at runtime; this stays in sync with package.json
  // manually. Bumping the plugin should bump this string.
  return '0.2.0';
}
