export type ServiceStatus = 'live' | 'soon' | 'hidden';

export type LiveSource = 'stamp' | 'explorer' | 'testnetExplorer' | 'grcpay';

export interface ServiceEntity {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  color: string;
  status: ServiceStatus;
  liveSource?: LiveSource;
}
