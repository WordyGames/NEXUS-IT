import React, { useEffect, useState } from 'react';
import { MessageCircle, LogOut, Search, Sun, Moon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeSupportChatThread, subscribeSupportChatThreads } from '@nexus-it/shared';
import { NotificationBell } from './NotificationBell';

const COMPANY_COLORS: Record<string, string> = {
  ESPECIAS: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  AMEX:     'bg-blue-100   text-blue-700   border-blue-200   dark:bg-blue-900/30   dark:text-blue-400   dark:border-blue-800',
  OSENAL:   'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
};

const getCompanyStyle = (company: string): string => {
  const key = Object.keys(COMPANY_COLORS).find((k) => company.toUpperCase().includes(k));
  return key ? COMPANY_COLORS[key] : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600';
};

const Navbar = () => {
  const { userData, logout, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
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

  const btnBase = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border';
  const btnNeutral = `${btnBase} bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200`;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 h-[60px] flex items-center justify-between flex-shrink-0 transition-colors">

      {/* Left: greeting */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Hola,{' '}
          <span className="text-slate-900 dark:text-white font-semibold">{userData?.name ?? '—'}</span>
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
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs cursor-default select-none">
          <Search size={13} />
          <span>Buscar</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono text-[10px]">⌘K</kbd>
        </div>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggle}
          className={btnNeutral}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Chat */}
        <button
          type="button"
          onClick={handleOpenChat}
          className={`relative ${btnNeutral}`}
          title="Chat de soporte"
        >
          <MessageCircle size={15} />
          <span className="hidden sm:inline">Chat</span>
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full
                             bg-red-500 text-white text-[9px] font-bold leading-[17px] text-center
                             border-2 border-white dark:border-slate-900">
              {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
            </span>
          )}
        </button>

        {/* Notificaciones */}
        <NotificationBell />

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className={`${btnBase} border-transparent text-red-600 hover:bg-red-50 hover:border-red-100 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-800`}
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
