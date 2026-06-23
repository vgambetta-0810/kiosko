import { memo } from 'react';
import CategoryCombobox from './CategoryCombobox';
import { blockNonIntegerKeys, isUnsignedIntegerInput } from '../../utils/quantity';

function ProductForm({
  form,
  categories,
  selectedCategory,
  categoryInput,
  categoryLoading,
  categoryError,
  saving,
  error,
  mode,
  onChange,
  onSubmit,
  onCategorySearch,
  onCategorySelect,
  onCategoryInputChange,
  onCategoryClear
}) {
  return (
    <form className="product-form" onSubmit={onSubmit}>
      <label>
        Nombre
        <input name="name" value={form.name} onChange={onChange} required />
      </label>
      <label>
        Código de barras
        <input
          name="codigoBarras"
          value={form.codigoBarras}
          onChange={onChange}
          placeholder="Escanear o ingresar código de barras"
        />
      </label>
      <div className="product-form__field">
        <label htmlFor="inventory-product-category">Categoria</label>
        <CategoryCombobox
          id="inventory-product-category"
          value={categoryInput}
          options={categories}
          selectedOption={selectedCategory[0]}
          isLoading={categoryLoading}
          error={categoryError}
          disabled={saving}
          placeholder="Buscar categoría o crear nueva"
          onSearch={onCategorySearch}
          onSelect={onCategorySelect}
          onInputChange={onCategoryInputChange}
          onClear={onCategoryClear}
        />
      </div>
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
        <input name="stock" type="number" min="0" step="1" value={form.stock} onKeyDown={blockNonIntegerKeys} onChange={(event) => isUnsignedIntegerInput(event.target.value) && onChange(event)} />
      </label>
      {error ? <small className="inventory-error">{error}</small> : null}
      <button type="submit" className="inventory-primary-action" disabled={saving}>
        {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear producto'}
      </button>
    </form>
  );
}

export default memo(ProductForm);
