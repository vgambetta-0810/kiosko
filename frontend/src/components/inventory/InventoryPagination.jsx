import { memo } from 'react';

function InventoryPagination({ page, pageSize, pageSizeOptions, totalItems, totalPages, onPageChange, onPageSizeChange }) {
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(totalItems, page * pageSize);

  return (
    <footer className="inventory-pagination">
      <span>
        {firstItem}-{lastItem} de {totalItems}
      </span>
      <div className="inventory-pagination__controls">
        <select value={pageSize} onChange={(event) => onPageSizeChange(event.target.value)} aria-label="Productos por pagina">
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} por pagina
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
          Anterior
        </button>
        <strong>
          {page} / {totalPages}
        </strong>
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
          Siguiente
        </button>
      </div>
    </footer>
  );
}

export default memo(InventoryPagination);
