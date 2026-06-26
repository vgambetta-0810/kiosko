import { useState } from 'react';
import SearchableCreatableCombobox from '../common/SearchableCreatableCombobox';
import { api } from '../../services/api';
import CreateSupplierDrawer, { buildInitialSupplier } from './CreateSupplierDrawer';

const getSupplierLabel = (supplier) => supplier?.name || '';
const getSupplierValue = (supplier) => supplier?.id || '';
const getSupplierDescription = (supplier) => [supplier?.businessName, supplier?.cuit, supplier?.email, supplier?.phone]
  .filter(Boolean)
  .join(' - ');

export default function PurchaseSupplierSelector({
  selectedSupplier,
  options,
  loading,
  error,
  onSearch,
  onSelect,
  onClear,
  onInputChange,
  onCreated
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const openCreate = (name) => {
    setSupplierForm(buildInitialSupplier(name));
    setCreateError('');
    setDrawerOpen(true);
  };

  const saveSupplier = async (event) => {
    event.preventDefault();
    setSaving(true);
    setCreateError('');
    try {
      const { data } = await api.post('/suppliers', supplierForm);
      setDrawerOpen(false);
      onCreated(data);
      onSelect(data);
    } catch (requestError) {
      setCreateError(requestError?.response?.data?.message || 'No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SearchableCreatableCombobox
        id="purchase-supplier"
        label="Proveedor"
        required
        selectedOption={selectedSupplier}
        options={options}
        placeholder="Buscar proveedor o crear nuevo"
        loading={loading}
        loadingLabel="Buscando..."
        error={error}
        allowCreate
        clearSelectionOnInput
        createDescription="Abrir alta rapida de proveedor"
        createLabel={(query) => `Crear proveedor "${query}"`}
        createOnNoResultsOnly
        filterOptions={false}
        keepQueryOnBlur
        getOptionLabel={getSupplierLabel}
        getOptionValue={getSupplierValue}
        getOptionDescription={getSupplierDescription}
        onSearch={onSearch}
        onSelect={onSelect}
        onCreate={(query) => {
          openCreate(query);
          return null;
        }}
        onClear={onClear}
        onInputChange={onInputChange}
      />
      {drawerOpen ? (
        <CreateSupplierDrawer
          initialName={supplierForm?.name || ''}
          value={supplierForm}
          saving={saving}
          error={createError}
          onChange={setSupplierForm}
          onClose={() => setDrawerOpen(false)}
          onSubmit={saveSupplier}
        />
      ) : null}
    </>
  );
}
