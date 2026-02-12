import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  Company,
  getTickets,
  createTicket,
  updateTicket
} from '@nexus-it/shared';
import TicketForm from '../components/TicketForm';
import TicketDetail from '../components/TicketDetail';
import { Download } from 'lucide-react';
import { exportTicketsToExcel } from '../utils/exportToExcel';

const Tickets = () => {
  const { userData, isAdmin } = useAuth();
  const { id: ticketIdFromUrl } = useParams<{ id: string }>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<Company | ''>('');

  useEffect(() => {
    loadTickets();
  }, [companyFilter, isAdmin, userData?.id]);

  useEffect(() => {
    // Si viene un ID de ticket en la URL, abrirlo automáticamente
    if (ticketIdFromUrl && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketIdFromUrl);
      if (ticket) {
        handleOpenDetail(ticket);
      }
    }
  }, [ticketIdFromUrl, tickets]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (isAdmin && companyFilter) {
        filters.company = companyFilter;
      }
      if (!isAdmin && userData?.id) {
        filters.createdBy = userData.id;
      }
      const data = await getTickets(Object.keys(filters).length ? filters : undefined);
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (data: any) => {
    try {
      if (!userData?.id) {
        alert('Error: Usuario no autenticado');
        return;
      }

      await createTicket({
        ...data,
        createdBy: userData.id,
        createdByName: userData.name
      });

      setShowForm(false);
      await loadTickets();
    } catch (error: any) {
      alert(error.message || 'Error al crear ticket');
    }
  };

  const handleOpenDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedTicket(null);
  };

  const priorityColors: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: 'bg-gray-100 text-gray-800',
    [TicketPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
    [TicketPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [TicketPriority.URGENT]: 'bg-red-100 text-red-800'
  };

  const statusColors: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'bg-green-100 text-green-800',
    [TicketStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
    [TicketStatus.RESOLVED]: 'bg-blue-100 text-blue-800',
    [TicketStatus.CLOSED]: 'bg-gray-100 text-gray-800',
    [TicketStatus.CANCELLED]: 'bg-red-100 text-red-800'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Tickets
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de soporte técnico
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <select
              aria-label="Filtrar por empresa"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as Company | '')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todas las empresas</option>
              {Object.values(Company).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => exportTicketsToExcel(tickets, 'tickets')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            disabled={tickets.length === 0}
          >
            <Download size={18} />
            Exportar Excel
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            + Nuevo Ticket
          </button>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No hay tickets registrados
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Prioridad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Creado por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    onClick={() => handleOpenDetail(ticket)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {ticket.ticketNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        {ticket.title}
                        {ticket.comments && ticket.comments.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {ticket.comments.length} 💬
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {ticket.createdByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <TicketForm
          ticket={selectedTicket}
          onSubmit={handleCreateTicket}
          onCancel={() => {
            setShowForm(false);
            setSelectedTicket(null);
          }}
          userName={userData?.name || 'Usuario'}
        />
      )}

      {/* Modal de detalle */}
      {showDetail && selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          onClose={handleCloseDetail}
          onUpdate={loadTickets}
          currentUserId={userData?.id || ''}
          currentUserName={userData?.name || 'Usuario'}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

export default Tickets;
