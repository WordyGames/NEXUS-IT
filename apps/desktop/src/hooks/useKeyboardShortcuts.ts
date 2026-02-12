import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutHandlers {
  onNewEquipment?: () => void;
  onSearch?: () => void;
  onClose?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers = {}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si está escribiendo en un input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;

      // Ctrl+N - Nuevo Equipo
      if (e.ctrlKey && e.key === 'n' && !isInput) {
        e.preventDefault();
        if (handlers.onNewEquipment) {
          handlers.onNewEquipment();
        }
      }

      // Ctrl+K o / - Búsqueda Global
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !isInput)) {
        e.preventDefault();
        if (handlers.onSearch) {
          handlers.onSearch();
        }
      }

      // Ctrl+B - Dashboard
      if (e.ctrlKey && e.key === 'b' && !isInput) {
        e.preventDefault();
        navigate('/');
      }

      // ESC - Cerrar modales
      if (e.key === 'Escape') {
        if (handlers.onClose) {
          handlers.onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, navigate]);
};
