'use client';

import React from 'react';
import { Menu, MenuItemLink } from 'react-admin';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Custom Admin Menu that includes default resources plus Settings
 * React-Admin's Menu component automatically includes all Resources
 * We just add our custom Settings link
 */
export const AdminMenu = () => {
  return (
    <Menu>
      <MenuItemLink
        to="/settings"
        primaryText="Settings"
        leftIcon={<SettingsIcon />}
      />
    </Menu>
  );
};
