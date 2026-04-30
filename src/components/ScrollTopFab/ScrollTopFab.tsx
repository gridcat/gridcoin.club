import React from 'react';
import {
  Fab,
  Fade,
  useScrollTrigger,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

export function ScrollTopFab() {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 200,
  });

  const handleClick = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Fade in={trigger}>
      <Fab
        color="primary"
        size="medium"
        aria-label="Scroll to top"
        onClick={handleClick}
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
          zIndex: (theme) => theme.zIndex.tooltip,
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Fade>
  );
}
