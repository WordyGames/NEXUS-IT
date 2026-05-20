import { supabase } from '../config/supabase';

const BUCKET = 'attachments';

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedError) throw signedError;
    return signedData.signedUrl;
  }

  return data.publicUrl;
};

export const deleteFile = async (path: string): Promise<void> => {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
};

export const getFileURL = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
};

export const generateStoragePath = (
  type: 'tickets' | 'maintenances' | 'equipment' | 'attachments',
  entityId: string,
  filename: string
): string => {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${type}/${entityId}/${timestamp}-${sanitized}`;
};

export const extractStoragePathFromURL = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const marker = `/object/public/${BUCKET}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx !== -1) return decodeURIComponent(parsed.pathname.slice(idx + marker.length));

    const signedMarker = `/object/sign/${BUCKET}/`;
    const signedIdx = parsed.pathname.indexOf(signedMarker);
    if (signedIdx !== -1) return decodeURIComponent(parsed.pathname.slice(signedIdx + signedMarker.length).split('?')[0]);

    return null;
  } catch {
    return null;
  }
};

export const resolveAttachmentStoragePath = (attachment: {
  storagePath?: string;
  url?: string;
}): string | null => {
  if (attachment.storagePath) return attachment.storagePath;
  if (!attachment.url) return null;
  return extractStoragePathFromURL(attachment.url);
};

export const validateFile = (
  file: File,
  maxSizeMB = 10,
  allowedTypes?: string[]
): { valid: boolean; error?: string } => {
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `El archivo es muy grande. Máximo ${maxSizeMB}MB` };
  }
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}` };
  }
  return { valid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
