export interface SourceLocation {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface ProcedureCC {
  scope: string;
  kind: 'before_reasoning' | 'after_reasoning' | 'reasoning_instructions' | 'available_when' | 'other';
  complexity: number;
  contributors: CCContributor[];
  location: SourceLocation;
}

export interface CCContributor {
  kind: 'if_statement' | 'elif_clause' | 'ternary_expression' | 'short_circuit_and' | 'short_circuit_or';
  location: SourceLocation;
}

export type ActionTargetKind = 'apex' | 'flow' | 'prompt' | 'utils' | 'unknown';

export interface ActionDeclaration {
  name: string;
  scope: string;
  target?: string;
  targetKind: ActionTargetKind;
  location: SourceLocation;
}

export type ActionReferenceContext =
  | 'reasoning_actions'
  | 'reasoning_instructions_run'
  | 'after_reasoning_run'
  | 'before_reasoning_run'
  | 'transition'
  | 'unknown';

export interface ActionReference {
  name: string;
  scope: string;
  context: ActionReferenceContext;
  location: SourceLocation;
}

export interface FileReport {
  path: string;
  procedures: ProcedureCC[];
  fileComplexity: number;
  declarations: ActionDeclaration[];
  references: ActionReference[];
  parseErrors: ParseDiagnostic[];
}

export interface ParseDiagnostic {
  message: string;
  location: SourceLocation;
}

export interface AnalysisReport {
  files: FileReport[];
  totalComplexity: number;
  totalDeclarations: number;
  totalReferences: number;
  byTargetKind: Record<ActionTargetKind, number>;
  apexClasses: ApexClassReport[];
  totalApexComplexity: number;
  unresolvedApexTargets: string[];
}

export type ApexCCContributorKind =
  | 'if_statement'
  | 'for_statement'
  | 'while_statement'
  | 'do_while_statement'
  | 'when_arm'
  | 'catch_clause'
  | 'ternary'
  | 'short_circuit_and'
  | 'short_circuit_or';

export interface ApexCCContributor {
  kind: ApexCCContributorKind;
  location: SourceLocation;
}

export interface ApexMethodCC {
  name: string;
  kind: 'method' | 'constructor';
  signature: string;
  complexity: number;
  contributors: ApexCCContributor[];
  location: SourceLocation;
}

export interface ApexClassReport {
  className: string;
  path: string;
  /** Bundles or actions whose target resolves here. */
  referencedBy: string[];
  methods: ApexMethodCC[];
  classComplexity: number;
  parseErrors: ParseDiagnostic[];
}
