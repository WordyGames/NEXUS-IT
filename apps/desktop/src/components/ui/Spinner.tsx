import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
const borders = { sm: 'border-2', md: 'border-2', lg: 'border-[3px]', xl: 'border-4' };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '', label }) => (
  <div className={`flex flex-col items-center gap-3 ${className}`} role="status" aria-label={label ?? 'Cargando'}>
    <div className={[
      'rounded-full border-slate-200 border-t-blue-600 animate-spin',
      sizes[size],
      borders[size],
    ].join(' ')} />
    {label && <p className="text-sm text-slate-500 font-medium">{label}</p>}
  </div>
);

/** Spinner de pantalla completa para Suspense */
export const PageSpinner: React.FC<{ label?: string }> = ({ label = 'Cargando módulo...' }) => (
  <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50">
    <Spinner size="xl" label={label} />
  </div>
);
