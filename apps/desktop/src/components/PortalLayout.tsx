import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Navbar from './Navbar';
import PortalSidebar from './PortalSidebar';
import UpdateNotification from './UpdateNotification';

const PortalLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <PortalSidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <Navbar />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <UpdateNotification />
      </div>
    </div>
  );
};

export default PortalLayout;
