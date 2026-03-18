import React from 'react';
import { Equipment } from '@nexus-it/shared';
import { QrCode, FileText } from 'lucide-react';
import styles from './EquipmentCard.module.css';

const getCompanyTagVariant = (company: string) => {
  const normalized = company.toUpperCase();
  if (normalized.includes('ESPECIAS')) return styles.companyEspecias;
  if (normalized.includes('AMEX')) return styles.companyAmex;
  if (normalized.includes('OSENAL')) return styles.companyOsenal;
  return styles.companyDefault;
};

interface EquipmentCardProps {
  equipment: Equipment;
  onEdit: () => void;
  onDelete: () => void;
  onShowQR: () => void;
  onGenerateCarta: () => void;
  canEdit: boolean;
}

const EquipmentCard = ({ equipment, onEdit, onDelete, onShowQR, onGenerateCarta, canEdit }: EquipmentCardProps) => {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    retired: 'bg-red-100 text-red-800'
  };

  const toDate = (value: any): Date => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') return new Date(value);
    if (typeof value === 'object' && 'toDate' in value) return value.toDate();
    return new Date();
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    const d = toDate(date);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getWarrantyStatus = (): { text: string; color: string } => {
    if (!equipment.warrantyExpiration) return { text: 'Sin datos', color: 'text-gray-500' };
    
    const now = new Date();
    const warranty = toDate(equipment.warrantyExpiration);
    const daysLeft = Math.floor((warranty.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: 'Expirada', color: 'text-red-600' };
    if (daysLeft < 30) return { text: `${daysLeft} días`, color: 'text-orange-600' };
    return { text: `${daysLeft} días`, color: 'text-green-600' };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
            {equipment.name}
          </h3>
          <div
            aria-label={`Empresa: ${equipment.company}`}
            title={equipment.company}
            className={`${styles.companyTag} ${getCompanyTagVariant(equipment.company)}`}
          >
            {equipment.company}
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[equipment.status]}`}>
          {equipment.status}
        </span>
      </div>

      {/* Specs */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 w-24">Tipo:</span>
          <span className="text-gray-800 dark:text-white capitalize">{equipment.type}</span>
        </div>
        {equipment.specs.cpu && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 w-24">CPU:</span>
            <span className="text-gray-800 dark:text-white">{equipment.specs.cpu}</span>
          </div>
        )}
        {equipment.specs.ram && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 w-24">RAM:</span>
            <span className="text-gray-800 dark:text-white">{equipment.specs.ram}</span>
          </div>
        )}
        {equipment.specs.storage && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 w-24">Storage:</span>
            <span className="text-gray-800 dark:text-white">{equipment.specs.storage}</span>
          </div>
        )}
        {equipment.specs.os && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 w-24">OS:</span>
            <span className="text-gray-800 dark:text-white">{equipment.specs.os}</span>
          </div>
        )}
        {equipment.specs.hostname && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 w-24">Hostname:</span>
            <span className="text-gray-800 dark:text-white">{equipment.specs.hostname}</span>
          </div>
        )}
        {equipment.location && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 w-24">Ubicación:</span>
            <span className="text-gray-800 dark:text-white">{equipment.location}</span>
          </div>
        )}
      </div>

      {/* Warranty Info */}
      <div className="space-y-1 mb-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        {equipment.purchaseDate && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 w-24">Compra:</span>
            <span className="text-gray-800 dark:text-white">{formatDate(equipment.purchaseDate)}</span>
          </div>
        )}
        {equipment.warrantyExpiration && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 w-24">Garantía:</span>
            <span className={`font-semibold ${getWarrantyStatus().color}`}>
              {formatDate(equipment.warrantyExpiration)} 
              <span className="text-xs ml-2">({getWarrantyStatus().text})</span>
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onShowQR}
          className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm transition-colors flex items-center gap-1"
          title="Ver código QR"
        >
          <QrCode size={16} />
        </button>
        <button
          onClick={onGenerateCarta}
          className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors flex items-center gap-1"
          title="Generar Carta Responsiva"
        >
          <FileText size={16} />
        </button>
        {canEdit && (
          <>
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
            >
              Editar
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
            >
              Eliminar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EquipmentCard;
