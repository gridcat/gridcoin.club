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
  { label: 'Projects', href: '/projects' },
  { label: 'About', href: '/about' },
];
