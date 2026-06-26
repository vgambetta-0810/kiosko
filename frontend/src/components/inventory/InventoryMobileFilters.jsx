import { memo, useState } from 'react';

function InventoryMobileFilters({ filters, categories, onFilterChange, onNewProduct }) {
  const [open, setOpen] = useState(false);
  const hasActive = Boolean(
    filters.search || filters.category || (filters.stockStatus && filters.stockStatus !== 'all')
  );

  return (
    <div className="inv-mobile-filters">
      <div className="inv-mobile-filters__bar">
        <button
          type="button"
          className={`inv-mobile-filters__toggle${hasActive ? ' inv-mobile-filters__toggle--active' : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '▲' : '▼'} Filtros{hasActive ? ' ●' : ''}
        </button>
        <button type="button" className="inventory-primary-action" onClick={onNewProduct}>
          + Nuevo
        </button>
      </div>
      {open && (
        <div className="inv-mobile-filters__panel">
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Buscar por código, nombre o categoría"
          />
          <select value={filters.category} onChange={(e) => onFilterChange('category', e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select value={filters.stockStatus} onChange={(e) => onFilterChange('stockStatus', e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="normal">Stock normal</option>
            <option value="low">Stock bajo</option>
            <option value="empty">Sin stock</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default memo(InventoryMobileFilters);
