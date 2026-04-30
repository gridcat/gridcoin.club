import React, { useEffect, useState } from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import {
  Container,
  Button,
  Dialog,
  Toolbar,
  Box,
  Stack,
  Divider,
  Typography,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { styled } from '@mui/material/styles';
import { useRouteNavigating } from '@/hooks';
import { menuItems, isMenuGroup, MenuLeaf } from './constants';
import { ModeToggle } from './Mode';
import { plausibleClass } from '@/lib/plausible';

const SubMenuContainer = styled(Container)(() => ({
  alignItems: 'center',
  display: 'flex',
}));

const MenuContainer = styled(Container)(() => ({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'center',
  height: '100%',
}));

const MenuButton = styled(Button)(({ theme }) => ({
  paddingLeft: theme.spacing(5),
  paddingRight: theme.spacing(5),
  fontWeight: 600,
}));

interface LeafLinkProps {
  leaf: MenuLeaf;
  currentPath: string;
}

function LeafLink({ leaf, currentPath }: LeafLinkProps) {
  const isCurrent = currentPath === leaf.href;
  return (
    <Link href={leaf.href} passHref>
      <MenuButton
        variant={isCurrent ? 'contained' : 'text'}
        disableElevation
        color="primary"
        className={plausibleClass('Nav Click', { to: leaf.href, from: 'mobile' })}
      >
        {leaf.label}
      </MenuButton>
    </Link>
  );
}

export function NavMenuMobile() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const navigating = useRouteNavigating();

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  useEffect(() => {
    if (!navigating) {
      setOpen(false);
    }
  }, [navigating]);

  return (
    <>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={handleClickOpen}
      >
        <MenuIcon />
      </IconButton>
      <Dialog fullScreen open={open} onClose={handleClose}>
        {navigating && (
          <LinearProgress
            color="primary"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 2,
            }}
          />
        )}
        <SubMenuContainer>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Image src="/ic-logo.svg" width={32} height={32} alt="Gridcoin Club logo" />
            <Typography
              component="span"
              sx={{
                fontWeight: 800,
                letterSpacing: '0.02em',
                fontSize: '1.25rem',
                background: (t) => `linear-gradient(90deg, ${t.palette.primary.dark}, ${t.palette.primary.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Gridcoin Club
            </Typography>
          </Box>
          <Toolbar
            sx={{ justifyContent: 'flex-end', flexGrow: 1 }}
            disableGutters
          >
            <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </SubMenuContainer>
        <MenuContainer>
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            {menuItems.map((entry) => {
              if (isMenuGroup(entry)) return null;
              return (
                <Box key={`mmenu-item-${entry.href.replace('/', '') || 'root'}`}>
                  <LeafLink leaf={entry} currentPath={router.pathname} />
                </Box>
              );
            })}
          </Stack>
        </MenuContainer>
        <Divider />
        <Toolbar sx={{ justifyContent: 'flex-end' }}>
          <ModeToggle />
        </Toolbar>
      </Dialog>
    </>
  );
}
