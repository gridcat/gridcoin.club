import MuiLink, { LinkProps as MuiLinkProps } from '@mui/material/Link';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { forwardRef } from 'react';
import { linkRel } from '@/lib/externalRel';

type NextMuiLinkProps = Omit<NextLinkProps, 'href'> &
MuiLinkProps & {
  href: NextLinkProps['href'];
};

// `rel` is computed from `href` + `target` to enforce the dofollow/nofollow
// policy site-wide; any caller-supplied `rel` is intentionally ignored.
// eslint-disable-next-line react/display-name
export const NextMuiLink = forwardRef<HTMLAnchorElement, NextMuiLinkProps>(
  (props, ref) => {
    const {
      href,
      as,
      replace,
      scroll,
      shallow,
      prefetch,
      locale,
      target,
      ...muiProps
    } = props;

    const rel = typeof href === 'string' ? linkRel(href, target) : undefined;

    return (
      <MuiLink
        component={NextLink}
        ref={ref}
        href={href}
        as={as}
        replace={replace}
        scroll={scroll}
        shallow={shallow}
        prefetch={prefetch}
        locale={locale}
        {...muiProps}
        target={target}
        rel={rel}
      />
    );
  },
);
