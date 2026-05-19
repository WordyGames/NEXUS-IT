import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  Company,
  UserPermission,
  getTickets,
  createTicket,
} from '@nexus-it/shared';
import TicketForm from '../components/TicketForm';
import TicketDetail from '../components/TicketDetail';
import { Download, Plus, ClipboardList } from 'lucide-react';
import { exportTicketsToExcel } from '../utils/exportToExcel';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { getTicketSortValue } from '../utils/dateUtils';
import { Spinner, Card, Button, EmptyState, ticketStatusBadge, priorityBadge } from '../components/ui';

const normalizePriority = (value: unknown): TicketPriority =>
  Object.values(TicketPriority).includes(value as TicketPriority)
    ? (value as TicketPriority)
    : TicketPriority.MEDIUM;

const normalizeStatus = (value: unknown): TicketStatus =>
  Object.values(TicketStatus).includes(value as TicketStatus)
    ? (value as TicketStatus)
    : TicketStatus.OPEN;

const Tickets = () => {
  const { userData, hasPermission } = useAuth();
  const { showToast } = useUiFeedback();
  const canViewAllTickets = hasPermission(UserPermission.TICKETS_VIEW_ALL);
  const canChangeTicketStatus = hasPermission(UserPermission.TICKETS_CHANGE_STATUS);
  const { id: ticketIdFromUrl } = useParams<{ id: string }>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<Company | ''>('');

  useEffect(() => {
    loadTickets();
  }, [companyFilter, canViewAllTickets, userData?.id, userData?.username, userData?.name]);

  useEffect(() => {
    if (ticketIdFromUrl && tickets.length > 0) {
      const ticket = tickets.find((t) => t.id === ticketIdFromUrl);
      if (ticket) handleOpenDetail(ticket);
    }
  }, [ticketIdFromUrl, tickets]);

  const loadUserTickets = async (): Promise<Ticket[]> => {
    if (!userData) return [];
    try {
      const queries: Promise<Ticket[]>[] = [];
      const ids = new Set<string>();
      if (userData.id) ids.add(userData.id);
      if (userData.username) ids.add(userData.username);
      ids.forEach((id) => queries.push(getTickets({ createdBy: id })));
      if (userData.name) queries.push(getTickets({ createdByName: userData.name }));
      if (queries.length === 0) return [];

      const unique = new Map<string, Ticket>();
      (await Promise.all(queries)).flat().forEach((t) => unique.set(t.id, t));
      let merged = Array.from(unique.values());
      if (userData.company) merged = merged.filter((t) => t.company === userData.company);
      merged.sort((a, b) => getTicketSortValue(b) - getTicketSortValue(a));
      return merged;
    } catch {
      return [];
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      if (!canViewAllTickets) {
        setTickets(await loadUserTickets());
        return;
      }
      const filters: any = companyFilter ? { company: companyFilter } : {};
      setTickets(await getTickets(Object.keys(filters).length ? filters : undefined));
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (data: any): Promise<string> => {
    if (!userData?.id) throw new Error('Usuario no autenticado');
    try {
      const createdId = await createTicket({
        ...data,
        createdBy: userData.id,
        createdByName: userData.name
      });
      setShowForm(false);
      await loadTickets();
      showToast({ type: 'success', title: 'Ticket creado', message: 'El ticket se guardó correctamente' });
      return createdId;
    } catch (error: any) {
      showToast({ type: 'error', title: 'Error al crear ticket', message: error.message || 'No se pudo crear el ticket' });
      throw error;
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

  if (loading) return <Spinner size="xl" label="Cargando tickets..." className="h-64 justify-center" />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Tickets</h1>
          <p className="text-sm text-slate-500">Sistema de soporte técnico</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canViewAllTickets && (
            <select
              aria-label="Filtrar por empresa"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as Company | '')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todas las empresas</option>
              {Object.values(Company).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportTicketsToExcel(tickets, 'tickets')}
            disabled={tickets.length === 0}
            iconLeft={<Download size={15} />}
          >
            Exportar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowForm(true)}
            iconLeft={<Plus size={15} />}
          >
            Nuevo Ticket
          </Button>
        </div>
      </div>

      {/* Table */}
      {tickets.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="Sin tickets"
          description="No hay tickets registrados. Crea el primero."
          action={{ label: 'Nuevo Ticket', onClick: () => setShowForm(true) }}
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Número</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Título</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Prioridad</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Creado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tickets.map((ticket) => {
                  const safePriority = normalizePriority((ticket as any).priority);
                  const safeStatus = normalizeStatus((ticket as any).status);
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => handleOpenDetail(ticket)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-700">
                        #{ticket.ticketNumber}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{ticket.title}</span>
                          {ticket.comments && ticket.comments.length > 0 && (
                            <span className="shrink-0 text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full">
                              {ticket.comments.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {priorityBadge(safePriority)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {ticketStatusBadge(safeStatus)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500">
                        {ticket.createdByName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && (
        <TicketForm
          ticket={selectedTicket}
          onSubmit={handleCreateTicket}
          onCancel={() => { setShowForm(false); setSelectedTicket(null); }}
          userName={userData?.name || 'Usuario'}
        />
      )}

      {showDetail && selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          onClose={handleCloseDetail}
          onUpdate={loadTickets}
          currentUserId={userData?.id || ''}
          currentUserName={userData?.name || 'Usuario'}
          canChangeStatus={canChangeTicketStatus}
        />
      )}
    </div>
  );
};

export default Tickets;
