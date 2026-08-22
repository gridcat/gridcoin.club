export interface MenuLeaf {
  label: string;
  href: string;
}

export interface MenuGroup {
  label: string;
  children: MenuLeaf[];
}

export type MenuEntry = MenuLeaf | MenuGroup;

export const isMenuGroup = (entry: MenuEntry): entry is MenuGroup => (
  (entry as MenuGroup).children !== undefined
);

export const menuItems: MenuEntry[] = [
  { label: 'Home', href: '/' },
  { label: 'Tools', href: '/tools' },
  { label: 'Nodes', href: '/nodes' },
  { label: 'Projects', href: '/projects' },
  { label: 'About', href: '/about' },
];

/**
 * Is this nav entry the section the reader is currently in?
 *
 * Nested routes count: /nodes stays highlighted on /nodes/all and on a
 * single node's page, because the reader is still in that section. Home is
 * compared exactly, since every route starts with "/" and it would otherwise
 * always match.
 */
export function isCurrentSection(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
