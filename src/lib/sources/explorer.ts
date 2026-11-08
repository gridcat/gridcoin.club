import { serverFetch } from '../serverFetch';

export interface ExplorerStats {
  height: number | null;
  latestBlockTime: string | null;
}

interface StatusResponse {
  // Verified live (2026-11-08, grc-explorer 2.5.0): JSON:API envelope,
  // `tip.time` is Unix seconds as a string.
  data?: {
    attributes?: {
      tip?: { height?: number; time?: string | number };
    };
  };
}

export async function fetchExplorerStats(
  apiUrl: string = process.env.EXPLORER_API_URL || 'https://explorer.gridcoin.club/api',
): Promise<ExplorerStats> {
  const status = await serverFetch<StatusResponse>(`${apiUrl}/status`);
  const tip = status?.data?.attributes?.tip;
  const seconds = Number(tip?.time);
  return {
    height: typeof tip?.height === 'number' ? tip.height : null,
    latestBlockTime: tip?.time != null && Number.isFinite(seconds)
      ? new Date(seconds * 1000).toISOString()
      : null,
  };
}
