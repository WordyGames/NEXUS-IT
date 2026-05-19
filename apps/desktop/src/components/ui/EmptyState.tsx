import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
      {icon ?? <Inbox size={28} />}
    </div>
    <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-slate-400 max-w-xs text-balance">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
