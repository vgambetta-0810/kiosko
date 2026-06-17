const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));
const formatNumber = (value) => new Intl.NumberFormat('es-AR').format(Number(value || 0));

export default function KpiCard({ title, value, type = 'money', icon: Icon }) {
  return (
    <article className="inventory-metric analytics-kpi-card">
      <div className="analytics-kpi-card__header">
        <span>{title}</span>
        <span className="analytics-kpi-card__icon" aria-hidden="true">{Icon ? <Icon size={16} /> : null}</span>
      </div>
      <strong>{type === 'money' ? formatMoney(value) : formatNumber(value)}</strong>
    </article>
  );
}
