import type { GetServerSidePropsContext } from 'next';
import { NodesPage } from '@/routes/nodes';
import { withThemeDataServerSide } from '@/lib/modeDataServer';
import { ADDNODES_PUBLIC_URL, fetchPublishedBoth } from '@/lib/sources/addnodes';

export const getServerSideProps = withThemeDataServerSide(
  async (_context: GetServerSidePropsContext) => {
    const data = await fetchPublishedBoth();
    return {
      props: {
        ...data,
        baseUrl: ADDNODES_PUBLIC_URL,
        // Rendered server-side so relative times are identical in the SSR
        // markup and after hydration; a `new Date()` inside the component
        // would differ between the two and trip React's hydration check.
        renderedAt: new Date().toISOString(),
      },
    };
  },
);

export default NodesPage;
