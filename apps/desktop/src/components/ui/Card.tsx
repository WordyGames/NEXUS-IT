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
  blue:   { bg: 'bg-blue-50   dark:bg-blue-900/30',   text: 'text-blue-600   dark:text-blue-400',   ring: 'ring-blue-100   dark:ring-blue-800' },
  green:  { bg: 'bg-green-50  dark:bg-green-900/30',  text: 'text-green-600  dark:text-green-400',  ring: 'ring-green-100  dark:ring-green-800' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-100 dark:ring-yellow-800' },
  red:    { bg: 'bg-red-50    dark:bg-red-900/30',    text: 'text-red-600    dark:text-red-400',    ring: 'ring-red-100    dark:ring-red-800' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-100 dark:ring-purple-800' },
  cyan:   { bg: 'bg-cyan-50   dark:bg-cyan-900/30',   text: 'text-cyan-600   dark:text-cyan-400',   ring: 'ring-cyan-100   dark:ring-cyan-800' },
  slate:  { bg: 'bg-slate-100 dark:bg-slate-700',     text: 'text-slate-500  dark:text-slate-400',  ring: 'ring-slate-200  dark:ring-slate-600' },
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'blue', trend }) => {
  const c = statColors[color];
  return (
    <Card className="flex items-center gap-4">
      {icon && (
        <div className={`w-12 h-12 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center flex-shrink-0 ${c.text}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{label}</p>
        {trend && (
          <p className={`text-xs mt-0.5 ${trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
    </Card>
  );
};
