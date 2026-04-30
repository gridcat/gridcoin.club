'use client';

import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { getThemeFromCookie, toggleTheme } from '@/lib/mode';
import { plausibleClass } from '@/lib/plausible';

export function ModeToggle() {
  const theme = useTheme();
  const colorMode = getThemeFromCookie();

  const toggleMode = () => {
    toggleTheme(colorMode);
    window.location.reload();
  };

  // Predict the destination mode for the event prop — `colorMode` is the
  // current state, so the click is going the other way.
  const nextMode = colorMode === 'dark' ? 'light' : 'dark';

  return (
    <Box>
      <IconButton
        sx={{ ml: 1 }}
        onClick={toggleMode}
        color="inherit"
        className={plausibleClass('Mode Toggle', { to: nextMode })}
      >
        {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Box>
  );
}
