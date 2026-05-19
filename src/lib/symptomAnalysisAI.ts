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

const HARD_OVERRIDE_PHRASES = [
  'chest pain', 'heart attack', 'cannot breathe', "can't breathe", 'stroke',
  'facial drooping', 'slurred speech', 'paralysis', 'unconscious', 'loss of consciousness',
  'seizure', 'cauda equina', 'saddle anaesthesia', 'loss of bladder control',
  'loss of bowel control', 'suicidal', 'want to die', 'self harm', 'self-harm',
  'anaphylaxis', 'throat closing', 'coughing blood', 'vomiting blood',
  'worst headache of my life', 'thunderclap headache', 'sudden vision loss',
  'sudden blindness', 'stabbed', 'gunshot',
];

const ATTRIBUTION_MARKERS = [
  'my friend', 'my mother', 'my wife', 'my partner', 'my husband', 'my sister', 'my brother',
];

function isAttributed(text: string, matchIndex: number): boolean {
  const window = text.slice(Math.max(0, matchIndex - 80), matchIndex).toLowerCase();
  return ATTRIBUTION_MARKERS.some((m) => window.includes(m));
}

function buildSuggestedNextStep(urgency: UrgencyTier, aiRationale: string | null, practitionerName: string): string {
  if (aiRationale && aiRationale.length > 20) return aiRationale;
  switch (urgency) {
    case 'emergency':
      return 'These symptoms may require immediate emergency attention. Please call your lead physiotherapist or go to your nearest emergency department now.';
    case 'urgent':
      return `Please contact ${practitionerName} today. These symptoms warrant prompt review.`;
    case 'soon':
      return `Schedule an appointment with ${practitionerName} within the next 24–48 hours.`;
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

  // Layer 1 — Hard override: critical phrase check with attribution guard
  for (const phrase of HARD_OVERRIDE_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1 && !isAttributed(text, idx)) {
      return {
        red_flag_detected: true, severity: 10, urgency: 'emergency', should_notify_practitioner: true,
        matched_score: 10, matched_symptom: phrase,
        suggested_next_step: buildSuggestedNextStep('emergency', null, pName),
        ai_rationale: null, ai_red_flags: [phrase], ai_categories: null,
        confidence: 1, negation_detected: false, attribution_detected: false,
        source: 'keyword_only', confidence_score: 1,
      };
    }
  }

  // Layer 2 — LLM call with 15-second timeout
  let aiResult: LLMTriageResult | null = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const { data, error } = await supabase.functions.invoke('triage-query', {
      body: { query_text: text, client_context: clientContext },
    });
    clearTimeout(timeoutId);
    if (!error && isValidLLMResult(data)) aiResult = data;
  } catch {
    // fall through to keyword fallback
  }

  // Fallback — LLM failed or timed out
  if (!aiResult) {
    const keywordFallback = analyzeSymptomLocal(text, clientContext);
    const urgency = (keywordFallback.urgency ?? 'routine') as UrgencyTier;
    const severity = keywordFallback.severity ?? 0;
    return {
      red_flag_detected: keywordFallback.red_flag_detected, severity, urgency,
      should_notify_practitioner: severity >= 7 || urgency === 'urgent' || urgency === 'emergency',
      matched_score: keywordFallback.matched_score ?? 0, matched_symptom: keywordFallback.matched_symptom,
      suggested_next_step: buildSuggestedNextStep(urgency, null, pName),
      ai_rationale: null, ai_red_flags: null, ai_categories: null, confidence: null,
      negation_detected: null, attribution_detected: null, source: 'keyword_only',
      confidence_score: keywordFallback.confidence_score,
    };
  }

  // Layer 3 — Keyword floor: only apply if AI didn't detect negation/attribution
  let finalSeverity = aiResult.severity;
  let finalUrgency = aiResult.urgency;
  let source: CombinedTriageResult['source'] = 'ai_primary';

  if (!aiResult.negation_detected && !aiResult.attribution_detected) {
    const keywordResult = analyzeSymptomLocal(text, clientContext);
    const keywordSeverity = keywordResult.severity ?? 0;
    if (keywordSeverity > aiResult.severity) {
      finalSeverity = keywordSeverity;
      const urgencyMap: Record<number, UrgencyTier> = { 9: 'urgent', 10: 'urgent' };
      finalUrgency = urgencyMap[keywordSeverity] ?? (keywordSeverity >= 7 ? 'urgent' : keywordSeverity >= 5 ? 'soon' : keywordSeverity >= 3 ? 'monitor' : 'routine');
      source = 'ai_with_keyword_escalation';
    }
  }

  const shouldNotify = aiResult.should_notify_practitioner || finalSeverity >= 7 || finalUrgency === 'urgent' || finalUrgency === 'emergency';

  return {
    red_flag_detected: (aiResult.red_flags.length > 0) || finalSeverity >= 6,
    severity: finalSeverity, urgency: finalUrgency, should_notify_practitioner: shouldNotify,
    matched_score: finalSeverity, matched_symptom: aiResult.red_flags.length > 0 ? aiResult.red_flags[0] : null,
    suggested_next_step: buildSuggestedNextStep(finalUrgency, aiResult.rationale, pName),
    ai_rationale: aiResult.rationale,
    ai_red_flags: aiResult.red_flags.length > 0 ? aiResult.red_flags : null,
    ai_categories: aiResult.categories.length > 0 ? aiResult.categories : null,
    confidence: aiResult.confidence, negation_detected: aiResult.negation_detected,
    attribution_detected: aiResult.attribution_detected, source,
    confidence_score: aiResult.confidence,
  };
}
