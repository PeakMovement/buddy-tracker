export interface Practitioner {
  id: string;
  name: string;
  full_name: string | null;
  login_code: string;
  password_hash: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  email: string;
  practitioner_id: string | null;
  login_code: string;
  primary_complaint: string;
  notes: string | null;
  next_appointment: string | null;
  tracking_duration_weeks: number | null;
  tracking_end_date: string | null;
  check_in_frequency: string | null;
  created_at: string;
}

export interface CheckIn {
  id: string;
  client_id: string;
  overall_feeling: number;
  symptom_change: string;
  pain_level: number;
  sleep_quality: number;
  stress_level: number;
  medication_taken: boolean;
  notes: string | null;
  flagged: boolean;
  created_at: string;
}

export interface Symptom {
  id: string;
  client_id: string;
  name: string;
  body_area: string;
  active: boolean;
  created_at: string;
}

export interface SymptomEntry {
  id: string;
  check_in_id: string;
  symptom_id: string;
  severity: number;
  notes: string | null;
}

export interface SymptomQuery {
  id: string;
  client_id: string;
  symptom_description: string;
  red_flag_detected: boolean;
  confidence_score: number;
  created_at: string;
}

export interface ContactRequest {
  id: string;
  client_id: string;
  practitioner_id: string;
  symptom_description: string;
  symptom_score: number;
  is_read: boolean;
  responded_at: string | null;
  created_at: string;
  clients?: { full_name: string; primary_complaint: string };
}

export interface SymptomChange {
  symptom_name: string;
  start_severity: number;
  end_severity: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface ComplianceMetrics {
  frequency: number;
  engagement: number;
  variability: number;
  recency: number;
  overall: number;
}

export interface FollowUpReport {
  total_check_ins: number;
  compliance_rate: number;
  compliance_metrics: ComplianceMetrics;
  summary: {
    overall_trend: 'improving' | 'declining' | 'stable';
    avg_pain_level: number;
    avg_sleep_quality: number;
    avg_stress_level: number;
    pain_trend: number[];
    symptom_changes: SymptomChange[];
    flag_count: number;
    recommendations: string[];
  };
}
