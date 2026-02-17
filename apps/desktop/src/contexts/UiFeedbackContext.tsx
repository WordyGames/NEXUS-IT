import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastInput {
  type?: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastInput, 'message'>> {
  id: string;
  type: ToastType;
  title?: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  intent?: 'primary' | 'danger';
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  intent: 'primary' | 'danger';
}

interface UiFeedbackContextType {
  showToast: (toast: ToastInput) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UiFeedbackContext = createContext<UiFeedbackContextType | undefined>(undefined);

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800'
};

const CONFIRM_BUTTON_STYLES: Record<'primary' | 'danger', string> = {
  primary: 'bg-blue-600 hover:bg-blue-700',
  danger: 'bg-red-600 hover:bg-red-700'
};

export const UiFeedbackProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    intent: 'primary'
  });
  const toastCounter = useRef(0);
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);

  const removeToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = `toast-${Date.now()}-${toastCounter.current++}`;
    const durationMs = toast.durationMs ?? 3500;
    const nextToast: ToastItem = {
      id,
      type: toast.type ?? 'info',
      title: toast.title,
      message: toast.message
    };

    setToasts((prev) => [...prev, nextToast]);
    setTimeout(() => removeToast(id), durationMs);
  }, [removeToast]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState({
        open: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        intent: options.intent ?? 'primary'
      });
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    if (confirmResolver.current) {
      confirmResolver.current(result);
      confirmResolver.current = null;
    }
    setConfirmState((prev) => ({ ...prev, open: false }));
  }, []);

  const contextValue = useMemo(() => ({
    showToast,
    confirm
  }), [showToast, confirm]);

  return (
    <UiFeedbackContext.Provider value={contextValue}>
      {children}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-full max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-lg border px-4 py-3 shadow-lg ${TOAST_STYLES[toast.type]}`}
              role="status"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {toast.title && (
                    <p className="font-semibold leading-5">{toast.title}</p>
                  )}
                  <p className="text-sm leading-5 break-words">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-xs font-semibold opacity-70 hover:opacity-100"
                  aria-label="Cerrar notificación"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmState.open && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {confirmState.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {confirmState.message}
              </p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`px-4 py-2 rounded-lg text-white ${CONFIRM_BUTTON_STYLES[confirmState.intent]}`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </UiFeedbackContext.Provider>
  );
};

export const useUiFeedback = () => {
  const context = useContext(UiFeedbackContext);
  if (!context) {
    throw new Error('useUiFeedback must be used within UiFeedbackProvider');
  }
  return context;
};
