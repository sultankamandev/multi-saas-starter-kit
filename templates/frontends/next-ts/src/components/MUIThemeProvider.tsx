'use client';

import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1', // indigo-500
    },
    secondary: {
      main: '#8b5cf6', // purple-500
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

interface MUIThemeProviderProps {
  children: React.ReactNode;
}

export const MUIThemeProvider: React.FC<MUIThemeProviderProps> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

