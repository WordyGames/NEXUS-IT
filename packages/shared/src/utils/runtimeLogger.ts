export type RuntimePlatform = 'desktop' | 'mobile' | 'shared';

interface RuntimeErrorPayload {
  platform: RuntimePlatform;
  label: string;
  message: string;
  stack?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

const normalizeError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Error no serializable' };
  }
};

export const logRuntimeError = (
  platform: RuntimePlatform,
  label: string,
  error: unknown,
  meta?: Record<string, unknown>
): void => {
  const normalized = normalizeError(error);

  const payload: RuntimeErrorPayload = {
    platform,
    label,
    message: normalized.message,
    stack: normalized.stack,
    meta,
    timestamp: new Date().toISOString(),
  };

  console.error(`[${platform}] ${label}`, payload);
};

let webHandlersInstalled = false;

export const installWebGlobalErrorHandlers = (platform: RuntimePlatform = 'desktop'): void => {
  if (webHandlersInstalled || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    logRuntimeError(platform, 'Unhandled error event', event.error || event.message, {
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logRuntimeError(platform, 'Unhandled promise rejection', event.reason);
  });

  webHandlersInstalled = true;
};
