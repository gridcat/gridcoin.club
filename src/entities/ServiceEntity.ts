import type { MarkId } from '@/components/HexMark';

export type ServiceStatus = 'live' | 'soon' | 'hidden';

export type LiveSource = 'stamp' | 'explorer' | 'grcpay' | 'addnodes';

export interface ServiceEntity {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  color: string;
  status: ServiceStatus;
  liveSource?: LiveSource;
  // Which symbol sits inside this service's hexagon on the home page.
  mark: MarkId;
  // Two to six words. The full `tagline` doesn't fit inside a hexagon, so it
  // moves to the cell's accessible name instead.
  short: string;
  // [dark, light] — the mainnet brand pair taken from the service's own
  // theme.ts, so the hive's rings match the real logos rather than
  // approximating them from `color`.
  gradient: readonly [string, string];
}
