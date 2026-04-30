import type { GetServerSidePropsContext } from 'next';
import { ProjectsPage } from '@/routes/projects';
import { withThemeDataServerSide } from '@/lib/modeDataServer';

export const getServerSideProps = withThemeDataServerSide(
  async (_context: GetServerSidePropsContext) => ({
    props: {},
  }),
);

export default ProjectsPage;
