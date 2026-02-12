import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import UpdateNotification from './UpdateNotification';

const PortalLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <UpdateNotification />
    </div>
  );
};

export default PortalLayout;
