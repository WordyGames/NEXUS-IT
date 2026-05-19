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
      'bg-white rounded-xl border border-slate-100 shadow-card',
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
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex-shrink-0 ml-4">{action}</div>}
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
  trend?: { value: number; label: string };
}

const statColors = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-100' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  ring: 'ring-green-100' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', ring: 'ring-yellow-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    ring: 'ring-red-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-600',   ring: 'ring-cyan-100' },
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'blue', trend }) => {
  const c = statColors[color];
  return (
    <Card className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center flex-shrink-0 ${c.text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 truncate">{label}</p>
        {trend && (
          <p className={`text-xs mt-0.5 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
    </Card>
  );
};
