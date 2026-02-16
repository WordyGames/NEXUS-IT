import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject
} from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Sube un archivo a Firebase Storage
 * @param file Archivo a subir
 * @param path Ruta en storage (ej: tickets/123/archivo.pdf)
 * @returns URL pública del archivo
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Elimina un archivo de Firebase Storage
 * @param path Ruta del archivo a eliminar
 */
export const deleteFile = async (path: string): Promise<void> => {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Obtiene la URL pública de un archivo
 * @param path Ruta del archivo
 * @returns URL pública
 */
export const getFileURL = async (path: string): Promise<string> => {
  try {
    const fileRef = ref(storage, path);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
};

/**
 * Genera una ruta segura para guardar archivos
 * Formato: {type}/{entityId}/{timestamp}-{filename}
 * @param type Tipo (tickets, maintenances, etc)
 * @param entityId ID de la entidad
 * @param filename Nombre del archivo
 * @returns Ruta para storage
 */
export const generateStoragePath = (
  type: 'tickets' | 'maintenances' | 'equipment' | 'attachments',
  entityId: string,
  filename: string
): string => {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${type}/${entityId}/${timestamp}-${sanitizedFilename}`;
};

/**
 * Valida que el archivo sea válido
 * @param file Archivo a validar
 * @param maxSizeMB Tamaño máximo en MB
 * @returns true si es válido
 */
export const validateFile = (
  file: File,
  maxSizeMB: number = 10,
  allowedTypes?: string[]
): { valid: boolean; error?: string } => {
  // Validar tamaño
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `El archivo es muy grande. Máximo ${maxSizeMB}MB`
    };
  }

  // Validar tipo
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Formatea el tamaño de archivo a formato legible
 * @param bytes Tamaño en bytes
 * @returns String formateado
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
