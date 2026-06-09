import { memo } from 'react';
import InventoryRowActions from './InventoryRowActions';
import StockBadge from './StockBadge';
import { getProductCodeLabel } from '../../utils/products';

const columns = [
  { key: 'codigoBarras', label: 'Código de barras' },
  { key: 'name', label: 'Nombre' },
  { key: 'category', label: 'Categoria' },
  { key: 'stock', label: 'Stock' },
  { key: 'available', label: 'Disponible' },
  { key: 'reserved', label: 'Reservado' },
  { key: 'cost', label: 'Costo' },
  { key: 'price', label: 'Precio Venta' },
  { key: 'status', label: 'Estado' }
];

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

function SortButton({ column, sort, onSort }) {
  const active = sort.key === column.key;
  const marker = active ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <button type="button" className={active ? 'inventory-sort inventory-sort--active' : 'inventory-sort'} onClick={() => onSort(column.key)}>
      {column.label}
      {marker}
    </button>
  );
}

function InventoryTable({ products, sort, onSort, onEdit, onDuplicate, onHistory, loading }) {
  return (
    <section className="inventory-table-card">
      <div className="inventory-table-scroll">
        <table className="inventory-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <SortButton column={column} sort={sort} onSort={onSort} />
                </th>
              ))}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="inventory-table__empty">
                  Cargando productos...
                </td>
              </tr>
            ) : null}
            {!loading && products.length === 0 ? (
              <tr>
                <td colSpan={10} className="inventory-table__empty">
                  No hay productos que coincidan con los filtros.
                </td>
              </tr>
            ) : null}
            {!loading
              ? products.map((product) => (
                  <tr key={product.productId}>
                    <td className="inventory-table__muted">{getProductCodeLabel(product)}</td>
                    <td>
                      <strong>{product.name}</strong>
                      <span>{product.supplierName}</span>
                    </td>
                    <td>{product.category || '-'}</td>
                    <td>{product.stock}</td>
                    <td>{product.available}</td>
                    <td>{product.reserved}</td>
                    <td>{money(product.cost)}</td>
                    <td>{money(product.price)}</td>
                    <td>
                      <StockBadge stock={product.stock} />
                    </td>
                    <td>
                      <InventoryRowActions product={product} onEdit={onEdit} onDuplicate={onDuplicate} onHistory={onHistory} />
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default memo(InventoryTable);
