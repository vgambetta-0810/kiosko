import { X } from 'lucide-react';

export default function EntityDrawer({ eyebrow, title, children, onClose, wide = false }) {
  return (
    <div className="supplier-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className={`supplier-drawer${wide ? ' supplier-drawer--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="supplier-drawer__header">
          <div>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
