import React from 'react';

type Color = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan' | 'gray' | 'orange';

interface BadgeProps {
  color?: Color;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const colors: Record<Color, string> = {
  blue:   'bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-900/40   dark:text-blue-300   dark:border-blue-700',
  green:  'bg-green-50  text-green-700  border-green-200  dark:bg-green-900/40  dark:text-green-300  dark:border-green-700',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  red:    'bg-red-50    text-red-700    border-red-200    dark:bg-red-900/40    dark:text-red-300    dark:border-red-700',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
  cyan:   'bg-cyan-50   text-cyan-700   border-cyan-200   dark:bg-cyan-900/40   dark:text-cyan-300   dark:border-cyan-700',
  gray:   'bg-slate-50  text-slate-600  border-slate-200  dark:bg-slate-700     dark:text-slate-300  dark:border-slate-600',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
};

const dotColors: Record<Color, string> = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  yellow: 'bg-yellow-500',
  red:    'bg-red-500',
  purple: 'bg-purple-500',
  cyan:   'bg-cyan-500',
  gray:   'bg-slate-400',
  orange: 'bg-orange-500',
};

export const Badge: React.FC<BadgeProps> = ({ color = 'gray', children, dot, className = '' }) => (
  <span className={[
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
    colors[color],
    className,
  ].join(' ')}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[color]}`} />}
    {children}
  </span>
);

export const ticketStatusBadge = (status: string): React.ReactElement => {
  const map: Record<string, { color: Color; label: string }> = {
    open:        { color: 'blue',   label: 'Abierto' },
    in_progress: { color: 'yellow', label: 'En Progreso' },
    resolved:    { color: 'green',  label: 'Resuelto' },
    closed:      { color: 'gray',   label: 'Cerrado' },
    cancelled:   { color: 'red',    label: 'Cancelado' },
  };
  const cfg = map[status] ?? { color: 'gray' as Color, label: status };
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
};

export const maintenanceStatusBadge = (status: string): React.ReactElement => {
  const map: Record<string, { color: Color; label: string }> = {
    programado:  { color: 'blue',   label: 'Programado' },
    en_progreso: { color: 'yellow', label: 'En Progreso' },
    completado:  { color: 'green',  label: 'Completado' },
    cancelado:   { color: 'gray',   label: 'Cancelado' },
    atrasado:    { color: 'red',    label: 'Atrasado' },
  };
  const cfg = map[status] ?? { color: 'gray' as Color, label: status };
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
};

export const priorityBadge = (priority: string): React.ReactElement => {
  const map: Record<string, { color: Color; label: string }> = {
    low:    { color: 'green',  label: 'Baja' },
    medium: { color: 'yellow', label: 'Media' },
    high:   { color: 'orange', label: 'Alta' },
    urgent: { color: 'red',    label: 'Urgente' },
  };
  const cfg = map[priority] ?? { color: 'gray' as Color, label: priority };
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
};
