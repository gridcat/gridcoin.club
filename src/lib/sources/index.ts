import { fetchStampStats, StampStats } from './stamp';
import { fetchExplorerStats, ExplorerStats } from './explorer';
import { fetchGrcpayStats, GrcpayStats } from './grcpay';

export interface LiveStats {
  stamp: StampStats | null;
  explorer: ExplorerStats | null;
  grcpay: GrcpayStats | null;
}

// Promise.allSettled so a single sibling outage never breaks the home
// render — failed sources surface as `null` and the corresponding tile
// renders a static fallback line.
export async function fetchAllLiveStats(): Promise<LiveStats> {
  const [stamp, explorer, grcpay] = await Promise.allSettled([
    fetchStampStats(),
    fetchExplorerStats(),
    fetchGrcpayStats(),
  ]);
  return {
    stamp: stamp.status === 'fulfilled' ? stamp.value : null,
    explorer: explorer.status === 'fulfilled' ? explorer.value : null,
    grcpay: grcpay.status === 'fulfilled' ? grcpay.value : null,
  };
}

export type { StampStats, ExplorerStats, GrcpayStats };
