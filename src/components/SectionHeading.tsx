import * as React from 'react';
import { Typography } from '@mui/material';

// Shared docs section heading used across the docs pages.
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography component="h2" variant="h4" sx={{ mt: 6, mb: 1, fontWeight: 700 }}>
      {children}
    </Typography>
  );
}
