const statusLabels = { DRAFT: 'Borrador', CONFIRMED: 'Confirmada', CANCELLED: 'Anulada' };

export default function PurchaseDetail({ purchase, money, dateTime }) {
  return (
    <div className="purchase-detail">
      <div className="purchase-detail__summary">
        <span className={`purchase-status purchase-status--${purchase.status.toLowerCase()}`}>{statusLabels[purchase.status] || purchase.status}</span>
        <h3>{purchase.supplier?.name || 'Proveedor'}</h3>
        <p>{dateTime.format(new Date(purchase.purchaseDate || purchase.createdAt))}</p>
      </div>
      <div className="purchase-detail__items">
        {purchase.purchaseItems?.map((item) => (
          <div key={item.id}>
            <span>{item.product?.name || 'Producto'}</span>
            <span>{item.quantity} × {money.format(Number(item.unitCost || 0))}</span>
            <strong>{money.format(Number(item.subtotal || item.quantity * item.unitCost || 0))}</strong>
          </div>
        ))}
      </div>
      {purchase.notes ? <div className="purchase-detail__notes"><strong>Observaciones</strong><p>{purchase.notes}</p></div> : null}
      <div className="purchase-detail__total"><span>Total</span><strong>{money.format(Number(purchase.total || 0))}</strong></div>
    </div>
  );
}
