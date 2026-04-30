'use server';

import * as React from 'react';
import Document, {
  Html, Head, Main, NextScript,
} from 'next/document';
import createEmotionServer from '@emotion/server/create-instance';
import { parseCookie } from 'cookie';
import { DEFAULT_THEME, ThemeMode } from '@/lib/mode';
import createEmotionCache from '../createEmotionCache';

export default class MyDocument extends Document {
  render() {
    const { theme } = this.props as any;
    return (
      <Html
        lang="en"
        data-theme={theme}
        data-scroll-behavior="smooth"
      >
        <Head>
          <link rel="dns-prefetch" href="https://daj.pw" />
          <link rel="preconnect" href="https://daj.pw" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://stamp.gridcoin.club" />
          <link rel="dns-prefetch" href="https://grcpay.gridcoin.club" />
          <link rel="dns-prefetch" href="https://explorer.gridcoin.club" />
          <link rel="dns-prefetch" href="https://gridcoinstats.eu" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

MyDocument.getInitialProps = async (ctx) => {
  const originalRenderPage = ctx.renderPage;

  const cache = createEmotionCache();
  const { extractCriticalToChunks } = createEmotionServer(cache);

  ctx.renderPage = () => originalRenderPage({
    enhanceApp: (App: any) => (props) => <App emotionCache={cache} {...props} />,
  });

  const initialProps = await Document.getInitialProps(ctx);
  const emotionStyles = extractCriticalToChunks(initialProps.html);
  const emotionStyleTags = emotionStyles.styles.map((style) => (
    <style
      data-emotion={`${style.key} ${style.ids.join(' ')}`}
      key={style.key}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: style.css }}
    />
  ));

  const { req } = ctx;
  let theme: ThemeMode = DEFAULT_THEME;
  if (req) {
    const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
    const themeCookie = cookies.theme;
    theme = themeCookie === 'light' || themeCookie === 'dark'
      ? (themeCookie as ThemeMode)
      : DEFAULT_THEME;
  }

  return {
    ...initialProps,
    theme,
    styles: [...React.Children.toArray(initialProps.styles), ...emotionStyleTags],
  };
};
