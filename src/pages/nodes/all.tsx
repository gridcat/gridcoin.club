import type { GetServerSidePropsContext } from 'next';
import { AllNodesPage } from '@/routes/nodes/all';
import { withThemeDataServerSide } from '@/lib/modeDataServer';
import { fetchInventoryBoth } from '@/lib/sources/addnodes';

export const getServerSideProps = withThemeDataServerSide(
  async (_context: GetServerSidePropsContext) => {
    const data = await fetchInventoryBoth();
    return {
      props: {
        ...data,
        renderedAt: new Date().toISOString(),
      },
    };
  },
);

export default AllNodesPage;
