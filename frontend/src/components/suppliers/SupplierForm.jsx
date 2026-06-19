export const emptySupplier = {
  name: '',
  businessName: '',
  cuit: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  isActive: true
};

export default function SupplierForm({ value, saving, onChange, onSubmit }) {
  const update = (field, fieldValue) => onChange((current) => ({ ...current, [field]: fieldValue }));

  return (
    <form className="supplier-form" onSubmit={onSubmit}>
      <label>Nombre comercial *<input required value={value.name} onChange={(event) => update('name', event.target.value)} /></label>
      <label>Razón social<input value={value.businessName} onChange={(event) => update('businessName', event.target.value)} /></label>
      <div className="supplier-form__grid">
        <label>CUIT<input value={value.cuit} onChange={(event) => update('cuit', event.target.value)} /></label>
        <label>Teléfono<input value={value.phone} onChange={(event) => update('phone', event.target.value)} /></label>
      </div>
      <label>Email<input type="email" value={value.email} onChange={(event) => update('email', event.target.value)} /></label>
      <label>Dirección<input value={value.address} onChange={(event) => update('address', event.target.value)} /></label>
      <label>Observaciones<textarea rows={4} value={value.notes} onChange={(event) => update('notes', event.target.value)} /></label>
      <button type="submit" className="inventory-primary-action" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar proveedor'}
      </button>
    </form>
  );
}
