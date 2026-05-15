export default function MovementHistory({ movements, selectedProduct, filters, onFilterChange, onApplyFilters }) {
  return (
    <div className="card">
      <h2>Movement History</h2>
      {selectedProduct && <p>Product: {selectedProduct.name} - Current Stock: {selectedProduct.stock}</p>}
      <div>
        <input name="productId" placeholder="Product ID" value={filters.productId || ''} onChange={onFilterChange} />
        <input name="type" placeholder="Type (IN/OUT/RESERVED/RETURN)" value={filters.type || ''} onChange={onFilterChange} />
        <input name="dateFrom" type="date" value={filters.dateFrom || ''} onChange={onFilterChange} />
        <input name="dateTo" type="date" value={filters.dateTo || ''} onChange={onFilterChange} />
        <button onClick={onApplyFilters}>Filter</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Reason</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td>{new Date(m.createdAt).toLocaleString()}</td>
              <td>{m.type}</td>
              <td>{m.quantity}</td>
              <td>{m.reason}</td>
              <td>{m.createdBy?.name || 'System'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
