import { memo } from 'react';

function CheckoutStep({
  cart,
  clients,
  clientId,
  status,
  paymentMethod,
  discount,
  subtotal,
  finalTotal,
  loading,
  onBack,
  onSubmit,
  onClientChange,
  onStatusChange,
  onPaymentMethodChange,
  onDiscountChange
}) {
  return (
    <form
      className="pos-checkout"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h3>Resumen de venta</h3>
      <div className="pos-checkout__summary">
        <div>Items: {cart.length}</div>
        <div>Subtotal: ${subtotal.toFixed(2)}</div>
        <div>Total final: ${finalTotal.toFixed(2)}</div>
      </div>

      <label>
        Descuento
        <input type="number" min="0" max={subtotal} value={discount} onChange={(e) => onDiscountChange(e.target.value)} />
      </label>

      <label>
        Metodo de pago
        <select value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value)}>
          <option value="CASH">CASH</option>
          <option value="TRANSFER">TRANSFER</option>
          <option value="CARD">CARD</option>
          <option value="MP">MP</option>
        </select>
      </label>

      <label>
        Tipo de venta
        <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="PAID">Paid</option>
          <option value="PENDING">Fiado (Pending)</option>
        </select>
      </label>

      <label>
        Cliente (opcional, obligatorio para fiado)
        <select value={clientId} onChange={(e) => onClientChange(e.target.value)}>
          <option value="">No client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.email})
            </option>
          ))}
        </select>
      </label>

      <div className="pos-checkout__actions">
        <button type="button" className="pos-modal__cancel" onClick={onBack} disabled={loading}>Volver</button>
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Finalizar'}</button>
      </div>
    </form>
  );
}

export default memo(CheckoutStep);
