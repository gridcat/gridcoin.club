import React from 'react';
import {
  Container, Typography, Box,
} from '@mui/material';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { Seo, SITE_NAME } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { NextMuiLink } from '@/components/NextMuiLink';
import { DonationAddress } from '@/components/DonationAddress';
import { CopyableValue } from '@/components/CopyableValue';
import { CONTACT_EMAIL } from '@/lib/contact';
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
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, pb: 2 }}>
            About
          </Typography>
          <Box sx={{ '& p': { pb: 2, lineHeight: 1.7 } }}>
            <Typography variant="body1" component="p">
              <strong>Gridcoin Club</strong>
              {' '}
              is a community-run hub for tools built around the Gridcoin network.
              The site itself is deliberately thin: each tool lives on its own subdomain
              with its own API, and every tool is open source and runs without depending
              on this hub.
            </Typography>
            <Typography variant="body1" component="p">
              No third-party trackers, no marketing cookies. The only analytics we run is Plausible, self-hosted and cookieless.
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
              alongside the other sites we run.
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
            <Typography
              id="contact"
              variant="h5"
              component="h2"
              sx={{ fontWeight: 700, pt: 3, pb: 1 }}
            >
              Contact us
            </Typography>
            <Typography variant="body1" component="p">
              One mailbox for everything: questions, problem reports, and
              requests to remove a node from the
              {' '}
              <NextMuiLink href="/nodes">addnodes list</NextMuiLink>
              .
            </Typography>
            <CopyableValue
              value={CONTACT_EMAIL}
              copyLabel="Copy our contact address"
              trackingClass={plausibleClass('Contact Copy', { from: 'about' })}
            />

            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, pt: 3, pb: 1 }}>
              Support our work
            </Typography>
            <Typography variant="body1" component="p">
              Everything here is free to use and runs on hardware and hosting we
              pay for ourselves. If these tools are useful to you, a Gridcoin
              donation helps keep the lights on:
            </Typography>
            <DonationAddress address="SJVaQcJriv7N8Py8eWjNUtWPTPBtDZashD" />
          </Box>
        </Container>
        <Footer />
      </PageWrapper>
      <ScrollTopFab />
    </>
  );
}
