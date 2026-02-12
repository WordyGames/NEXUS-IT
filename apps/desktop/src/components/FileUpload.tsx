import React, { useState } from 'react';
import { Upload, X, Download, File as FileIcon, Image } from 'lucide-react';
import { Attachment, uploadFile, generateStoragePath, validateFile, formatFileSize } from '@nexus-it/shared';

interface FileUploadProps {
  entityId: string;
  entityType: 'tickets' | 'maintenances';
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  userId: string;
  userName: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  entityId,
  entityType,
  attachments,
  onAttachmentsChange,
  maxFiles = 10,
  maxSizeMB = 10,
  userId,
  userName
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ [key: string]: string }>({});
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFiles = async (files: FileList) => {
    if (attachments.length >= maxFiles) {
      alert(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        if (attachments.length + i >= maxFiles) {
          alert(`Solo puedo agregar ${maxFiles - attachments.length} más`);
          break;
        }

        const file = files[i];
        
        // Validar archivo
        const validation = validateFile(file, maxSizeMB);
        if (!validation.valid) {
          alert(`${file.name}: ${validation.error}`);
          continue;
        }

        // Generar ruta y subir
        const storagePath = generateStoragePath(entityType, entityId, file.name);
        const downloadURL = await uploadFile(file, storagePath);

        // Crear objeto attachment
        const newAttachment: Attachment = {
          id: Date.now().toString(),
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          url: downloadURL,
          uploadedBy: userId,
          uploadedByName: userName,
          createdAt: new Date()
        };

        // Agregar preview si es imagen
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreview(prev => ({
              ...prev,
              [newAttachment.id]: e.target?.result as string
            }));
          };
          reader.readAsDataURL(file);
        }

        onAttachmentsChange([...attachments, newAttachment]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error al subir archivos');
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleRemove = (attachmentId: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== attachmentId));
    setPreview(prev => {
      const newPreview = { ...prev };
      delete newPreview[attachmentId];
      return newPreview;
    });
  };

  const isImage = (fileType: string) => fileType.startsWith('image/');

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
        }`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          disabled={uploading || attachments.length >= maxFiles}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload
            size={32}
            className={uploading ? 'text-gray-400' : 'text-blue-500'}
          />
          <div className="text-sm">
            <p className="font-medium text-gray-700 dark:text-gray-300">
              {uploading ? 'Subiendo...' : 'Arrastra archivos aquí o haz clic'}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              Máximo {maxSizeMB}MB por archivo, {maxFiles - attachments.length} restante
            </p>
          </div>
        </label>
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Adjuntos ({attachments.length}/{maxFiles})
          </h4>
          
          {/* Image Gallery */}
          {attachments.some(a => isImage(a.fileType)) && (
            <div className="grid grid-cols-3 gap-2">
              {attachments
                .filter(a => isImage(a.fileType))
                .map(attachment => (
                  <div
                    key={attachment.id}
                    className="relative bg-gray-100 dark:bg-gray-700 rounded overflow-hidden group"
                  >
                    {preview[attachment.id] && (
                      <img
                        src={preview[attachment.id]}
                        alt={attachment.fileName}
                        className="w-full h-24 object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 bg-blue-500 rounded text-white"
                        title="Descargar"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        onClick={() => handleRemove(attachment.id)}
                        className="p-1 bg-red-500 rounded text-white"
                        title="Eliminar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* File List */}
          <div className="space-y-1">
            {attachments
              .filter(a => !isImage(a.fileType))
              .map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileIcon size={16} className="text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-gray-700 dark:text-gray-300">
                        {attachment.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                      title="Descargar"
                    >
                      <Download size={16} />
                    </a>
                    <button
                      onClick={() => handleRemove(attachment.id)}
                      className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      title="Eliminar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Uploaded By Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {attachments.length > 0 && `Subidos por: ${attachments[0].uploadedByName}`}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
