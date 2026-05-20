import React from 'react';
import { User, Ticket } from '@nexus-it/shared';
import { Monitor, ClipboardList } from 'lucide-react';
import { toDate } from '../utils/dateUtils';
import { StatCard, Card, EmptyState, ticketStatusBadge, priorityBadge } from './ui';

interface Props {
  userData: User | null;
  userEquipment: any[];
  userTicketsCount: number;
  recentTickets: Ticket[];
}

const DashboardUserView: React.FC<Props> = ({ userData, userEquipment, userTicketsCount, recentTickets }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Mi Panel</h1>
        <p className="text-sm text-slate-500">{userData?.company} · Mis equipos y tickets</p>
      </div>
      <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">v2.5</span>
    </div>

    {/* Equipos Asignados */}
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Mis Equipos</h2>
      {userEquipment.length === 0 ? (
        <EmptyState
          title="Sin equipos asignados"
          description="No tienes equipos asignados aún. Contacta al administrador."
          icon={<Monitor size={28} />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userEquipment.map((eq) => (
            <Card key={eq.id} padding="sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-slate-800 text-sm">{eq.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  eq.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {eq.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">Tipo: <span className="capitalize font-medium text-slate-700">{eq.type}</span></p>
              <p className="text-xs text-slate-500">Ubicación: <span className="text-slate-700">{eq.location}</span></p>
              {eq.specs?.cpu && <p className="text-xs text-slate-400 mt-1.5">CPU: {eq.specs.cpu}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>

    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatCard label="Mis Equipos" value={userEquipment.length}  icon={<Monitor size={22} />}      color="blue"   />
      <StatCard label="Mis Tickets" value={userTicketsCount}       icon={<ClipboardList size={22} />} color="purple" />
    </div>

    {/* Tickets Recientes */}
    {recentTickets.length > 0 && (
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Tickets Recientes</h2>
        <Card padding="none">
          <div className="divide-y divide-slate-100">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-2 mb-1">
                  <span className="font-semibold text-slate-700 text-sm">#{ticket.ticketNumber}</span>
                  {ticketStatusBadge(ticket.status)}
                  {priorityBadge(ticket.priority)}
                </div>
                <p className="text-sm font-medium text-slate-800">{ticket.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ticket.description}</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  {ticket.createdAt && toDate(ticket.createdAt).toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )}
  </div>
);

export default DashboardUserView;
