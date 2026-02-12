import React, { useEffect, useState } from 'react';
import { 
  Ticket, 
  TicketPriority, 
  Company, 
  Attachment
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';

interface TicketFormProps {
  ticket: Ticket | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  userName: string;
}

const TicketForm = ({ ticket, onSubmit, onCancel, userName }: TicketFormProps) => {
  const { userData, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(ticket?.attachments || []);
  const [formData, setFormData] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    company: ticket?.company || userData?.company || Company.GRUPO_AMEX,
    priority: ticket?.priority || TicketPriority.MEDIUM
  });
  const isCompanyLocked = !!userData?.company && !isAdmin;

  useEffect(() => {
    if (!ticket && userData?.company && !isAdmin) {
      setFormData((prev) => ({ ...prev, company: userData.company as Company }));
    }
  }, [ticket, userData?.company, isAdmin]);

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('El título es requerido');
      return;
    }
    
    if (!formData.description.trim()) {
      alert('La descripción es requerida');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        attachments
      };
      
      await onSubmit(submitData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {ticket ? 'Editar Ticket' : 'Nuevo Ticket'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Solicitado por: <span className="font-semibold">{userName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Ej: No puedo imprimir documentos"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Describe el problema con detalle..."
              rows={5}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Empresa *
              </label>
              <select
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                aria-label="Empresa"
                disabled={isCompanyLocked}
                title={isCompanyLocked ? 'Empresa asignada por tu perfil' : 'Seleccionar empresa'}
                required
              >
                {Object.values(Company).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioridad *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                aria-label="Prioridad"
                required
              >
                <option value={TicketPriority.LOW}>Baja</option>
                <option value={TicketPriority.MEDIUM}>Media</option>
                <option value={TicketPriority.HIGH}>Alta</option>
                <option value={TicketPriority.URGENT}>Urgente</option>
              </select>
            </div>
          </div>

          {/* Adjuntos */}
          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adjuntos (Fotos, documentos, etc.)
            </h3>
            <FileUpload
              entityId={ticket?.id || 'new'}
              entityType="tickets"
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              userId={userData?.id || ''}
              userName={userName}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Guardando...' : 'Crear Ticket'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketForm;
