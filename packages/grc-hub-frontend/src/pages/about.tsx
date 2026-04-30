import type { GetServerSidePropsContext } from 'next';
import { AboutPage } from '@/routes/about';
import { withThemeDataServerSide } from '@/lib/modeDataServer';

export const getServerSideProps = withThemeDataServerSide(
  async (_context: GetServerSidePropsContext) => ({
    props: {},
  }),
);

export default AboutPage;
