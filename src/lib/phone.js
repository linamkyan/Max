/**
 * Приводит введённый номер к виду, который принимает CheckAccount:
 * только цифры, 11 или 12 знаков, коды стран 7 (РФ) или 375 (РБ).
 * «8 999 …» превращается в «7999…».
 */
export function normalizePhone(input) {
  let digits = String(input).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  return digits;
}

export function validatePhone(digits) {
  if (!digits) return 'Введите номер телефона';
  const ok = (digits.length === 11 && digits.startsWith('7')) || (digits.length === 12 && digits.startsWith('375'));
  return ok ? null : 'Нужен номер РФ (+7, 11 цифр) или РБ (+375, 12 цифр)';
}

export function formatPhone(digits) {
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith('375')) {
    return `+375 ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`;
  }
  return digits ? `+${digits}` : '';
}
