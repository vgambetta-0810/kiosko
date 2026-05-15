export default function MovementHistory({ movements, selectedProduct, filters, onFilterChange, onApplyFilters }) {
  return (
    <div className="card">
      <h2>Historial de movimientos</h2>
      {selectedProduct && <p>Producto: {selectedProduct.name} - Stock actual: {selectedProduct.stock}</p>}
      <div>
        <input name="productId" placeholder="ID del producto" value={filters.productId || ''} onChange={onFilterChange} />
        <input name="type" placeholder="Tipo (IN/OUT/RESERVED/RETURN)" value={filters.type || ''} onChange={onFilterChange} />
        <input name="dateFrom" type="date" value={filters.dateFrom || ''} onChange={onFilterChange} />
        <input name="dateTo" type="date" value={filters.dateTo || ''} onChange={onFilterChange} />
        <button onClick={onApplyFilters}>Filtrar</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
          {movements.map((m) => (
            <tr key={m._id} style={{ borderBottom: '1px solid #ddd' }}>
              <td>{new Date(m.createdAt).toLocaleString()}</td>
              <td>{m.type}</td>
              <td>{m.quantity}</td>
              <td>{m.reason}</td>
              <td>{m.createdBy?.name || 'Sistema'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
