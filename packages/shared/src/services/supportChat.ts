import { supabase } from '../config/supabase';
import { SupportChatMessage, SupportChatSender, SupportChatThread } from '../types';

export type Unsubscribe = () => void;

const freshChannel = (name: string) => {
  const existing = supabase.getChannels().find(ch => ch.topic === `realtime:${name}`);
  if (existing) supabase.removeChannel(existing);
  return supabase.channel(name);
};

const toDate = (v: string | null | undefined): Date => {
  if (!v) return new Date(0);
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const rowToThread = (row: any): SupportChatThread => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  lastMessage: row.last_message ?? undefined,
  lastSender: row.last_sender as SupportChatSender ?? undefined,
  hasUnreadForUser: row.has_unread_for_user ?? false,
  hasUnreadForAdmin: row.has_unread_for_admin ?? false,
  userLastReadAt: toDate(row.user_last_read_at),
  adminLastReadAt: toDate(row.admin_last_read_at),
  lastMessageAt: toDate(row.last_message_at),
  createdAt: toDate(row.created_at),
  updatedAt: toDate(row.updated_at)
});

const rowToMessage = (row: any): SupportChatMessage => ({
  id: row.id,
  userId: row.user_id ?? '',
  userName: row.user_name ?? '',
  sender: row.sender as SupportChatSender,
  senderName: row.sender_name ?? undefined,
  text: row.text,
  createdAt: toDate(row.created_at)
});

const ensureThread = async (userId: string, userName: string): Promise<string> => {
  const { data: existing } = await supabase
    .from('support_chats')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    await supabase.from('support_chats').update({ user_name: userName }).eq('user_id', userId);
    return existing.id;
  }

  const { data, error } = await supabase.from('support_chats').insert({
    user_id: userId,
    user_name: userName,
    has_unread_for_user: false,
    has_unread_for_admin: false
  }).select('id').single();

  if (error) throw error;
  return data.id;
};

export const getSupportChatThread = async (userId: string): Promise<SupportChatThread | null> => {
  if (!userId?.trim()) throw new Error('userId es requerido para cargar el chat');

  const { data, error } = await supabase
    .from('support_chats')
    .select('*')
    .eq('user_id', userId.trim())
    .single();

  if (error || !data) return null;
  return rowToThread(data);
};

export const subscribeSupportChatThread = (
  userId: string,
  onData: (thread: SupportChatThread | null) => void,
  onError?: (error: unknown) => void
): Unsubscribe => {
  if (!userId?.trim()) throw new Error('userId es requerido para suscribirse al chat');

  const channel = freshChannel(`support_chat_thread_${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_chats', filter: `user_id=eq.${userId}` },
      async () => {
        const thread = await getSupportChatThread(userId);
        onData(thread);
      }
    )
    .subscribe();

  getSupportChatThread(userId).then(onData).catch(onError ?? console.error);

  return () => { supabase.removeChannel(channel); };
};

export const getSupportChatThreads = async (maxItems = 200): Promise<SupportChatThread[]> => {
  const { data, error } = await supabase
    .from('support_chats')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(Math.min(maxItems, 500));

  if (error) throw error;
  return (data ?? []).map(rowToThread);
};

export const subscribeSupportChatThreads = (
  onData: (threads: SupportChatThread[]) => void,
  options?: { maxItems?: number; onError?: (error: unknown) => void }
): Unsubscribe => {
  const channel = freshChannel('support_chat_threads')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_chats' },
      async () => {
        const threads = await getSupportChatThreads(options?.maxItems);
        onData(threads);
      }
    )
    .subscribe();

  getSupportChatThreads(options?.maxItems).then(onData).catch(options?.onError ?? console.error);

  return () => { supabase.removeChannel(channel); };
};

export const getSupportChatMessages = async (userId: string, maxItems = 200): Promise<SupportChatMessage[]> => {
  if (!userId?.trim()) throw new Error('userId es requerido para cargar mensajes de chat');

  const { data: thread } = await supabase
    .from('support_chats')
    .select('id')
    .eq('user_id', userId.trim())
    .single();

  if (!thread) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', thread.id)
    .order('created_at', { ascending: true })
    .limit(Math.min(maxItems, 500));

  if (error) throw error;
  return (data ?? []).map(r => ({ ...rowToMessage(r), userId, userName: '' }));
};

export const subscribeSupportChatMessages = (
  userId: string,
  onData: (messages: SupportChatMessage[]) => void,
  options?: { maxItems?: number; onError?: (error: unknown) => void }
): Unsubscribe => {
  if (!userId?.trim()) throw new Error('userId es requerido para suscribirse a mensajes de chat');

  let chatId: string | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  supabase
    .from('support_chats')
    .select('id')
    .eq('user_id', userId.trim())
    .single()
    .then(({ data }) => {
      if (!data) return;
      chatId = data.id;

      channel = freshChannel(`chat_messages_${chatId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
          async () => {
            const msgs = await getSupportChatMessages(userId, options?.maxItems);
            onData(msgs);
          }
        )
        .subscribe();
    });

  getSupportChatMessages(userId, options?.maxItems).then(onData).catch(options?.onError ?? console.error);

  return () => { if (channel) supabase.removeChannel(channel); };
};

