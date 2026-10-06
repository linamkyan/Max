/**
 * Чистые функции для работы со списком чатов.
 * Состояние: { [chatId]: { chatId, phone, name, messages: Message[] } }
 * Message: { id, text, out, ts, status? }  status: sending | sent | delivered | read | failed
 */

import { formatPhone } from './phone';

const STATUS_RANK = { sending: 0, sent: 1, delivered: 2, read: 3 };

export function upsertChat(chats, { chatId, phone, name }) {
  const prev = chats[chatId];
  return {
    ...chats,
    [chatId]: {
      chatId,
      phone: prev?.phone || phone || '',
      name: prev?.name || name || '',
      messages: prev?.messages ?? [],
    },
  };
}

export function addMessage(chats, chatId, message, meta = {}) {
  const withChat = upsertChat(chats, { chatId, ...meta });
  const chat = withChat[chatId];
  if (message.id && chat.messages.some((m) => m.id === message.id)) return chats; // дубль

  // Уведомление о нашем же сообщении может прийти раньше ответа sendMessage —
  // тогда привязываем id к ещё «отправляющемуся» сообщению, а не создаём копию.
  if (message.out && message.id) {
    const pending = chat.messages.findIndex((m) => m.out && !m.id && m.status === 'sending' && m.text === message.text);
    if (pending !== -1) {
      const messages = chat.messages.slice();
      messages[pending] = { ...messages[pending], id: message.id, status: 'sent' };
      return { ...withChat, [chatId]: { ...chat, messages } };
    }
  }

  return { ...withChat, [chatId]: { ...chat, messages: [...chat.messages, message] } };
}

export function updateMessage(chats, chatId, localId, patch) {
  const chat = chats[chatId];
  if (!chat) return chats;
  return {
    ...chats,
    [chatId]: { ...chat, messages: chat.messages.map((m) => (m.localId === localId ? { ...m, ...patch } : m)) },
  };
}

export function applyStatus(chats, chatId, id, status) {
  const chat = chats[chatId];
  if (!chat) return chats;
  let changed = false;
  const messages = chat.messages.map((m) => {
    if (m.id !== id) return m;
    // статусы могут прийти не по порядку — не откатываем «прочитано» обратно в «доставлено»
    if (status !== 'failed' && (STATUS_RANK[status] ?? -1) <= (STATUS_RANK[m.status] ?? -1)) return m;
    changed = true;
    return { ...m, status };
  });
  return changed ? { ...chats, [chatId]: { ...chat, messages } } : chats;
}

export function sortedChats(chats) {
  const last = (c) => c.messages.at(-1)?.ts ?? 0;
  return Object.values(chats).sort((a, b) => last(b) - last(a));
}

export function chatTitle(chat) {
  return chat.name || formatPhone(chat.phone) || `Чат ${chat.chatId}`;
}
