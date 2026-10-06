import { useCallback, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import { createGreenApiClient } from '../api/greenApi';
import { useNotifications } from '../hooks/useNotifications';
import { useStoredState } from '../hooks/useStoredState';
import { addMessage, applyStatus, sortedChats, updateMessage, upsertChat } from '../lib/chats';

export default function Messenger({ credentials, onLogout }) {
  const client = useMemo(() => createGreenApiClient(credentials), [credentials]);
  const [chats, setChats] = useStoredState(`max-chat:chats:${credentials.idInstance}`, {});
  const [activeChatId, setActiveChatId] = useState(null);
  const [online, setOnline] = useState(true);

  // Входящие уведомления: новые сообщения и статусы отправленных
  const handleNotification = useCallback((event) => {
    setChats((prev) => {
      if (event.kind === 'message') {
        return addMessage(prev, event.chatId, event.message, { name: event.chatName, phone: event.phone });
      }
      return applyStatus(prev, event.chatId, event.id, event.status);
    });
  }, [setChats]);

  useNotifications(client, handleNotification, setOnline);

  async function handleCreateChat(phone) {
    const { exist, chatId } = await client.checkAccount(phone);
    if (!exist || !chatId) throw new Error('У этого номера нет аккаунта MAX');
    setChats((prev) => upsertChat(prev, { chatId: String(chatId), phone }));
    setActiveChatId(String(chatId));
  }

  async function deliver(chatId, localId, text) {
    try {
      const { idMessage } = await client.sendMessage(chatId, text);
      setChats((prev) => {
        const msg = prev[chatId]?.messages.find((m) => m.localId === localId);
        // статус мог уже обновиться уведомлением — не понижаем его
        const status = msg?.status && msg.status !== 'sending' ? msg.status : 'sent';
        return updateMessage(prev, chatId, localId, { id: idMessage, status });
      });
    } catch (err) {
      console.warn('sendMessage failed:', err);
      setChats((prev) => updateMessage(prev, chatId, localId, { status: 'failed' }));
    }
  }

  function handleSend(text) {
    const chatId = activeChatId;
    const localId = crypto.randomUUID();
    setChats((prev) => addMessage(prev, chatId, { localId, text, out: true, ts: Date.now(), status: 'sending' }));
    deliver(chatId, localId, text);
  }

  function handleRetry(message) {
    setChats((prev) => updateMessage(prev, activeChatId, message.localId, { status: 'sending' }));
    deliver(activeChatId, message.localId, message.text);
  }

  const list = sortedChats(chats);
  const activeChat = activeChatId ? chats[activeChatId] : null;

  return (
    <div className={`app${activeChat ? ' app--chat-open' : ''}`}>
      <Sidebar chats={list} activeChatId={activeChatId} onSelect={setActiveChatId} onCreateChat={handleCreateChat}
        onLogout={onLogout} online={online} idInstance={credentials.idInstance} />
      {activeChat ? (
        <ChatWindow key={activeChat.chatId} chat={activeChat} onSend={handleSend} onRetry={handleRetry}
          onBack={() => setActiveChatId(null)} />
      ) : (
        <section className="placeholder">
          <p>Выберите чат или создайте новый по номеру телефона</p>
        </section>
      )}
    </div>
  );
}
