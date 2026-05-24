import { supabase } from './supabase';
import type {
  Client,
  Practitioner,
  CheckIn,
  Symptom,
  SymptomEntry,
  ContactRequest,
  FollowUpReport,
  SymptomChange,
  ComplianceMetrics,
} from '../types/database';

export function getPractitionerDisplayName(p: Practitioner): string {
  return p.full_name || p.name;
}

export async function getPractitionerByCode(code: string): Promise<Practitioner | null> {
  const { data } = await supabase
    .from('practitioners')
    .select('*')
    .eq('login_code', code.trim())
    .maybeSingle();
  return data ?? null;
}

export async function getClientByCode(code: string): Promise<Client | null> {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('login_code', code.trim())
    .maybeSingle();
  return data ?? null;
}

export async function getClient(clientId: string): Promise<Client | null> {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();
  return data ?? null;
}

export async function getPractitioner(practitionerId: string): Promise<Practitioner | null> {
  const { data } = await supabase
    .from('practitioners')
    .select('*')
    .eq('id', practitionerId)
    .maybeSingle();
  return data ?? null;
}

export async function getPractitioners(): Promise<Practitioner[]> {
  const { data } = await supabase
    .from('practitioners')
    .select('*')
    .order('name');
  return data ?? [];
}

export async function getClients(practitionerId?: string): Promise<Client[]> {
  let query = supabase.from('clients').select('*').order('full_name');
  if (practitionerId) {
    query = query.eq('practitioner_id', practitionerId);
  }
  const { data, error } = await query;
  if (error) console.error('[Buddy store]', error.message);
  return data ?? [];
}

export async function updateClient(
  clientId: string,
  updates: Partial<Client>
): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function createClient(payload: {
  full_name: string;
  email: string;
  practitioner_id: string;
  login_code: string;
  primary_complaint: string;
  notes?: string;
  next_appointment?: string;
  tracking_duration_weeks?: number;
  tracking_end_date?: string;
  check_in_frequency?: string;
}): Promise<Client | null> {
  const { data } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .maybeSingle();
  return data ?? null;
}

export async function deleteClient(clientId: string): Promise<void> {
  await supabase.from('clients').delete().eq('id', clientId);
}

export async function getLastCheckInDates(clientIds: string[]): Promise<Record<string, string>> {
  if (clientIds.length === 0) return {};
  const { data } = await supabase
    .from('check_ins')
    .select('client_id, created_at')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false });
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (!map[row.client_id]) map[row.client_id] = row.created_at;
  }
  return map;
}

export async function getCheckIns(clientId: string): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) console.error('[Buddy store]', error.message);
  return data ?? [];
}

