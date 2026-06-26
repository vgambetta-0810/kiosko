import EntityDrawer from '../common/EntityDrawer';
import SupplierForm, { emptySupplier } from '../suppliers/SupplierForm';

const buildInitialSupplier = (name) => ({
  ...emptySupplier,
  name,
  businessName: name
});

export default function CreateSupplierDrawer({
  initialName,
  value,
  saving,
  error,
  onChange,
  onClose,
  onSubmit
}) {
  return (
    <EntityDrawer eyebrow="Proveedores" title="Crear proveedor" onClose={onClose}>
      {error ? <p className="inventory-error" role="alert">{error}</p> : null}
      <SupplierForm
        value={value || buildInitialSupplier(initialName)}
        saving={saving}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    </EntityDrawer>
  );
}

export { buildInitialSupplier };
