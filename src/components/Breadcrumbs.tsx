import { Breadcrumbs as MuiBreadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { NextMuiLink } from './NextMuiLink';

export interface Crumb {
  label: string;
  /** Omit on the last crumb: the page you are already on is not a link. */
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <MuiBreadcrumbs
      aria-label="Breadcrumb"
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ pb: 1, fontSize: '0.875rem' }}
    >
      {items.map((crumb) => (crumb.href ? (
        <NextMuiLink
          key={crumb.href}
          href={crumb.href}
          underline="hover"
          sx={{ color: 'text.secondary', fontSize: 'inherit' }}
        >
          {crumb.label}
        </NextMuiLink>
      ) : (
        <Typography
          key={crumb.label}
          aria-current="page"
          sx={{
            color: 'text.primary',
            fontSize: 'inherit',
            // A node address runs long; keep it on one line rather than
            // letting the trail wrap into two.
            maxWidth: { xs: 180, sm: 420 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {crumb.label}
        </Typography>
      )))}
    </MuiBreadcrumbs>
  );
}
