import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
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

const ChatScreen = () => {
  const { userData, isAdmin } = useAuth();
  const [mode, setMode] = useState<'my' | 'admin'>(isAdmin ? 'admin' : 'my');
  const [threads, setThreads] = useState<SupportChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  const canUseChat = Boolean(userData?.id && userData?.name);
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
          Alert.alert('Error', 'No se pudieron cargar los chats de usuarios.');
        }
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

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
          Alert.alert('Error', 'No se pudo cargar la conversación.');
        }
      }
    );

    return () => unsubscribe();
  }, [activeChatUserId, isAdminInboxMode]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSend = async () => {
    if (!canUseChat || sending || !activeChatUserId || !activeChatUserName) return;

    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Mensaje vacío', 'Escribe un mensaje antes de enviarlo.');
      return;
    }

    try {
      setSending(true);
      await sendSupportChatMessage({
        userId: activeChatUserId,
        userName: activeChatUserName,
        text: trimmed,
        sender: isAdminInboxMode ? SupportChatSender.AGENT : SupportChatSender.USER,
        senderName: userData?.name || userData?.username || 'Soporte'
      });
      setText('');
    } catch (error: any) {
      console.error('Error sending mobile support chat message:', error);
      Alert.alert('Error', error?.message || 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const renderMessages = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.centerText}>Cargando conversación...</Text>
        </View>
      );
    }

    if (!activeChatUserId || !activeChatUserName) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.centerIcon}>📭</Text>
          <Text style={styles.centerText}>Selecciona un chat para comenzar</Text>
        </View>
      );
    }

    if (messages.length === 0) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.centerIcon}>💬</Text>
          <Text style={styles.centerText}>Aún no hay mensajes</Text>
        </View>
      );
    }

    return (
      <ScrollView ref={scrollRef} style={styles.messagesScroll} contentContainerStyle={styles.messagesContent}>
        {messages.map((message) => {
          const isOwn = isAdminInboxMode
            ? message.sender === SupportChatSender.AGENT
            : message.sender === SupportChatSender.USER;

          const senderLabel = message.senderName
            || (message.sender === SupportChatSender.USER ? message.userName : 'Soporte');

          return (
            <View key={message.id} style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
              <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
                <Text style={[styles.senderLabel, isOwn ? styles.senderLabelOwn : styles.senderLabelOther]}>
                  {senderLabel}
                </Text>
                <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
                  {message.text}
                </Text>
                <Text style={[styles.messageTime, isOwn ? styles.messageTimeOwn : styles.messageTimeOther]}>
                  {toDate(message.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat de Soporte</Text>
      <Text style={styles.subtitle}>Tiempo real y conversación individual por usuario.</Text>

      {isAdmin && (
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'my' ? styles.modeButtonActive : styles.modeButtonInactive]}
            onPress={() => setMode('my')}
          >
            <Text style={[styles.modeButtonText, mode === 'my' && styles.modeButtonTextActive]}>Mi chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'admin' ? styles.modeButtonActive : styles.modeButtonInactive]}
            onPress={() => setMode('admin')}
          >
            <Text style={[styles.modeButtonText, mode === 'admin' && styles.modeButtonTextActive]}>
              Inbox soporte ({threads.filter((thread) => thread.hasUnreadForAdmin).length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.chatCard}>
        {isAdminInboxMode ? (
          <View style={styles.adminLayout}>
            <View style={styles.threadColumn}>
              <View style={styles.threadFiltersContainer}>
                <TextInput
                  style={styles.threadSearchInput}
                  placeholder="Buscar usuario o mensaje..."
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                  style={[styles.unreadFilterButton, showUnreadOnly && styles.unreadFilterButtonActive]}
                  onPress={() => setShowUnreadOnly((prev) => !prev)}
                >
                  <Text style={[styles.unreadFilterButtonText, showUnreadOnly && styles.unreadFilterButtonTextActive]}>
                    {showUnreadOnly ? 'Solo no leídos' : 'Mostrar no leídos'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.threadColumnContent}>
              {threads.length === 0 ? (
                <Text style={styles.threadEmpty}>Sin conversaciones.</Text>
              ) : filteredThreads.length === 0 ? (
                <Text style={styles.threadEmpty}>Sin resultados con ese filtro.</Text>
              ) : (
                filteredThreads.map((thread) => {
                  const isSelected = selectedThreadId === thread.userId;
                  return (
                    <TouchableOpacity
                      key={thread.userId}
                      style={[styles.threadItem, isSelected && styles.threadItemSelected]}
                      onPress={() => setSelectedThreadId(thread.userId)}
                    >
                      <View style={styles.threadRowTop}>
                        <Text style={styles.threadName} numberOfLines={1}>{thread.userName}</Text>
                        {thread.hasUnreadForAdmin && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.threadLastMessage} numberOfLines={1}>
                        {thread.lastMessage || 'Sin mensajes'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
              </ScrollView>
            </View>

            <View style={styles.conversationColumn}>
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationHeaderText} numberOfLines={1}>
                  {selectedThread ? `Conversación: ${selectedThread.userName}` : 'Selecciona una conversación'}
                </Text>
              </View>

              <View style={styles.messagesWrapper}>{renderMessages()}</View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Responder a este usuario..."
                  placeholderTextColor="#9ca3af"
                  value={text}
                  onChangeText={setText}
                  editable={canUseChat && !sending && Boolean(activeChatUserId)}
                  maxLength={2000}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!canUseChat || sending || !activeChatUserId) && styles.sendButtonDisabled]}
                  onPress={() => { void handleSend(); }}
                  disabled={!canUseChat || sending || !activeChatUserId}
                >
                  <Text style={styles.sendButtonText}>{sending ? '...' : 'Enviar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationHeaderText} numberOfLines={1}>
                Soporte NEXUS IT · {userData?.name || 'Usuario'}
              </Text>
            </View>

            <View style={styles.messagesWrapper}>{renderMessages()}</View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Escribe tu mensaje aquí..."
                placeholderTextColor="#9ca3af"
                value={text}
                onChangeText={setText}
                editable={canUseChat && !sending}
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!canUseChat || sending) && styles.sendButtonDisabled]}
                onPress={() => { void handleSend(); }}
                disabled={!canUseChat || sending}
              >
                <Text style={styles.sendButtonText}>{sending ? '...' : 'Enviar'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
    gap: 10
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827'
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280'
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8
  },
  modeButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1
  },
  modeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  modeButtonInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db'
  },
  modeButtonText: {
    color: '#374151',
    fontWeight: '600'
  },
  modeButtonTextActive: {
    color: '#ffffff'
  },
  chatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden'
  },
  adminLayout: {
    flex: 1,
    flexDirection: 'row'
  },
  threadColumn: {
    width: '38%',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#f9fafb'
  },
  threadFiltersContainer: {
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff'
  },
  threadSearchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#ffffff'
  },
  unreadFilterButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10
  },
  unreadFilterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  unreadFilterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center'
  },
  unreadFilterButtonTextActive: {
    color: '#ffffff'
  },
  threadColumnContent: {
    paddingBottom: 10
  },
  threadEmpty: {
    padding: 12,
    color: '#6b7280'
  },
  threadItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7'
  },
  threadItemSelected: {
    backgroundColor: '#eff6ff'
  },
  threadRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6
  },
  threadName: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '700'
  },
  threadLastMessage: {
    marginTop: 3,
    color: '#6b7280',
    fontSize: 12
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444'
  },
  conversationColumn: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  conversationHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  conversationHeaderText: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '600'
  },
  messagesWrapper: {
    flex: 1
  },
  messagesScroll: {
    flex: 1
  },
  messagesContent: {
    padding: 10,
    gap: 8
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12
  },
  centerIcon: {
    fontSize: 28
  },
  centerText: {
    color: '#6b7280',
    textAlign: 'center'
  },
  messageRow: {
    width: '100%'
  },
  messageRowOwn: {
    alignItems: 'flex-end'
  },
  messageRowOther: {
    alignItems: 'flex-start'
  },
  messageBubble: {
    maxWidth: '84%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  messageBubbleOwn: {
    backgroundColor: '#2563eb'
  },
  messageBubbleOther: {
    backgroundColor: '#f3f4f6'
  },
  senderLabel: {
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '700'
  },
  senderLabelOwn: {
    color: '#dbeafe'
  },
  senderLabelOther: {
    color: '#6b7280'
  },
  messageText: {
    fontSize: 14
  },
  messageTextOwn: {
    color: '#ffffff'
  },
  messageTextOther: {
    color: '#111827'
  },
  messageTime: {
    marginTop: 4,
    fontSize: 10
  },
  messageTimeOwn: {
    color: '#dbeafe'
  },
  messageTimeOther: {
    color: '#6b7280'
  },
  inputRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#ffffff'
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  sendButtonDisabled: {
    opacity: 0.6
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});

export default ChatScreen;
