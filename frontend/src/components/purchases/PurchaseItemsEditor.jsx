import { Plus, Trash2 } from 'lucide-react';

export default function PurchaseItemsEditor({ items, products, suggestedProductIds, money, onAdd, onUpdate, onRemove }) {
  return (
    <>
      <button type="button" className="purchase-add-item" onClick={onAdd}><Plus size={16} /> Agregar producto</button>
      <div className="purchase-items">
        {items.map((item, index) => (
          <div className="purchase-item" key={`${item.productId}-${index}`}>
            <select value={item.productId} onChange={(event) => onUpdate(index, 'productId', event.target.value)}>
              {products.map((product) => <option key={product.id} value={product.id}>{suggestedProductIds.has(product.id) ? '★ ' : ''}{product.name}</option>)}
            </select>
            <input aria-label="Cantidad" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => onUpdate(index, 'quantity', event.target.value)} />
            <input aria-label="Costo unitario" type="number" min="0" step="0.01" value={item.unitCost} onChange={(event) => onUpdate(index, 'unitCost', event.target.value)} />
            <strong>{money.format(Number(item.quantity || 0) * Number(item.unitCost || 0))}</strong>
            <button type="button" onClick={() => onRemove(index)} aria-label="Quitar producto"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </>
  );
}
