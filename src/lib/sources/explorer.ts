import { serverFetch } from '../serverFetch';

export interface ExplorerStats {
  height: number | null;
  latestBlockTime: string | null;
  difficulty: number | null;
}

interface StatusResponse {
  // Explorer's /status shape varies by version; we read defensively.
  height?: number;
  blockHeight?: number;
  latestBlock?: {
    height?: number;
    time?: string;
    timestamp?: string;
    difficulty?: number;
  };
  difficulty?: number;
}

export async function fetchExplorerStats(
  apiUrl: string = process.env.EXPLORER_API_URL || 'https://explorer.gridcoin.club/api',
): Promise<ExplorerStats> {
  const status = await serverFetch<StatusResponse>(`${apiUrl}/status`);
  if (!status) {
    return { height: null, latestBlockTime: null, difficulty: null };
  }
  const height = status.latestBlock?.height ?? status.height ?? status.blockHeight ?? null;
  const latestBlockTime = status.latestBlock?.time ?? status.latestBlock?.timestamp ?? null;
  const difficulty = status.latestBlock?.difficulty ?? status.difficulty ?? null;
  return {
    height: typeof height === 'number' ? height : null,
    latestBlockTime: latestBlockTime ?? null,
    difficulty: typeof difficulty === 'number' ? difficulty : null,
  };
}

