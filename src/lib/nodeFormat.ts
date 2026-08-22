// Small presentation helpers shared by the three node pages.

/** "3 d 4 h", "28 h 52 m", "just now" — coarse on purpose, this is uptime. */
export function humanDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '—';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${mins} m`;
  return `${mins} m`;
}

export function timeAgo(iso: string | null | undefined, now: Date): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'never';
  return `${humanDuration(now.getTime() - then)} ago`;
}

export function percent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return '—';
  return `${(ratio * 100).toFixed(ratio >= 0.995 || ratio === 0 ? 0 : 1)}%`;
}

/** UTC to the minute; these are machine facts, not local appointments. */
export function utc(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function networkLabel(network: 'main' | 'test'): string {
  return network === 'main' ? 'Mainnet' : 'Testnet';
}
