import { memo, useEffect, useState } from 'react';

function QuantityModal({ isOpen, product, onConfirm, onCancel, inputRef }) {
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (!isOpen) return;
    setQuantity('1');
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(quantity);
  };

  return (
    <div className="pos-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="pos-modal" role="dialog" aria-modal="true" aria-labelledby="quantity-title" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="quantity-title">Cantidad</h2>
        <p className="pos-modal__product">{product.name}</p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="number"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="pos-modal__qty-input"
          />
          <div className="pos-modal__actions">
            <button type="submit">Agregar</button>
            <button type="button" onClick={onCancel} className="pos-modal__cancel">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default memo(QuantityModal);
