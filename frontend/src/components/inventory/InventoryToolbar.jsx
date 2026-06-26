import { memo } from 'react';

function InventoryToolbar({ filters, categories, onFilterChange, onNewProduct }) {
  return (
    <section className="inventory-toolbar" aria-label="Filtros de inventario">
      <div className="inventory-toolbar__filters">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          placeholder="Buscar por código de barras, nombre o categoría"
        />
        <select value={filters.category} onChange={(e) => onFilterChange('category', e.target.value)}>
          <option value="">Todas las categorias</option>
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
      <button type="button" className="inventory-primary-action" onClick={onNewProduct}>
        Nuevo Producto
      </button>
    </section>
  );
}

export default memo(InventoryToolbar);
