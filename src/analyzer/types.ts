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

export interface ActionReference {
  name: string;
  scope: string;
  context: 'reasoning_actions' | 'after_reasoning_run' | 'before_reasoning_run' | 'transition' | 'unknown';
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
}
