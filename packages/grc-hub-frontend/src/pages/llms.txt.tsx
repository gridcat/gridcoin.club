import type { GetServerSideProps } from 'next';
import { services } from '@/data/services';
import { projects } from '@/data/projects';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/entities/ProjectEntity';

// /llms.txt is a curated, plain-text summary of the site for LLMs / AEO.
// Generated from the same data files that power the home and projects
// pages, so it stays fresh as services and curated projects evolve.
//
// See https://llmstxt.org/ for the convention.

function buildContent(): string {
  const liveServices = services.filter((s) => s.status === 'live');
  const upcomingServices = services.filter((s) => s.status === 'soon');
  const liveProjects = projects.filter((p) => p.status === 'live');

  const lines: string[] = [];
  lines.push('# Gridcoin Club');
  lines.push('');
  lines.push('> Apex hub at gridcoin.club for the Gridcoin Club family. A directory of self-hosted tools we run for the Gridcoin network plus a hand-curated index of fellow community projects.');
  lines.push('');
  lines.push('Gridcoin Club is a thin front door: each tool we run lives on its own subdomain under *.gridcoin.club. The home page server-renders fresh stats pulled from sibling APIs at request time so first paint already shows real numbers — no client hydration flash, no JS-required content, fully indexable. Privacy-first: no cookies for tracking, only privacy-friendly Plausible Analytics.');
  lines.push('');

  lines.push('## Services we run (*.gridcoin.club)');
  lines.push('');
  for (const s of liveServices) {
    lines.push(`- [${s.name}](${s.url}): ${s.tagline}`);
  }
  lines.push('');

  if (upcomingServices.length > 0) {
    lines.push('## Coming soon');
    lines.push('');
    for (const s of upcomingServices) {
      lines.push(`- ${s.name}: ${s.tagline}`);
    }
    lines.push('');
  }

  lines.push('## Curated Gridcoin projects');
  lines.push('');
  lines.push('A hand-maintained directory of fellow projects building on or alongside the Gridcoin network. Submit additions via PR against `packages/grc-hub-frontend/src/data/projects.ts`.');
  lines.push('');
  for (const cat of CATEGORY_ORDER) {
    const entries = liveProjects.filter((p) => p.category === cat);
    if (entries.length === 0) continue;
    lines.push(`### ${CATEGORY_LABELS[cat]}`);
    lines.push('');
    for (const p of entries) {
      lines.push(`- [${p.name}](${p.url}): ${p.blurb}`);
    }
    lines.push('');
  }

  lines.push('## Source & stewardship');
  lines.push('');
  lines.push('- Source: https://github.com/gridcat/gridcoin.club');
  lines.push('- Maintainer: @gridcat (https://github.com/gridcat)');
  lines.push('- License: MIT');
  lines.push('');

  lines.push('## Pages');
  lines.push('');
  lines.push('- `/` — Home: hero stats from sibling APIs, our-tools grid, fellow-projects teaser');
  lines.push('- `/projects` — Full curated directory grouped by category');
  lines.push('- `/about` — What Gridcoin Club is, who runs it, how to suggest a project');
  lines.push('');

  return lines.join('\n');
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.write(buildContent());
  res.end();
  return { props: {} };
};

export default function LlmsTxt() {
  return null;
}
