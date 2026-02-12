import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import PortalSidebar from './PortalSidebar';
import UpdateNotification from './UpdateNotification';

const PortalLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <PortalSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <UpdateNotification />
      </div>
    </div>
  );
};

export default PortalLayout;
