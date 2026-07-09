/**
 * Accesor de variables de entorno cross-runtime.
 *
 * - apps/desktop usa Vite  -> import.meta.env.VITE_*
 * - apps/mobile usa Expo   -> process.env.EXPO_PUBLIC_* / process.env.VITE_*
 * - scripts Node           -> process.env.*
 *
 * Lee la primera variable disponible entre las claves indicadas.
 * NO se hardcodean secretos aqui.
 */
export function readEnv(...keys: string[]): string | undefined {
  // Vite / navegador (import.meta.env)
  try {
    // @ts-ignore - import.meta solo existe en bundles ESM (Vite)
    const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
    if (viteEnv) {
      for (const k of keys) {
        if (viteEnv[k] != null && viteEnv[k] !== '') return String(viteEnv[k]);
      }
    }
  } catch {
    // import.meta no soportado en este runtime (ej. CommonJS)
  }

  // Node / Expo (process.env)
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
