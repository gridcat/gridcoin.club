import React from 'react';
import {
  Container, Box, Typography, Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Image from 'next/image';
import Link from 'next/link';
import { Seo } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { plausibleClass } from '@/lib/plausible';

const PageBody = styled(Box)(() => ({
  backgroundImage: 'url(/il-background-error-page.svg)',
  backgroundSize: 'cover',
}));

const NotFoundError = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(5),
}));

const ErrorContainer = styled(Container)(() => ({
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'center',
}));

export function NotFound() {
  return (
    <PageBody>
      <Seo
        title="Page Not Found"
        description="The page you were looking for does not exist."
        path="/404"
        noindex
      />
      <PageWrapper>
        <ErrorContainer maxWidth="xl">
          <Image
            src="/ic-error.svg"
            width={244}
            height={310}
            alt="Major Tom"
            priority
          />
          <NotFoundError variant="h4" color="inherit">
            This page has been eaten by Major Tom!
          </NotFoundError>
          <Link href="/" passHref>
            <Button
              variant="contained"
              className={plausibleClass('404 Recover')}
            >
              Ground control, bring me home.
            </Button>
          </Link>
        </ErrorContainer>
      </PageWrapper>
    </PageBody>
  );
}
