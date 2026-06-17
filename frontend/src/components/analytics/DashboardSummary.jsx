const formatMoney = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));

const formatNumber = (value) => new Intl.NumberFormat('es-AR').format(Number(value || 0));

export default function DashboardSummary({ periodLabel, kpis = {} }) {
  const items = [
    { label: 'Ventas', value: formatMoney(kpis.netSales), tone: 'strong' },
    { label: 'Cobrado', value: formatMoney(kpis.paidAmount), tone: 'success' },
    { label: 'Pendiente', value: formatMoney(kpis.pendingAmount), tone: 'warning' },
    { label: 'Tickets', value: formatNumber(kpis.salesCount), tone: 'info' }
  ];

  return (
    <section className="analytics-executive-summary" aria-label="Resumen ejecutivo">
      <span className="analytics-executive-summary__period">{periodLabel}:</span>
      <div className="analytics-executive-summary__items">
        {items.map((item) => (
          <div key={item.label} className={`analytics-executive-summary__item analytics-executive-summary__item--${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
