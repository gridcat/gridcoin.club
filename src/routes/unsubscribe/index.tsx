import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { Seo, SITE_NAME } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { NextMuiLink } from '@/components/NextMuiLink';
import { plausibleClass } from '@/lib/plausible';

// Landing spot for unsubscribe links in spam that spoofs @gridcoin.club.
// noindex and kept out of the sitemap and nav: only people who clicked one should see it.
export function UnsubscribePage() {
  return (
    <>
      <Seo
        title={`Unsubscribe — ${SITE_NAME}`}
        description="Gridcoin Club doesn't send email, so there is nothing to unsubscribe from."
        path="/unsubscribe"
        noindex
      />
      <PageWrapper>
        <Header />
        <Container maxWidth="md" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, pb: 2 }}>
            You&apos;re not subscribed
          </Typography>
          <Typography variant="h6" component="p" sx={{ color: 'text.secondary', pb: 3 }}>
            Gridcoin Club doesn&apos;t send email. There&apos;s no mailing list, so
            there&apos;s nothing to unsubscribe from.
          </Typography>
          <Box sx={{ '& p': { pb: 2, lineHeight: 1.7 } }}>
            <Typography variant="body1" component="p">
              If an email from an @gridcoin.club address brought you here, someone
              else sent it using our name. We didn&apos;t send it.
            </Typography>
            <Typography variant="body1" component="p">
              Mark it as spam. Don&apos;t reply to it, click anything else in it, or
              open its attachments.
            </Typography>
            <Typography variant="body1" component="p">
              We ask mail providers to reject any email that claims to come from
              gridcoin.club.
            </Typography>
            <Typography variant="body1" component="p">
              Questions? Our contact address is on the
              {' '}
              <NextMuiLink
                href="/about#contact"
                className={plausibleClass('Internal Link', { to: '/about', from: 'unsubscribe' })}
              >
                About page
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
