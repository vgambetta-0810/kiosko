import { memo } from 'react';

function BarcodeInput({ value, onChange, onSubmit, inputRef, disabled, loading }) {
  return (
    <div className="pos-barcode-input">
      <label htmlFor="barcode-input">Código de barras</label>
      <input
        id="barcode-input"
        ref={inputRef}
        type="text"
        inputMode="text"
        placeholder="Escanear o ingresar código de barras"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onSubmit}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        aria-busy={loading}
      />
      <span className="pos-barcode-input__status">
        {loading ? 'Buscando...' : 'Ingresá un código de barras y presioná Enter. Si está vacío, Enter continúa la venta.'}
      </span>
    </div>
  );
}

export default memo(BarcodeInput);
