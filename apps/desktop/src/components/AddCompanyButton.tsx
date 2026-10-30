import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { addCompany } from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onAdded?: (name: string) => void;
}

/** Botón "+ Nueva empresa" (solo administradores). */
const AddCompanyButton = ({ onAdded }: Props) => {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isAdmin) return null;

  const close = () => { setOpen(false); setName(''); setError(''); };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const created = await addCompany(name);
      onAdded?.(created);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar la empresa');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
        <Plus size={14} /> Nueva empresa
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); void save(); }
            if (e.key === 'Escape') close();
          }}
          placeholder="Nombre de la empresa"
          aria-label="Nombre de la nueva empresa"
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <button type="button" onClick={() => void save()} disabled={busy || name.trim().length < 2}
          className="px-2 py-1 text-xs rounded-lg bg-blue-600 text-white disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={close} className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600">
          Cancelar
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
};

export default AddCompanyButton;