export async function createCheckIn(payload: {
  client_id: string;
  overall_feeling: number;
  symptom_change: string;
  pain_level: number;
  sleep_quality: number;
  stress_level: number;
  medication_taken: boolean;
  notes?: string;
  flagged?: boolean;
}): Promise<CheckIn | null> {
  const { data, error } = await supabase
    .from('check_ins')
    .insert({ ...payload, flagged: payload.flagged ?? false })
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function getSymptoms(clientId: string): Promise<Symptom[]> {
  const { data, error } = await supabase
    .from('symptoms')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at');
  if (error) console.error('[Buddy store]', error.message);
  return data ?? [];
}

export async function createSymptom(payload: {
  client_id: string;
  name: string;
  body_area: string;
}): Promise<Symptom | null> {
  const { data, error } = await supabase
    .from('symptoms')
    .insert({ ...payload, active: true })
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function updateSymptom(
  symptomId: string,
  updates: Partial<Symptom>
): Promise<void> {
  await supabase.from('symptoms').update(updates).eq('id', symptomId);
}

export async function getSymptomEntriesBySymptom(symptomId: string): Promise<SymptomEntry[]> {
  const { data, error } = await supabase
    .from('symptom_entries')
    .select('*')
    .eq('symptom_id', symptomId)
    .order('id');
  if (error) console.error('[Buddy store]', error.message);
  return data ?? [];
}

export async function createSymptomEntry(payload: {
  check_in_id: string;
  symptom_id: string;
  severity: number;
  notes?: string;
}): Promise<void> {
  const { error } = await supabase.from('symptom_entries').insert(payload);
  if (error) throw new Error(error.message);
}

export async function storeSymptomQuery(
  clientId: string,
  symptomDescription: string,
  redFlagDetected: boolean,
  confidenceScore: number
): Promise<void> {
  await supabase.from('symptom_queries').insert({
    client_id: clientId,
    symptom_description: symptomDescription,
    red_flag_detected: redFlagDetected,
    confidence_score: confidenceScore,
  });
}

function normalizeWebhookUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  // Strip email-style prefix: "token@host" → "https://host/token"
  const atIndex = trimmed.indexOf('@');
  if (atIndex !== -1 && !trimmed.startsWith('http')) {
    const token = trimmed.slice(0, atIndex);
    const host = trimmed.slice(atIndex + 1);
    return `https://${host}/${token}`;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export async function getWebhookSettings(practitionerId: string): Promise<{
  webhook_url: string;
  enabled: boolean;
  contact_webhook_url: string;
  contact_webhook_enabled: boolean;
} | null> {
  const { data } = await supabase
    .from('webhook_settings')
    .select('webhook_url, enabled, contact_webhook_url, contact_webhook_enabled')
    .eq('practitioner_id', practitionerId)
    .maybeSingle();
  return data ?? null;
}

export async function saveWebhookSettings(
  practitionerId: string,
  webhookUrl: string,
  enabled: boolean,
  contactWebhookUrl?: string,
  contactWebhookEnabled?: boolean
): Promise<void> {
  const existing = await getWebhookSettings(practitionerId);
  const patch: Record<string, unknown> = {
    webhook_url: normalizeWebhookUrl(webhookUrl),
    enabled,
    updated_at: new Date().toISOString(),
  };
  if (contactWebhookUrl !== undefined) patch.contact_webhook_url = normalizeWebhookUrl(contactWebhookUrl);
  if (contactWebhookEnabled !== undefined) patch.contact_webhook_enabled = contactWebhookEnabled;

  if (existing) {
    const { error } = await supabase
      .from('webhook_settings')
      .update(patch)
      .eq('practitioner_id', practitionerId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('webhook_settings')
      .insert({ practitioner_id: practitionerId, ...patch });
    if (error) throw new Error(error.message);
  }
}

export async function fireContactProfessionalWebhook(
  practitionerId: string,
  clientName: string,
  symptomDescription: string,
  symptomScore: number
): Promise<void> {
  let settings = await getWebhookSettings(practitionerId);
  // Fall back to admin's webhook if the assigned practitioner has none configured
  if (!settings?.contact_webhook_url) {
    const { data: admin } = await supabase
      .from('practitioners')
      .select('id')
      .eq('is_admin', true)
      .maybeSingle();
    if (admin && admin.id !== practitionerId) {
      settings = await getWebhookSettings(admin.id);
    }
  }
  const webhookUrl = normalizeWebhookUrl(settings?.contact_webhook_url ?? '');
  if (!webhookUrl || !settings?.contact_webhook_enabled) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'contact_professional',
      client_name: clientName,
      symptom_description: symptomDescription,
      symptom_score: symptomScore,
      practitioner_id: practitionerId,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // fire-and-forget — do not surface webhook errors to the client
  });
}

export async function createContactRequest(
  clientId: string,
  practitionerId: string,
  symptomDescription: string,
  symptomScore: number,
  clientName?: string,
  redFlagDetected?: boolean,
  aiRationale?: string | null,
  aiRedFlags?: string[] | null,
  aiCategories?: string[] | null,
  urgency?: string | null,
  source?: string | null,
): Promise<void> {
  await supabase.from('contact_requests').insert({
    client_id: clientId,
    practitioner_id: practitionerId,
    symptom_description: symptomDescription,
    symptom_score: symptomScore,
    is_read: false,
    ai_rationale: aiRationale ?? null,
    ai_red_flags: aiRedFlags ?? null,
    ai_categories: aiCategories ?? null,
    urgency: urgency ?? null,
    source: source ?? null,
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-alert-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        practitioner_id: practitionerId,
        client_id: clientId,
        client_name: clientName ?? 'Client',
        symptom_description: symptomDescription,
        symptom_score: symptomScore,
        red_flag_detected: redFlagDetected ?? false,
      }),
    });
  } catch {
    // webhook failure is non-blocking
  }
}

export async function getContactRequests(practitionerId: string): Promise<ContactRequest[]> {
  const { data, error } = await supabase
    .from('contact_requests')
    .select('*, clients(full_name, primary_complaint)')
    .eq('practitioner_id', practitionerId)
    .order('created_at', { ascending: false });
  if (error) console.error('[Buddy store]', error.message);
  return (data as ContactRequest[]) ?? [];
}

export async function getAllContactRequests(): Promise<ContactRequest[]> {
  const { data } = await supabase
    .from('contact_requests')
    .select('*, clients(full_name, primary_complaint)')
    .order('created_at', { ascending: false });
  return (data as ContactRequest[]) ?? [];
}

export async function markContactRequestRead(requestId: string): Promise<void> {
  await supabase
    .from('contact_requests')
    .update({ is_read: true, responded_at: new Date().toISOString() })
    .eq('id', requestId);
}

export async function resolveContactRequest(id: string, note?: string): Promise<void> {
  const { error } = await supabase
    .from('contact_requests')
    .update({ is_read: true, ...(note?.trim() ? { practitioner_note: note.trim() } : {}) })
    .eq('id', id);
  if (error) console.error('[Buddy]', error.message);
}

