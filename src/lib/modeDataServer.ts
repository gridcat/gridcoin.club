'use server';

import {
  GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult,
} from 'next';
import { parseCookie } from 'cookie';
import { DEFAULT_THEME, ThemeMode } from './mode';

export function withThemeDataServerSide<T extends Record<string, any>>(
  gssp?: GetServerSideProps<T>,
): GetServerSideProps<T & { mode: ThemeMode }> {
  return async (
    context: GetServerSidePropsContext,
  ): Promise<GetServerSidePropsResult<T & { mode: ThemeMode }>> => {
    const { req } = context;
    const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
    const themeCookie = cookies.theme;
    const theme: ThemeMode = themeCookie === 'light' || themeCookie === 'dark'
      ? (themeCookie as ThemeMode)
      : DEFAULT_THEME;

    let pageProps: T = {} as T;
    if (gssp) {
      const result = await gssp(context);
      if ('props' in result) {
        pageProps = result.props as T;
      } else {
        return result as any;
      }
    }

    return {
      props: {
        ...pageProps,
        mode: theme,
      },
    };
  };
}
