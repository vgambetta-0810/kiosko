import { memo, useState } from 'react';
import InventoryProductActionsMenu from './InventoryProductActionsMenu';
import StockBadge from './StockBadge';
import { getProductCodeLabel } from '../../utils/products';

const money = (v) =>
  Number(v || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  });

function InventoryProductCard({ product, onEdit, onDuplicate, onHistory }) {
  const [expanded, setExpanded] = useState(false);
  const code = getProductCodeLabel(product);
  const hasCode = code !== 'Sin código';

  return (
    <article className="inv-product-card">
      <div className="inv-product-card__header">
        <strong className="inv-product-card__name">{product.name}</strong>
        <StockBadge stock={product.stock} />
      </div>

      <div className="inv-product-card__meta">
        {hasCode && <span>Código: {code}</span>}
        {product.category && <span>Categoría: {product.category}</span>}
      </div>

      <dl className="inv-product-card__stats">
        <div className="inv-product-card__stat-row">
          <dt className="inv-product-card__stat-label">Stock</dt>
          <dd className="inv-product-card__stat-value">{product.available} disponible</dd>
        </div>
        <div className="inv-product-card__stat-row">
          <dt className="inv-product-card__stat-label">Precio</dt>
          <dd className="inv-product-card__stat-value">{money(product.price)}</dd>
        </div>
      </dl>

      {expanded && (
        <dl className="inv-product-card__detail">
          <div className="inv-product-card__detail-row">
            <dt>Costo</dt>
            <dd>{money(product.cost)}</dd>
          </div>
          <div className="inv-product-card__detail-row">
            <dt>Stock total</dt>
            <dd>{product.stock}</dd>
          </div>
          <div className="inv-product-card__detail-row">
            <dt>Reservado</dt>
            <dd>{product.reserved}</dd>
          </div>
          {product.supplierName && (
            <div className="inv-product-card__detail-row">
              <dt>Proveedor</dt>
              <dd>{product.supplierName}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="inv-product-card__footer">
        <button
          type="button"
          className="inv-product-card__expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '▲ Ocultar detalle' : '▼ Ver detalle'}
        </button>
        <InventoryProductActionsMenu
          product={product}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onHistory={onHistory}
        />
      </div>
    </article>
  );
}

export default memo(InventoryProductCard);
