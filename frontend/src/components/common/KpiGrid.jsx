import { memo } from 'react';

export function KpiCard({ label, value, tone }) {
  return (
    <article className={['inventory-metric', tone && `inventory-metric--${tone}`].filter(Boolean).join(' ')}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function KpiGrid({ items, className, ariaLabel }) {
  return (
    <section className={['kpi-grid', className].filter(Boolean).join(' ')} aria-label={ariaLabel ?? 'Métricas'}>
      {items.map((item) => (
        <KpiCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
      ))}
    </section>
  );
}

export default memo(KpiGrid);
