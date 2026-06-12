import { useCallback, useState } from 'react';
import InventoryMetrics from '../components/inventory/InventoryMetrics';
import InventoryPagination from '../components/inventory/InventoryPagination';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryToolbar from '../components/inventory/InventoryToolbar';
import ProductDrawer from '../components/inventory/ProductDrawer';
import MovementHistory from '../components/MovementHistory';
import useInventoryFilters from '../hooks/useInventoryFilters';
import useInventoryProducts from '../hooks/useInventoryProducts';

export default function StockDashboard() {
  const inventory = useInventoryProducts();
  const {
    products,
    metrics,
    selectedProduct,
    movements,
    movementFilters,
    loading,
    error,
    message,
    setMessage,
    reload,
    loadMovements,
    handleMovementFilterChange,
    applyMovementFilters
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
      loadMovements(product.productId);
    },
    [loadMovements]
  );

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

      <InventoryMetrics metrics={metrics} />

      <div className="card inventory-workspace">
        <InventoryToolbar
          filters={inventoryFilters.filters}
          categories={inventoryFilters.categories}
          onFilterChange={inventoryFilters.updateFilter}
          onNewProduct={openCreateDrawer}
        />
        <InventoryTable
          products={inventoryFilters.paginatedProducts}
          sort={inventoryFilters.sort}
          onSort={inventoryFilters.updateSort}
          onEdit={openEditDrawer}
          onDuplicate={openDuplicateDrawer}
          onHistory={handleHistory}
          loading={loading}
        />
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

      <MovementHistory
        movements={movements}
        selectedProduct={selectedProduct}
        filters={movementFilters}
        onFilterChange={handleMovementFilterChange}
        onApplyFilters={applyMovementFilters}
      />

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
