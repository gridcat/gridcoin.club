export type ToolStatus = 'live' | 'soon' | 'hidden';

export interface ToolEntity {
  slug: string;
  name: string;
  blurb: string;
  repo: string;
  tags: string[];
  status: ToolStatus;
}