function calculateComplianceMetrics(checkIns: CheckIn[], trackingWeeks = 8): ComplianceMetrics {
  const total = checkIns.length;
  if (total === 0) return { frequency: 0, engagement: 0, variability: 0, recency: 0, overall: 0 };

  const sorted = [...checkIns].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const expectedTotal = trackingWeeks * 7;
  const frequency = Math.min(100, Math.round((total / expectedTotal) * 100));

  const engagementScores = checkIns.map((ci) => {
    let score = 0;
    if (ci.notes && ci.notes.trim().length > 10) score += 40;
    else if (ci.notes && ci.notes.trim().length > 0) score += 20;
    if (ci.medication_taken) score += 20;
    score += 40;
    return score;
  });
  const engagement = Math.round(engagementScores.reduce((a, b) => a + b, 0) / total);

  let variability = 0;
  if (total >= 3) {
    const painValues = sorted.map((c) => c.pain_level);
    const mean = painValues.reduce((a, b) => a + b, 0) / painValues.length;
    const variance = painValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / painValues.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 0.5) variability = 100;
    else if (stdDev < 1.5) variability = 85;
    else if (stdDev < 2.5) variability = 70;
    else if (stdDev < 3.5) variability = 50;
    else variability = 30;
  } else {
    variability = 50;
  }

  const now = Date.now();
  const lastCheckIn = new Date(sorted[sorted.length - 1].created_at).getTime();
  const daysSinceLast = (now - lastCheckIn) / (1000 * 60 * 60 * 24);
  let recency: number;
  if (daysSinceLast <= 1) recency = 100;
  else if (daysSinceLast <= 3) recency = 85;
  else if (daysSinceLast <= 7) recency = 65;
  else if (daysSinceLast <= 14) recency = 40;
  else recency = 15;

  const overall = Math.round(frequency * 0.35 + engagement * 0.25 + variability * 0.2 + recency * 0.2);

  return {
    frequency,
    engagement,
    variability,
    recency,
    overall,
  };
}

function generateRecommendations(
  overallTrend: 'improving' | 'declining' | 'stable',
  avgPain: number,
  avgSleep: number,
  avgStress: number,
  flagCount: number,
  compliance: ComplianceMetrics
): string[] {
  const recs: string[] = [];

  if (overallTrend === 'declining') {
    recs.push('Pain levels are trending upward — consider reviewing the current treatment plan.');
  } else if (overallTrend === 'improving') {
    recs.push('Good progress — pain levels are trending downward. Continue current approach.');
  }

  if (avgPain >= 7) {
    recs.push('High average pain levels reported. Consider pain management strategies or specialist referral.');
  }

  if (avgSleep <= 2.5) {
    recs.push('Poor sleep quality reported. Address sleep hygiene or refer to a sleep specialist.');
  }

  if (avgStress >= 4) {
    recs.push('Elevated stress levels detected. Consider relaxation techniques or psychological support.');
  }

  if (flagCount > 0) {
    recs.push(`${flagCount} red-flag check-in${flagCount > 1 ? 's' : ''} recorded — review flagged entries urgently.`);
  }

  if (compliance.frequency < 50) {
    recs.push('Low check-in frequency. Encourage the client to complete daily check-ins for better monitoring.');
  }

  if (compliance.recency < 40) {
    recs.push('No recent check-ins detected. Follow up with the client to re-engage with tracking.');
  }

  if (recs.length === 0) {
    recs.push('Client is progressing well. Continue monitoring and maintain current plan.');
  }

  return recs;
}

