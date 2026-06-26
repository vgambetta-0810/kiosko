import { memo, useState } from 'react';

const movementTypes = {
  IN: 'Entrada',
  OUT: 'Salida',
  RESERVED: 'Reserva',
  WASTE: 'Merma',
  RETURN: 'Devolución'
};

function MovementMobileFilters({ filters, products, onFilterChange, onClearFilters }) {
  const [open, setOpen] = useState(false);
  const hasActive = Boolean(
    filters.productId || filters.type || filters.dateFrom || filters.dateTo
  );

  return (
    <div className="mov-mobile-filters">
      <div className="mov-mobile-filters__bar">
        <button
          type="button"
          className={`inv-mobile-filters__toggle${hasActive ? ' inv-mobile-filters__toggle--active' : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '▲' : '▼'} Filtros{hasActive ? ' ●' : ''}
        </button>
        {hasActive && (
          <button type="button" className="mov-mobile-filters__clear" onClick={onClearFilters}>
            Limpiar
          </button>
        )}
      </div>
      {open && (
        <div className="inv-mobile-filters__panel">
          <select name="productId" value={filters.productId} onChange={onFilterChange}>
            <option value="">Todos los productos</option>
            {products.map((product) => (
              <option key={product.id || product._id} value={product.id || product._id}>
                {product.name}
              </option>
            ))}
          </select>
          <select name="type" value={filters.type} onChange={onFilterChange}>
            <option value="">Todos los tipos</option>
            {Object.entries(movementTypes).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <label className="mov-mobile-filters__date-label">
            Desde
            <input name="dateFrom" type="date" value={filters.dateFrom} onChange={onFilterChange} />
          </label>
          <label className="mov-mobile-filters__date-label">
            Hasta
            <input name="dateTo" type="date" value={filters.dateTo} onChange={onFilterChange} />
          </label>
        </div>
      )}
    </div>
  );
}

export default memo(MovementMobileFilters);
