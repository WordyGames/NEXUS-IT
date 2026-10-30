/**
 * Variante para React Native (Metro la elige sobre env.ts).
 * Hermes no soporta `import.meta`, así que aquí solo se lee process.env;
 * apps/mobile/src/polyfills.ts copia ahí las variables EXPO_PUBLIC_*.
 */
export function readEnv(...keys: string[]): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    for (const k of keys) {
      if (process.env[k] != null && process.env[k] !== '') return String(process.env[k]);
    }
  }
  return undefined;
}

export function requireEnv(label: string, ...keys: string[]): string {
  const v = readEnv(...keys);
  if (!v) {
    throw new Error(
      `[nexus-it] Falta la variable de entorno para "${label}". ` +
      `Define alguna de: ${keys.join(', ')} en el archivo .env correspondiente.`
    );
  }
  return v;
}
