const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));

export function ProductRanking({ title, rows = [], showAmount = true, className = '' }) {
  return (
    <section className={`analytics-panel ${className}`.trim()}>
      <h3>{title}</h3>
      <div className="inventory-table-card analytics-ranking-table">
        <table className="inventory-table inventory-table--compact">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Unidades</th>
              {showAmount ? <th>Monto</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.productId}-${index}`}>
                <td>
                  <strong>{row.product?.name || 'Producto'}</strong>
                  <span className="inventory-table__muted">{row.product?.codigoBarras || row.product?.sku || row.productId}</span>
                </td>
                <td>{Number(row.quantity || 0)} u.</td>
                {showAmount ? <td>{formatMoney(row.gross || row.amount || 0)}</td> : null}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={showAmount ? 3 : 2} className="inventory-table__empty">
                  Sin datos en el rango seleccionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

