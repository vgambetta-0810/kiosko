import { memo } from 'react';
import InventoryProductCard from './InventoryProductCard';

function InventoryMobileList({ products, onEdit, onDuplicate, onHistory, loading }) {
  if (loading) {
    return (
      <div className="inv-mobile-list">
        <p className="inv-mobile-list__empty">Cargando productos...</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="inv-mobile-list">
        <p className="inv-mobile-list__empty">No hay productos que coincidan con los filtros.</p>
      </div>
    );
  }

  return (
    <div className="inv-mobile-list">
      {products.map((product) => (
        <InventoryProductCard
          key={product.productId}
          product={product}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onHistory={onHistory}
        />
      ))}
    </div>
  );
}

export default memo(InventoryMobileList);
