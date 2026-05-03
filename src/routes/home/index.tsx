import React from 'react';
import {
  Container, Grid, Typography, Box, Button,
} from '@mui/material';
import Link from 'next/link';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { GradientLine } from '@/components/GradientLine';
import { Seo, SITE_NAME } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { ServiceCard } from '@/components/ServiceCard';
import { ComingSoonCard } from '@/components/ComingSoonCard';
import { ProjectCard } from '@/components/ProjectCard';
import { ToolCard } from '@/components/ToolCard';
import type { LiveStats } from '@/lib/sources';
import { services } from '@/data/services';
import { projects } from '@/data/projects';
import { tools } from '@/data/tools';
import { plausibleClass } from '@/lib/plausible';

interface HomePageProps {
  liveStats: LiveStats;
}

export function HomePage({ liveStats }: HomePageProps) {
  const visibleServices = services.filter((s) => s.status !== 'hidden');
  const visibleTools = tools.filter((t) => t.status !== 'hidden');
  const teaser = projects.filter((p) => p.status === 'live').slice(0, 6);
  return (
    <>
      <Seo
        title={`${SITE_NAME} — tools for the Gridcoin network`}
        description="Stamping, payments, a block explorer, and a directory of other community projects on the Gridcoin network."
        path="/"
      />
      <PageWrapper>
        <Header />
        <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
          <GradientLine />
          <Box sx={{ textAlign: { xs: 'left', md: 'center' }, py: { xs: 4, md: 6 } }}>
            <Typography component="h1" variant="h3" sx={{ fontWeight: 800, pb: 2 }}>
              Tools for the Gridcoin network.
            </Typography>
            <Typography
              variant="h6"
              component="p"
              sx={{ color: 'text.secondary', pb: 4, maxWidth: 720, mx: 'auto' }}
            >
              Services we run under
              {' '}
              <strong>*.gridcoin.club</strong>
              , plus fellow community projects from around the network.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', pt: 2 }}>
              <Button
                component={Link}
                href="/projects"
                variant="contained"
                color="primary"
                size="large"
                className={plausibleClass('Hero CTA', { to: '/projects' })}
              >
                Browse projects
              </Button>
              <Button
                component={Link}
                href="/about"
                variant="outlined"
                color="primary"
                size="large"
                className={plausibleClass('Hero CTA', { to: '/about' })}
              >
                About
              </Button>
            </Box>
          </Box>

          <Box sx={{ pb: 2 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, pb: 2 }}>
              Our services
            </Typography>
            <Grid container spacing={3}>
              {visibleServices.map((service) => (
                <Grid key={service.slug} size={{ xs: 12, sm: 6, md: 4 }}>
                  {service.status === 'live'
                    ? <ServiceCard service={service} liveStats={liveStats} />
                    : <ComingSoonCard service={service} />}
                </Grid>
              ))}
            </Grid>
          </Box>

          {visibleTools.length > 0 && (
            <Box sx={{ pt: 6, pb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', pb: 2 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                  Our tools
                </Typography>
                <Button
                  component={Link}
                  href="/tools"
                  size="small"
                  color="primary"
                  className={plausibleClass('Tools See All', { from: 'home-teaser' })}
                >
                  See all →
                </Button>
              </Box>
              <Grid container spacing={2}>
                {visibleTools.slice(0, 6).map((t) => (
                  <Grid key={t.slug} size={{ xs: 12, sm: 6, md: 4 }}>
                    <ToolCard tool={t} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Box sx={{ pt: 6, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', pb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                Fellow projects
              </Typography>
              <Button
                component={Link}
                href="/projects"
                size="small"
                color="primary"
                className={plausibleClass('Fellow See All', { from: 'home-teaser' })}
              >
                See all →
              </Button>
            </Box>
            <Grid container spacing={2}>
              {teaser.map((p) => (
                <Grid key={p.url} size={{ xs: 12, sm: 6, md: 4 }}>
                  <ProjectCard project={p} />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
        <Footer />
      </PageWrapper>
      <ScrollTopFab />
    </>
  );
}
