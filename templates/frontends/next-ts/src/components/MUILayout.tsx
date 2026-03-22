'use client';

import { ReactNode } from 'react';
import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';

interface MUILayoutProps {
  children: ReactNode;
}

export default function MUILayout({ children }: MUILayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SaaS Starter
          </Typography>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ flex: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
