import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EntityDrawer from '../components/common/EntityDrawer';
import KpiGrid from '../components/common/KpiGrid';
import SupplierForm, { emptySupplier } from '../components/suppliers/SupplierForm';
import SupplierList from '../components/suppliers/SupplierList';
import SupplierProductLinks from '../components/suppliers/SupplierProductLinks';
import { api } from '../services/api';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const emptyLink = { productId: '', supplierSku: '', lastCost: '', preferred: false };

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [allLinks, setAllLinks] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [linkForm, setLinkForm] = useState(emptyLink);
  const [editingSupplierId, setEditingSupplierId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3500);
  };

  const loadLinks = useCallback(async (supplierId) => {
    if (!supplierId) return setLinks([]);
    try {
      const { data } = await api.get(`/suppliers/${supplierId}/products`);
      setLinks(data || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudieron cargar los productos del proveedor');
    }
  }, []);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [supplierResponse, productResponse] = await Promise.all([api.get('/suppliers'), api.get('/products')]);
      const nextSuppliers = supplierResponse.data || [];
      setSuppliers(nextSuppliers);
      setProducts(productResponse.data || []);
      const linkResponses = await Promise.all(nextSuppliers.map((supplier) => api.get(`/suppliers/${supplier.id}/products`)));
      setAllLinks(linkResponses.flatMap((response) => response.data || []));
      setSelectedSupplierId((current) => current || nextSuppliers.find((supplier) => supplier.isActive)?.id || '');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudieron cargar los proveedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { loadLinks(selectedSupplierId); }, [loadLinks, selectedSupplierId]);

  const metrics = useMemo(() => {
    const assignedIds = new Set(allLinks.filter((link) => link.isActive !== false).map((link) => link.productId));
    const activeProducts = products.filter((product) => product.isActive);
    return {
      active: suppliers.filter((supplier) => supplier.isActive).length,
      inactive: suppliers.filter((supplier) => !supplier.isActive).length,
      withSupplier: activeProducts.filter((product) => assignedIds.has(product.id)).length,
      withoutSupplier: activeProducts.filter((product) => !assignedIds.has(product.id)).length
    };
  }, [allLinks, products, suppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) => [supplier.name, supplier.businessName, supplier.cuit, supplier.email]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [supplierQuery, suppliers]);

  const openSupplier = (supplier) => {
    setEditingSupplierId(supplier?.id || '');
    setSupplierForm(supplier ? { ...emptySupplier, ...supplier } : emptySupplier);
    setDrawerOpen(true);
  };

  const saveSupplier = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingSupplierId) await api.patch(`/suppliers/${editingSupplierId}`, supplierForm);
      else await api.post('/suppliers', supplierForm);
      setDrawerOpen(false);
      showMessage(editingSupplierId ? 'Proveedor actualizado' : 'Proveedor creado');
      await loadBase();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const toggleSupplier = async (supplier) => {
    setError('');
    try {
      await api.patch(`/suppliers/${supplier.id}/status`, { isActive: !supplier.isActive });
      showMessage(`Proveedor ${supplier.isActive ? 'desactivado' : 'activado'}`);
      await loadBase();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo cambiar el estado');
    }
  };

  const addProductLink = async (event) => {
    event.preventDefault();
    if (!selectedSupplierId || !linkForm.productId) return setError('Seleccioná proveedor y producto');
    setSaving(true);
    setError('');
    try {
      await api.post(`/suppliers/${selectedSupplierId}/products`, {
        ...linkForm,
        lastCost: linkForm.lastCost === '' ? null : Number(linkForm.lastCost)
      });
      setLinkForm(emptyLink);
      showMessage('Producto asociado al proveedor');
      await Promise.all([loadLinks(selectedSupplierId), loadBase()]);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo asociar el producto');
    } finally {
      setSaving(false);
    }
  };

  const removeProductLink = async (link) => {
    if (!window.confirm(`¿Quitar ${link.product?.name || 'este producto'} del proveedor?`)) return;
    try {
      await api.delete(`/suppliers/${selectedSupplierId}/products/${link.productId}`);
      showMessage('Asociación eliminada');
      await Promise.all([loadLinks(selectedSupplierId), loadBase()]);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo quitar la asociación');
    }
  };

  const updateLink = async (link, payload, success) => {
    try {
      await api.patch(`/suppliers/${selectedSupplierId}/products/${link.productId}`, payload);
      showMessage(success);
      await Promise.all([loadLinks(selectedSupplierId), loadBase()]);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo actualizar la asociación');
    }
  };

  const editLinkCost = (link) => {
    const value = window.prompt('Nuevo costo sugerido', link.lastCost ?? '');
    if (value === null) return;
    const lastCost = Number(value);
    if (!Number.isFinite(lastCost) || lastCost < 0) return setError('Ingresá un costo válido');
    updateLink(link, { lastCost }, 'Costo sugerido actualizado');
  };

  return (
    <div className="page suppliers-page">
      <header className="suppliers-header">
        <div><p className="suppliers-kicker">Abastecimiento</p><h1>Proveedores</h1><p>Gestioná proveedores y productos asociados</p></div>
        <button type="button" className="inventory-primary-action" onClick={() => openSupplier(null)}><Plus size={17} /> Nuevo proveedor</button>
      </header>
      {error ? <p className="inventory-error">{error}</p> : null}
      {message ? <p className="inventory-success">{message}</p> : null}
      <KpiGrid
        ariaLabel="Resumen de proveedores"
        items={[
          { label: 'Proveedores activos', value: metrics.active },
          { label: 'Proveedores inactivos', value: metrics.inactive },
          { label: 'Productos con proveedor', value: metrics.withSupplier },
          { label: 'Productos sin proveedor', value: metrics.withoutSupplier },
        ]}
      />
      <div className="card suppliers-workspace">
        <section className="suppliers-panel">
          <div className="suppliers-panel__header">
            <label className="suppliers-search"><Search size={17} /><input value={supplierQuery} onChange={(event) => setSupplierQuery(event.target.value)} placeholder="Buscar por nombre, CUIT o email" /></label>
            <button type="button" className="suppliers-refresh" onClick={loadBase} disabled={loading}>{loading ? <LoaderCircle className="sales-action-spinner" size={16} /> : <RefreshCw size={16} />} Actualizar</button>
          </div>
          <SupplierList
            suppliers={filteredSuppliers}
            loading={loading}
            onEdit={openSupplier}
            onToggle={toggleSupplier}
            onSelect={setSelectedSupplierId}
            onNewPurchase={(supplierId) => navigate(`/compras?supplierId=${supplierId}&new=1`)}
          />
          <SupplierProductLinks
            suppliers={suppliers}
            products={products}
            selectedSupplierId={selectedSupplierId}
            links={links}
            linkForm={linkForm}
            productQuery={productQuery}
            saving={saving}
            money={money}
            onSupplierChange={setSelectedSupplierId}
            onProductQueryChange={setProductQuery}
            onLinkFormChange={setLinkForm}
            onAdd={addProductLink}
            onRemove={removeProductLink}
            onPreferred={(link) => updateLink(link, { preferred: true }, 'Proveedor preferido actualizado')}
            onEditCost={editLinkCost}
          />
        </section>
      </div>
      {drawerOpen ? (
        <EntityDrawer eyebrow="Proveedores" title={editingSupplierId ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setDrawerOpen(false)}>
          <SupplierForm value={supplierForm} saving={saving} onChange={setSupplierForm} onSubmit={saveSupplier} />
        </EntityDrawer>
      ) : null}
    </div>
  );
}
