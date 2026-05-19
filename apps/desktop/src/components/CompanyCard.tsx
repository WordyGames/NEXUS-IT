import React from 'react';
import { Building2 } from 'lucide-react';
import { Company } from '@nexus-it/shared';

interface CompanyCardProps {
  company: Company;
  equipmentCount: number;
  color: string;
}

const colorClasses: Record<string, string> = {
  'especias':      'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700',
  'grupo-amex':    'bg-blue-500    hover:bg-blue-600    dark:bg-blue-600    dark:hover:bg-blue-700',
  'montacargas':   'bg-amber-500   hover:bg-amber-600   dark:bg-amber-600   dark:hover:bg-amber-700',
  'equipos-osenal':'bg-purple-500  hover:bg-purple-600  dark:bg-purple-600  dark:hover:bg-purple-700',
  'amex-juarez':   'bg-cyan-500    hover:bg-cyan-600    dark:bg-cyan-600    dark:hover:bg-cyan-700',
};

const CompanyCard = ({ company, equipmentCount, color }: CompanyCardProps) => (
  <div className={`${colorClasses[color] ?? 'bg-slate-500 hover:bg-slate-600'} text-white rounded-xl p-5 shadow-card transition-all hover:scale-[1.02] cursor-pointer`}>
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold leading-tight opacity-90">{company}</h3>
          <div className="h-0.5 w-10 bg-white/40 rounded mt-1.5" />
        </div>
        <Building2 size={20} className="opacity-30" />
      </div>

      <div>
        <p className="text-xs opacity-70 mb-0.5">Equipos</p>
        <p className="text-4xl font-bold">{equipmentCount}</p>
      </div>

      <div className="pt-2 border-t border-white/20">
        <p className="text-xs opacity-60">Ver todos →</p>
      </div>
    </div>
  </div>
);

export default CompanyCard;
