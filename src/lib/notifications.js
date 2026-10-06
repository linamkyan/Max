/**
 * Разбор входящих уведомлений GREEN-API.
 * Формат: https://green-api.com/v3/docs/api/receiving/notifications-format/
 *
 * Возвращает одно из:
 *   { kind: 'message', chatId, chatName, phone, message: { id, text, out, ts } }
 *   { kind: 'status',  chatId, id, status }
 *   null — уведомление нам не нужно (файлы, сервисные события и т.п.)
 */

function extractText(messageData) {
  if (!messageData) return null;
  switch (messageData.typeMessage) {
    case 'textMessage':
      return messageData.textMessageData?.textMessage ?? null;
    case 'extendedTextMessage':
    case 'quotedMessage':
      return messageData.extendedTextMessageData?.text ?? null;
    default:
      return null; // по ТЗ поддерживаем только текст
  }
}

export function parseNotification(body) {
  if (!body?.typeWebhook) return null;

  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived': // отправлено с телефона
    case 'outgoingAPIMessageReceived': {
      // отправлено через API (в т.ч. нами — дубль отсечётся по id)
      const text = extractText(body.messageData);
      if (text == null) return null;
      const sender = body.senderData ?? {};
      if (sender.chatType && sender.chatType !== 'user') return null; // только личные чаты
      const out = body.typeWebhook !== 'incomingMessageReceived';
      return {
        kind: 'message',
        chatId: String(sender.chatId),
        chatName: out ? sender.chatName : sender.senderName || sender.chatName,
        phone: !out && sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : undefined,
        message: { id: body.idMessage, text, out, ts: (body.timestamp ?? Date.now() / 1000) * 1000 },
      };
    }
    case 'outgoingMessageStatus': {
      // delivered | read | failed | noAccount | notInGroup — последние два для пользователя тоже «не отправлено»
      const status = body.status === 'noAccount' || body.status === 'notInGroup' ? 'failed' : body.status;
      return { kind: 'status', chatId: String(body.chatId), id: body.idMessage, status };
    }
    default:
      return null;
  }
}
