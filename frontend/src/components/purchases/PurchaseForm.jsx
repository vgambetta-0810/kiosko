import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchableCreatableCombobox from '../common/SearchableCreatableCombobox';
import PurchaseItemsEditor from './PurchaseItemsEditor';

export const emptyPurchase = (supplierId = '') => ({
  supplierId,
  purchaseDate: new Date().toISOString().slice(0, 10),
  notes: '',
  items: []
});

export default function PurchaseForm({
  value,
  suppliers,
  products,
  suggestedProductIds,
  saving,
  money,
  onChange,
  onSupplierChange,
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
          <SearchableCreatableCombobox
            id="purchase-supplier"
            label="Proveedor"
            required
            allowCreate={false}
            selectedOption={selectedSupplier}
            options={suppliers.filter((supplier) => supplier.isActive)}
            placeholder="Buscar proveedor"
            getOptionDescription={(supplier) => supplier.cuit || supplier.businessName || ''}
            onSelect={(supplier) => onSupplierChange(supplier.id)}
            onClear={() => onSupplierChange('')}
          />
          <Link className="purchase-create-supplier-link" to="/proveedores">¿No existe? Crear proveedor</Link>
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
