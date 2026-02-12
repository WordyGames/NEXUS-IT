import React, { useState, useEffect } from 'react';
import { Search, X, Monitor, User, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEquipment, getUsers } from '@nexus-it/shared';
import { Equipment, User as UserType } from '@nexus-it/shared';

interface SearchResult {
  type: 'equipment' | 'user';
  id: string;
  title: string;
  subtitle: string;
  data: Equipment | UserType;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchResults: SearchResult[] = [];
        const searchLower = searchTerm.toLowerCase();

        // Buscar equipos
        const allEquipment = await getEquipment({});
        allEquipment.forEach((equipment) => {
          const matches = 
            equipment.name?.toLowerCase().includes(searchLower) ||
            equipment.specs?.hostname?.toLowerCase().includes(searchLower);

          if (matches) {
            searchResults.push({
              type: 'equipment',
              id: equipment.id!,
              title: equipment.name || 'Sin nombre',
              subtitle: `${equipment.company}`,
              data: equipment,
            });
          }
        });

        // Buscar usuarios
        const allUsers = await getUsers();
        allUsers.forEach((user) => {
          const matches = 
            user.name?.toLowerCase().includes(searchLower) ||
            user.department?.toLowerCase().includes(searchLower);

          if (matches) {
            searchResults.push({
              type: 'user',
              id: user.id,
              title: user.name,
              subtitle: `${user.department || 'Sin departamento'}`,
              data: user,
            });
          }
        });

        setResults(searchResults.slice(0, 10)); // Limitar a 10 resultados
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, isOpen]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'equipment') {
      navigate('/equipment');
    } else if (result.type === 'user') {
      navigate('/users');
    }
    onClose();
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'equipment':
        return <Monitor className="w-5 h-5 text-blue-500" />;
      case 'user':
        return <User className="w-5 h-5 text-green-500" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'equipment':
        return 'Equipo';
      case 'user':
        return 'Usuario';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar equipos, usuarios, mantenimientos..."
            className="flex-1 outline-none text-lg"
            autoFocus
          />
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" title="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-gray-500">
              Buscando...
            </div>
          )}

          {!loading && searchTerm.length > 0 && results.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No se encontraron resultados
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left transition-colors"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{result.title}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {getTypeLabel(result.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && searchTerm.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">Comienza a escribir para buscar</p>
              <div className="text-sm space-y-1">
                <p><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">K</kbd> para abrir</p>
                <p><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">ESC</kbd> para cerrar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
