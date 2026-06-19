import { Edit3, PackagePlus } from 'lucide-react';

export default function SupplierList({ suppliers, loading, onEdit, onToggle, onSelect, onNewPurchase }) {
  return (
    <div className="suppliers-grid">
      {suppliers.map((supplier) => (
        <article key={supplier.id} className={`supplier-card${supplier.isActive ? '' : ' supplier-card--inactive'}`}>
          <div>
            <span className={`supplier-status ${supplier.isActive ? 'active' : ''}`}>{supplier.isActive ? 'Activo' : 'Inactivo'}</span>
            <h3>{supplier.name}</h3>
            <p>{supplier.businessName || supplier.email || 'Sin datos adicionales'}</p>
          </div>
          <dl>
            <div><dt>CUIT</dt><dd>{supplier.cuit || '-'}</dd></div>
            <div><dt>Teléfono</dt><dd>{supplier.phone || '-'}</dd></div>
          </dl>
          <div className="supplier-card__actions">
            <button type="button" onClick={() => onEdit(supplier)}><Edit3 size={15} /> Editar</button>
            <button type="button" onClick={() => onSelect(supplier.id)}>Ver productos</button>
            {supplier.isActive ? <button type="button" onClick={() => onNewPurchase(supplier.id)}><PackagePlus size={15} /> Nueva compra</button> : null}
            <button type="button" onClick={() => onToggle(supplier)}>{supplier.isActive ? 'Desactivar' : 'Activar'}</button>
          </div>
        </article>
      ))}
      {!loading && !suppliers.length ? <p className="suppliers-empty">No hay proveedores para mostrar.</p> : null}
    </div>
  );
}
