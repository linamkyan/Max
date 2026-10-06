const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const IconCompose = () => (
  <svg {...base}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const IconLogout = () => (
  <svg {...base}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const IconSend = () => (
  <svg {...base} fill="currentColor" stroke="none"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" /></svg>
);
export const IconBack = () => (
  <svg {...base}><path d="m15 18-6-6 6-6" /></svg>
);
export const IconClose = () => (
  <svg {...base}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconEye = ({ off }) => (
  <svg {...base} width={18} height={18}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

/** Галочки статуса как в мессенджерах: одна — отправлено, две — доставлено, синие — прочитано. */
export function StatusTicks({ status }) {
  if (status === 'sending') {
    return <svg className="ticks" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Отправляется"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  }
  if (status === 'failed') {
    return <span className="ticks ticks--failed" aria-label="Не отправлено">!</span>;
  }
  const double = status === 'delivered' || status === 'read';
  return (
    <svg className={`ticks${status === 'read' ? ' ticks--read' : ''}`} width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-label={status === 'read' ? 'Прочитано' : double ? 'Доставлено' : 'Отправлено'}>
      <path d="m1 6.5 3.5 3.5L11 2.5" />
      {double && <path d="m7.5 10 6.5-7.5" />}
    </svg>
  );
}
