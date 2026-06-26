import { Check } from 'lucide-react';
import PurchaseItemsEditor from './PurchaseItemsEditor';
import PurchaseSupplierSelector from './PurchaseSupplierSelector';

export const emptyPurchase = (supplierId = '') => ({
  supplierId,
  purchaseDate: new Date().toISOString().slice(0, 10),
  notes: '',
  items: []
});

export default function PurchaseForm({
  value,
  suppliers,
  supplierOptions,
  supplierLoading,
  supplierError,
  products,
  suggestedProductIds,
  saving,
  money,
  onChange,
  onSupplierSearch,
  onSupplierChange,
  onSupplierCreated,
  onSupplierTextChange,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onSave
}) {
  const selectedSupplier = suppliers.find((supplier) => supplier.id === value.supplierId) || null;
  const total = value.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);

  return (
    <div className="purchase-form">
      <div className="purchase-form__grid">
        <div>
          <PurchaseSupplierSelector
            selectedSupplier={selectedSupplier}
            options={supplierOptions}
            loading={supplierLoading}
            error={supplierError}
            onSearch={onSupplierSearch}
            onInputChange={onSupplierTextChange}
            onSelect={(supplier) => onSupplierChange(supplier.id)}
            onClear={() => onSupplierChange('')}
            onCreated={onSupplierCreated}
          />
        </div>
        <label>Fecha<input type="date" value={value.purchaseDate} onChange={(event) => onChange((current) => ({ ...current, purchaseDate: event.target.value }))} /></label>
      </div>
      <PurchaseItemsEditor
        items={value.items}
        products={products}
        suggestedProductIds={suggestedProductIds}
        money={money}
        onAdd={onAddItem}
        onUpdate={onUpdateItem}
        onRemove={onRemoveItem}
      />
      <label>Observaciones<textarea rows={3} value={value.notes} onChange={(event) => onChange((current) => ({ ...current, notes: event.target.value }))} /></label>
      <div className="purchase-form__footer">
        <div><span>Total</span><strong>{money.format(total)}</strong></div>
        <button type="button" onClick={() => onSave(false)} disabled={saving}>Guardar borrador</button>
        <button type="button" className="inventory-primary-action" onClick={() => onSave(true)} disabled={saving}><Check size={16} /> Confirmar compra</button>
      </div>
    </div>
  );
}
