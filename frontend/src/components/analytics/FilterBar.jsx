import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

const presetLabels = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Últimos 30 días',
  custom: 'Personalizado'
};

export default function FilterBar({ filters, onChange, sellers = [], clients = [], loading = false }) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeChips = useMemo(() => {
    const seller = sellers.find((s) => String(s.id) === String(filters.sellerId));
    const client = clients.find((c) => String(c.id) === String(filters.clientId));
    const chips = [presetLabels[filters.preset] || 'Personalizado'];
    if (filters.preset === 'custom' && filters.dateFrom && filters.dateTo) {
      chips.push(`${filters.dateFrom} → ${filters.dateTo}`);
    }
    chips.push(`Cliente: ${client?.name || 'Todos'}`);
    chips.push(`Vendedor: ${seller?.name || 'Todos'}`);
    return chips;
  }, [filters, sellers, clients]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div className="dash-filter" ref={containerRef}>
      <div className="dash-filter__anchor">
        <span className="dash-filter__status" aria-live="polite">
          {loading ? (
            <>
              <span className="dash-filter__spinner" aria-hidden="true" />
              Actualizando...
            </>
          ) : (
            'Sincronizado'
          )}
        </span>

        <button
          type="button"
          className="dash-filter__toggle"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((v) => !v)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filtros
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`dash-filter__chevron${isOpen ? ' dash-filter__chevron--open' : ''}`}
          />
        </button>

        <div
          id={panelId}
          role="region"
          aria-label="Panel de filtros"
          aria-hidden={!isOpen}
          inert={isOpen ? undefined : ''}
          className={`dash-filter__panel${isOpen ? '' : ' is-closed'}`}
        >
          <div className="dash-filter__panel-inner">
            <div className="dash-filter__grid">
              <label className="dash-filter__field">
                <span>Periodo</span>
                <select value={filters.preset} onChange={(e) => onChange('preset', e.target.value)}>
                  <option value="today">Hoy</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Últimos 30 días</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>
              <label className="dash-filter__field">
                <span>Desde</span>
                <input type="date" value={filters.dateFrom} onChange={(e) => onChange('dateFrom', e.target.value)} />
              </label>
              <label className="dash-filter__field">
                <span>Hasta</span>
                <input type="date" value={filters.dateTo} onChange={(e) => onChange('dateTo', e.target.value)} />
              </label>
              <label className="dash-filter__field">
                <span>Vendedor</span>
                <select value={filters.sellerId} onChange={(e) => onChange('sellerId', e.target.value)}>
                  <option value="">Todos los vendedores</option>
                  {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="dash-filter__field dash-filter__field--wide">
                <span>Cliente</span>
                <select value={filters.clientId} onChange={(e) => onChange('clientId', e.target.value)}>
                  <option value="">Todos los clientes</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-filter__chips" aria-label="Filtros activos">
        <span className="dash-filter__chips-label">Filtros activos</span>
        {activeChips.map((chip) => (
          <span key={chip} className="dash-filter__chip">{chip}</span>
        ))}
      </div>
    </div>
  );
}
