import type { GetServerSideProps } from 'next';
import { services } from '@/data/services';
import { projects } from '@/data/projects';
import { tools } from '@/data/tools';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/entities/ProjectEntity';

// /llms.txt is a curated, plain-text summary of the site for LLMs / AEO.
// Generated from the same data files that power the home and projects
// pages, so it stays fresh as services and curated projects evolve.
//
// Format follows https://llmstxt.org/ strictly: H1 title, blockquote
// summary, optional intro prose, then H2-delimited sections whose bodies
// are bulleted lists of `[name](url): notes`. An `## Optional` section at
// the end holds links an LLM may safely skip when context is tight.

function buildContent(): string {
  const liveServices = services.filter((s) => s.status === 'live');
  const soonServices = services.filter((s) => s.status === 'soon');
  const liveTools = tools.filter((t) => t.status === 'live');
  const liveProjects = projects.filter((p) => p.status === 'live');

  const lines: string[] = [];
  lines.push('# Gridcoin Club');
  lines.push('');
  lines.push('> Apex hub at gridcoin.club. A directory of self-hosted tools we run for the Gridcoin network plus a hand-curated index of fellow community projects.');
  lines.push('');
  lines.push('Gridcoin Club is a thin front door: each tool we run lives on its own subdomain with its own API. The home page server-renders fresh stats pulled from sibling APIs at request time, so first paint already shows real numbers: no client hydration flash, no JS-required content, fully indexable. Privacy-first: no cookies for tracking, only privacy-friendly Plausible Analytics.');
  lines.push('');

  lines.push('## Services we run');
  lines.push('');
  for (const s of liveServices) {
    lines.push(`- [${s.name}](${s.url}): ${s.tagline}`);
  }
  for (const s of soonServices) {
    lines.push(`- [${s.name}](${s.url}): ${s.tagline} (coming soon)`);
  }
  lines.push('');

  if (liveTools.length > 0) {
    lines.push('## Tools we maintain');
    lines.push('');
    for (const t of liveTools) {
      lines.push(`- [${t.name}](${t.repo}): ${t.blurb}`);
    }
    lines.push('');
  }

  for (const cat of CATEGORY_ORDER) {
    const entries = liveProjects.filter((p) => p.category === cat);
    if (entries.length === 0) continue;
    lines.push(`## ${CATEGORY_LABELS[cat]}`);
    lines.push('');
    for (const p of entries) {
      lines.push(`- [${p.name}](${p.url}): ${p.blurb}`);
    }
    lines.push('');
  }

  lines.push('## Pages');
  lines.push('');
  lines.push('- [Home](https://gridcoin.club/): live stats from sibling APIs, our services, our open source tools, and a teaser of fellow community projects');
  lines.push('- [Tools](https://gridcoin.club/tools): open source libraries, GitHub Actions, and CLIs we maintain, with tag filtering');
  lines.push('- [Curated projects](https://gridcoin.club/projects): full directory grouped by category, with tag filtering');
  lines.push('- [About](https://gridcoin.club/about): what Gridcoin Club is, who runs it, how to suggest a project');
  lines.push('');

  lines.push('## Optional');
  lines.push('');
  lines.push('- [Source code](https://github.com/gridcat/gridcoin.club): hub repo on GitHub, MIT-licensed');
  lines.push('- [Maintainer](https://github.com/gridcat): @gridcat — open a PR against `src/data/projects.ts` to suggest additions');
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
