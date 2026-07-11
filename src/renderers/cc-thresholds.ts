/**
 * Canonical cyclomatic-complexity risk bands — McCabe / NIST SP 500-235
 * "Structured Testing" / SEI. Cyclomatic complexity is a control-flow metric,
 * so these boundaries are language-agnostic:
 *
 *   1–10   low        🟢   simple; at or under McCabe's recommended per-unit max
 *   11–20  moderate   🟡   more complex
 *   ≥21    high       🔴   high / very-high risk (SEI 21–50 and >50 collapsed)
 *
 * Single source of truth: the text, markdown, and SARIF renderers all consume
 * these constants so their severity signal is identical. To make the bands
 * user-configurable later, thread overrides through the renderers and fall back
 * to these constants — the same `opts?.…Threshold ?? DEFAULT` pattern SARIF
 * already uses for its warning/error levels.
 */
export const CC_MODERATE = 11;
export const CC_HIGH = 21;

export type CcLevel = 'high' | 'low' | 'moderate';

/** Classify a cyclomatic-complexity value into its risk band. */
export function ccLevel(n: number): CcLevel {
  if (n >= CC_HIGH) return 'high';
  if (n >= CC_MODERATE) return 'moderate';
  return 'low';
}

const BAND_EMOJI: Record<CcLevel, string> = {
  high: '🔴',
  low: '🟢',
  moderate: '🟡',
};

/** Stoplight emoji for a cyclomatic-complexity value (🟢/🟡/🔴). */
export function ccBand(n: number): string {
  return BAND_EMOJI[ccLevel(n)];
}
