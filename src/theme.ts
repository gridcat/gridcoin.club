import { createTheme, responsiveFontSizes, lighten } from '@mui/material/styles';
import { red } from '@mui/material/colors';
import { PaletteMode, ThemeOptions } from '@mui/material';

const theme = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    primary: mode === 'light' ? {
      main: '#283593',
      light: '#5f5fc4',
      dark: '#001064',
    } : {
      main: lighten('#283593', 0.3),
      light: lighten('#5f5fc4', 0.3),
      dark: lighten('#001064', 0.3),
    },
    secondary: {
      main: '#f5a623',
      light: '#ffc14d',
      dark: '#c47e0e',
    },
    error: {
      main: red.A400,
    },
    mode,
  },
  typography: {
    fontFamily: [
      'SF UI Text Regular',
      '-apple-system',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        contained: {
          borderRadius: 50,
          textTransform: 'none',
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 10,
          paddingBottom: 10,
        },
        outlined: {
          borderWidth: 2,
          borderRadius: 50,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 10,
          paddingBottom: 10,
          textTransform: 'none',
          ':hover': {
            borderWidth: 2,
          },
        },
        text: {
          textTransform: 'none',
        },
        root: {
          '&.Mui-disabled': {
            borderWidth: 2,
          },
        },
      },
    },
  },
});

export const themeCreator = (mode: PaletteMode = 'light') => responsiveFontSizes(createTheme(theme(mode)));
