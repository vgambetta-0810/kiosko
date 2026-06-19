import { useMemo } from 'react';
import { formatDateTime } from '../../utils/dateTime';

const movementTypes = {
  IN: 'Entrada',
  OUT: 'Salida',
  RESERVED: 'Reserva',
  WASTE: 'Merma',
  RETURN: 'Devolución'
};

const reasonLabels = {
  SALE: 'Venta',
  PURCHASE: 'Compra',
  RESERVATION: 'Reserva',
  EXPIRED: 'Reserva vencida',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  BROKEN: 'Roto',
  THEFT: 'Robo',
  LOSS: 'Pérdida',
  LOAD_ERROR: 'Error de carga',
  INTERNAL_USE: 'Consumo interno',
  OTHER: 'Otro'
};

const getProductId = (movement) => movement.productId || movement.product?.id || movement.product?._id;

const startOfDay = (date) => new Date(`${date}T00:00:00`);
const endOfDay = (date) => new Date(`${date}T23:59:59.999`);

export default function InventoryMovementsHistory({
  movements,
  products,
  filters,
  onFilterChange,
  onClearFilters,
  loading
}) {
  const visibleMovements = useMemo(() => {
    const from = filters.dateFrom ? startOfDay(filters.dateFrom) : null;
    const to = filters.dateTo ? endOfDay(filters.dateTo) : null;

    return movements
      .filter((movement) => {
        if (filters.productId && getProductId(movement) !== filters.productId) return false;
        if (filters.type && movement.type !== filters.type) return false;

        const createdAt = new Date(movement.createdAt);
        if (from && createdAt < from) return false;
        if (to && createdAt > to) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [filters, movements]);

  return (
    <section className="card movement-history movement-history--standalone">
      <div className="movement-history__filters" aria-label="Filtros de movimientos">
        <label>
          Producto
          <select name="productId" value={filters.productId} onChange={onFilterChange}>
            <option value="">Todos los productos</option>
            {products.map((product) => (
              <option key={product.id || product._id} value={product.id || product._id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tipo de movimiento
          <select name="type" value={filters.type} onChange={onFilterChange}>
            <option value="">Todos los tipos</option>
            {Object.entries(movementTypes).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label>
          Desde
          <input name="dateFrom" type="date" value={filters.dateFrom} onChange={onFilterChange} />
        </label>

        <label>
          Hasta
          <input name="dateTo" type="date" value={filters.dateTo} onChange={onFilterChange} />
        </label>

        <button type="button" onClick={onClearFilters}>Limpiar filtros</button>
      </div>

      <p className="movement-history__summary">
        {loading ? 'Cargando movimientos...' : `${visibleMovements.length} movimiento${visibleMovements.length === 1 ? '' : 's'}`}
      </p>

      <div className="inventory-table-scroll">
        <table className="inventory-table inventory-table--compact movements-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Stock</th>
              <th>Motivo</th>
              <th>Proveedor / referencia</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {!loading && visibleMovements.map((movement) => (
              <tr key={movement.id || movement._id}>
                <td>{formatDateTime(movement.createdAt)}</td>
                <td><strong>{movement.product?.name || 'Producto no disponible'}</strong></td>
                <td>
                  <span className={`movement-type movement-type--${movement.type.toLowerCase()}`}>
                    {movementTypes[movement.type] || movement.type}
                  </span>
                </td>
                <td>{movement.quantity}</td>
                <td>
                  {movement.stockBefore == null || movement.stockAfter == null
                    ? '-'
                    : `${movement.stockBefore} → ${movement.stockAfter}`}
                </td>
                <td>
                  {movement.type === 'WASTE' && movement.reason === 'EXPIRED'
                    ? 'Vencido'
                    : reasonLabels[movement.reason] || movement.reason || '-'}
                  {movement.note ? <span className="inventory-table__muted">{movement.note}</span> : null}
                </td>
                <td>
                  {movement.supplier?.name || movement.referenceType || '-'}
                  {movement.referenceId ? <span className="inventory-table__muted">#{String(movement.referenceId).slice(0, 8)}</span> : null}
                </td>
                <td>{movement.createdBy?.name || 'Sistema'}</td>
              </tr>
            ))}
            {!loading && visibleMovements.length === 0 ? (
              <tr>
                <td colSpan={8} className="inventory-table__empty">No hay movimientos que coincidan con los filtros.</td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td colSpan={8} className="inventory-table__empty">Cargando movimientos...</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
