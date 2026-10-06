const sameDay = (a, b) => a.toDateString() === b.toDateString();

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/** Время в списке чатов: сегодня — часы, иначе — дата. */
export function formatListTime(ts) {
  const d = new Date(ts);
  return sameDay(d, new Date()) ? formatTime(ts) : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function formatDayLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Сегодня';
  if (sameDay(d, yesterday)) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export function isSameDay(a, b) {
  return sameDay(new Date(a), new Date(b));
}
