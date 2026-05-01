import React from 'react';
import {
  Container, Typography, Box,
} from '@mui/material';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { GradientLine } from '@/components/GradientLine';
import { Seo, SITE_NAME } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { NextMuiLink } from '@/components/NextMuiLink';
import { plausibleClass } from '@/lib/plausible';

export function AboutPage() {
  return (
    <>
      <Seo
        title={`About — ${SITE_NAME}`}
        description="What Gridcoin Club is, who runs it, and how to suggest projects for the directory."
        path="/about"
      />
      <PageWrapper>
        <Header />
        <Container maxWidth="md" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
          <GradientLine />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, pb: 2 }}>
            About
          </Typography>
          <Box sx={{ '& p': { pb: 2, lineHeight: 1.7 } }}>
            <Typography variant="body1" component="p">
              <strong>Gridcoin Club</strong>
              {' '}
              is a community-run hub for tools built around the Gridcoin network.
              The site itself is deliberately thin: each tool lives on its own subdomain
              under
              {' '}
              <code>*.gridcoin.club</code>
              {' '}
              with its own API, and every tool is open source and runs without depending
              on this hub. We keep it that way so the directory can grow without becoming
              a single point of failure.
            </Typography>
            <Typography variant="body1" component="p">
              No third-party trackers, no marketing cookies. The home page is server-rendered,
              with stats pulled from sibling APIs at request time, so the tool tiles work without
              JavaScript. The only analytics we run is Plausible, self-hosted and cookieless.
            </Typography>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, pt: 3, pb: 1 }}>
              Suggest a project
            </Typography>
            <Typography variant="body1" component="p">
              The
              {' '}
              <NextMuiLink
                href="/projects"
                className={plausibleClass('Internal Link', { to: '/projects', from: 'about' })}
              >
                directory
              </NextMuiLink>
              {' '}
              is hand-maintained. To add a project, open a pull request against
              {' '}
              <NextMuiLink
                href="https://github.com/gridcat/gridcoin.club"
                target="_blank"
                className={plausibleClass('Outbound GitHub', {
                  target: 'gridcat/gridcoin.club',
                  from: 'about-pr',
                })}
              >
                gridcat/gridcoin.club
              </NextMuiLink>
              {' '}
              editing
              {' '}
              <code>src/data/projects.ts</code>
              .
              Entries not yet ready can be staged with
              {' '}
              <code>status: &apos;hidden&apos;</code>
              , or shown as coming-soon with
              {' '}
              <code>status: &apos;soon&apos;</code>
              .
            </Typography>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, pt: 3, pb: 1 }}>
              Stewardship
            </Typography>
            <Typography variant="body1" component="p">
              Maintained by
              {' '}
              <NextMuiLink
                href="https://github.com/gridcat"
                target="_blank"
                className={plausibleClass('Outbound GitHub', {
                  target: 'gridcat',
                  from: 'about-stewardship',
                })}
              >
                @gridcat
              </NextMuiLink>
              {' '}
              alongside the rest of the
              {' '}
              <code>*.gridcoin.club</code>
              {' '}
              sites.
              The source is MIT-licensed and lives at
              {' '}
              <NextMuiLink
                href="https://github.com/gridcat/gridcoin.club"
                target="_blank"
                className={plausibleClass('Outbound GitHub', {
                  target: 'gridcat/gridcoin.club',
                  from: 'about-source',
                })}
              >
                gridcat/gridcoin.club
              </NextMuiLink>
              .
            </Typography>
          </Box>
        </Container>
        <Footer />
      </PageWrapper>
      <ScrollTopFab />
    </>
  );
}
