import { memo, useState, useRef, useEffect } from 'react';
import StockBadge from './StockBadge';
import { getProductCodeLabel } from '../../utils/products';

const money = (v) => `$${Number(v || 0).toFixed(2)}`;

function ActionMenu({ product, onEdit, onDuplicate, onHistory }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="inv-card-menu" ref={ref}>
      <button
        type="button"
        className="inv-card-menu__trigger"
        aria-label="Más acciones"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">•••</span>
      </button>
      {open && (
        <div className="inv-card-menu__dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEdit(product);
              setOpen(false);
            }}
          >
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDuplicate(product);
              setOpen(false);
            }}
          >
            Duplicar
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onHistory(product);
              setOpen(false);
            }}
          >
            Historial
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onEdit, onDuplicate, onHistory }) {
  const [expanded, setExpanded] = useState(false);
  const code = getProductCodeLabel(product);
  const subline = [code !== 'Sin código' ? code : null, product.supplierName].filter(Boolean).join(' · ');

  return (
    <article className="inv-card">
      <div className="inv-card__head">
        <div className="inv-card__title-row">
          <strong className="inv-card__name">{product.name}</strong>
          <StockBadge stock={product.stock} />
        </div>
        {subline && <p className="inv-card__sub">{subline}</p>}
      </div>

      <dl className="inv-card__summary">
        <div className="inv-card__stat">
          <dt>Stock</dt>
          <dd>{product.stock}</dd>
        </div>
        <div className="inv-card__stat">
          <dt>Precio</dt>
          <dd>{money(product.price)}</dd>
        </div>
        <div className="inv-card__stat">
          <dt>Categoría</dt>
          <dd>{product.category || '—'}</dd>
        </div>
      </dl>

      {expanded && (
        <dl className="inv-card__detail">
          <div className="inv-card__detail-row">
            <dt>Costo</dt>
            <dd>{money(product.cost)}</dd>
          </div>
          <div className="inv-card__detail-row">
            <dt>Disponible</dt>
            <dd>{product.available}</dd>
          </div>
          <div className="inv-card__detail-row">
            <dt>Reservado</dt>
            <dd>{product.reserved}</dd>
          </div>
        </dl>
      )}

      <div className="inv-card__footer">
        <button
          type="button"
          className="inv-card__expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '▲ Ocultar detalle' : '▼ Ver detalle'}
        </button>
        <ActionMenu product={product} onEdit={onEdit} onDuplicate={onDuplicate} onHistory={onHistory} />
      </div>
    </article>
  );
}

function InventoryCardList({ products, onEdit, onDuplicate, onHistory, loading }) {
  if (loading) {
    return (
      <div className="inv-card-list">
        <p className="inv-card-list__empty">Cargando productos...</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="inv-card-list">
        <p className="inv-card-list__empty">No hay productos que coincidan con los filtros.</p>
      </div>
    );
  }

  return (
    <div className="inv-card-list">
      {products.map((product) => (
        <ProductCard
          key={product.productId}
          product={product}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onHistory={onHistory}
        />
      ))}
    </div>
  );
}

export default memo(InventoryCardList);
