/**
 * Минимальный клиент GREEN-API для мессенджера MAX.
 * Документация: https://green-api.com/v3/docs/api/
 *
 * Формат любого запроса:
 *   {apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}
 */

export class GreenApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
  }
}

/**
 * apiUrl зависит от инстанса и показан в личном кабинете GREEN-API.
 * Обычно это https://XXXX.api.green-api.com, где XXXX — первые 4 цифры idInstance.
 */
export const DEMO_ID_INSTANCE = '1101000001';
export const DEMO_API_URL = 'http://localhost:4010';

export function guessApiUrl(idInstance) {
  if (String(idInstance).trim() === DEMO_ID_INSTANCE) return DEMO_API_URL; // локальная заглушка
  const prefix = String(idInstance).trim().slice(0, 4);
  return /^\d{4}$/.test(prefix) ? `https://${prefix}.api.green-api.com` : '';
}

function humanizeStatus(status) {
  if (status === 401 || status === 403) return 'Неверный idInstance или apiTokenInstance';
  if (status === 404) return 'Инстанс не найден. Проверьте idInstance и apiUrl';
  if (status === 429) return 'Слишком много запросов. Подождите немного';
  if (status === 466) return 'Превышен лимит тарифа «Разработчик»';
  if (status >= 500) return 'Сервер GREEN-API временно недоступен';
  return `Ошибка запроса (${status})`;
}

export function createGreenApiClient({ apiUrl, idInstance, apiTokenInstance }) {
  const base = apiUrl.replace(/\/+$/, '');

  async function request(method, { httpMethod = 'GET', body, query, suffix = '', signal } = {}) {
    let url = `${base}/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`;
    if (query) url += `?${new URLSearchParams(query)}`;

    let response;
    try {
      response = await fetch(url, {
        method: httpMethod,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      throw new GreenApiError('Нет соединения с GREEN-API. Проверьте интернет и apiUrl', 0);
    }

    if (!response.ok) throw new GreenApiError(humanizeStatus(response.status), response.status);

    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      // по apiUrl ответил не GREEN-API (например, HTML-страница) — скорее всего, адрес указан неверно
      throw new GreenApiError('Ответ не от GREEN-API. Проверьте apiUrl', response.status);
    }
  }

  return {
    /** Состояние инстанса: authorized, notAuthorized, blocked, starting… */
    getStateInstance: (opts) => request('getStateInstance', opts),

    /** Номер телефона → chatId пользователя MAX. */
    checkAccount: (phoneNumber, opts) =>
      request('checkAccount', { ...opts, httpMethod: 'POST', body: { phoneNumber: Number(phoneNumber) } }),

    /** Отправка текстового сообщения. Возвращает { idMessage }. */
    sendMessage: (chatId, message, opts) =>
      request('sendMessage', { ...opts, httpMethod: 'POST', body: { chatId, message } }),

    /** Long polling: ждёт уведомление до receiveTimeout секунд. Возвращает { receiptId, body } или null. */
    receiveNotification: (receiveTimeout = 5, opts) =>
      request('receiveNotification', { ...opts, query: { receiveTimeout } }),

    /** Удаляет уведомление из очереди, иначе оно будет приходить снова. */
    deleteNotification: (receiptId, opts) =>
      request('deleteNotification', { ...opts, httpMethod: 'DELETE', suffix: `/${receiptId}` }),
  };
}
