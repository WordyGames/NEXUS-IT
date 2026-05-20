import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, User, Lock, Eye, EyeOff, ArrowRight, Monitor, Wrench, ClipboardList, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserPermission, hasUserPermission } from '@nexus-it/shared';

const FEATURES = [
  { icon: Monitor,       text: 'Inventario de equipos en tiempo real' },
  { icon: ClipboardList, text: 'Gestión de tickets de soporte técnico' },
  { icon: Wrench,        text: 'Seguimiento de mantenimientos preventivos' },
];

const resolveInitialRoute = (user: any): string => {
  if (hasUserPermission(user, UserPermission.DASHBOARD_ADMIN))   return '/dashboard';
  if (hasUserPermission(user, UserPermission.EQUIPMENT_VIEW))    return '/equipment';
  if (hasUserPermission(user, UserPermission.TICKETS_VIEW))      return '/tickets';
  if (hasUserPermission(user, UserPermission.MAINTENANCES_VIEW)) return '/maintenances';
  if (hasUserPermission(user, UserPermission.NOTIFICATIONS_VIEW)) return '/notifications';
  return '/portal';
};

const Login = () => {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      if (!user) { setError('No se pudo obtener los datos del usuario'); return; }
      navigate(resolveInitialRoute(user));
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo (branding) ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950
                      flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/12 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/12 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-blue-800/10 rounded-full blur-2xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Right edge glow */}
        <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/15">
            <Cpu size={20} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight">NEXUS IT</span>
            <p className="text-blue-400/50 text-xs leading-none mt-0.5">Grupo AMEX</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-soft" />
            Sistema activo
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4 tracking-tight">
            Gestión TI<br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">centralizada</span>
          </h2>
          <p className="text-slate-400 text-[15px] leading-relaxed mb-10">
            Equipos, tickets y mantenimientos de todas tus empresas, en un solo lugar.
          </p>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-white/8 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-blue-300" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-700 text-xs">
          © 2026 NEXUS IT · Todos los derechos reservados
        </p>
      </div>

      {/* ── Panel derecho (formulario) ──────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-gradient-to-br from-white to-slate-50">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Cpu size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">NEXUS IT</span>
          </div>

          <h1 className="text-[26px] font-bold text-slate-800 mb-1 tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            Ingresa tus credenciales para continuar
          </p>

          {/* Error alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200
                            flex items-start gap-2.5 text-red-700 text-sm animate-slide-down">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Usuario</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800
                    placeholder-slate-400 bg-white hover:border-slate-300
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                    transition-all duration-150 shadow-sm"
                  placeholder="Tu nombre de usuario"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Contraseña</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm text-slate-800
                    placeholder-slate-400 bg-white hover:border-slate-300
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                    transition-all duration-150 shadow-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400
                             hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full mt-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600
                hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800
                text-white text-sm font-semibold rounded-xl transition-all duration-150
                shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-300">
            © 2026 NEXUS IT · Sistema de Gestión TI
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
