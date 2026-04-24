import { supabase } from './supabase';
import type { Client, Practitioner, CheckIn } from '../types/database';

export async function getClients(): Promise<Client[]> {
  const { data } = await supabase.from('clients').select('*').order('full_name');
  return (data as Client[]) ?? [];
}

export async function getClient(id: string): Promise<Client | null> {
  const { data } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
  return data ?? null;
}

export async function getClientByCode(code: string): Promise<Client | null> {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('login_code', code)
    .maybeSingle();
  return data ?? null;
}

export async function createClient(
  clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>
): Promise<Client | null> {
  const { data } = await supabase
    .from('clients')
    .insert(clientData)
    .select()
    .maybeSingle();
  return data ?? null;
}

export async function updateClient(
  id: string,
  updates: Partial<Omit<Client, 'id' | 'created_at'>>
): Promise<Client | null> {
  const { data } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  return data ?? null;
}

export async function getPractitioner(id: string): Promise<Practitioner | null> {
  const { data } = await supabase
    .from('practitioners')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ?? null;
}

export async function getPractitioners(): Promise<Practitioner[]> {
  const { data } = await supabase
    .from('practitioners')
    .select('*')
    .order('full_name');
  return (data as Practitioner[]) ?? [];
}

export async function getPractitionerByCode(code: string): Promise<Practitioner | null> {
  const { data } = await supabase
    .from('practitioners')
    .select('*')
    .eq('login_code', code)
    .maybeSingle();
  return data ?? null;
}

export function getPractitionerDisplayName(p: Practitioner): string {
  return p.full_name || p.name || 'Unknown';
}

export async function getCheckIns(
  clientId?: string,
  limit = 50
): Promise<CheckIn[]> {
  let query = supabase
    .from('check_ins')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  const { data } = await query;
  return (data as CheckIn[]) ?? [];
}

export async function createCheckIn(
  checkIn: Omit<CheckIn, 'id' | 'created_at'>
): Promise<CheckIn | null> {
  const { data } = await supabase
    .from('check_ins')
    .insert(checkIn)
    .select()
    .maybeSingle();
  return data ?? null;
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
    webhook_url: webhookUrl,
    enabled,
    updated_at: new Date().toISOString(),
  };
  if (contactWebhookUrl !== undefined) patch.contact_webhook_url = contactWebhookUrl;
  if (contactWebhookEnabled !== undefined) patch.contact_webhook_enabled = contactWebhookEnabled;

  if (existing) {
    await supabase
      .from('webhook_settings')
      .update(patch)
      .eq('practitioner_id', practitionerId);
  } else {
    await supabase
      .from('webhook_settings')
      .insert({ practitioner_id: practitionerId, ...patch });
  }
}

export async function fireContactProfessionalWebhook(
  practitionerId: string,
  clientName: string,
  symptomDescription: string,
  symptomScore: number
): Promise<void> {
  const settings = await getWebhookSettings(practitionerId);
  const webhookUrl = settings?.contact_webhook_url?.trim();
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
  redFlagDetected?: boolean
): Promise<void> {
  await supabase.from('contact_requests').insert({
    client_id: clientId,
    practitioner_id: practitionerId,
    symptom_description: symptomDescription,
    symptom_score: symptomScore,
    client_name: clientName,
    red_flag_detected: redFlagDetected ?? false,
  });

  const webhookSettings = await getWebhookSettings(practitionerId);
  if (webhookSettings?.webhook_url && webhookSettings.enabled) {
    try {
      await fetch(webhookSettings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact_request',
          client_id: clientId,
          practitioner_id: practitionerId,
          client_name: clientName,
          symptom_description: symptomDescription,
          symptom_score: symptomScore,
          red_flag_detected: redFlagDetected ?? false,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // webhook failures are non-blocking
    }
  }
}

export async function getContactRequests(practitionerId?: string) {
  let query = supabase
    .from('contact_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (practitionerId) {
    query = query.eq('practitioner_id', practitionerId);
  }
  const { data } = await query;
  return data ?? [];
}

export async function markContactRequestRead(id: string): Promise<void> {
  await supabase.from('contact_requests').update({ read: true }).eq('id', id);
}

export async function getAlerts(practitionerId?: string) {
  let query = supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (practitionerId) {
    query = query.eq('practitioner_id', practitionerId);
  }
  const { data } = await query;
  return data ?? [];
}

export async function markAlertRead(id: string): Promise<void> {
  await supabase.from('alerts').update({ read: true }).eq('id', id);
}

export type AnalyticsSummary = {
  totalClients: number;
  totalCheckIns: number;
  avgPain: number;
  avgSleep: number;
  avgStress: number;
  redFlagCount: number;
  checkInsThisWeek: number;
  improvingCount: number;
  worseningCount: number;
};

export async function getAnalyticsSummary(
  practitionerId?: string
): Promise<AnalyticsSummary> {
  const clients = practitionerId
    ? (await supabase.from('clients').select('id').eq('practitioner_id', practitionerId)).data ?? []
    : (await supabase.from('clients').select('id')).data ?? [];

  const clientIds = clients.map((c: { id: string }) => c.id);
  const totalClients = clientIds.length;

  if (totalClients === 0) {
    return {
      totalClients: 0,
      totalCheckIns: 0,
      avgPain: 0,
      avgSleep: 0,
      avgStress: 0,
      redFlagCount: 0,
      checkInsThisWeek: 0,
      improvingCount: 0,
      worseningCount: 0,
    };
  }

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('*')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })
    .limit(1000);

  const all = (checkIns as CheckIn[]) ?? [];
  const totalCheckIns = all.length;

  const avgPain = all.length
    ? all.reduce((s, c) => s + (c.pain_level ?? 0), 0) / all.length
    : 0;
  const avgSleep = all.length
    ? all.reduce((s, c) => s + (c.sleep_quality ?? 0), 0) / all.length
    : 0;
  const avgStress = all.length
    ? all.reduce((s, c) => s + (c.stress_level ?? 0), 0) / all.length
    : 0;

  const redFlagCount = all.filter((c) => c.red_flag).length;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const checkInsThisWeek = all.filter(
    (c) => new Date(c.created_at) >= oneWeekAgo
  ).length;

  let improvingCount = 0;
  let worseningCount = 0;
  for (const clientId of clientIds) {
    const clientCIs = all
      .filter((c) => c.client_id === clientId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);
    if (clientCIs.length >= 2) {
      const recent = clientCIs.slice(0, 2).reduce((s, c) => s + (c.pain_level ?? 0), 0) / 2;
      const older = clientCIs.slice(2).reduce((s, c) => s + (c.pain_level ?? 0), 0) / Math.max(clientCIs.slice(2).length, 1);
      if (recent < older - 0.5) improvingCount++;
      else if (recent > older + 0.5) worseningCount++;
    }
  }

  return {
    totalClients,
    totalCheckIns,
    avgPain: Math.round(avgPain * 10) / 10,
    avgSleep: Math.round(avgSleep * 10) / 10,
    avgStress: Math.round(avgStress * 10) / 10,
    redFlagCount,
    checkInsThisWeek,
    improvingCount,
    worseningCount,
  };
}

