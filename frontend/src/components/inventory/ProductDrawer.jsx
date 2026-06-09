import { memo } from 'react';
import useProductForm from '../../hooks/useProductForm';
import ProductForm from './ProductForm';

const titles = {
  create: 'Nuevo Producto',
  edit: 'Editar Producto',
  duplicate: 'Duplicar Producto'
};

function ProductDrawer({ isOpen, mode, product, onClose, onSaved }) {
  const formState = useProductForm({ mode, product, isOpen, onSaved });

  if (!isOpen) return null;

  return (
    <div className="product-drawer-backdrop" role="presentation">
      <aside className="product-drawer" role="dialog" aria-modal="true" aria-labelledby="product-drawer-title">
        <header className="product-drawer__header">
          <div>
            <span>Inventario</span>
            <h2 id="product-drawer-title">{titles[mode] || titles.create}</h2>
          </div>
          <button type="button" className="product-drawer__close" onClick={onClose} aria-label="Cerrar">
            X
          </button>
        </header>
        <ProductForm
          form={formState.form}
          categories={formState.categories}
          selectedCategory={formState.selectedCategory}
          categoryInput={formState.categoryInput}
          categoryLoading={formState.categoryLoading}
          categoryError={formState.categoryError}
          saving={formState.saving}
          error={formState.error}
          mode={mode}
          onChange={formState.handleChange}
          onSubmit={formState.submit}
          onCategorySearch={formState.searchCategories}
          onCategorySelect={formState.selectCategory}
          onCategoryInputChange={formState.changeCategoryInput}
          onCategoryClear={formState.clearCategory}
        />
      </aside>
    </div>
  );
}

export default memo(ProductDrawer);
