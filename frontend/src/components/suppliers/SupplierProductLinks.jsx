import { Plus, Trash2 } from 'lucide-react';

export default function SupplierProductLinks({
  suppliers,
  products,
  selectedSupplierId,
  links,
  linkForm,
  productQuery,
  saving,
  money,
  onSupplierChange,
  onProductQueryChange,
  onLinkFormChange,
  onAdd,
  onRemove,
  onPreferred,
  onEditCost
}) {
  const linkedIds = new Set(links.map((link) => link.productId));
  const query = productQuery.trim().toLowerCase();
  const availableProducts = products.filter((product) => product.isActive && !linkedIds.has(product.id)
    && (!query || [product.name, product.sku, product.codigoBarras].filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))));

  return (
    <section className="supplier-products-section">
      <div className="suppliers-panel__header">
        <div><h2>Productos asociados</h2><p>Administrá el catálogo que provee cada proveedor.</p></div>
      </div>
      <div className="supplier-product-toolbar">
        <label>Proveedor
          <select value={selectedSupplierId} onChange={(event) => onSupplierChange(event.target.value)}>
            <option value="">Seleccionar proveedor</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.isActive ? '' : ' (inactivo)'}</option>)}
          </select>
        </label>
        <label>Buscar producto
          <input value={productQuery} onChange={(event) => onProductQueryChange(event.target.value)} placeholder="Nombre, SKU o código" />
        </label>
      </div>
      <form className="supplier-link-form" onSubmit={onAdd}>
        <label>Producto
          <select required value={linkForm.productId} onChange={(event) => onLinkFormChange((current) => ({ ...current, productId: event.target.value }))}>
            <option value="">Seleccionar producto</option>
            {availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · Stock {product.stock}</option>)}
          </select>
        </label>
        <label>SKU proveedor<input value={linkForm.supplierSku} onChange={(event) => onLinkFormChange((current) => ({ ...current, supplierSku: event.target.value }))} /></label>
        <label>Costo sugerido<input type="number" min="0" step="0.01" value={linkForm.lastCost} onChange={(event) => onLinkFormChange((current) => ({ ...current, lastCost: event.target.value }))} /></label>
        <label className="supplier-check"><input type="checkbox" checked={linkForm.preferred} onChange={(event) => onLinkFormChange((current) => ({ ...current, preferred: event.target.checked }))} /> Preferido</label>
        <button type="submit" className="inventory-primary-action" disabled={saving || !selectedSupplierId}><Plus size={16} /> Asociar</button>
      </form>
      <div className="supplier-links">
        {links.map((link) => (
          <article key={link.id}>
            <div><h3>{link.product?.name}</h3><p>{link.supplierSku ? `SKU ${link.supplierSku} · ` : ''}Costo {link.lastCost == null ? '-' : money.format(link.lastCost)}</p></div>
            <div>
              <button type="button" onClick={() => onEditCost(link)}>Editar costo</button>
              {link.preferred ? <span className="supplier-preferred">Preferido</span> : <button type="button" onClick={() => onPreferred(link)}>Marcar preferido</button>}
              <button type="button" className="supplier-remove" onClick={() => onRemove(link)} aria-label="Quitar producto"><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
        {selectedSupplierId && !links.length ? <p className="suppliers-empty">Este proveedor todavía no tiene productos asociados.</p> : null}
      </div>
    </section>
  );
}
