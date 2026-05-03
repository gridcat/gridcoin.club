import type { NextPageContext } from 'next';
import { parseCookie } from 'cookie';
import { DEFAULT_THEME, ThemeMode } from '@/lib/mode';
import { NotFound } from '@/routes/not-found';

interface ErrorPageProps {
  mode: ThemeMode;
}

// Pages Router forbids `getServerSideProps` on `pages/404.tsx`, which would
// statically prerender the route at build time and skip the per-request
// theme cookie read. Routing 404s (and other errors) through `_error.tsx`
// with `getInitialProps` keeps the whole site SSR per request.
export default function ErrorPage(_props: ErrorPageProps) {
  return <NotFound />;
}

ErrorPage.getInitialProps = async (ctx: NextPageContext): Promise<ErrorPageProps> => {
  const { req } = ctx;

  let mode: ThemeMode = DEFAULT_THEME;
  if (req) {
    const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
    const themeCookie = cookies.theme;
    mode = themeCookie === 'light' || themeCookie === 'dark'
      ? (themeCookie as ThemeMode)
      : DEFAULT_THEME;
  }

  return { mode };
};
