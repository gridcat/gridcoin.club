import type { GetServerSidePropsContext } from 'next';
import { UnsubscribePage } from '@/routes/unsubscribe';
import { withThemeDataServerSide } from '@/lib/modeDataServer';

export const getServerSideProps = withThemeDataServerSide(
  async (_context: GetServerSidePropsContext) => ({
    props: {},
  }),
);

export default UnsubscribePage;
