import {
  Container,
  Divider,
  Typography,
  Grid,
} from '@mui/material';
import GithubIcon from '@mui/icons-material/GitHub';
import React from 'react';
import { styled } from '@mui/material/styles';
import { linkRel } from '@/lib/externalRel';
import { plausibleClass } from '@/lib/plausible';

const GITHUB_REPO_URL = 'https://github.com/gridcat/gridcoin.club';

const SubFooterTypography = styled(Typography)(({ theme }) => ({
  textAlign: 'left',
  lineHeight: theme.spacing(8),
  width: '100%',
  display: 'inline-block',
  color: theme.palette.text.disabled,
  [theme.breakpoints.down('sm')]: {
    textAlign: 'center',
    lineHeight: theme.spacing(5),
  },
}));

const FooterTextTypography = styled(Typography)(({ theme }) => ({
  display: 'inline-block',
  width: '100%',
  [theme.breakpoints.down('md')]: {
    textAlign: 'left',
  },
  [theme.breakpoints.down('sm')]: {
    textAlign: 'center',
  },
}));

export function Footer() {
  return (
    <Container maxWidth="xl">
      <div>
        <Divider />
      </div>
      <Grid container spacing={0} sx={{ mt: 2, mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FooterTextTypography variant="caption">
            The front door for the Gridcoin Club family.
          </FooterTextTypography>
          <FooterTextTypography variant="caption" sx={{ color: 'text.disabled' }}>
            Privacy-first by design.
          </FooterTextTypography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FooterTextTypography variant="caption" sx={{ textAlign: 'right' }}>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel={linkRel(GITHUB_REPO_URL, '_blank')}
              style={{ display: 'inline-block' }}
              className={plausibleClass('Outbound GitHub', {
                target: 'gridcat/gridcoin.club',
                from: 'footer',
              })}
            >
              <GithubIcon color="primary" sx={{ fontSize: 40 }} />
            </a>
          </FooterTextTypography>
        </Grid>
      </Grid>
      <Divider />
      <SubFooterTypography variant="caption">
        Made with
        {' '}
        <span style={{ color: 'red' }}>❤</span>
        {' '}
        by @gridcat
      </SubFooterTypography>
    </Container>
  );
}
