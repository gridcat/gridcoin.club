'use client';

import React, { useMemo, useState } from 'react';
import {
  Container, Typography, Box, Grid, Grow, Collapse, Fade,
} from '@mui/material';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { GradientLine } from '@/components/GradientLine';
import { Seo, SITE_NAME, itemListLd } from '@/components/Seo';
import { PageWrapper } from '@/components/PageWrapper';
import { ScrollTopFab } from '@/components/ScrollTopFab/ScrollTopFab';
import { ProjectCard } from '@/components/ProjectCard';
import { TagFilter } from '@/components/TagFilter';
import { projects } from '@/data/projects';
import { plausibleClass } from '@/lib/plausible';
import {
  CATEGORY_LABELS, CATEGORY_ORDER, ProjectCategory, ProjectEntity,
} from '@/entities/ProjectEntity';

function groupByCategory(entries: ProjectEntity[]): Record<ProjectCategory, ProjectEntity[]> {
  const empty = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = [];
    return acc;
  }, {} as Record<ProjectCategory, ProjectEntity[]>);
  for (const entry of entries) {
    empty[entry.category].push(entry);
  }
  return empty;
}

function projectMatches(project: ProjectEntity, active: ReadonlySet<string>): boolean {
  if (active.size === 0) return true;
  if (!project.tags || project.tags.length === 0) return false;
  // OR semantics — entry passes if any of its tags is selected. With a
  // small dataset OR feels less surprising than AND ("show me everything
  // tagged X or Y") and lets the user broaden by clicking more chips.
  return project.tags.some((t) => active.has(t));
}

export function ProjectsPage() {
  const visible = useMemo(
    () => projects.filter((p) => p.status !== 'hidden'),
    [],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of visible) {
      for (const t of p.tags ?? []) set.add(t);
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
    () => visible.filter((p) => projectMatches(p, active)),
    [visible, active],
  );
  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  return (
    <>
      <Seo
        title={`Curated Gridcoin projects — ${SITE_NAME}`}
        description="Hand-picked directory of community projects built on or alongside the Gridcoin network: wallets, explorers, mining tooling, docs."
        path="/projects"
        jsonLd={itemListLd(
          'Curated Gridcoin projects',
          visible.map((p) => ({ name: p.name, url: p.url, description: p.blurb })),
        )}
      />
      <PageWrapper>
        <Header />
        <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
          <GradientLine />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, pb: 1 }}>
            Curated projects
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', pb: 4, maxWidth: 720 }}>
            Fellow Gridcoin projects we admire. Hand-maintained: submit a PR to add yours.
          </Typography>

          <TagFilter
            tags={allTags}
            active={active}
            onToggle={toggleTag}
            onClear={clearTags}
            visibleCount={filtered.length}
            totalCount={visible.length}
          />

          {CATEGORY_ORDER.map((cat) => {
            const entries = grouped[cat];
            const isOpen = entries.length > 0;
            return (
              <Collapse
                key={cat}
                in={isOpen}
                timeout={300}
                mountOnEnter
                unmountOnExit
              >
                <Box sx={{ pb: 5 }}>
                  <Typography
                    variant="overline"
                    component="h2"
                    sx={{
                      color: 'text.secondary',
                      letterSpacing: '0.12em',
                      pb: 1.5,
                      display: 'block',
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Typography>
                  <Grid container spacing={2}>
                    {entries.map((p, idx) => (
                      <Grow
                        key={p.url}
                        in
                        timeout={250 + idx * 60}
                        style={{ transformOrigin: 'top left' }}
                      >
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                          <ProjectCard project={p} />
                        </Grid>
                      </Grow>
                    ))}
                  </Grid>
                </Box>
              </Collapse>
            );
          })}

          <Fade in={filtered.length === 0} timeout={300}>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No projects match the selected tags.
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
