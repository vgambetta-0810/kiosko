import { memo, useEffect, useState } from 'react';

function QuantityModal({ isOpen, product, onConfirm, onCancel, inputRef }) {
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setQuantity('1');
    setError('');
    const focusId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(focusId);
  }, [inputRef, isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (quantity.trim() === '' || Number.isNaN(Number(quantity))) {
      setError('Ingresá una cantidad válida');
      return;
    }
    onConfirm(quantity);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="pos-modal-backdrop" role="presentation">
      <div className="pos-modal" role="dialog" aria-modal="true" aria-labelledby="quantity-title" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="quantity-title">Cantidad</h2>
        <p className="pos-modal__product">{product.name}</p>
        <p className="pos-modal__meta">
          SKU: {product.sku || product.codigoBarras || product.id} · Stock: {product.stock}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            className="pos-modal__qty-input"
            aria-label={`Cantidad para ${product.name}`}
          />
          {error ? <small className="pos-error">{error}</small> : null}
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
