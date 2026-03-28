'use client';

import React from 'react';
import { Layout, Menu, type LayoutProps } from 'react-admin';

const AdminAppMenu = () => (
  <Menu>
    <Menu.DashboardItem />
    <Menu.ResourceItems />
  </Menu>
);

export const AdminAppLayout = (props: LayoutProps) => <Layout {...props} menu={AdminAppMenu} />;
