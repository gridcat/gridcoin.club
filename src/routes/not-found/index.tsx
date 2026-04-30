import React from 'react';
import {
  Container, Box, Typography, Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { Seo } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { plausibleClass } from '@/lib/plausible';

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
    <Box>
      <Seo
        title="Page Not Found"
        description="The page you were looking for does not exist."
        path="/404"
        noindex
      />
      <PageWrapper>
        <ErrorContainer maxWidth="md">
          <Typography variant="h1" sx={{ fontWeight: 900, color: 'primary.main' }}>
            404
          </Typography>
          <Typography variant="h5" sx={{ pb: 4, color: 'text.secondary' }}>
            Looks like this corner of the club is empty.
          </Typography>
          <Link href="/" passHref>
            <Button
              variant="contained"
              className={plausibleClass('404 Recover')}
            >
              Take me home
            </Button>
          </Link>
        </ErrorContainer>
      </PageWrapper>
    </Box>
  );
}
