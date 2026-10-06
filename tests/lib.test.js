import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizePhone, validatePhone, formatPhone } from '../src/lib/phone';
import { parseNotification } from '../src/lib/notifications';
import { addMessage, applyStatus, sortedChats, upsertChat } from '../src/lib/chats';
import { createGreenApiClient, guessApiUrl } from '../src/api/greenApi';

describe('phone', () => {
  it('нормализует номер РФ из разных форматов', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567');
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567');
  });
  it('валидирует РФ и РБ', () => {
    expect(validatePhone('79991234567')).toBeNull();
    expect(validatePhone('375291234567')).toBeNull();
    expect(validatePhone('12345')).toMatch(/РФ/);
    expect(validatePhone('')).toMatch(/Введите/);
  });
  it('форматирует', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67');
  });
});

const incoming = {
  typeWebhook: 'incomingMessageReceived',
  idMessage: 'in-1',
  timestamp: 1763115112,
  senderData: { chatId: '10000000', chatType: 'user', senderName: 'Иван', senderPhoneNumber: 79876543210 },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
};

describe('parseNotification', () => {
  it('разбирает входящее текстовое сообщение', () => {
    expect(parseNotification(incoming)).toEqual({
      kind: 'message', chatId: '10000000', chatName: 'Иван', phone: '79876543210',
      message: { id: 'in-1', text: 'Привет', out: false, ts: 1763115112000 },
    });
  });
  it('разбирает extendedTextMessage', () => {
    const n = { ...incoming, messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://max.ru' } } };
    expect(parseNotification(n).message.text).toBe('https://max.ru');
  });
  it('игнорирует не-текст и групповые чаты', () => {
    expect(parseNotification({ ...incoming, messageData: { typeMessage: 'imageMessage' } })).toBeNull();
    expect(parseNotification({ ...incoming, senderData: { ...incoming.senderData, chatType: 'group' } })).toBeNull();
    expect(parseNotification({ typeWebhook: 'stateInstanceChanged' })).toBeNull();
  });
  it('сообщение с телефона — исходящее', () => {
    expect(parseNotification({ ...incoming, typeWebhook: 'outgoingMessageReceived' }).message.out).toBe(true);
  });
  it('статус', () => {
    expect(parseNotification({ typeWebhook: 'outgoingMessageStatus', chatId: '1', idMessage: 'x', status: 'read' }))
      .toEqual({ kind: 'status', chatId: '1', id: 'x', status: 'read' });
  });
  it('noAccount — сообщение не отправлено', () => {
    expect(parseNotification({ typeWebhook: 'outgoingMessageStatus', chatId: '1', idMessage: 'x', status: 'noAccount' }).status)
      .toBe('failed');
  });
});

describe('chats', () => {
  it('не дублирует сообщения с одинаковым id', () => {
    let s = addMessage({}, '1', { id: 'a', text: 'x', out: false, ts: 1 });
    s = addMessage(s, '1', { id: 'a', text: 'x', out: false, ts: 1 });
    expect(s['1'].messages).toHaveLength(1);
  });
  it('склеивает уведомление о нашем сообщении с «отправляющимся»', () => {
    let s = addMessage({}, '1', { localId: 'L', text: 'hi', out: true, ts: 1, status: 'sending' });
    s = addMessage(s, '1', { id: 'srv', text: 'hi', out: true, ts: 2 });
    expect(s['1'].messages).toEqual([{ localId: 'L', text: 'hi', out: true, ts: 1, status: 'sent', id: 'srv' }]);
  });
  it('не откатывает статус назад', () => {
    let s = addMessage({}, '1', { id: 'a', text: 'x', out: true, ts: 1, status: 'read' });
    s = applyStatus(s, '1', 'a', 'delivered');
    expect(s['1'].messages[0].status).toBe('read');
  });
  it('сортирует по последнему сообщению', () => {
    let s = upsertChat({}, { chatId: 'old' });
    s = addMessage(s, 'old', { id: '1', text: 'a', out: false, ts: 1 });
    s = addMessage(s, 'new', { id: '2', text: 'b', out: false, ts: 2 });
    expect(sortedChats(s).map((c) => c.chatId)).toEqual(['new', 'old']);
  });
});

describe('greenApi client', () => {
  afterEach(() => vi.restoreAllMocks());
  const client = createGreenApiClient({ apiUrl: 'https://3100.api.green-api.com/', idInstance: '3100123', apiTokenInstance: 'tok' });

  it('угадывает apiUrl', () => {
    expect(guessApiUrl('3100123456')).toBe('https://3100.api.green-api.com');
    expect(guessApiUrl('ab')).toBe('');
    expect(guessApiUrl('1101000001')).toBe('http://localhost:4010');
  });
  it('sendMessage: правильные URL, метод и тело', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"idMessage":"m1"}'));
    await expect(client.sendMessage('10000000', 'Привет')).resolves.toEqual({ idMessage: 'm1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://3100.api.green-api.com/waInstance3100123/sendMessage/tok');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ chatId: '10000000', message: 'Привет' });
  });
  it('receiveNotification: null когда очередь пуста', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('null'));
    await expect(client.receiveNotification(5)).resolves.toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe('https://3100.api.green-api.com/waInstance3100123/receiveNotification/tok?receiveTimeout=5');
  });
  it('deleteNotification: DELETE с receiptId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"result":true}'));
    await client.deleteNotification(42);
    expect(fetchMock.mock.calls[0][0]).toBe('https://3100.api.green-api.com/waInstance3100123/deleteNotification/tok/42');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
  it('checkAccount: phoneNumber числом', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"exist":true,"chatId":"1"}'));
    await client.checkAccount('79991234567');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ phoneNumber: 79991234567 });
  });
  it('понятная ошибка, если по apiUrl ответил не GREEN-API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<!doctype html><html></html>'));
    await expect(client.getStateInstance()).rejects.toThrow('Проверьте apiUrl');
  });
  it('понятная ошибка при 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    await expect(client.getStateInstance()).rejects.toThrow('Неверный idInstance или apiTokenInstance');
  });
});
