import { Check, Eye } from 'lucide-react';

const statusLabels = { DRAFT: 'Borrador', CONFIRMED: 'Confirmada', CANCELLED: 'Anulada' };

export default function PurchaseList({ purchases, loading, saving, money, dateTime, onConfirm, onCancel, onDetail }) {
  return (
    <div className="purchase-list">
      {purchases.map((purchase) => (
        <article key={purchase.id} className="purchase-card">
          <div className="purchase-card__main">
            <div>
              <span className={`purchase-status purchase-status--${purchase.status.toLowerCase()}`}>{statusLabels[purchase.status] || purchase.status}</span>
              <h3>{purchase.supplier?.name || 'Proveedor'}</h3>
              <p>{dateTime.format(new Date(purchase.purchaseDate || purchase.createdAt))} · {purchase.purchaseItems?.length || 0} productos</p>
            </div>
            <strong>{money.format(Number(purchase.total || 0))}</strong>
          </div>
          <div className="purchase-card__items">
            {purchase.purchaseItems?.map((item) => <span key={item.id}>{item.product?.name} × {item.quantity}</span>)}
          </div>
          <div className="supplier-card__actions">
            <button type="button" onClick={() => onDetail(purchase)}><Eye size={15} /> Ver detalle</button>
            {purchase.status === 'DRAFT' ? (
              <>
                <button type="button" className="purchase-confirm" onClick={() => onConfirm(purchase)} disabled={saving}><Check size={15} /> Confirmar</button>
                <button type="button" onClick={() => onCancel(purchase)}>Anular</button>
              </>
            ) : null}
          </div>
        </article>
      ))}
      {!loading && !purchases.length ? <p className="suppliers-empty">No hay compras para mostrar.</p> : null}
    </div>
  );
}
