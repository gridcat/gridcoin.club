import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useMediaQuery, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NavMenuMobile } from '@/components/Navigation/NavMenuMobile';
import { useRouteNavigating } from '@/hooks';
import { NavMenuDesktop } from '../Navigation/NavMenuDesktop';

interface Props {
  children: React.ReactElement<React.ComponentProps<typeof AppBar>>;
}

export function ElevationScroll({ children }: Props) {
  const theme = useTheme();
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  return React.cloneElement(children, {
    elevation: trigger ? 4 : 0,
    sx: { backgroundColor: trigger ? theme.palette.background.paper : 'transparent' },
  });
}

interface HeaderProps {
  showLinks?: boolean;
}

export function Header({ showLinks = true }: HeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mounted, setMounted] = useState(false);
  const navigating = useRouteNavigating();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <ElevationScroll>
        <AppBar color="transparent">
          {navigating && (
            <LinearProgress
              color="primary"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                zIndex: (t) => t.zIndex.appBar + 1,
              }}
            />
          )}
          <Container maxWidth="xl" sx={{ display: 'flex', alignItems: 'center' }}>
            <Box>
              <Link
                passHref
                href="/"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Image
                  src="/ic-logo.svg"
                  width={isMobile && mounted ? 32 : 40}
                  height={isMobile && mounted ? 32 : 40}
                  alt="Gridcoin Club logo"
                  priority
                />
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    fontSize: isMobile && mounted ? '1.25rem' : '1.5rem',
                    background: (t) => `linear-gradient(90deg, ${t.palette.primary.dark}, ${t.palette.primary.light})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Gridcoin Club
                </Typography>
              </Link>
            </Box>

            <Toolbar
              sx={{ justifyContent: 'flex-end', flexGrow: 1 }}
              disableGutters
            >
              {showLinks && (isMobile ? <NavMenuMobile /> : <NavMenuDesktop />)}
            </Toolbar>
          </Container>
        </AppBar>
      </ElevationScroll>
      <Toolbar />
    </>
  );
}
