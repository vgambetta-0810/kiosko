import { memo, useEffect, useRef, useState } from 'react';

function InventoryProductActionsMenu({ product, onEdit, onDuplicate, onHistory }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="mobile-actions-menu" ref={ref}>
      <button
        type="button"
        className="mobile-actions-menu__trigger"
        aria-label="Acciones del producto"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Acciones <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div className="mobile-actions-menu__dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEdit(product);
              setOpen(false);
            }}
          >
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDuplicate(product);
              setOpen(false);
            }}
          >
            Duplicar
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onHistory(product);
              setOpen(false);
            }}
          >
            Ver historial
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(InventoryProductActionsMenu);
