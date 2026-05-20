import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick,
}) => (
  <div
    onClick={onClick}
    className={[
      'bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-card transition-colors',
      hover ? 'hover:shadow-card-md hover:-translate-y-0.5 cursor-pointer' : '',
      onClick ? 'cursor-pointer' : '',
      paddings[padding],
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon }) => (
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex-shrink-0 ml-4">{action}</div>}
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan' | 'slate';
  trend?: { value: number; label: string };
}

const statColors = {
  blue:   { bg: 'bg-gradient-to-br from-blue-50 to-blue-100/60   dark:from-blue-900/30 dark:to-blue-900/10',   text: 'text-blue-600   dark:text-blue-400',   ring: 'ring-blue-200/60   dark:ring-blue-700/40',   bar: 'bg-gradient-to-r from-blue-500 to-indigo-500' },
  green:  { bg: 'bg-gradient-to-br from-green-50 to-green-100/60  dark:from-green-900/30 dark:to-green-900/10',  text: 'text-green-600  dark:text-green-400',  ring: 'ring-green-200/60  dark:ring-green-700/40',  bar: 'bg-gradient-to-r from-green-500 to-emerald-500' },
  yellow: { bg: 'bg-gradient-to-br from-yellow-50 to-amber-100/60 dark:from-yellow-900/30 dark:to-yellow-900/10', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-200/60 dark:ring-yellow-700/40', bar: 'bg-gradient-to-r from-yellow-500 to-amber-500' },
  red:    { bg: 'bg-gradient-to-br from-red-50 to-rose-100/60     dark:from-red-900/30 dark:to-red-900/10',     text: 'text-red-600    dark:text-red-400',    ring: 'ring-red-200/60    dark:ring-red-700/40',    bar: 'bg-gradient-to-r from-red-500 to-rose-500' },
  purple: { bg: 'bg-gradient-to-br from-purple-50 to-violet-100/60 dark:from-purple-900/30 dark:to-purple-900/10', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-200/60 dark:ring-purple-700/40', bar: 'bg-gradient-to-r from-purple-500 to-violet-500' },
  cyan:   { bg: 'bg-gradient-to-br from-cyan-50 to-sky-100/60     dark:from-cyan-900/30 dark:to-cyan-900/10',   text: 'text-cyan-600   dark:text-cyan-400',   ring: 'ring-cyan-200/60   dark:ring-cyan-700/40',   bar: 'bg-gradient-to-r from-cyan-500 to-sky-500' },
  slate:  { bg: 'bg-slate-100 dark:bg-slate-700',                                                                text: 'text-slate-500  dark:text-slate-400',  ring: 'ring-slate-200/60  dark:ring-slate-600/40',  bar: 'bg-gradient-to-r from-slate-400 to-slate-500' },
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'blue', trend }) => {
  const c = statColors[color];
  return (
    <Card className="relative overflow-hidden flex items-center gap-4 pt-5">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />
      {icon && (
        <div className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center flex-shrink-0 ${c.text} shadow-sm`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{label}</p>
        {trend && (
          <p className={`text-xs mt-0.5 font-medium ${trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </Card>
  );
};
