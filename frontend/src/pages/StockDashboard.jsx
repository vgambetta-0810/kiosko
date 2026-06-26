import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryMetrics from '../components/inventory/InventoryMetrics';
import InventoryMobileFilters from '../components/inventory/InventoryMobileFilters';
import InventoryMobileList from '../components/inventory/InventoryMobileList';
import InventoryPagination from '../components/inventory/InventoryPagination';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryToolbar from '../components/inventory/InventoryToolbar';
import ProductDrawer from '../components/inventory/ProductDrawer';
import useInventoryFilters from '../hooks/useInventoryFilters';
import useInventoryProducts from '../hooks/useInventoryProducts';

export default function StockDashboard() {
  const navigate = useNavigate();
  const inventory = useInventoryProducts();
  const {
    products,
    metrics,
    loading,
    error,
    message,
    setMessage,
    reload
  } = inventory;
  const inventoryFilters = useInventoryFilters(products);
  const [drawerState, setDrawerState] = useState({ isOpen: false, mode: 'create', product: null });

  const openCreateDrawer = useCallback(() => {
    setDrawerState({ isOpen: true, mode: 'create', product: null });
  }, []);

  const openEditDrawer = useCallback((product) => {
    setDrawerState({ isOpen: true, mode: 'edit', product });
  }, []);

  const openDuplicateDrawer = useCallback((product) => {
    setDrawerState({ isOpen: true, mode: 'duplicate', product });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleProductSaved = useCallback(async () => {
    await reload();
    setMessage('Producto guardado correctamente');
    closeDrawer();
  }, [closeDrawer, reload, setMessage]);

  const handleHistory = useCallback(
    (product) => {
      navigate(`/movimientos?productId=${encodeURIComponent(product.productId)}`);
    },
    [navigate]
  );

  const filterProps = {
    filters: inventoryFilters.filters,
    categories: inventoryFilters.categories,
    onFilterChange: inventoryFilters.updateFilter,
    onNewProduct: openCreateDrawer
  };

  const listProps = {
    products: inventoryFilters.paginatedProducts,
    onEdit: openEditDrawer,
    onDuplicate: openDuplicateDrawer,
    onHistory: handleHistory,
    loading
  };

  return (
    <div className="page inventory-page">
      <header className="inventory-header">
        <div>
          <p className="inventory-kicker">Gestion comercial</p>
          <h1>Inventario</h1>
        </div>
        <span className="inventory-header__status">{loading ? 'Actualizando...' : 'Catalogo sincronizado'}</span>
      </header>

      {error ? <p className="inventory-error">{error}</p> : null}
      {message ? <p className="inventory-success">{message}</p> : null}

      <InventoryMetrics metrics={metrics} className="inventory-metrics--desktop" />

      <div className="card inventory-workspace">
        {/* Desktop toolbar — hidden on mobile via CSS */}
        <InventoryToolbar {...filterProps} />

        {/* Mobile filters — hidden on desktop via CSS */}
        <InventoryMobileFilters {...filterProps} />

        <InventoryMetrics metrics={metrics} compact className="inventory-metrics--mobile" />

        {/* Desktop table — hidden on mobile via CSS */}
        <InventoryTable
          {...listProps}
          sort={inventoryFilters.sort}
          onSort={inventoryFilters.updateSort}
        />

        {/* Mobile card list — hidden on desktop via CSS */}
        <InventoryMobileList {...listProps} />

        <InventoryPagination
          page={inventoryFilters.page}
          pageSize={inventoryFilters.pageSize}
          pageSizeOptions={inventoryFilters.pageSizeOptions}
          totalItems={inventoryFilters.totalItems}
          totalPages={inventoryFilters.totalPages}
          onPageChange={inventoryFilters.setPage}
          onPageSizeChange={inventoryFilters.updatePageSize}
        />
      </div>

      <ProductDrawer
        isOpen={drawerState.isOpen}
        mode={drawerState.mode}
        product={drawerState.product}
        onClose={closeDrawer}
        onSaved={handleProductSaved}
      />
    </div>
  );
}
