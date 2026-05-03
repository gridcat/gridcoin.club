'use client';

import React, { useMemo, useState } from 'react';
import {
  Container, Typography, Box, Grid, Grow, Fade,
} from '@mui/material';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { GradientLine } from '@/components/GradientLine';
import { Seo, SITE_NAME } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { ToolCard } from '@/components/ToolCard';
import { TagFilter } from '@/components/TagFilter';
import { tools } from '@/data/tools';
import { plausibleClass } from '@/lib/plausible';
import { ToolEntity } from '@/entities/ToolEntity';

function toolMatches(tool: ToolEntity, active: ReadonlySet<string>): boolean {
  if (active.size === 0) return true;
  if (tool.tags.length === 0) return false;
  return tool.tags.some((t) => active.has(t));
}

export function ToolsPage() {
  const visible = useMemo(
    () => tools.filter((t) => t.status !== 'hidden'),
    [],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of visible) {
      for (const tag of t.tags) set.add(tag);
    }
    return Array.from(set).sort();
  }, [visible]);

  const [active, setActive] = useState<ReadonlySet<string>>(() => new Set());

  const toggleTag = (tag: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };
  const clearTags = () => setActive(new Set());

  const filtered = useMemo(
    () => visible.filter((t) => toolMatches(t, active)),
    [visible, active],
  );

  return (
    <>
      <Seo
        title={`Open source tools — ${SITE_NAME}`}
        description="Open source libraries, GitHub Actions, and CLI tools we maintain on github.com/gridcat for the Gridcoin network."
        path="/tools"
      />
      <PageWrapper>
        <Header />
        <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
          <GradientLine />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, pb: 1 }}>
            Tools
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', pb: 4, maxWidth: 720 }}>
            Open source libraries, GitHub Actions, and CLIs we maintain on
            {' '}
            <strong>github.com/gridcat</strong>
            . Use them, fork them, send patches.
          </Typography>

          <TagFilter
            tags={allTags}
            active={active}
            onToggle={toggleTag}
            onClear={clearTags}
            visibleCount={filtered.length}
            totalCount={visible.length}
          />

          <Grid container spacing={2}>
            {filtered.map((t, idx) => (
              <Grow
                key={t.slug}
                in
                timeout={250 + idx * 60}
                style={{ transformOrigin: 'top left' }}
              >
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <ToolCard tool={t} />
                </Grid>
              </Grow>
            ))}
          </Grid>

          <Fade in={filtered.length === 0} timeout={300}>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No tools match the selected tags.
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Try removing a filter or
                {' '}
                <Box
                  component="button"
                  onClick={clearTags}
                  className={plausibleClass('Tag Clear All', { from: 'empty-state' })}
                  sx={{
                    background: 'none',
                    border: 0,
                    p: 0,
                    color: 'primary.main',
                    cursor: 'pointer',
                    font: 'inherit',
                    textDecoration: 'underline',
                  }}
                >
                  clear all
                </Box>
                .
              </Typography>
            </Box>
          </Fade>
        </Container>
        <Footer />
      </PageWrapper>
      <ScrollTopFab />
    </>
  );
}
