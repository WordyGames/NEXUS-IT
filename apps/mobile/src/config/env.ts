const readExpoPublicEnv = (key: string): string | undefined => {
  const raw = process.env[key as keyof NodeJS.ProcessEnv];
  if (!raw) {
    return undefined;
  }

  const value = raw.trim();
  return value.length > 0 ? value : undefined;
};

export const mobileEnv = {
  apiBaseUrl:
    readExpoPublicEnv('EXPO_PUBLIC_API_BASE_URL') ??
    'https://nexus-it-wordygames-projects.vercel.app',
  adminEmail: readExpoPublicEnv('EXPO_PUBLIC_ADMIN_EMAIL'),
};

export const assertMobileNotificationEnv = (): void => {
  if (!mobileEnv.adminEmail) {
    throw new Error(
      'Falta EXPO_PUBLIC_ADMIN_EMAIL. Configúralo en apps/mobile/.env para habilitar correos de confirmación.'
    );
  }
};