export const sendSupportChatMessage = async (params: {
  userId: string;
  userName: string;
  text: string;
  sender?: SupportChatSender;
  senderName?: string;
}): Promise<string> => {
  const userId = params.userId?.trim();
  const userName = params.userName?.trim();
  const text = params.text?.trim().replace(/\s+/g, ' ');
  const sender = params.sender ?? SupportChatSender.USER;

  if (!userId) throw new Error('userId es requerido para enviar mensajes');
  if (!userName) throw new Error('userName es requerido para enviar mensajes');
  if (!text) throw new Error('No se puede enviar un mensaje vacío');

  const chatId = await ensureThread(userId, userName);

  const { data, error } = await supabase.from('chat_messages').insert({
    chat_id: chatId,
    sender,
    sender_name: params.senderName?.trim() ?? null,
    text,
    user_id: userId,
    user_name: userName
  }).select('id').single();

  if (error) throw error;

  const isUser = sender === SupportChatSender.USER;
  await supabase.from('support_chats').update({
    last_message: text.substring(0, 250),
    last_sender: sender,
    has_unread_for_admin: isUser,
    has_unread_for_user: !isUser,
    last_message_at: new Date().toISOString(),
    ...(isUser ? { user_last_read_at: new Date().toISOString() } : { admin_last_read_at: new Date().toISOString() })
  }).eq('user_id', userId);

  return data.id;
};

export const markSupportChatAsReadByUser = async (userId: string): Promise<void> => {
  if (!userId?.trim()) return;
  await supabase.from('support_chats').update({
    has_unread_for_user: false,
    user_last_read_at: new Date().toISOString()
  }).eq('user_id', userId.trim());
};

export const markSupportChatAsReadByAdmin = async (userId: string): Promise<void> => {
  if (!userId?.trim()) return;
  await supabase.from('support_chats').update({
    has_unread_for_admin: false,
    admin_last_read_at: new Date().toISOString()
  }).eq('user_id', userId.trim());
};

export const getSupportChatUnreadCountForAdmin = async (maxItems = 500): Promise<number> => {
  const { count, error } = await supabase
    .from('support_chats')
    .select('*', { count: 'exact', head: true })
    .eq('has_unread_for_admin', true)
    .limit(maxItems);

  if (error) return 0;
  return count ?? 0;
};

export const getSupportChatHasUnreadForUser = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('support_chats')
    .select('has_unread_for_user')
    .eq('user_id', userId)
    .single();

  return data?.has_unread_for_user ?? false;
};
