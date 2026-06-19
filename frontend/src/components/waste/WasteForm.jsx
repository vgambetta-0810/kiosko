import { useMemo, useState } from 'react';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import { toLocalDateTimeInput } from '../../utils/dateTime';

const reasons = [
  ['EXPIRED', 'Vencido'],
  ['BROKEN', 'Roto'],
  ['THEFT', 'Robo'],
  ['LOSS', 'Pérdida'],
  ['LOAD_ERROR', 'Error de carga'],
  ['INTERNAL_USE', 'Consumo interno'],
  ['OTHER', 'Otro']
];

export default function WasteForm({ products, value, onChange, onSubmit, saving, money }) {
  const [productSearch, setProductSearch] = useState('');
  const selectedProduct = products.find((product) => product.id === value.productId);
  const matches = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products.slice(0, 8);
    return products.filter((product) =>
      [product.name, product.sku, product.codigoBarras].filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(query))
    ).slice(0, 8);
  }, [productSearch, products]);
  const total = Number(value.quantity || 0) * Number(selectedProduct?.cost || 0);

  return (
    <form className="waste-form" onSubmit={onSubmit}>
      <label className="waste-form__field">
        <span>Producto</span>
        <div className="waste-product-picker">
          <div className="waste-product-picker__search">
            <PackageSearch size={18} />
            <input
              value={selectedProduct ? selectedProduct.name : productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                onChange({ ...value, productId: '' });
              }}
              onFocus={() => {
                if (selectedProduct) {
                  setProductSearch(selectedProduct.name);
                  onChange({ ...value, productId: '' });
                }
              }}
              placeholder="Buscar por nombre, SKU o código"
              autoComplete="off"
              required={!value.productId}
            />
          </div>
          {!selectedProduct && productSearch ? (
            <div className="waste-product-picker__options">
              {matches.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => {
                    onChange({ ...value, productId: product.id, quantity: '' });
                    setProductSearch('');
                  }}
                >
                  <strong>{product.name}</strong>
                  <span>Stock: {product.stock} · Costo: {money.format(product.cost || 0)}</span>
                </button>
              ))}
              {!matches.length ? <p>No se encontraron productos.</p> : null}
            </div>
          ) : null}
        </div>
      </label>

      {selectedProduct ? (
        <div className="waste-form__stock">
          <span>Stock disponible</span>
          <strong>{selectedProduct.stock}</strong>
        </div>
      ) : null}

      <div className="waste-form__grid">
        <label className="waste-form__field">
          <span>Cantidad</span>
          <input type="number" min="0.01" step="any" max={selectedProduct?.stock} value={value.quantity} onChange={(event) => onChange({ ...value, quantity: event.target.value })} required />
        </label>
        <label className="waste-form__field">
          <span>Motivo</span>
          <select value={value.reason} onChange={(event) => onChange({ ...value, reason: event.target.value })} required>
            <option value="">Seleccionar motivo</option>
            {reasons.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="waste-form__field">
          <span>Fecha y hora</span>
          <input
            type="datetime-local"
            max={toLocalDateTimeInput()}
            step="60"
            value={value.date}
            onChange={(event) => onChange({ ...value, date: event.target.value })}
            required
          />
        </label>
        <label className="waste-form__field">
          <span>Costo unitario actual</span>
          <input value={money.format(selectedProduct?.cost || 0)} readOnly />
        </label>
      </div>

      <label className="waste-form__field">
        <span>Observación <small>(opcional)</small></span>
        <textarea rows="4" maxLength="1000" value={value.note} onChange={(event) => onChange({ ...value, note: event.target.value })} placeholder="Agregá información útil para la auditoría" />
      </label>

      <div className="waste-form__total">
        <div><span>Valor total perdido</span><strong>{money.format(total)}</strong></div>
        <p><AlertTriangle size={16} /> Al confirmar, el stock se descontará inmediatamente.</p>
      </div>

      <button className="inventory-primary-action waste-form__submit" type="submit" disabled={saving || !selectedProduct}>
        {saving ? 'Registrando...' : 'Confirmar merma'}
      </button>
    </form>
  );
}
