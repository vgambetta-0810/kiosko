import { useId, useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

const presetLabels = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  custom: 'Personalizado'
};

export default function FilterBar({ filters, onChange, sellers = [], clients = [] }) {
  const panelId = useId();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const activeFilters = useMemo(() => {
    const selectedSeller = sellers.find((seller) => String(seller.id) === String(filters.sellerId));
    const selectedClient = clients.find((client) => String(client.id) === String(filters.clientId));
    const periodLabel = presetLabels[filters.preset] || 'Personalizado';
    const labels = [periodLabel];

    if (filters.preset === 'custom' && filters.dateFrom && filters.dateTo) {
      labels.push(`${filters.dateFrom} a ${filters.dateTo}`);
    }

    labels.push(`Cliente: ${selectedClient?.name || 'Todos'}`);
    labels.push(`Vendedor: ${selectedSeller?.name || 'Todos'}`);

    return labels;
  }, [clients, filters.clientId, filters.dateFrom, filters.dateTo, filters.preset, filters.sellerId, sellers]);

  return (
    <section className="analytics-filter-shell" aria-label="Filtros de analitica">
      <div className="analytics-filter-summary">
        <button
          type="button"
          className="analytics-filter-toggle"
          aria-expanded={isFiltersOpen}
          aria-controls={panelId}
          onClick={() => setIsFiltersOpen((current) => !current)}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          Filtros
          <ChevronDown size={18} aria-hidden="true" />
        </button>

        <div className="analytics-filter-chips" aria-label="Filtros activos">
          {activeFilters.map((filterLabel) => (
            <strong key={filterLabel}>{filterLabel}</strong>
          ))}
        </div>
      </div>

      <div
        id={panelId}
        className={`analytics-filter-panel${isFiltersOpen ? '' : ' is-collapsed'}`}
        aria-hidden={!isFiltersOpen}
        inert={isFiltersOpen ? undefined : ''}
      >
        <div className="analytics-filter-panel__inner">
          <div className="analytics-filterbar">
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
          </div>
        </div>
      </div>
    </section>
  );
}
