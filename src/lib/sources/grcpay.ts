import { serverFetch } from '../serverFetch';

export interface GrcpayStats {
  ok: boolean;
  version: string | null;
}

interface StatusResponse {
  ok?: boolean;
  status?: string;
  version?: string;
}

const GRCPAY_API = process.env.GRCPAY_API_URL || 'https://grcpay.gridcoin.club/api';

export async function fetchGrcpayStats(): Promise<GrcpayStats> {
  const res = await serverFetch<StatusResponse>(`${GRCPAY_API}/status`);
  if (!res) return { ok: false, version: null };
  const ok = res.ok === true || res.status === 'ok';
  return { ok, version: res.version ?? null };
}
