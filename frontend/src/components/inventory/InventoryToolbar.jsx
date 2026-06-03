import { memo } from 'react';

function InventoryToolbar({ filters, categories, onFilterChange, onNewProduct }) {
  return (
    <section className="inventory-toolbar" aria-label="Filtros de inventario">
      <div className="inventory-toolbar__filters">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onFilterChange('search', event.target.value)}
          placeholder="Buscar por SKU, codigo, nombre o categoria"
        />
        <select value={filters.category} onChange={(event) => onFilterChange('category', event.target.value)}>
          <option value="">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select value={filters.stockStatus} onChange={(event) => onFilterChange('stockStatus', event.target.value)}>
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
