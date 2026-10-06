import { useEffect, useLayoutEffect, useRef } from 'react';
import { parseNotification } from '../lib/notifications';

const RETRY_DELAY_MS = 3000;

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });

/**
 * Получение сообщений по технологии HTTP API (long polling):
 *   1. receiveNotification ждёт уведомление до 5 секунд;
 *   2. обрабатываем его;
 *   3. обязательно deleteNotification, иначе очередь «застрянет» на нём.
 * https://green-api.com/v3/docs/api/receiving/technology-http-api/
 */
export function useNotifications(client, onNotification, onConnectionChange) {
  // Держим колбэки в ref, чтобы цикл не перезапускался при каждом рендере
  const handlers = useRef({ onNotification, onConnectionChange });
  useLayoutEffect(() => {
    handlers.current = { onNotification, onConnectionChange };
  });

  useEffect(() => {
    if (!client) return undefined;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      while (!signal.aborted) {
        try {
          const notification = await client.receiveNotification(5, { signal });
          handlers.current.onConnectionChange?.(true);
          if (!notification) continue; // за 5 секунд ничего не пришло

          try {
            const parsed = parseNotification(notification.body);
            if (parsed) handlers.current.onNotification(parsed);
          } finally {
            await client.deleteNotification(notification.receiptId, { signal });
          }
        } catch (err) {
          if (signal.aborted) break;
          console.warn('GREEN-API polling error:', err);
          handlers.current.onConnectionChange?.(false);
          await sleep(RETRY_DELAY_MS, signal);
        }
      }
    })();

    return () => controller.abort();
  }, [client]);
}
