import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';

export interface DetectedMobilePayload {
  name: string;
  location: string;
  notes?: string;
  specs: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    imei?: string;
    phoneNumber?: string;
    googleAccountEmail?: string;
    os?: string;
    hostname?: string;
    ram?: string;
    cpu?: string;
    storage?: string;
  };
}

const formatBytes = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return '';
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;

  if (bytes >= gb) return `${(bytes / gb).toFixed(1)} GB`;
  if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
  return `${(bytes / kb).toFixed(1)} KB`;
};

const deviceTypeLabel = (deviceType: Device.DeviceType | null): string => {
  switch (deviceType) {
    case Device.DeviceType.PHONE:
      return 'Teléfono';
    case Device.DeviceType.TABLET:
      return 'Tablet';
    case Device.DeviceType.TV:
      return 'TV';
    case Device.DeviceType.DESKTOP:
      return 'Desktop';
    default:
      return 'No identificado';
  }
};

export const detectCurrentMobileDevice = async (): Promise<DetectedMobilePayload> => {
  let serialNumber = '';

  if (Platform.OS === 'android') {
    serialNumber = Application.getAndroidId() || '';
  } else if (Platform.OS === 'ios') {
    serialNumber = (await Application.getIosIdForVendorAsync()) || '';
  }

  let totalStorageBytes: number | null = null;
  let freeStorageBytes: number | null = null;
  try {
    totalStorageBytes = await FileSystem.getTotalDiskCapacityAsync();
    freeStorageBytes = await FileSystem.getFreeDiskStorageAsync();
  } catch (error) {
    console.warn('No fue posible detectar almacenamiento del dispositivo:', error);
  }

  const dynamicDeviceType = await Device.getDeviceTypeAsync().catch(() => Device.deviceType || null);
  const manufacturer = Device.manufacturer || Device.brand || '';
  const model = Device.modelName || Device.designName || 'Dispositivo móvil';
  const os = [Device.osName, Device.osVersion].filter(Boolean).join(' ');
  const hostname = Device.deviceName || [manufacturer, model].filter(Boolean).join(' ');
  const cpu = Device.supportedCpuArchitectures?.join(', ') || '';
  const ram = formatBytes(Device.totalMemory);
  const totalStorage = formatBytes(totalStorageBytes);
  const freeStorage = formatBytes(freeStorageBytes);
  const storage = totalStorage
    ? `${totalStorage}${freeStorage ? ` (Libre ${freeStorage})` : ''}`
    : '';
  const location = Device.isDevice ? 'Móvil corporativo' : 'Simulador / pruebas';

  const notesLines = [
    `Tipo de dispositivo: ${deviceTypeLabel(dynamicDeviceType)}`,
    Device.brand ? `Marca comercial: ${Device.brand}` : '',
    Device.modelId ? `Modelo interno: ${Device.modelId}` : '',
    Device.designName ? `Diseño interno: ${Device.designName}` : '',
    Device.productName ? `Producto: ${Device.productName}` : '',
    Device.osBuildId ? `OS Build: ${Device.osBuildId}` : '',
    Device.osInternalBuildId ? `OS Internal Build: ${Device.osInternalBuildId}` : '',
    Device.platformApiLevel ? `API Android: ${Device.platformApiLevel}` : '',
    Device.deviceYearClass ? `Device Year Class: ${Device.deviceYearClass}` : '',
    Application.applicationId ? `App ID: ${Application.applicationId}` : '',
    Application.nativeApplicationVersion
      ? `Version app: ${Application.nativeApplicationVersion}`
      : '',
    Application.nativeBuildVersion
      ? `Build app: ${Application.nativeBuildVersion}`
      : ''
  ].filter(Boolean);

  return {
    name: model,
    location,
    notes: notesLines.join('\n'),
    specs: {
      manufacturer,
      model,
      serialNumber,
      os,
      hostname,
      ram,
      cpu,
      storage
    }
  };
};
