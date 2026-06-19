export interface SourceLocation {
  endCol: number;
  endRow: number;
  startCol: number;
  startRow: number;
}

export interface ProcedureCC {
  complexity: number;
  contributors: CCContributor[];
  kind: 'after_reasoning' | 'available_when' | 'before_reasoning' | 'other' | 'reasoning_instructions';
  location: SourceLocation;
  scope: string;
}

export interface CCContributor {
  kind: 'elif_clause' | 'if_statement' | 'short_circuit_and' | 'short_circuit_or' | 'ternary_expression';
  location: SourceLocation;
}

export type ActionTargetKind = 'apex' | 'flow' | 'prompt' | 'unknown' | 'utils';

export interface ActionDeclaration {
  location: SourceLocation;
  name: string;
  scope: string;
  target?: string;
  targetKind: ActionTargetKind;
}

export type ActionReferenceContext =
  | 'after_reasoning_run'
  | 'before_reasoning_run'
  | 'reasoning_actions'
  | 'reasoning_instructions_run'
  | 'transition'
  | 'unknown';

export interface ActionReference {
  context: ActionReferenceContext;
  location: SourceLocation;
  name: string;
  scope: string;
}

export interface FileReport {
  declarations: ActionDeclaration[];
  fileComplexity: number;
  parseErrors: ParseDiagnostic[];
  path: string;
  procedures: ProcedureCC[];
  references: ActionReference[];
}

export interface ParseDiagnostic {
  location: SourceLocation;
  message: string;
}

export interface AnalysisReport {
  apexClasses: ApexClassReport[];
  byTargetKind: Record<ActionTargetKind, number>;
  files: FileReport[];
  totalApexComplexity: number;
  totalComplexity: number;
  totalDeclarations: number;
  totalReferences: number;
  unresolvedApexTargets: string[];
}

export type ApexCCContributorKind =
  | 'catch_clause'
  | 'do_while_statement'
  | 'for_statement'
  | 'if_statement'
  | 'short_circuit_and'
  | 'short_circuit_or'
  | 'ternary'
  | 'when_arm'
  | 'while_statement';

export interface ApexCCContributor {
  kind: ApexCCContributorKind;
  location: SourceLocation;
}

export interface ApexMethodCC {
  complexity: number;
  contributors: ApexCCContributor[];
  kind: 'constructor' | 'method';
  location: SourceLocation;
  name: string;
  signature: string;
}

export interface ApexClassReport {
  classComplexity: number;
  className: string;
  methods: ApexMethodCC[];
  parseErrors: ParseDiagnostic[];
  path: string;
  /** Bundles or actions whose target resolves here. */
  referencedBy: string[];
}
