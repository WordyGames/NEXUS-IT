import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  markSupportChatAsReadByAdmin,
  markSupportChatAsReadByUser,
  sendSupportChatMessage,
  subscribeSupportChatMessages,
  subscribeSupportChatThreads,
  SupportChatMessage,
  SupportChatSender,
  SupportChatThread
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

const toDate = (value: unknown): Date => {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const withToDate = value as { toDate: () => Date };
    return withToDate.toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const withSeconds = value as { seconds: number };
    return new Date(withSeconds.seconds * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const Chat: React.FC = () => {
  const { userData, isAdmin } = useAuth();
  const { showToast } = useUiFeedback();
  const [mode, setMode] = useState<'my' | 'admin'>(isAdmin ? 'admin' : 'my');
  const [threads, setThreads] = useState<SupportChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canUseChat = useMemo(() => Boolean(userData?.id && userData?.name), [userData?.id, userData?.name]);

  const isAdminInboxMode = isAdmin && mode === 'admin';
  const filteredThreads = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return threads.filter((thread) => {
      const matchesUnread = !showUnreadOnly || thread.hasUnreadForAdmin;

      if (!normalizedSearch) {
        return matchesUnread;
      }

      const searchTarget = `${thread.userName} ${thread.lastMessage || ''}`.toLowerCase();
      return matchesUnread && searchTarget.includes(normalizedSearch);
    });
  }, [threads, searchQuery, showUnreadOnly]);

  const selectedThread = useMemo(
    () => filteredThreads.find((thread) => thread.userId === selectedThreadId) || null,
    [filteredThreads, selectedThreadId]
  );

  const activeChatUserId = isAdminInboxMode ? selectedThread?.userId : userData?.id;
  const activeChatUserName = isAdminInboxMode ? selectedThread?.userName : userData?.name;

  useEffect(() => {
    if (!isAdmin && mode === 'admin') {
      setMode('my');
    }
  }, [isAdmin, mode]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = subscribeSupportChatThreads(
      (rows) => {
        setThreads(rows);
      },
      {
        onError: () => {
          showToast({
            type: 'error',
            title: 'Inbox no disponible',
            message: 'No se pudieron cargar los chats de usuarios.'
          });
        }
      }
    );

    return () => unsubscribe();
  }, [isAdmin, showToast]);

  useEffect(() => {
    if (!isAdminInboxMode) return;

    if (filteredThreads.length === 0) {
      if (selectedThreadId !== null) {
        setSelectedThreadId(null);
      }
      return;
    }

    const selectedIsVisible = filteredThreads.some((thread) => thread.userId === selectedThreadId);
    if (!selectedIsVisible) {
      setSelectedThreadId(filteredThreads[0]?.userId || null);
    }
  }, [filteredThreads, isAdminInboxMode, selectedThreadId]);

  useEffect(() => {
    if (!activeChatUserId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeSupportChatMessages(
      activeChatUserId,
      (rows) => {
        setMessages(rows);
        setLoading(false);

        if (isAdminInboxMode) {
          void markSupportChatAsReadByAdmin(activeChatUserId);
        } else {
          void markSupportChatAsReadByUser(activeChatUserId);
        }
      },
      {
        onError: () => {
          setLoading(false);
          showToast({
            type: 'error',
            title: 'No se pudo cargar la conversación',
            message: 'Intenta nuevamente en unos segundos.'
          });
        }
      }
    );

    return () => unsubscribe();
  }, [activeChatUserId, isAdminInboxMode, showToast]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUseChat || sending || !activeChatUserId || !activeChatUserName) return;

    const trimmedText = text.trim();
    if (!trimmedText) {
      showToast({
        type: 'warning',
        title: 'Mensaje vacío',
        message: 'Escribe un mensaje antes de enviarlo.'
      });
      return;
    }

    try {
      setSending(true);
      await sendSupportChatMessage({
        userId: activeChatUserId,
        userName: activeChatUserName,
        text: trimmedText,
        sender: isAdminInboxMode ? SupportChatSender.AGENT : SupportChatSender.USER,
        senderName: userData?.name || userData?.username || 'Soporte'
      });
      setText('');
    } catch (error: any) {
      console.error('Error sending support chat message:', error);
      showToast({
        type: 'error',
        title: 'No se pudo enviar el mensaje',
        message: error?.message || 'Intenta nuevamente.'
      });
    } finally {
      setSending(false);
    }
  };

  const renderConversation = () => {
    if (!activeChatUserId || !activeChatUserName) {
      return (
        <div className="h-full flex items-center justify-center text-center p-6">
          <div>
            <p className="text-3xl mb-2">📭</p>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Selecciona un chat para comenzar</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAdminInboxMode ? `Conversación de ${activeChatUserName}` : `Soporte NEXUS IT · ${activeChatUserName}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Cargando conversación...</p>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <p className="text-4xl mb-2">💬</p>
                <p className="text-gray-600 dark:text-gray-300 font-medium">Aún no hay mensajes</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = isAdminInboxMode
                ? message.sender === SupportChatSender.AGENT
                : message.sender === SupportChatSender.USER;

              const bubbleLabel = message.senderName
                || (message.sender === SupportChatSender.USER ? message.userName : 'Soporte');

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                    }`}
                  >
                    <p className={`text-[11px] mb-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {bubbleLabel}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    <p
                      className={`text-[11px] mt-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {toDate(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2"
        >
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={isAdminInboxMode ? 'Responder a este usuario...' : 'Escribe tu mensaje aquí...'}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!canUseChat || sending}
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!canUseChat || sending}
            className="px-5 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Chat de Soporte</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Conversación en tiempo real. Cada usuario mantiene su chat individual.
        </p>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'my'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'
            }`}
          >
            Mi chat
          </button>
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'
            }`}
          >
            Inbox soporte
            {threads.some((thread) => thread.hasUnreadForAdmin) && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[11px] bg-red-500 text-white">
                {threads.filter((thread) => thread.hasUnreadForAdmin).length}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 min-h-[450px] border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isAdminInboxMode ? (
          <div className="h-full grid grid-cols-12">
            <aside className="col-span-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por usuario o mensaje..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowUnreadOnly((prev) => !prev)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                    showUnreadOnly
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {showUnreadOnly ? 'Mostrando: solo no leídos' : 'Mostrar solo no leídos'}
                </button>
              </div>

              {threads.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No hay conversaciones aún.</div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No hay resultados con ese filtro.</div>
              ) : (
                filteredThreads.map((thread) => {
                  const isActive = thread.userId === selectedThreadId;
                  return (
                    <button
                      key={thread.userId}
                      type="button"
                      onClick={() => setSelectedThreadId(thread.userId)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{thread.userName}</p>
                        {thread.hasUnreadForAdmin && (
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {thread.lastMessage || 'Sin mensajes'}
                      </p>
                    </button>
                  );
                })
              )}
            </aside>

            <section className="col-span-8 h-full flex flex-col">{renderConversation()}</section>
          </div>
        ) : (
          <div className="h-full flex flex-col">{renderConversation()}</div>
        )}
      </div>
    </div>
  );
};

export default Chat;
