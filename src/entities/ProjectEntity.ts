export type ProjectCategory =
  | 'wallet'
  | 'mining'
  | 'pools'
  | 'stats'
  | 'tool'
  | 'community'
  | 'docs';

export type ProjectStatus = 'live' | 'soon' | 'hidden';

export interface ProjectEntity {
  name: string;
  url: string;
  blurb: string;
  category: ProjectCategory;
  tags?: string[];
  status: ProjectStatus;
  // Path under /public (e.g. '/projects/boinc.png') to a locally-bundled
  // logo. Optional — entries without a logo render an initial-letter chip.
  // Logos are vendored locally on purpose: no third-party hotlinks, no
  // tracking, predictable LCP on the home page.
  logo?: string;
}

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  wallet: 'Wallets',
  mining: 'Mining & BOINC',
  pools: 'Mining pools',
  stats: 'Stats & explorers',
  tool: 'Tools',
  community: 'Community',
  docs: 'Docs & wiki',
};

export const CATEGORY_ORDER: ProjectCategory[] = [
  'wallet',
  'mining',
  'pools',
  'stats',
  'tool',
  'docs',
  'community',
];