export type ClientReport = {
  client: Client;
  checkIns: CheckIn[];
  summary: {
    overall_trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    avg_pain_level: number;
    avg_sleep_quality: number;
    avg_stress_level: number;
    pain_trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    symptom_changes: string[];
    flag_count: number;
    recommendations: string[];
  };
};

export async function getClientReport(clientId: string): Promise<ClientReport | null> {
  const client = await getClient(clientId);
  if (!client) return null;

  const checkIns = await getCheckIns(clientId, 30);

  if (checkIns.length === 0) {
    return {
      client,
      checkIns,
      summary: {
        overall_trend: 'insufficient_data',
        avg_pain_level: 0,
        avg_sleep_quality: 0,
        avg_stress_level: 0,
        pain_trend: 'insufficient_data',
        symptom_changes: [],
        flag_count: 0,
        recommendations: ['Not enough check-in data to generate a report.'],
      },
    };
  }

  const avgPain = checkIns.reduce((s, c) => s + (c.pain_level ?? 0), 0) / checkIns.length;
  const avgSleep = checkIns.reduce((s, c) => s + (c.sleep_quality ?? 0), 0) / checkIns.length;
  const avgStress = checkIns.reduce((s, c) => s + (c.stress_level ?? 0), 0) / checkIns.length;
  const flagCount = checkIns.filter((c) => c.red_flag).length;

  const recent = checkIns.slice(0, Math.ceil(checkIns.length / 2));
  const older = checkIns.slice(Math.ceil(checkIns.length / 2));
  const recentPain = recent.reduce((s, c) => s + (c.pain_level ?? 0), 0) / recent.length;
  const olderPain = older.length
    ? older.reduce((s, c) => s + (c.pain_level ?? 0), 0) / older.length
    : recentPain;

  let painTrend: 'improving' | 'stable' | 'worsening' | 'insufficient_data' = 'stable';
  if (checkIns.length < 3) painTrend = 'insufficient_data';
  else if (recentPain < olderPain - 0.5) painTrend = 'improving';
  else if (recentPain > olderPain + 0.5) painTrend = 'worsening';

  const overallTrend = painTrend;

  const symptomChanges: string[] = [];
  if (checkIns.length >= 3) {
    if (recentPain < olderPain - 1) symptomChanges.push('Pain levels have decreased recently');
    else if (recentPain > olderPain + 1) symptomChanges.push('Pain levels have increased recently');
  }

  const recommendations: string[] = [];
  if (avgPain >= 7) recommendations.push('High average pain — consider scheduling a review');
  if (flagCount > 2) recommendations.push(`${flagCount} red flags recorded — follow up recommended`);
  if (avgSleep < 4) recommendations.push('Poor average sleep quality noted');
  if (recommendations.length === 0) recommendations.push('Progress appears stable — continue current plan');

  return {
    client,
    checkIns,
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
