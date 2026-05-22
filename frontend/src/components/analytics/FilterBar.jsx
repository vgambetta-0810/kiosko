export default function FilterBar({ filters, onChange, sellers = [], clients = [], onApply }) {
  return (
    <section className="rounded-2xl border border-panelBorder bg-panelSoft p-4">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <select value={filters.preset} onChange={(e) => onChange('preset', e.target.value)} className="rounded-xl border border-panelBorder bg-slate-900/80 px-3 py-2 text-ink">
          <option value="today">Hoy</option><option value="week">Semana</option><option value="month">Mes</option><option value="custom">Personalizado</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => onChange('dateFrom', e.target.value)} className="rounded-xl border border-panelBorder bg-slate-900/80 px-3 py-2 text-ink" />
        <input type="date" value={filters.dateTo} onChange={(e) => onChange('dateTo', e.target.value)} className="rounded-xl border border-panelBorder bg-slate-900/80 px-3 py-2 text-ink" />
        <select value={filters.sellerId} onChange={(e) => onChange('sellerId', e.target.value)} className="rounded-xl border border-panelBorder bg-slate-900/80 px-3 py-2 text-ink">
          <option value="">Todos los vendedores</option>{sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.clientId} onChange={(e) => onChange('clientId', e.target.value)} className="rounded-xl border border-panelBorder bg-slate-900/80 px-3 py-2 text-ink">
          <option value="">Todos los clientes</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" onClick={onApply} className="rounded-xl bg-cyan-500 px-3 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400">Aplicar filtros</button>
      </div>
    </section>
  );
}
