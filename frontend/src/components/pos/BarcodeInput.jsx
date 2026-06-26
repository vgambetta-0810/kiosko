import { memo, useEffect, useState } from 'react';

const MOBILE_HELP_QUERY = '(max-width: 1024px)';

function getSalesHelpText(isMobile) {
  if (isMobile) {
    return 'Escaneá un código o utilizá el botón Buscar producto. Si el campo está vacío, Continuar avanza a la siguiente pantalla.';
  }

  return 'Escaneá un código o presioná F1 para buscar producto. Si está vacío, Enter continúa la venta.';
}

function BarcodeInput({ value, onChange, onOpenSearch, onSubmit, inputRef, disabled, loading }) {
  const [isMobileHelp, setIsMobileHelp] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(MOBILE_HELP_QUERY).matches : false
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia(MOBILE_HELP_QUERY);
    const updateHelpMode = () => setIsMobileHelp(mediaQuery.matches);

    updateHelpMode();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateHelpMode);
      return () => mediaQuery.removeEventListener('change', updateHelpMode);
    }

    mediaQuery.addListener(updateHelpMode);
    return () => mediaQuery.removeListener(updateHelpMode);
  }, []);

  return (
    <div className="pos-barcode-input">
      <label htmlFor="barcode-input">Codigo de barras</label>
      <div className="pos-barcode-input__row">
        <input
          id="barcode-input"
          ref={inputRef}
          type="text"
          inputMode="text"
          placeholder="Escanear o ingresar codigo de barras"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onSubmit}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          aria-busy={loading}
        />
        <button type="button" className="pos-search-open-button" onClick={onOpenSearch} disabled={disabled}>
          Buscar producto
        </button>
      </div>
      <span className="pos-barcode-input__status">
        {loading ? 'Buscando...' : getSalesHelpText(isMobileHelp)}
      </span>
    </div>
  );
}

export default memo(BarcodeInput);
