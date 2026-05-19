import React, { useEffect, useState } from 'react';
import { MessageCircle, LogOut, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeSupportChatThread, subscribeSupportChatThreads } from '@nexus-it/shared';
import { NotificationBell } from './NotificationBell';

const COMPANY_COLORS: Record<string, string> = {
  ESPECIAS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  AMEX:     'bg-blue-100   text-blue-700   border-blue-200',
  OSENAL:   'bg-purple-100 text-purple-700 border-purple-200',
};

const getCompanyStyle = (company: string): string => {
  const key = Object.keys(COMPANY_COLORS).find((k) =>
    company.toUpperCase().includes(k)
  );
  return key ? COMPANY_COLORS[key] : 'bg-slate-100 text-slate-600 border-slate-200';
};

const Navbar = () => {
  const { userData, logout, isAdmin } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
  };

  const handleOpenChat = () => {
    navigate(location.pathname.startsWith('/portal') ? '/portal/chat' : '/chat');
  };

  useEffect(() => {
    if (!userData?.id) { setChatUnreadCount(0); return; }

    if (isAdmin) {
      const unsub = subscribeSupportChatThreads(
        (threads) => setChatUnreadCount(threads.filter((t) => t.hasUnreadForAdmin).length),
        { onError: () => setChatUnreadCount(0) }
      );
      return unsub;
    }

    const unsub = subscribeSupportChatThread(
      userData.id,
      (thread) => setChatUnreadCount(thread?.hasUnreadForUser ? 1 : 0),
      () => setChatUnreadCount(0)
    );
    return unsub;
  }, [isAdmin, userData?.id]);

  return (
    <header className="bg-white border-b border-slate-100 px-6 h-[60px] flex items-center justify-between flex-shrink-0">

      {/* Left: breadcrumb / greeting */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-slate-700">
          Hola,{' '}
          <span className="text-slate-900 font-semibold">{userData?.name ?? '—'}</span>
        </p>
        {userData?.company && (
          <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCompanyStyle(userData.company)}`}>
            {userData.company}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">

        {/* Search hint */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-xs cursor-default select-none">
          <Search size={13} />
          <span>Buscar</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-mono text-[10px]">⌘K</kbd>
        </div>

        {/* Chat */}
        <button
          onClick={handleOpenChat}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200
                     text-slate-600 hover:bg-slate-100 hover:text-slate-800 text-xs font-medium transition-all"
          title="Chat de soporte"
        >
          <MessageCircle size={15} />
          <span className="hidden sm:inline">Chat</span>
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full
                             bg-red-500 text-white text-[9px] font-bold leading-[17px] text-center
                             border-2 border-white">
              {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
            </span>
          )}
        </button>

        {/* Notificaciones */}
        <NotificationBell />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                     text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
          title="Cerrar sesión"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
