import { supabase } from './supabase';
import { analyzeSymptomLocal, analyzeSymptomRealTime, buildClientRiskContext } from './symptomAnalysis';
import type { ClientRiskContext, RealTimeAnalysisResult } from './symptomAnalysis';

export type { ClientRiskContext, RealTimeAnalysisResult };
export { analyzeSymptomRealTime, buildClientRiskContext };

export type UrgencyTier = 'emergency' | 'urgent' | 'soon' | 'monitor' | 'routine';

export interface CombinedTriageResult {
  red_flag_detected: boolean;
  severity: number;
  urgency: UrgencyTier;
  should_notify_practitioner: boolean;
  matched_score: number;
  matched_symptom: string | null;
  suggested_next_step: string;
  ai_rationale: string | null;
  ai_red_flags: string[] | null;
  ai_categories: string[] | null;
  confidence: number | null;
  negation_detected: boolean | null;
  attribution_detected: boolean | null;
  source: 'ai_primary' | 'ai_with_keyword_escalation' | 'keyword_only';
  confidence_score: number;
}

const NEVER_SUPPRESS_PHRASES = [
  'suicidal',
  'self-harm',
  'self harm',
  'want to die',
  'heart attack',
  'stroke',
  'cauda equina',
  'cannot breathe',
  "can't breathe",
  'cant breathe',
  'anaphylaxis',
  'not breathing',
  'stopped breathing',
  'unconscious',
  'loss of consciousness',
  'seizure',
  'facial drooping',
  'slurred speech',
];

function buildSuggestedNextStep(urgency: UrgencyTier, aiRationale: string | null, practitionerName: string): string {
  if (aiRationale && aiRationale.length > 20) return aiRationale;
  switch (urgency) {
    case 'emergency':
      return 'These symptoms may require immediate emergency attention. Please call 112 or go to your nearest emergency department now.';
    case 'urgent':
      return `Please contact ${practitionerName} today. These symptoms warrant prompt review.`;
    case 'soon':
      return `Schedule an appointment with ${practitionerName} within the next 24\u201348 hours.`;
    case 'monitor':
      return `Continue monitoring your symptoms. If they worsen or persist, contact ${practitionerName}.`;
    case 'routine':
      return 'Continue your current treatment plan. Reach out if symptoms change.';
  }
}

interface LLMTriageResult {
  severity: number;
  urgency: UrgencyTier;
  categories: string[];
  red_flags: string[];
  negation_detected: boolean;
  attribution_detected: boolean;
  rationale: string;
  should_notify_practitioner: boolean;
  confidence: number;
}

function isValidLLMResult(obj: unknown): obj is LLMTriageResult {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.severity === 'number' &&
    typeof o.urgency === 'string' &&
    ['emergency', 'urgent', 'soon', 'monitor', 'routine'].includes(o.urgency as string) &&
    Array.isArray(o.categories) &&
    Array.isArray(o.red_flags) &&
    typeof o.negation_detected === 'boolean' &&
    typeof o.attribution_detected === 'boolean' &&
    typeof o.rationale === 'string' &&
    typeof o.should_notify_practitioner === 'boolean' &&
    typeof o.confidence === 'number'
  );
}

export async function analyzeSymptomCombined(
  text: string,
  clientContext: ClientRiskContext | undefined,
  practitionerName?: string,
): Promise<CombinedTriageResult> {
  const pName = practitionerName ?? 'your professional';
  const lower = text.toLowerCase();

  // Layer 1 — Never-suppress check
  for (const phrase of NEVER_SUPPRESS_PHRASES) {
    if (lower.includes(phrase)) {
      return {
        red_flag_detected: true,
        severity: 10,
        urgency: 'emergency',
        should_notify_practitioner: true,
        matched_score: 10,
        matched_symptom: phrase,
        suggested_next_step: buildSuggestedNextStep('emergency', null, pName),
        ai_rationale: null,
        ai_red_flags: null,
        ai_categories: null,
        confidence: 1,
        negation_detected: null,
        attribution_detected: null,
        source: 'keyword_only',
        confidence_score: 1,
      };
    }
  }

  // Layer 2 — Keyword engine (safety floor)
  const keywordResult = analyzeSymptomLocal(text, clientContext);
  const keywordSeverity = keywordResult.severity ?? 0;

  // Layer 3 — LLM call with 8-second timeout
  let llmResult: LLMTriageResult | null = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const { data, error } = await supabase.functions.invoke('triage-query', {
      body: { query_text: text, client_context: clientContext },
    });

    clearTimeout(timeoutId);

    if (!error && isValidLLMResult(data)) {
      llmResult = data;
    }
  } catch {
    // fall through to keyword-only fallback
  }

  // Keyword-only fallback
  if (!llmResult) {
    const urgency = (keywordResult.urgency ?? 'routine') as UrgencyTier;
    const severity = keywordSeverity;
    return {
      red_flag_detected: keywordResult.red_flag_detected,
      severity,
      urgency,
      should_notify_practitioner: severity >= 7 || urgency === 'urgent' || urgency === 'emergency',
      matched_score: keywordResult.matched_score ?? 0,
      matched_symptom: keywordResult.matched_symptom,
      suggested_next_step: buildSuggestedNextStep(urgency, null, pName),
      ai_rationale: null,
      ai_red_flags: null,
      ai_categories: null,
      confidence: null,
      negation_detected: null,
      attribution_detected: null,
      source: 'keyword_only',
      confidence_score: keywordResult.confidence_score,
    };
  }

  // Merge logic
  let finalSeverity = llmResult.severity;
  let finalUrgency = llmResult.urgency;
  let source: CombinedTriageResult['source'] = 'ai_primary';

  if (keywordSeverity >= 9 && llmResult.severity < 9) {
    finalSeverity = keywordSeverity;
    finalUrgency = 'urgent';
    source = 'ai_with_keyword_escalation';
  }

  const shouldNotify =
    llmResult.should_notify_practitioner ||
    finalSeverity >= 7 ||
    finalUrgency === 'urgent' ||
    finalUrgency === 'emergency';

  return {
    red_flag_detected: keywordResult.red_flag_detected || finalSeverity >= 6,
    severity: finalSeverity,
    urgency: finalUrgency,
    should_notify_practitioner: shouldNotify,
    matched_score: keywordResult.matched_score ?? 0,
    matched_symptom: keywordResult.matched_symptom,
    suggested_next_step: buildSuggestedNextStep(finalUrgency, llmResult.rationale, pName),
    ai_rationale: llmResult.rationale,
    ai_red_flags: llmResult.red_flags.length > 0 ? llmResult.red_flags : null,
    ai_categories: llmResult.categories.length > 0 ? llmResult.categories : null,
    confidence: llmResult.confidence,
    negation_detected: llmResult.negation_detected,
    attribution_detected: llmResult.attribution_detected,
    source,
    confidence_score: llmResult.confidence,
  };
}
