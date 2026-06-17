const formatMoney = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));

const formatNumber = (value) => new Intl.NumberFormat('es-AR').format(Number(value || 0));

const formatMetric = (value, type = 'money') => (type === 'money' ? formatMoney(value) : formatNumber(value));

export default function DashboardSecondaryMetrics({ metrics = [], children }) {
  return (
    <details className="analytics-secondary-metrics">
      <summary>Ver metricas adicionales</summary>
      <section className="analytics-kpis analytics-kpis--secondary" aria-label="Metricas adicionales">
        {children}
      </section>
      {metrics.length ? (
        <section className="analytics-secondary-grid" aria-label="Metricas complementarias">
          {metrics.map((metric) => (
            <article key={metric.label} className={`analytics-summary-box${metric.className ? ` ${metric.className}` : ''}`}>
              <span>{metric.label}</span>
              <strong>{formatMetric(metric.value, metric.type)}</strong>
            </article>
          ))}
        </section>
      ) : null}
    </details>
  );
}
