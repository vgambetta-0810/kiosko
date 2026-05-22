const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));

export function ProductRanking({ title, rows = [], showAmount = true }) {
  return (
    <section className="rounded-2xl border border-panelBorder bg-panelSoft p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">{title}</h3>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={`${row.productId}-${idx}`} className="flex items-center justify-between rounded-xl bg-slate-900/50 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-slate-100">{row.product?.name || 'Producto'}</p>
              <p className="text-xs text-slate-400">{row.product?.sku || row.productId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-cyan-300">{Number(row.quantity || 0)} u.</p>
              {showAmount ? <p className="text-xs text-slate-300">{formatMoney(row.gross || row.amount || 0)}</p> : null}
            </div>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-slate-400">Sin datos en el rango seleccionado.</p> : null}
      </div>
    </section>
  );
}

export function FinanceStrip({ finance }) {
  const items = [
    { label: 'Cobrado real', value: finance?.collected, color: 'text-emerald-300' },
    { label: 'Deuda pendiente', value: finance?.pendingDebt, color: 'text-amber-300' },
    { label: 'Descuentos', value: finance?.discounts, color: 'text-blue-300' },
    { label: 'Pérdida por devoluciones', value: finance?.returnsLost, color: 'text-rose-300' }
  ];

  return (
    <section className="grid gap-3 rounded-2xl border border-panelBorder bg-panelSoft p-4 md:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-xl bg-slate-900/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className={`mt-1 text-lg font-semibold ${item.color}`}>{formatMoney(item.value || 0)}</p>
        </article>
      ))}
    </section>
  );
}
