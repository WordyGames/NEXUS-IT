import React from 'react';
import { Company } from '@nexus-it/shared';

interface CompanyCardProps {
  company: Company;
  equipmentCount: number;
  color: string;
}

const CompanyCard = ({ company, equipmentCount, color }: CompanyCardProps) => {
  const colorClasses: Record<string, string> = {
    'especias': 'bg-green-500 hover:bg-green-600',
    'grupo-amex': 'bg-blue-500 hover:bg-blue-600',
    'montacargas': 'bg-amber-500 hover:bg-amber-600',
    'equipos-osenal': 'bg-purple-500 hover:bg-purple-600',
    'amex-juarez': 'bg-purple-500 hover:bg-purple-600'
  };

  return (
    <div
      className={`${colorClasses[color]} text-white rounded-lg p-6 shadow-lg transition-all hover:scale-105 cursor-pointer`}
    >
      <div className="flex flex-col space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {company}
          </h3>
          <div className="h-1 w-16 bg-white opacity-50 rounded"></div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm opacity-75">Equipos</p>
            <p className="text-4xl font-bold">{equipmentCount}</p>
          </div>
          <div className="text-5xl opacity-20">🏢</div>
        </div>

        <div className="pt-2 border-t border-white border-opacity-20">
          <p className="text-sm opacity-75">
            Ver todos →
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyCard;
