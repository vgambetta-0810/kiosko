export default function MovementHistory({ movements, selectedProduct, filters, onFilterChange, onApplyFilters }) {
  const visibleMovements = movements.filter((m) => {
    if (!filters.type) return true;
    if (filters.type === 'RESERVED') return m.type === 'RESERVED';
    if (filters.type === 'NOT_RESERVED') return m.type !== 'RESERVED';
    return true;
  });

  const typeLabel = (type) => {
    if (type === 'RESERVED') return 'Reservado';
    return 'No reservado';
  };

  return (
    <div className="card movement-history">
      <h2>Historial de Movimientos</h2>
      {selectedProduct && <p>Producto: {selectedProduct.name} - Stock actual: {selectedProduct.stock}</p>}
      <div className="movement-history__filters">
        <input name="productId" placeholder="ID de producto" value={filters.productId || ''} onChange={onFilterChange} />
        <select name="type" value={filters.type || ''} onChange={onFilterChange}>
          <option value="">Todos los tipos</option>
          <option value="RESERVED">Reservado</option>
          <option value="NOT_RESERVED">No reservado</option>
        </select>
        <label>
          Desde
          <input name="dateFrom" type="date" value={filters.dateFrom || ''} onChange={onFilterChange} />
        </label>
        <label>
          Hasta
          <input name="dateTo" type="date" value={filters.dateTo || ''} onChange={onFilterChange} />
        </label>
        <button type="button" onClick={onApplyFilters}>Filtrar</button>
      </div>
      <p className="movement-history__hint">
        Usa "Desde" y "Hasta" para filtrar movimientos dentro de un rango de fechas.
      </p>
      <div className="inventory-table-scroll">
        <table className="inventory-table inventory-table--compact">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Motivo</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {visibleMovements.map((m) => (
              <tr key={m.id || m._id}>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
                <td>{typeLabel(m.type)}</td>
                <td>{m.quantity}</td>
                <td>{m.reason}</td>
                <td>{m.createdBy?.name || 'Sistema'}</td>
              </tr>
            ))}
            {visibleMovements.length === 0 ? (
              <tr>
                <td colSpan={5} className="inventory-table__empty">No hay movimientos para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
