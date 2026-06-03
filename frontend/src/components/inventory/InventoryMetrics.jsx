import { memo } from 'react';

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2
});

function InventoryMetrics({ metrics }) {
  const cards = [
    { label: 'Total Productos', value: metrics.totalProducts },
    { label: 'Sin Stock', value: metrics.outOfStock, tone: 'danger' },
    { label: 'Stock Bajo', value: metrics.lowStock, tone: 'warning' },
    { label: 'Valor Inventario', value: moneyFormatter.format(metrics.inventoryValue) },
    { label: 'Valor Potencial de Venta', value: moneyFormatter.format(metrics.potentialSalesValue) },
    { label: 'Reservados', value: metrics.reservedUnits }
  ];

  return (
    <section className="inventory-metrics" aria-label="Metricas de inventario">
      {cards.map((card) => (
        <article key={card.label} className={`inventory-metric ${card.tone ? `inventory-metric--${card.tone}` : ''}`}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

export default memo(InventoryMetrics);
