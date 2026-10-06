import { useEffect, useState } from 'react';

/** useState, который переживает перезагрузку страницы (localStorage). */
export function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (!key) return initialValue;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!key) return;
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* приватный режим или переполнение — работаем без сохранения */
    }
  }, [key, value]);

  return [value, setValue];
}
