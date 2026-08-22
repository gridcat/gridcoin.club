import { fetchStampStats, StampStats } from './stamp';
import { fetchExplorerStats, ExplorerStats } from './explorer';
import { fetchGrcpayStats, GrcpayStats } from './grcpay';
import { fetchAddnodesStats, AddnodesStats } from './addnodes';

export interface LiveStats {
  stamp: StampStats | null;
  explorer: ExplorerStats | null;
  grcpay: GrcpayStats | null;
  addnodes: AddnodesStats | null;
}

// Promise.allSettled so a single sibling outage never breaks the home
// render — failed sources surface as `null` and the corresponding tile
// renders a static fallback line.
export async function fetchAllLiveStats(): Promise<LiveStats> {
  const [stamp, explorer, grcpay, addnodes] = await Promise.allSettled([
    fetchStampStats(),
    fetchExplorerStats(),
    fetchGrcpayStats(),
    fetchAddnodesStats(),
  ]);
  return {
    stamp: stamp.status === 'fulfilled' ? stamp.value : null,
    explorer: explorer.status === 'fulfilled' ? explorer.value : null,
    grcpay: grcpay.status === 'fulfilled' ? grcpay.value : null,
    addnodes: addnodes.status === 'fulfilled' ? addnodes.value : null,
  };
}

export type {
  StampStats, ExplorerStats, GrcpayStats, AddnodesStats,
};
