import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import UpdateNotification from './UpdateNotification';

const Layout = () => (
  <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
    <UpdateNotification />
  </div>
);

export default Layout;
