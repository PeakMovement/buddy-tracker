export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function feelingEmoji(level: number): string {
  if (level >= 5) return '😄';
  if (level === 4) return '🙂';
  if (level === 3) return '😐';
  if (level === 2) return '😕';
  return '😔';
}

export function changeLabel(change: string): string {
  if (change === 'better') return 'Better';
  if (change === 'worse') return 'Worse';
  return 'Same';
}

export function changeColor(change: string): string {
  if (change === 'better') return '#16a34a';
  if (change === 'worse') return '#dc2626';
  return '#64748b';
}

export function painColor(level: number): string {
  if (level <= 3) return '#16a34a';
  if (level <= 6) return '#d97706';
  return '#dc2626';
}

export function trendLabel(trend: string): string {
  if (trend === 'improving') return 'Improving';
  if (trend === 'declining') return 'Declining';
  return 'Stable';
}

export function trendColor(trend: string): string {
  if (trend === 'improving') return '#16a34a';
  if (trend === 'declining') return '#dc2626';
  return '#64748b';
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(iso);
}
