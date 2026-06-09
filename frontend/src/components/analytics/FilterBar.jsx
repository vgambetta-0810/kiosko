export default function FilterBar({ filters, onChange, sellers = [], clients = [], onApply, loading = false }) {
  return (
    <section className="analytics-filterbar" aria-label="Filtros de analitica">
      <label>
        <span>Periodo</span>
        <select value={filters.preset} onChange={(e) => onChange('preset', e.target.value)}>
          <option value="today">Hoy</option>
          <option value="week">Semana</option>
          <option value="month">Mes</option>
          <option value="custom">Personalizado</option>
        </select>
      </label>
      <label>
        <span>Desde</span>
        <input type="date" value={filters.dateFrom} onChange={(e) => onChange('dateFrom', e.target.value)} />
      </label>
      <label>
        <span>Hasta</span>
        <input type="date" value={filters.dateTo} onChange={(e) => onChange('dateTo', e.target.value)} />
      </label>
      <label>
        <span>Vendedor</span>
        <select value={filters.sellerId} onChange={(e) => onChange('sellerId', e.target.value)}>
          <option value="">Todos los vendedores</option>
          {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
        </select>
      </label>
      <label>
        <span>Cliente</span>
        <select value={filters.clientId} onChange={(e) => onChange('clientId', e.target.value)}>
          <option value="">Todos los clientes</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>
      <button type="button" className="inventory-primary-action" onClick={onApply} disabled={loading}>
        {loading ? 'Aplicando...' : 'Aplicar filtros'}
      </button>
    </section>
  );
}
