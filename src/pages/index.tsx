import type { GetServerSidePropsContext } from 'next';
import { HomePage } from '@/routes/home';
import { fetchAllLiveStats, LiveStats } from '@/lib/sources';
import { withThemeDataServerSide } from '@/lib/modeDataServer';

interface HomeProps {
  liveStats: LiveStats;
}

// SSR per request: reads the theme cookie (so first paint matches the
// user's preference) and fetches sibling stats via Promise.allSettled.
// The fetcher uses a 2s AbortController timeout per source — a hung
// sibling never stalls the render.
export const getServerSideProps = withThemeDataServerSide<HomeProps>(
  async (_context: GetServerSidePropsContext) => {
    const liveStats = await fetchAllLiveStats();
    return { props: { liveStats } };
  },
);

export default function Index({ liveStats }: HomeProps) {
  return <HomePage liveStats={liveStats} />;
}
