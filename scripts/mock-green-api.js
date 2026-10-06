/**
 * Локальная заглушка GREEN-API для разработки и демонстрации без реального аккаунта.
 *
 *   Запускается автоматически вместе с npm run dev (или отдельно: npm run mock) → http://localhost:4010
 *   Вход: idInstance 1101000001, apiTokenInstance demo, apiUrl http://localhost:4010
 *
 * «Получатель» отвечает автоматически через 1.5 с на каждое сообщение.
 * Вручную прислать сообщение: curl -X POST localhost:4010/__incoming -d '{"chatId":"10000001","text":"Привет"}'
 */
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 4010);
const AUTO_REPLY = process.env.AUTO_REPLY !== '0';
const TOKEN = 'demo';

const queue = []; // { receiptId, body }
const waiters = [];
let receipt = 0;
let msg = 0;

function push(body) {
  queue.push({ receiptId: ++receipt, body });
  while (waiters.length) waiters.shift()();
}

function incoming(chatId, text) {
  push({
    typeWebhook: 'incomingMessageReceived',
    instanceData: { idInstance: 1101000001, wid: '79990000000@c.us', typeInstance: 'v3' },
    timestamp: Math.floor(Date.now() / 1000),
    idMessage: `in-${++msg}`,
    senderData: { chatId, chatName: 'Анна Смирнова', chatType: 'user', sender: chatId, senderName: 'Анна Смирнова', senderType: 'user', senderPhoneNumber: 79991234567 },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
  });
}

const json = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' });
  res.end(data === undefined ? '' : JSON.stringify(data));
};
const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b ? JSON.parse(b) : {})); });

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204);
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/__incoming') {
    const { chatId = '10000001', text = 'Привет!' } = await readBody(req);
    incoming(chatId, text);
    return json(res, 200, { ok: true });
  }

  const m = url.pathname.match(/^\/waInstance(\d+)\/(\w+)\/([^/]+)(?:\/(\d+))?$/);
  if (!m) return json(res, 404, { error: 'not found' });
  const [, , method, token, extra] = m;
  if (token !== TOKEN) return json(res, 401, { error: 'Unauthorized' });

  switch (method) {
    case 'getStateInstance':
      return json(res, 200, { stateInstance: 'authorized' });
    case 'checkAccount': {
      const { phoneNumber } = await readBody(req);
      return String(phoneNumber).endsWith('0000')
        ? json(res, 200, { exist: false, chatId: '', fromCache: false })
        : json(res, 200, { exist: true, chatId: '10000001', fromCache: false });
    }
    case 'sendMessage': {
      const { chatId, message } = await readBody(req);
      const idMessage = `out-${++msg}`;
      json(res, 200, { idMessage });
      setTimeout(() => push({ typeWebhook: 'outgoingMessageStatus', chatId, idMessage, status: 'delivered', timestamp: Math.floor(Date.now() / 1000) }), 400);
      setTimeout(() => push({ typeWebhook: 'outgoingMessageStatus', chatId, idMessage, status: 'read', timestamp: Math.floor(Date.now() / 1000) }), 1000);
      if (AUTO_REPLY) setTimeout(() => incoming(chatId, `Получила: «${message}». Отвечаю из MAX 👋`), 1500);
      return undefined;
    }
    case 'receiveNotification': {
      const timeout = Number(url.searchParams.get('receiveTimeout') ?? 5) * 1000;
      if (!queue.length) {
        await new Promise((resolve) => { waiters.push(resolve); setTimeout(resolve, timeout); });
      }
      return json(res, 200, queue[0] ?? null);
    }
    case 'deleteNotification': {
      const i = queue.findIndex((n) => n.receiptId === Number(extra));
      if (i !== -1) queue.splice(i, 1);
      return json(res, 200, { result: i !== -1 });
    }
    default:
      return json(res, 404, { error: `method ${method} not mocked` });
  }
})
  .on('error', (err) => {
    // уже запущена (например, отдельно через npm run mock) — не мешаем dev-серверу
    if (err.code === 'EADDRINUSE') console.log(`Mock GREEN-API: порт ${PORT} уже занят — используем запущенную заглушку`);
    else throw err;
  })
  .listen(PORT, () => console.log(`Mock GREEN-API: http://localhost:${PORT}  (idInstance 1101000001, token "demo")`));
