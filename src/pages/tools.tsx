import type { GetServerSidePropsContext } from 'next';
import { ToolsPage } from '@/routes/tools';
import { withThemeDataServerSide } from '@/lib/modeDataServer';

export const getServerSideProps = withThemeDataServerSide(
  async (_context: GetServerSidePropsContext) => ({
    props: {},
  }),
);

export default ToolsPage;
