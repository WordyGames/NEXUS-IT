import React, { useState } from 'react';
import { Company, DataPlan, DataPlanProvider, Equipment } from '@nexus-it/shared';
import { Button } from './ui';

interface DataPlanFormProps {
  plan: DataPlan | null;
  defaultCompany: Company;
  equipmentOptions: Equipment[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const PROVIDER_LABELS: Record<DataPlanProvider, string> = {
  [DataPlanProvider.TELCEL]: 'Telcel',
  [DataPlanProvider.ATT]: 'AT&T',
  [DataPlanProvider.MOVISTAR]: 'Movistar',
  [DataPlanProvider.UNEFON]: 'Unefon',
  [DataPlanProvider.OTRO]: 'Otro'
};

const inputClass =
  'w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

const DataPlanForm: React.FC<DataPlanFormProps> = ({ plan, defaultCompany, equipmentOptions, onSubmit, onCancel }) => {
  const [company, setCompany] = useState<Company>(plan?.company ?? defaultCompany);
  const [provider, setProvider] = useState<DataPlanProvider>(plan?.provider ?? DataPlanProvider.TELCEL);
  const [providerOther, setProviderOther] = useState(plan?.providerOther ?? '');
  const [phoneNumber, setPhoneNumber] = useState(plan?.phoneNumber ?? '');
  const [planName, setPlanName] = useState(plan?.planName ?? '');
  const [isUnlimited, setIsUnlimited] = useState(plan ? plan.dataLimitGb === undefined : false);
  const [dataLimitGb, setDataLimitGb] = useState<number | ''>(plan?.dataLimitGb ?? '');
  const [monthlyCost, setMonthlyCost] = useState<number | ''>(plan?.monthlyCost ?? '');
  const [billingDay, setBillingDay] = useState<number | ''>(plan?.billingDay ?? '');
  const [equipmentId, setEquipmentId] = useState(plan?.equipmentId ?? '');
  const [status, setStatus] = useState<DataPlan['status']>(plan?.status ?? 'active');
  const [notes, setNotes] = useState(plan?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumber.trim()) {
      setError('Captura el número de línea');
      return;
    }
    if (!planName.trim()) {
      setError('Captura el nombre del plan');
      return;
    }
    if (provider === DataPlanProvider.OTRO && !providerOther.trim()) {
      setError('Especifica el nombre del proveedor');
      return;
    }
    if (monthlyCost === '' || Number(monthlyCost) < 0) {
      setError('Captura un costo mensual válido');
      return;
    }
    if (billingDay === '' || Number(billingDay) < 1 || Number(billingDay) > 31) {
      setError('El día de corte debe ser entre 1 y 31');
      return;
    }
    if (!isUnlimited && (dataLimitGb === '' || Number(dataLimitGb) <= 0)) {
      setError('Captura el límite de datos contratado o marca "Ilimitado"');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        company,
        provider,
        providerOther: provider === DataPlanProvider.OTRO ? providerOther.trim() : undefined,
        phoneNumber: phoneNumber.trim(),
        planName: planName.trim(),
        dataLimitGb: isUnlimited ? undefined : Number(dataLimitGb),
        monthlyCost: Number(monthlyCost),
        billingDay: Number(billingDay),
        equipmentId: equipmentId || undefined,
        status,
        notes: notes.trim() || undefined
      });
    } catch (err) {
      setError('No se pudo guardar el plan de datos');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
          {plan ? 'Editar plan de datos' : 'Nuevo plan de datos'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Registra la línea/plan contratado para monitorear el gasto mensual.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Empresa</label>
            <select value={company} onChange={(e) => setCompany(e.target.value as Company)} className={inputClass}>
              {Object.values(Company).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Proveedor</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value as DataPlanProvider)} className={inputClass}>
                {Object.values(DataPlanProvider).map((p) => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Número de línea</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ej. 6141234567"
                className={inputClass}
              />
            </div>
          </div>

          {provider === DataPlanProvider.OTRO && (
            <div>
              <label className={labelClass}>Nombre del proveedor</label>
              <input
                type="text"
                value={providerOther}
                onChange={(e) => setProviderOther(e.target.value)}
                placeholder="Ej. Virgin Mobile"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Nombre del plan</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Ej. Plan Amigo 20GB, MiFi empresarial..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={labelClass}>Límite de datos (GB)</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                disabled={isUnlimited}
                value={dataLimitGb}
                onChange={(e) => setDataLimitGb(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej. 20"
                className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isUnlimited}
                onChange={(e) => setIsUnlimited(e.target.checked)}
                className="rounded border-slate-300"
              />
              Ilimitado
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Costo mensual (MXN)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={monthlyCost}
                onChange={(e) => setMonthlyCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej. 299"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Día de corte</label>
              <input
                type="number"
                min={1}
                max={31}
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej. 15"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Equipo vinculado (opcional)</label>
            <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} className={inputClass}>
              <option value="">Sin vincular</option>
              {equipmentOptions
                .filter((eq) => eq.company === company)
                .map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.name} ({eq.type})</option>
                ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as DataPlan['status'])} className={inputClass}>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Guardando...' : plan ? 'Guardar cambios' : 'Crear plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DataPlanForm;
