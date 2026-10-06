import { useState } from 'react';
import Avatar from './Avatar';
import { IconClose, IconCompose, IconLogout } from './icons';
import { formatListTime } from '../lib/time';
import { chatTitle } from '../lib/chats';
import { normalizePhone, validatePhone } from '../lib/phone';

function NewChatForm({ onCreate, onCancel }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const digits = normalizePhone(phone);
    const problem = validatePhone(digits);
    if (problem) return setError(problem);
    setError('');
    setLoading(true);
    try {
      await onCreate(digits);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="new-chat" onSubmit={handleSubmit} noValidate>
      <label className="new-chat__label" htmlFor="new-chat-phone">Номер получателя</label>
      <div className="new-chat__row">
        <input id="new-chat-phone" className="field__input" type="tel" inputMode="tel" placeholder="+7 999 123-45-67"
          value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus
          onKeyDown={(e) => e.key === 'Escape' && onCancel()} />
        <button className="btn btn--primary btn--compact" type="submit" disabled={loading}>
          {loading ? '…' : 'Создать'}
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

export default function Sidebar({ chats, activeChatId, onSelect, onCreateChat, onLogout, online, idInstance }) {
  const [creating, setCreating] = useState(false);

  async function handleCreate(phone) {
    await onCreateChat(phone);
    setCreating(false);
  }

  return (
    <aside className="sidebar" aria-label="Список чатов">
      <header className="sidebar__header">
        <div>
          <h1 className="sidebar__title">Чаты</h1>
          <p className={`conn${online ? '' : ' conn--off'}`}>
            {online ? `Инстанс ${idInstance}` : 'Подключение…'}
          </p>
        </div>
        <div className="sidebar__actions">
          <button className="icon-btn" onClick={() => setCreating((v) => !v)}
            aria-label={creating ? 'Закрыть' : 'Новый чат'} title={creating ? 'Закрыть' : 'Новый чат'} aria-expanded={creating}>
            {creating ? <IconClose /> : <IconCompose />}
          </button>
          <button className="icon-btn" onClick={onLogout} aria-label="Выйти" title="Выйти"><IconLogout /></button>
        </div>
      </header>

      {creating && <NewChatForm onCreate={handleCreate} onCancel={() => setCreating(false)} />}

      {chats.length === 0 ? (
        <div className="sidebar__empty">
          <p>Здесь появятся ваши чаты.</p>
          {!creating && <button className="btn btn--primary" onClick={() => setCreating(true)}>Новый чат</button>}
        </div>
      ) : (
        <ul className="chat-list">
          {chats.map((chat) => {
            const last = chat.messages.at(-1);
            const title = chatTitle(chat);
            return (
              <li key={chat.chatId}>
                <button className={`chat-item${chat.chatId === activeChatId ? ' chat-item--active' : ''}`}
                  onClick={() => onSelect(chat.chatId)} aria-current={chat.chatId === activeChatId ? 'true' : undefined}>
                  <Avatar id={chat.chatId} title={title} />
                  <span className="chat-item__body">
                    <span className="chat-item__top">
                      <span className="chat-item__name">{title}</span>
                      {last && <time className="chat-item__time">{formatListTime(last.ts)}</time>}
                    </span>
                    <span className="chat-item__preview">
                      {last ? `${last.out ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
