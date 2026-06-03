import { memo } from 'react';

function SKUInput({ value, onChange, onSubmit, inputRef, disabled, loading }) {
  return (
    <div className="pos-sku-input">
      <label htmlFor="sku-input">SKU / Codigo de barras</label>
      <input
        id="sku-input"
        ref={inputRef}
        type="text"
        inputMode="text"
        placeholder="Escanear o escribir SKU"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onSubmit}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        aria-busy={loading}
      />
      <span className="pos-sku-input__status">{loading ? 'Buscando...' : 'Enter para cargar cantidad'}</span>
    </div>
  );
}

export default memo(SKUInput);
