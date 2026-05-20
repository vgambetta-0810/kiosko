import { memo } from 'react';

function SKUInput({ value, onChange, onSubmit, inputRef, disabled }) {
  return (
    <div className="pos-sku-input">
      <label htmlFor="sku-input">SKU / Codigo de producto</label>
      <input
        id="sku-input"
        ref={inputRef}
        placeholder="Escanear o escribir SKU y presionar Enter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onSubmit}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
      />
    </div>
  );
}

export default memo(SKUInput);