export async function generateReport(clientId: string, client?: Client): Promise<FollowUpReport | null> {
  const checkIns = await getCheckIns(clientId);
  if (checkIns.length === 0) return null;

  const sorted = [...checkIns].reverse();
  const total = sorted.length;

  const avgPain = sorted.reduce((s, c) => s + c.pain_level, 0) / total;
  const avgSleep = sorted.reduce((s, c) => s + c.sleep_quality, 0) / total;
  const avgStress = sorted.reduce((s, c) => s + c.stress_level, 0) / total;
  const painTrend = sorted.map((c) => c.pain_level);
  const flagCount = sorted.filter((c) => c.flagged).length;

  let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (total >= 3) {
    const first = painTrend.slice(0, Math.floor(total / 2));
    const last = painTrend.slice(Math.ceil(total / 2));
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
    if (lastAvg < firstAvg - 0.5) overallTrend = 'improving';
    else if (lastAvg > firstAvg + 0.5) overallTrend = 'declining';
  }

  const symptoms = await getSymptoms(clientId);
  const symptomChanges: SymptomChange[] = [];
  for (const sym of symptoms.filter((s) => s.active)) {
    const entries = await getSymptomEntriesBySymptom(sym.id);
    if (entries.length >= 2) {
      const start = entries[0].severity;
      const end = entries[entries.length - 1].severity;
      const trend: 'improving' | 'declining' | 'stable' =
        end < start - 0.5 ? 'improving' : end > start + 0.5 ? 'declining' : 'stable';
      symptomChanges.push({ symptom_name: sym.name, start_severity: start, end_severity: end, trend });
    }
  }

  const trackingWeeks = client?.tracking_duration_weeks ?? 8;
  const complianceMetrics = calculateComplianceMetrics(checkIns, trackingWeeks);
  const recommendations = generateRecommendations(overallTrend, avgPain, avgSleep, avgStress, flagCount, complianceMetrics);

  return {
    total_check_ins: total,
    compliance_rate: complianceMetrics.overall,
    compliance_metrics: complianceMetrics,
    summary: {
      overall_trend: overallTrend,
      avg_pain_level: Math.round(avgPain * 10) / 10,
      avg_sleep_quality: Math.round(avgSleep * 10) / 10,
      avg_stress_level: Math.round(avgStress * 10) / 10,
      pain_trend: painTrend,
      symptom_changes: symptomChanges,
      flag_count: flagCount,
      recommendations,
    },
  };
}

export interface DeviceVisit {
  id: string;
  client_id: string;
  device_type: string;
  user_agent: string;
  screen_width: number;
  screen_height: number;
  page: string;
  visited_at: string;
}

export async function recordDeviceVisit(clientId: string, page: string): Promise<void> {
  const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  await supabase.from('device_visits').insert({
    client_id: clientId,
    device_type: deviceType,
    user_agent: navigator.userAgent,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    page,
  });
}

export async function sendClientInvitation(
  email: string,
  name: string,
  practitionerId: string
): Promise<{ success: boolean; error?: string }> {
  const settings = await getWebhookSettings(practitionerId);
  const webhookUrl = settings?.webhook_url?.trim();

  if (!webhookUrl) {
    return { success: false, error: 'No invitation webhook configured. Please add your webhook URL in Settings.' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'client_invitation',
        email,
        name,
        practitioner_id: practitionerId,
        timestamp: new Date().toISOString(),
      }),
    });

    const status = res.ok ? 'sent' : 'failed';

    await supabase.from('client_invitations').insert({
      email,
      name,
      practitioner_id: practitionerId,
      status,
    });

    if (!res.ok) {
      return { success: false, error: 'Invitation webhook failed. Please try again.' };
    }
    return { success: true };
  } catch {
    await supabase.from('client_invitations').insert({
      email,
      name,
      practitioner_id: practitionerId,
      status: 'failed',
    });
    return { success: false, error: 'Network error. Please check your connection and try again.' };
  }
}

const CHECK_IN_WEBHOOK_URL = 'https://hook.eu2.make.com/671seik11jnwfdb99uysb3dlp3mqz7kl';

export async function fireCheckInWebhook(
  practitionerId: string,
  clientName: string,
  clientEmail: string
): Promise<void> {
  await fetch(CHECK_IN_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'check_in_reminder',
      client_name: clientName,
      client_email: clientEmail,
      practitioner_id: practitionerId,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}

export async function getClinicalStats(practitionerId: string, isAdmin: boolean) {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  let ciQuery = supabase
    .from('check_ins')
    .select('id,flagged,pain_level,created_at,client_id')
    .gte('created_at', since7d);
  if (!isAdmin) {
    const { data: clients } = await supabase.from('clients').select('id').eq('practitioner_id', practitionerId);
    ciQuery = ciQuery.in('client_id', (clients ?? []).map((c: { id: string }) => c.id));
  }
  const { data: cis } = await ciQuery;
  const { count: unread } = await supabase
    .from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .eq('practitioner_id', practitionerId);
  const checkIns = cis ?? [];
  const byDay = days.map(d => ({
    date: d,
    count: checkIns.filter((c: { created_at: string }) => c.created_at.startsWith(d)).length,
  }));
  const avgPain = checkIns.length
    ? checkIns.reduce((s: number, c: { pain_level: number }) => s + (c.pain_level || 0), 0) / checkIns.length
    : 0;
  return {
    weeklyCheckIns: checkIns.length,
    flaggedThisWeek: checkIns.filter((c: { flagged: boolean }) => c.flagged).length,
    unreadAlerts: unread ?? 0,
    avgPainLevel: Math.round(avgPain * 10) / 10,
    checkInsByDay: byDay,
  };
}

export async function getDeviceVisits(clientId?: string): Promise<DeviceVisit[]> {
  let query = supabase
    .from('device_visits')
    .select('*')
    .order('visited_at', { ascending: false })
    .limit(200);
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  const { data } = await query;
  return (data as DeviceVisit[]) ?? [];
}
