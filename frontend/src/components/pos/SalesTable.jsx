import { memo } from 'react';
import { getProductCodeLabel } from '../../utils/products';
import { blockNonIntegerKeys, isUnsignedIntegerInput } from '../../utils/quantity';

function SalesTable({ items, highlightedProductId, onUpdateQty, onRemove }) {
  return (
    <div className="pos-table-wrapper">
      <h3>Detalle</h3>
      <table className="pos-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {!items.length ? (
            <tr>
              <td colSpan={5} className="pos-table__empty">No hay productos cargados</td>
            </tr>
          ) : null}
          {items.map((item) => {
            const isHighlighted = item.productId === highlightedProductId;
            return (
              <tr key={item.productId} className={isHighlighted ? 'pos-row-highlight' : ''}>
                <td>
                  <strong>{item.name}</strong>
                  <span>{getProductCodeLabel(item)}</span>
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onKeyDown={blockNonIntegerKeys}
                    onChange={(e) => isUnsignedIntegerInput(e.target.value) && onUpdateQty(item.productId, e.target.value)}
                    aria-label={`Cantidad de ${item.name}`}
                  />
                </td>
                <td>${Number(item.price).toFixed(2)}</td>
                <td>${(item.quantity * item.price).toFixed(2)}</td>
                <td>
                  <span className="pos-stock-pill">Stock {item.stock}</span>
                  <button type="button" className="pos-remove-btn" onClick={() => onRemove(item.productId)}>
                    X
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default memo(SalesTable);
