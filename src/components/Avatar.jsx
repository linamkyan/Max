const PALETTE = ['#5b7cfa', '#9b6bf2', '#2bb3a3', '#f2994a', '#e86a92', '#3aa0e6', '#6fbf4a'];

function initials(title) {
  const words = title.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (/^\d/.test(words[0])) return words[0].slice(-2); // для номера — последние цифры
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}

export default function Avatar({ id, title, size = 48 }) {
  const hash = [...String(id)].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return (
    <span className="avatar" style={{ width: size, height: size, background: PALETTE[hash % PALETTE.length], fontSize: size * 0.36 }} aria-hidden="true">
      {initials(title)}
    </span>
  );
}
