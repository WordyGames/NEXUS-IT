import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { Equipment } from '@nexus-it/shared';

interface EquipmentQRCodeProps {
  equipment: Equipment;
  onClose: () => void;
}

const EquipmentQRCode = ({ equipment, onClose }: EquipmentQRCodeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    generateQR();
  }, [equipment]);

  const generateQR = async () => {
    if (!canvasRef.current) return;

    // Datos del equipo en formato JSON para el QR
    const qrData = JSON.stringify({
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      company: equipment.company,
      serialNumber: equipment.specs?.serialNumber,
      hostname: equipment.specs?.hostname,
    });

    try {
      // Generar QR en el canvas
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Guardar como data URL para descarga
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generando QR:', error);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `QR-${equipment.name.replace(/\s/g, '-')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR - ${equipment.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 20px;
              border-radius: 10px;
            }
            h2 { margin: 0 0 10px 0; }
            .info { margin: 10px 0; font-size: 14px; }
            img { margin: 20px 0; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>NEXUS IT</h2>
            <div class="info"><strong>${equipment.name}</strong></div>
            <div class="info">${equipment.company}</div>
            <div class="info">Tipo: ${equipment.type}</div>
            ${equipment.specs?.serialNumber ? `<div class="info">Serial: ${equipment.specs.serialNumber}</div>` : ''}
            ${equipment.specs?.hostname ? `<div class="info">Hostname: ${equipment.specs.hostname}</div>` : ''}
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="info" style="font-size: 12px; color: #666;">
              Escanea para ver detalles completos
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Código QR
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            title="Cerrar"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info del equipo */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              {equipment.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {equipment.company}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
              {equipment.type}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center py-4">
            <canvas
              ref={canvasRef}
              className="border-4 border-gray-200 dark:border-gray-600 rounded-lg"
            />
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
              Escanea este código para ver información completa del equipo
            </p>
          </div>

          {/* Specs rápidas */}
          {(equipment.specs?.serialNumber || equipment.specs?.hostname) && (
            <div className="space-y-1 text-sm">
              {equipment.specs.serialNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Serial:</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {equipment.specs.serialNumber}
                  </span>
                </div>
              )}
              {equipment.specs.hostname && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Hostname:</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {equipment.specs.hostname}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Download size={18} />
              Descargar
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Printer size={18} />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentQRCode;
