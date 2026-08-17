import React, { useState } from 'react';
import { Equipment, User } from '@nexus-it/shared';
import { Button } from './ui';

interface EquipmentLoanModalProps {
  equipment: Equipment;
  users: User[];
  onConfirm: (data: { borrowerId: string; days: number; notes?: string }) => Promise<void>;
  onCancel: () => void;
}

const EquipmentLoanModal = ({ equipment, users, onConfirm, onCancel }: EquipmentLoanModalProps) => {
  const [borrowerId, setBorrowerId] = useState(equipment.assignedTo || '');
  const [days, setDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dueDatePreview = new Date();
  dueDatePreview.setDate(dueDatePreview.getDate() + (Number(days) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerId) {
      setError('Selecciona a quién se le presta el equipo');
      return;
    }
    if (!days || days <= 0) {
      setError('La duración debe ser al menos 1 día');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ borrowerId, days: Number(days), notes: notes.trim() || undefined });
    } catch (err) {
      setError('No se pudo registrar el préstamo');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
          Prestar equipo por días
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {equipment.name} · se generará la carta responsiva de préstamo temporal.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Prestar a
            </label>
            <select
              value={borrowerId}
              onChange={(e) => setBorrowerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un usuario</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}{u.position ? ` — ${u.position}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Duración (días)
            </label>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Se devuelve el {dueDatePreview.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Generando...' : 'Prestar y generar carta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipmentLoanModal;
