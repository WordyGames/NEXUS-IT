import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void } | React.ReactNode;
  className?: string;
}

const isActionObj = (a: unknown): a is { label: string; onClick: () => void } =>
  typeof a === 'object' && a !== null && 'label' in a && 'onClick' in a;

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
      {icon ?? <Inbox size={28} />}
    </div>
    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">{description}</p>
    )}
    {action && (
      <div className="mt-5">
        {isActionObj(action)
          ? <Button variant="primary" size="sm" onClick={action.onClick}>{action.label}</Button>
          : action}
      </div>
    )}
  </div>
);
