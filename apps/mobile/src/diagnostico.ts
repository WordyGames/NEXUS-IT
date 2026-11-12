// TEMPORAL: muestra en pantalla cualquier error de JavaScript en lugar de cerrar la app.
// Debe importarse antes que todo lo demás (primera línea de App.tsx).
import { Alert } from 'react-native';

type Handler = (error: any, isFatal?: boolean) => void;

const errorUtils = (globalThis as any).ErrorUtils;
if (errorUtils?.setGlobalHandler) {
  const previous: Handler | undefined = errorUtils.getGlobalHandler?.();
  let shown = false;
  errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    try {
      if (!shown) {
        shown = true;
        const detail = `${error?.message ?? String(error)}\n\n${String(error?.stack ?? '').slice(0, 700)}`;
        Alert.alert(isFatal ? 'Error fatal NEXUS IT' : 'Error NEXUS IT', detail);
      }
    } catch {
      // sin aviso posible
    }
    if (!isFatal && previous) previous(error, isFatal);
  });
}
