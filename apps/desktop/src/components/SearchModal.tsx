import React, { useState, useEffect } from 'react';
import { Search, X, Loader } from 'lucide-react';
import { Equipment, Ticket, Maintenance, globalSearch, SearchResult, saveSearchHistory } from '@nexus-it/shared';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEquipment?: (equipment: Equipment) => void;
  onSelectTicket?: (ticket: Ticket) => void;
  onSelectMaintenance?: (maintenance: Maintenance) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectEquipment,
  onSelectTicket,
  onSelectMaintenance
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSearch = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await globalSearch(query);
        setResults(searchResults);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    saveSearchHistory(query);

    switch (result.type) {
      case 'equipment':
        onSelectEquipment?.(result.data as Equipment);
        break;
      case 'ticket':
        onSelectTicket?.(result.data as Ticket);
        break;
      case 'maintenance':
        onSelectMaintenance?.(result.data as Maintenance);
        break;
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="flex items-start justify-center pt-20">
        <div className="w-full max-w-2xl">
          {/* Search Input */}
          <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-lg p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Search size={24} className="text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Busca equipos, tickets, mantenimientos..."
                className="flex-1 outline-none bg-transparent text-lg text-gray-900 dark:text-white"
              />
              <button
                onClick={onClose}
                aria-label="Cerrar búsqueda"
                title="Cerrar"
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-lg max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader size={24} className="animate-spin text-blue-500" />
              </div>
            )}

            {!loading && results.length === 0 && query.length > 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No se encontraron resultados para "{query}"
              </div>
            )}

            {!loading && results.length === 0 && query.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Empieza a escribir para buscar...
              </div>
            )}

            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelectResult(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                  selectedIndex === index
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {getTypeLabel(result.type)}
                      </span>
                      {result.status && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {result.status}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {highlightMatch(result.title, query)}
                    </h3>

                    {/* Subtitle */}
                    {result.subtitle && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                        {result.subtitle}
                      </p>
                    )}

                    {/* Company */}
                    {result.company && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {result.company}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Results Count */}
            {!loading && results.length > 0 && (
              <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Keyboard Hints */}
          <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded mx-1">
              ↑↓ Navegar
            </span>
            <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded mx-1">
              ⏎ Seleccionar
            </span>
            <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded mx-1">
              Esc Cerrar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    equipment: '🖥️ Equipo',
    ticket: '🎫 Ticket',
    maintenance: '🔧 Mantenimiento',
    user: '👤 Usuario'
  };
  return labels[type] || type;
};

const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export default SearchModal;
