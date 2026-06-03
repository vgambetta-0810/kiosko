import { memo } from 'react';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';

function ProductForm({
  form,
  categories,
  selectedCategory,
  categoryLoading,
  saving,
  error,
  mode,
  onChange,
  onSubmit,
  onCategorySearch,
  onCategoryChange,
  onCategoryInputChange
}) {
  return (
    <form className="product-form" onSubmit={onSubmit}>
      <label>
        Nombre
        <input name="name" value={form.name} onChange={onChange} required />
      </label>
      <label>
        SKU
        <input name="sku" value={form.sku} onChange={onChange} placeholder="Opcional" />
      </label>
      <label>
        Codigo de barras
        <input name="codigoBarras" value={form.codigoBarras} onChange={onChange} placeholder="Opcional" />
      </label>
      <label>
        Categoria
        <AsyncTypeahead
          id="inventory-product-category"
          isLoading={categoryLoading}
          minLength={0}
          allowNew
          onFocus={() => onCategorySearch('')}
          onSearch={onCategorySearch}
          options={categories}
          labelKey="name"
          selected={selectedCategory}
          onChange={onCategoryChange}
          onInputChange={onCategoryInputChange}
          className="category-typeahead"
          newSelectionPrefix="Crear categoria: "
          placeholder="Buscar o crear categoria"
          promptText="Escribi para buscar categoria"
          searchText="Buscando categorias..."
          emptyLabel="Sin coincidencias. Presiona Enter para crear."
        />
      </label>
      <div className="product-form__grid">
        <label>
          Costo
          <input name="cost" type="number" min="0" step="0.01" value={form.cost} onChange={onChange} required />
        </label>
        <label>
          Precio venta
          <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={onChange} required />
        </label>
      </div>
      <label>
        Stock
        <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={onChange} />
      </label>
      {error ? <small className="inventory-error">{error}</small> : null}
      <button type="submit" className="inventory-primary-action" disabled={saving}>
        {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear producto'}
      </button>
    </form>
  );
}

export default memo(ProductForm);
