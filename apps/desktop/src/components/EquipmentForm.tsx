import React, { useState, useEffect, useMemo } from 'react';
import {
  Equipment, 
  Company, 
  getUsers, 
  User,
  triggerEquipmentNotifications,
  uploadFile,
  generateStoragePath,
  validateFile,
  formatFileSize,
  Attachment,
  deleteFile,
  resolveAttachmentStoragePath
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { Upload, X } from 'lucide-react';

interface EquipmentFormProps {
  equipment: Equipment | null;
  onSubmit: (data: any) => Promise<string | void>;
  onCancel: () => void;
}

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'object' && 'toDate' in value) return value.toDate();
  return new Date();
};

const formatDateForInput = (date: any): string => {
  if (!date) return '';
  const d = toDate(date);
  return d.toISOString().split('T')[0];
};

const generateEntityId = (existingId?: string): string => {
  if (existingId) return existingId;
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `equipment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getAttachmentKey = (attachment: Attachment): string => {
  return attachment.storagePath || attachment.url || attachment.id;
};

const SERIAL_NUMBER_REGEX = /^[A-Za-z0-9._/-]+$/;

const sanitizeText = (value: string): string => value.trim();

const EquipmentForm = ({ equipment, onSubmit, onCancel }: EquipmentFormProps) => {
  const { userData } = useAuth();
  const { showToast } = useUiFeedback();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [isPortableMode, setIsPortableMode] = useState(false);
  const [autoDetectAttempted, setAutoDetectAttempted] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(equipment?.attachments || []);
  const [pendingDeleteAttachments, setPendingDeleteAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [entityId] = useState<string>(() => generateEntityId(equipment?.id));
  const initialAttachmentKeys = useMemo(
    () => new Set((equipment?.attachments || []).map(getAttachmentKey)),
    [equipment?.attachments]
  );
  const [formData, setFormData] = useState({
    company: equipment?.company || Company.GRUPO_AMEX,
    name: equipment?.name || '',
    type: equipment?.type || 'desktop',
    location: equipment?.location || '',
    status: equipment?.status || 'active',
    assignedTo: equipment?.assignedTo || '',
    purchaseDate: equipment?.purchaseDate ? formatDateForInput(equipment.purchaseDate) : '',
    warrantyExpiration: equipment?.warrantyExpiration ? formatDateForInput(equipment.warrantyExpiration) : '',
    specs: {
      cpu: equipment?.specs?.cpu || '',
      gpu: equipment?.specs?.gpu || '',
      ram: equipment?.specs?.ram || '',
      storage: equipment?.specs?.storage || '',
      os: equipment?.specs?.os || '',
      hostname: equipment?.specs?.hostname || '',
      serialNumber: equipment?.specs?.serialNumber || '',
      imei: equipment?.specs?.imei || '',
      phoneNumber: equipment?.specs?.phoneNumber || '',
      googleAccountEmail: equipment?.specs?.googleAccountEmail || '',
      googleAccountPassword: equipment?.specs?.googleAccountPassword || '',
      ipAddress: equipment?.specs?.ipAddress || '',
      macAddress: equipment?.specs?.macAddress || '',
      model: equipment?.specs?.model || '',
      manufacturer: equipment?.specs?.manufacturer || ''
    }
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const loadRuntimeContext = async () => {
      try {
        const context = await window.electron?.getRuntimeContext?.();
        setIsPortableMode(Boolean(context?.isPortableMode));
      } catch (error) {
        console.error('Error loading runtime context:', error);
        setIsPortableMode(false);
      }
    };

    void loadRuntimeContext();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const isInitialAttachment = (attachment: Attachment): boolean => {
    return initialAttachmentKeys.has(getAttachmentKey(attachment));
  };

  const cleanupAttachmentsFromStorage = async (attachmentsToDelete: Attachment[]) => {
    if (attachmentsToDelete.length === 0) return;

    const deletions = attachmentsToDelete.map(async (attachment) => {
      const storagePath = resolveAttachmentStoragePath(attachment);
      if (!storagePath) return;
      await deleteFile(storagePath);
    });

    const results = await Promise.allSettled(deletions);
    const failedDeletes = results.filter((result) => result.status === 'rejected');
    if (failedDeletes.length > 0) {
      console.error(`Error deleting ${failedDeletes.length} equipment attachment(s) from storage`);
    }
  };

  const handleDetectSpecs = async (isAutomatic = false) => {
    setDetecting(true);
    try {
      // Verificar que estamos en Electron
      const detectSystemSpecs = window.electron?.detectSystemSpecs;
      if (!detectSystemSpecs) {
        throw new Error('Esta función solo está disponible en la aplicación desktop de Electron');
      }

      const specs = await detectSystemSpecs();
      
      // Actualizar specs y también el nombre del equipo con el modelo si está disponible
      setFormData((prev) => ({
        ...prev,
        name: specs.model || prev.name,
        specs: {
          ...prev.specs,
          ...specs
        }
      }));
      showToast({
        type: isAutomatic ? 'info' : 'success',
        title: isAutomatic ? 'Modo USB detectado' : 'Especificaciones detectadas',
        message: isAutomatic
          ? 'Se detectaron automaticamente las especificaciones del equipo'
          : 'La informacion del equipo se detecto correctamente'
      });
    } catch (error: any) {
      console.error('Error detectando specs:', error);
      if (!isAutomatic) {
        showToast({
          type: 'error',
          title: 'Error al detectar especificaciones',
          message: error.message || 'No se pudieron detectar las especificaciones'
        });
      }
    } finally {
      setDetecting(false);
    }
  };

  const hasDetectedSpecs = useMemo(() => {
    const specs = formData.specs;
    return Boolean(
      specs.cpu ||
      specs.gpu ||
      specs.ram ||
      specs.storage ||
      specs.os ||
      specs.hostname ||
      specs.serialNumber ||
      specs.model ||
      specs.manufacturer
    );
  }, [formData.specs]);

  useEffect(() => {
    const canAutoDetectType = formData.type === 'desktop' || formData.type === 'laptop';

    if (equipment) return;
    if (!isPortableMode) return;
    if (!canAutoDetectType) return;
    if (autoDetectAttempted) return;
    if (hasDetectedSpecs) {
      setAutoDetectAttempted(true);
      return;
    }

    setAutoDetectAttempted(true);
    void handleDetectSpecs(true);
  }, [equipment, isPortableMode, formData.type, autoDetectAttempted, hasDetectedSpecs]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userData) return;

    setUploading(true);
    try {
      const file = e.target.files[0];
      const validation = validateFile(file, 5, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);
      
      if (!validation.valid) {
        showToast({
          type: 'warning',
          title: 'Archivo no valido',
          message: validation.error || 'Selecciona una imagen valida'
        });
        return;
      }

      const storagePath = generateStoragePath('equipment', entityId, file.name);
      const downloadURL = await uploadFile(file, storagePath);

      const newAttachment: Attachment = {
        id: Date.now().toString(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        url: downloadURL,
        storagePath,
        uploadedBy: userData.id,
        uploadedByName: userData.name,
        createdAt: new Date()
      };

      setAttachments([newAttachment]); // Solo 1 foto principal
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast({
        type: 'error',
        title: 'Error al subir foto',
        message: 'No se pudo subir la foto del equipo'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (attachments.length === 0) return;

    const [attachmentToRemove] = attachments;
    setAttachments([]);

    if (isInitialAttachment(attachmentToRemove)) {
      setPendingDeleteAttachments((prev) => {
        const key = getAttachmentKey(attachmentToRemove);
        if (prev.some((attachment) => getAttachmentKey(attachment) === key)) {
          return prev;
        }
        return [...prev, attachmentToRemove];
      });
      return;
    }

    await cleanupAttachmentsFromStorage([attachmentToRemove]);
  };

  const handleCancel = async () => {
    const transientAttachments = attachments.filter((attachment) => !isInitialAttachment(attachment));
    await cleanupAttachmentsFromStorage(transientAttachments);
    onCancel();
  };

  // Determinar qué campos mostrar según el tipo
  const getFieldsForType = () => {
    const baseFields = ['name', 'company', 'type', 'location', 'status', 'assignedTo', 'purchaseDate', 'warrantyExpiration'];
    
    switch (formData.type) {
      case 'desktop':
      case 'laptop':
        return [...baseFields, 'specs.manufacturer', 'specs.model', 'specs.cpu', 'specs.gpu', 'specs.ram', 'specs.storage', 'specs.os', 'specs.hostname', 'specs.serialNumber'];
      case 'server':
        return [...baseFields, 'specs.manufacturer', 'specs.model', 'specs.cpu', 'specs.ram', 'specs.storage', 'specs.os', 'specs.hostname', 'specs.ipAddress', 'specs.serialNumber'];
      case 'phone':
        return [...baseFields, 'specs.manufacturer', 'specs.model', 'specs.os', 'specs.ram', 'specs.storage', 'specs.serialNumber', 'specs.imei', 'specs.phoneNumber', 'specs.googleAccountEmail', 'specs.googleAccountPassword'];
      case 'printer':
        return [...baseFields, 'specs.manufacturer', 'specs.model', 'specs.serialNumber', 'specs.ipAddress'];
      case 'router':
      case 'switch':
        return [...baseFields, 'specs.manufacturer', 'specs.model', 'specs.ipAddress', 'specs.macAddress'];
      default:
        return baseFields;
    }
  };

  const visibleFields = getFieldsForType();

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('specs.')) {
      const specField = field.split('.')[1];
      setFormData({
        ...formData,
        specs: { ...formData.specs, [specField]: value }
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = sanitizeText(formData.name);
    const normalizedLocation = sanitizeText(formData.location);
    const normalizedSpecs = Object.fromEntries(
      Object.entries(formData.specs).map(([key, value]) => [key, sanitizeText(value || '')])
    ) as typeof formData.specs;

    if (!normalizedName) {
      showToast({
        type: 'warning',
        title: 'Nombre requerido',
        message: 'Captura el nombre del equipo'
      });
      return;
    }

    if (!normalizedLocation) {
      showToast({
        type: 'warning',
        title: 'Ubicacion requerida',
        message: 'Captura la ubicacion del equipo'
      });
      return;
    }

    if (normalizedSpecs.serialNumber && !SERIAL_NUMBER_REGEX.test(normalizedSpecs.serialNumber)) {
      showToast({
        type: 'warning',
        title: 'Serial invalido',
        message: 'El numero serial solo puede incluir letras, numeros, punto, guion, diagonal y guion bajo'
      });
      return;
    }

    const purchaseDateValue = formData.purchaseDate ? new Date(formData.purchaseDate) : undefined;
    const warrantyDateValue = formData.warrantyExpiration ? new Date(formData.warrantyExpiration) : undefined;

    if (purchaseDateValue && Number.isNaN(purchaseDateValue.getTime())) {
      showToast({
        type: 'warning',
        title: 'Fecha de compra invalida',
        message: 'Revisa la fecha de compra antes de guardar'
      });
      return;
    }

    if (warrantyDateValue && Number.isNaN(warrantyDateValue.getTime())) {
      showToast({
        type: 'warning',
        title: 'Fecha de garantia invalida',
        message: 'Revisa la fecha de vencimiento de garantia'
      });
      return;
    }

    if (purchaseDateValue && warrantyDateValue && warrantyDateValue < purchaseDateValue) {
      showToast({
        type: 'warning',
        title: 'Fechas inconsistentes',
        message: 'La garantia no puede vencer antes de la fecha de compra'
      });
      return;
    }

    setLoading(true);
    try {
      const submitData: any = {
        ...formData,
        name: normalizedName,
        location: normalizedLocation,
        specs: normalizedSpecs,
        attachments, // Incluir fotos/archivos
        purchaseDate: purchaseDateValue,
        warrantyExpiration: warrantyDateValue
      };

      if (!equipment) {
        submitData.id = entityId;
      }
      
      const persistedEquipmentId = await onSubmit(submitData);
      const finalEquipmentId = equipment?.id || persistedEquipmentId || entityId;
      
      // Generar notificación de garantía si aplica
      if (formData.company) {
        const equipmentData = {
          ...submitData,
          id: finalEquipmentId,
          company: formData.company as Company,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userData?.id || 'system',
          status: formData.status as 'active' | 'inactive' | 'maintenance' | 'retired'
        } as Equipment;
        
        await triggerEquipmentNotifications(equipmentData);
      }

      await cleanupAttachmentsFromStorage(pendingDeleteAttachments);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (fieldName: string) => {
    const specField = fieldName.startsWith('specs.') ? fieldName.split('.')[1] : null;
    const value = specField ? formData.specs[specField as keyof typeof formData.specs] : (formData[fieldName as keyof typeof formData] as any);
    const label = getFieldLabel(fieldName);

    return (
      <div key={fieldName}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        {fieldName === 'company' && (
          <select
            value={value}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            aria-label="Empresa"
            required
          >
            {Object.values(Company).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {fieldName === 'type' && (
          <select
            value={value}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            aria-label="Tipo"
            required
          >
            <option value="desktop">Desktop</option>
            <option value="laptop">Laptop</option>
            <option value="phone">Teléfono</option>
            <option value="server">Servidor</option>
            <option value="printer">Impresora</option>
            <option value="router">Router</option>
            <option value="switch">Switch</option>
            <option value="other">Otro</option>
          </select>
        )}
        {fieldName === 'status' && (
          <select
            value={value}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            aria-label="Estado"
            required
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="retired">Retirado</option>
          </select>
        )}
        {fieldName === 'assignedTo' && (
          <select
            value={value}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            aria-label="Asignar a"
          >
            <option value="">Sin asignar</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.username})
              </option>
            ))}
          </select>
        )}
        {['purchaseDate', 'warrantyExpiration'].includes(fieldName) && (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            aria-label={label}
          />
        )}
        {!['company', 'type', 'status', 'assignedTo', 'purchaseDate', 'warrantyExpiration'].includes(fieldName) && (
          <input
            type={fieldName === 'specs.googleAccountPassword' ? 'password' : 'text'}
            value={value || ''}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            aria-label={label}
            required={['name', 'location'].includes(fieldName)}
          />
        )}
      </div>
    );
  };

  const getFieldLabel = (fieldName: string): string => {
    const labels: { [key: string]: string } = {
      name: 'Nombre *',
      company: 'Empresa *',
      type: 'Tipo *',
      location: 'Ubicación *',
      status: 'Estado *',
      assignedTo: 'Asignar a',
      purchaseDate: 'Fecha de Compra',
      warrantyExpiration: 'Fecha de Vencimiento de Garantía',
      'specs.cpu': 'CPU',
      'specs.gpu': 'GPU',
      'specs.ram': 'RAM',
      'specs.storage': 'Storage / ROM',
      'specs.os': 'Sistema Operativo',
      'specs.hostname': 'Hostname',
      'specs.serialNumber': 'Número Serial',
      'specs.imei': 'IMEI',
      'specs.phoneNumber': 'Teléfono',
      'specs.googleAccountEmail': 'Cuenta Google (correo)',
      'specs.googleAccountPassword': 'Clave de Cuenta Google',
      'specs.ipAddress': 'Dirección IP',
      'specs.macAddress': 'Dirección MAC',
      'specs.model': 'Modelo',
      'specs.manufacturer': 'Fabricante'
    };
    return labels[fieldName] || fieldName;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {equipment ? 'Editar Equipo' : 'Nuevo Equipo'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Tipo: <span className="font-semibold capitalize">{formData.type}</span>
        </p>

        {/* Botón para detectar specs automáticamente */}
        {(formData.type === 'desktop' || formData.type === 'laptop') && window.electron?.detectSystemSpecs && (
          <div className="mb-4">
            {isPortableMode && !equipment && (
              <p className="text-xs text-blue-600 dark:text-blue-300 mb-2 text-center">
                Modo USB activo: la detección se ejecuta automáticamente al crear el equipo.
              </p>
            )}
            <button
              type="button"
              onClick={() => { void handleDetectSpecs(); }}
              disabled={detecting}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {detecting ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  Detectando especificaciones...
                </>
              ) : (
                <>
                  🔍 Detectar Especificaciones Automáticamente
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              Detecta CPU, GPU, RAM, Storage, OS, Hostname, Serial Number, Modelo y Fabricante
            </p>
          </div>
        )}

        {/* Foto del equipo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Foto del Equipo
          </label>
          
          {attachments.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                disabled={uploading}
                className="hidden"
                id="equipment-photo"
              />
              <label
                htmlFor="equipment-photo"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload size={32} className={uploading ? 'text-gray-400' : 'text-blue-500'} />
                <div className="text-sm">
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {uploading ? 'Subiendo foto...' : 'Tomar foto o seleccionar imagen'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    JPG, PNG o WEBP. Máximo 5MB
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={attachments[0].url}
                alt="Foto del equipo"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => { void handleRemovePhoto(); }}
                title="Eliminar foto"
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
              >
                <X size={16} />
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {attachments[0].fileName} ({formatFileSize(attachments[0].fileSize)})
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {visibleFields.map((field) => (
              <div key={field} className={field === 'location' || field === 'assignedTo' ? 'col-span-2' : ''}>
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => { void handleCancel(); }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipmentForm;
