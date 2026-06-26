import { memo, useState } from 'react';
import { formatDateTime } from '../../utils/dateTime';

const movementTypes = {
  IN: 'Entrada',
  OUT: 'Salida',
  RESERVED: 'Reserva',
  WASTE: 'Merma',
  RETURN: 'Devolución'
};

const reasonLabels = {
  SALE: 'Venta',
  PURCHASE: 'Compra',
  RESERVATION: 'Reserva',
  EXPIRED: 'Reserva vencida',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  BROKEN: 'Roto',
  THEFT: 'Robo',
  LOSS: 'Pérdida',
  LOAD_ERROR: 'Error de carga',
  INTERNAL_USE: 'Consumo interno',
  OTHER: 'Otro'
};

function getQuantityLabel(movement) {
  const qty = movement.quantity;
  if (movement.type === 'IN' || movement.type === 'RETURN') return `+${qty}`;
  if (movement.type === 'OUT' || movement.type === 'WASTE') return `-${qty}`;
  return String(qty);
}

function getBadgeLabel(movement) {
  if (movement.type === 'WASTE' && movement.reason === 'EXPIRED') return 'Vencido';
  return reasonLabels[movement.reason] || movementTypes[movement.type] || movement.type;
}

function MovementMobileCard({ movement }) {
  const [expanded, setExpanded] = useState(false);
  const productName = movement.product?.name || 'Producto no disponible';
  const badgeLabel = getBadgeLabel(movement);
  const typeLabel = movementTypes[movement.type] || movement.type;
  const qtyLabel = getQuantityLabel(movement);
  const stockStr =
    movement.stockBefore == null || movement.stockAfter == null
      ? null
      : `${movement.stockBefore} → ${movement.stockAfter}`;

  return (
    <article className="mov-card">
      <div className="mov-card__header">
        <span className={`movement-type movement-type--${movement.type.toLowerCase()}`}>
          {badgeLabel}
        </span>
        <time className="mov-card__date">{formatDateTime(movement.createdAt)}</time>
      </div>

      <strong className="mov-card__product">{productName}</strong>

      <dl className="mov-card__stats">
        <div className="mov-card__stat-row">
          <dt className="mov-card__stat-label">Cantidad</dt>
          <dd className={`mov-card__stat-value mov-card__qty--${movement.type.toLowerCase()}`}>
            {qtyLabel}
          </dd>
        </div>
        {stockStr && (
          <div className="mov-card__stat-row">
            <dt className="mov-card__stat-label">Stock</dt>
            <dd className="mov-card__stat-value">{stockStr}</dd>
          </div>
        )}
      </dl>

      {expanded && (
        <dl className="mov-card__detail">
          <div className="mov-card__detail-row">
            <dt>Tipo</dt>
            <dd>{typeLabel}</dd>
          </div>
          {movement.createdBy?.name && (
            <div className="mov-card__detail-row">
              <dt>Usuario</dt>
              <dd>{movement.createdBy.name}</dd>
            </div>
          )}
          {movement.supplier?.name && (
            <div className="mov-card__detail-row">
              <dt>Proveedor</dt>
              <dd>{movement.supplier.name}</dd>
            </div>
          )}
          {movement.referenceType && (
            <div className="mov-card__detail-row">
              <dt>Referencia</dt>
              <dd>
                {movement.referenceType}
                {movement.referenceId ? ` #${String(movement.referenceId).slice(0, 8)}` : ''}
              </dd>
            </div>
          )}
          {movement.stockBefore != null && (
            <div className="mov-card__detail-row">
              <dt>Stock anterior</dt>
              <dd>{movement.stockBefore}</dd>
            </div>
          )}
          {movement.stockAfter != null && (
            <div className="mov-card__detail-row">
              <dt>Stock nuevo</dt>
              <dd>{movement.stockAfter}</dd>
            </div>
          )}
          {movement.note && (
            <div className="mov-card__detail-row">
              <dt>Observaciones</dt>
              <dd>{movement.note}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mov-card__footer">
        <button
          type="button"
          className="mov-card__expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '▲ Ocultar detalle' : '▼ Ver detalle'}
        </button>
      </div>
    </article>
  );
}

export default memo(MovementMobileCard);
