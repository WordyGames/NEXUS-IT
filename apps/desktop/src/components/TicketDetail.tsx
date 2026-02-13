import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority, addTicketComment, updateTicket, triggerTicketStatusChange, triggerTicketComment } from '@nexus-it/shared';
import { MessageCircle, Clock, User, AlertCircle, CheckCircle, X } from 'lucide-react';

interface TicketDetailProps {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: () => void;
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
}

const TicketDetail = ({ ticket, onClose, onUpdate, currentUserId, currentUserName, isAdmin }: TicketDetailProps) => {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      alert('El comentario no puede estar vacío');
      return;
    }

    setLoading(true);
    try {
      await addTicketComment(ticket.id, {
        userId: currentUserId,
        userName: currentUserName,
        text: newComment.trim()
      });
      
      // Generar notificación de comentario
      const excerpt = newComment.trim().substring(0, 50);
      await triggerTicketComment(
        ticket,
        currentUserId,
        currentUserName,
        excerpt
      );
      
      setNewComment('');
      onUpdate();
    } catch (error: any) {
      alert('Error al agregar comentario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (status: TicketStatus) => {
    setLoading(true);
    try {
      const previousStatus = ticket.status;
      
      await updateTicket(ticket.id, { status });
      
      // Agregar comentario automático del cambio de estado
      await addTicketComment(ticket.id, {
        userId: currentUserId,
        userName: currentUserName,
        text: `Estado cambiado a: ${getStatusLabel(status)}`
      });
      
      // Generar notificación de cambio de estado
      const updatedTicket = { ...ticket, status };
      await triggerTicketStatusChange(
        updatedTicket,
        previousStatus,
        currentUserId,
        currentUserName
      );
      
      setNewStatus(status);
      onUpdate();
    } catch (error: any) {
      alert('Error al cambiar estado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: TicketStatus): string => {
    const labels = {
      [TicketStatus.OPEN]: 'Abierto',
      [TicketStatus.IN_PROGRESS]: 'En Progreso',
      [TicketStatus.RESOLVED]: 'Resuelto',
      [TicketStatus.CLOSED]: 'Cerrado',
      [TicketStatus.CANCELLED]: 'Cancelado'
    };
    return labels[status];
  };

  const getPriorityLabel = (priority: TicketPriority): string => {
    const labels = {
      [TicketPriority.LOW]: 'Baja',
      [TicketPriority.MEDIUM]: 'Media',
      [TicketPriority.HIGH]: 'Alta',
      [TicketPriority.URGENT]: 'Urgente'
    };
    return labels[priority];
  };

  const formatDate = (date: any): string => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('es-MX', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusColors: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    [TicketStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    [TicketStatus.RESOLVED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    [TicketStatus.CLOSED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
    [TicketStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
  };

  const priorityColors: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: 'bg-gray-100 text-gray-800',
    [TicketPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
    [TicketPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [TicketPriority.URGENT]: 'bg-red-100 text-red-800'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {ticket.ticketNumber}
                </h2>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[ticket.status]}`}>
                  {getStatusLabel(ticket.status)}
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${priorityColors[ticket.priority]}`}>
                  Prioridad: {getPriorityLabel(ticket.priority)}
                </span>
              </div>
              <h3 className="text-xl text-gray-800 dark:text-white mb-2">
                {ticket.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <User size={16} />
                  <span>{ticket.createdByName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Descripción */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Descripción</h4>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* Cambiar Estado (Solo admin) */}
          {isAdmin && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Cambiar Estado</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.values(TicketStatus).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleChangeStatus(status)}
                    disabled={loading || status === ticket.status}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition
                      ${status === ticket.status 
                        ? statusColors[status] + ' cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
                      }
                      ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comentarios */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <MessageCircle size={20} />
              Comentarios ({ticket.comments?.length || 0})
            </h4>
            
            <div className="space-y-4">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {comment.userName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap ml-10">
                      {comment.text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No hay comentarios aún
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Agregar comentario */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario o actualización..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
              rows={3}
              required
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Enviando...' : 'Agregar Comentario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
