import { styled } from '@mui/material/styles';
import React from 'react';
import { Box } from '@mui/material';
import { useRouter } from 'next/router';
import { ModeToggle } from './Mode';
import { menuItems, isMenuGroup, MenuEntry } from './constants';
import { NextMuiLink } from '../NextMuiLink';
import { plausibleClass } from '@/lib/plausible';

const itemHorzPadding = 1;
const gutter = 2;

const Nav = styled('ul')(() => ({
  listStyle: 'none',
  display: 'flex',
  overflow: 'auto',
  padding: 0,
  margin: 0,
}));

const NavItem = styled('li')(({ theme }) => ({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  borderRadius: 4,
  padding: theme.spacing(1, itemHorzPadding),
  cursor: 'pointer',
  textDecoration: 'none',
  transition: '0.2s ease-out',
  '& a, & .groupTrigger': {
    color: theme.palette.text.secondary,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    font: 'inherit',
    cursor: 'pointer',
    padding: 0,
  },
  '&:after': {
    content: '""',
    display: 'block',
    position: 'absolute',
    bottom: 0,
    left: theme.spacing(itemHorzPadding),
    width: `calc(100% - ${theme.spacing(itemHorzPadding * 2)})`,
    height: 3,
    transform: 'scale(0, 1)',
    transition: '0.2s ease-out',
    opacity: 0,
    borderRadius: 2,
    backgroundImage: `linear-gradient(to right, ${theme.palette.primary.dark}, ${theme.palette.primary.light})`,
  },
  '&:hover': {
    '& a, & .groupTrigger': {
      color:
    theme.palette.mode === 'dark'
      ? theme.palette.primary.light
      : theme.palette.primary.main,
    },
    '&:after': {
      opacity: 1,
      transform: 'scale(1, 1)',
    },
  },
  '&:not(:first-of-type)': {
    marginLeft: theme.spacing(gutter),
  },
  '&.itemActive': {
    '& a, & .groupTrigger': {
      color:
        theme.palette.mode === 'dark'
          ? theme.palette.primary.light
          : theme.palette.primary.main,
    },
    '&:after': {
      opacity: 1,
      transform: 'scale(1, 1)',
      backgroundColor:
          theme.palette.mode === 'dark'
            ? theme.palette.primary.light
            : theme.palette.primary.main,
    },
  },
}));

function entryKeyFor(entry: MenuEntry, index: number): string {
  if (isMenuGroup(entry)) {
    return `dmenu-group-${entry.label.toLowerCase().replace(/\s+/g, '-')}-${index}`;
  }
  return `dmenu-item-${entry.href.replace('/', '') || 'root'}`;
}

export function NavMenuDesktop() {
  const router = useRouter();

  return (
    <>
      <Box component="nav">
        <Nav>
          {menuItems.map((entry, index) => {
            const key = entryKeyFor(entry, index);
            // Hub menu has no groups today, but the structure is preserved
            // for parity with sibling sites that do.
            if (isMenuGroup(entry)) return null;
            const isActive = router.pathname === entry.href;
            return (
              <NavItem
                key={key}
                className={isActive ? 'itemActive' : undefined}
              >
                <NextMuiLink
                  href={entry.href}
                  className={plausibleClass('Nav Click', { to: entry.href, from: 'desktop' })}
                >
                  {entry.label}
                </NextMuiLink>
              </NavItem>
            );
          })}
        </Nav>
      </Box>
      <ModeToggle />
    </>
  );
}
