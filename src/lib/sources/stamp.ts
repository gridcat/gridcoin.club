import { serverFetch } from '../serverFetch';

export interface StampStats {
  total: number | null;
  latestHash: string | null;
  latestAt: string | null;
}

const STAMP_API = process.env.STAMP_API_URL || 'https://stamp.gridcoin.club/api';

interface StampListResponse {
  // Verified live (2026-04-30): `/api/stamps?page[size]=1&sort=-created_at`
  // returns `{ meta: { count: <total> }, data: [{ attributes: { hash, createdAt, time, ... } }] }`
  // — count is in `meta.count`, NOT `meta.total`. Stamp records use
  // camelCase `createdAt` and a Unix `time` field.
  meta?: { count?: number };
  data?: Array<{
    attributes?: {
      hash?: string;
      createdAt?: string;
      time?: number;
    };
  }>;
}

export async function fetchStampStats(): Promise<StampStats> {
  // /api/status is name+version+maintenance only — no counts there. The
  // cumulative tally lives in the list endpoint's `meta.count`.
  const list = await serverFetch<StampListResponse>(
    `${STAMP_API}/stamps?page[size]=1&sort=-created_at`,
  );

  const count = list?.meta?.count;
  const latest = list?.data?.[0]?.attributes;
  const latestAt = latest?.createdAt
    ?? (typeof latest?.time === 'number'
      ? new Date(latest.time * 1000).toISOString()
      : null);

  return {
    total: typeof count === 'number' ? count : null,
    latestHash: latest?.hash ?? null,
    latestAt,
  };
}
