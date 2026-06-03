import { memo } from 'react';

function InventoryRowActions({ product, onEdit, onDuplicate, onHistory }) {
  return (
    <div className="inventory-row-actions">
      <button type="button" onClick={() => onEdit(product)}>
        Editar
      </button>
      <button type="button" onClick={() => onDuplicate(product)}>
        Duplicar
      </button>
      <button type="button" onClick={() => onHistory(product)}>
        Historial
      </button>
    </div>
  );
}

export default memo(InventoryRowActions);
