type MaintenanceEmailPayload = {
  recipientEmail: string;
  recipientName?: string;
  maintenanceId: string;
  equipmentName: string;
  company: string;
  title: string;
  scheduledDate: string;
  assignedToName?: string;
  createdByName?: string;
};

const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_URL?.trim();
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '');
  }

  return '';
};

export const sendMaintenanceSavedEmail = async ({
  recipientEmail,
  recipientName,
  maintenanceId,
  equipmentName,
  company,
  title,
  scheduledDate,
  assignedToName,
  createdByName
}: MaintenanceEmailPayload): Promise<void> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl || ''}/api/notifications/maintenance-saved-email`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipientEmail,
      recipientName,
      maintenanceId,
      equipmentName,
      company,
      title,
      scheduledDate,
      assignedToName,
      createdByName
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Failed to send maintenance email (${response.status})`);
  }
};