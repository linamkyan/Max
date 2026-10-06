import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { chatTitle } from '../lib/chats';
import { IconBack, IconSend, StatusTicks } from './icons';
import { formatDayLabel, formatTime, isSameDay } from '../lib/time';
import { formatPhone } from '../lib/phone';

const MAX_LENGTH = 4000;

function Composer({ onSend, chatId }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, [chatId]);

  // Поле растёт вместе с текстом, но не больше ~6 строк
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  function submit() {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText('');
  }

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <textarea ref={ref} className="composer__input" rows={1} placeholder="Сообщение" value={text} maxLength={MAX_LENGTH}
        aria-label="Текст сообщения" onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter — отправить, Shift+Enter — новая строка
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
        }} />
      <button className="composer__send" type="submit" disabled={!text.trim()} aria-label="Отправить">
        <IconSend />
      </button>
    </form>
  );
}

export default function ChatWindow({ chat, onSend, onRetry, onBack }) {
  const listRef = useRef(null);
  const title = chatTitle(chat);
  const subtitle = chat.name && chat.phone ? formatPhone(chat.phone) : 'MAX';

  // Прокрутка к последнему сообщению
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.chatId, chat.messages.length]);

  return (
    <section className="chat" aria-label={`Чат: ${title}`}>
      <header className="chat__header">
        <button className="icon-btn chat__back" onClick={onBack} aria-label="Назад к чатам"><IconBack /></button>
        <Avatar id={chat.chatId} title={title} size={40} />
        <div className="chat__heading">
          <h2 className="chat__title">{title}</h2>
          <p className="chat__subtitle">{subtitle}</p>
        </div>
      </header>

      <div className="chat__messages" ref={listRef} role="log" aria-live="polite">
        {chat.messages.length === 0 && (
          <p className="chat__empty">Напишите первое сообщение — ответ появится здесь</p>
        )}
        {chat.messages.map((m, i) => {
          const prev = chat.messages[i - 1];
          const showDay = !prev || !isSameDay(prev.ts, m.ts);
          const grouped = prev && prev.out === m.out && !showDay;
          return (
            <Fragment key={m.localId ?? m.id}>
              {showDay && <div className="day"><span>{formatDayLabel(m.ts)}</span></div>}
              <div className={`bubble ${m.out ? 'bubble--out' : 'bubble--in'}${grouped ? ' bubble--grouped' : ''}`}>
                <span className="bubble__text">{m.text}</span>
                <span className="bubble__meta">
                  <time>{formatTime(m.ts)}</time>
                  {m.out && <StatusTicks status={m.status ?? 'sent'} />}
                </span>
                {m.status === 'failed' && m.localId && (
                  <button className="bubble__retry" onClick={() => onRetry(m)}>Не отправлено. Повторить</button>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>

      <Composer onSend={onSend} chatId={chat.chatId} />
    </section>
  );
}
