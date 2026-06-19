import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import EntityDrawer from '../components/common/EntityDrawer';
import PurchaseDetail from '../components/purchases/PurchaseDetail';
import PurchaseForm, { emptyPurchase } from '../components/purchases/PurchaseForm';
import PurchaseList from '../components/purchases/PurchaseList';
import { api } from '../services/api';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export default function PurchasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSupplierId = searchParams.get('supplierId') || '';
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [supplierLinks, setSupplierLinks] = useState([]);
  const [purchaseForm, setPurchaseForm] = useState(() => emptyPurchase(requestedSupplierId));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [drawer, setDrawer] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3500);
  };

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [supplierResponse, productResponse, purchaseResponse] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products'),
        api.get('/purchases')
      ]);
      setSuppliers(supplierResponse.data || []);
      setProducts(productResponse.data || []);
      setPurchases(purchaseResponse.data || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudieron cargar las compras');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSupplierLinks = useCallback(async (supplierId) => {
    if (!supplierId) return setSupplierLinks([]);
    try {
      const { data } = await api.get(`/suppliers/${supplierId}/products`);
      setSupplierLinks(data || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudieron cargar los productos sugeridos');
    }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { loadSupplierLinks(purchaseForm.supplierId); }, [loadSupplierLinks, purchaseForm.supplierId]);
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setPurchaseForm(emptyPurchase(requestedSupplierId));
      setDrawer('form');
      setSearchParams({}, { replace: true });
    }
  }, [requestedSupplierId, searchParams, setSearchParams]);

  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = purchases.filter((purchase) => {
      const date = new Date(purchase.purchaseDate || purchase.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    return {
      month: thisMonth.length,
      total: thisMonth.filter((purchase) => purchase.status === 'CONFIRMED').reduce((sum, purchase) => sum + Number(purchase.total || 0), 0),
      draft: purchases.filter((purchase) => purchase.status === 'DRAFT').length,
      confirmed: purchases.filter((purchase) => purchase.status === 'CONFIRMED').length
    };
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return purchases.filter((purchase) => {
      const matchesStatus = statusFilter === 'ALL' || purchase.status === statusFilter;
      const matchesQuery = !normalizedQuery || [
        purchase.supplier?.name,
        purchase.notes,
        ...(purchase.purchaseItems || []).map((item) => item.product?.name)
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [purchases, query, statusFilter]);

  const suggestedProductIds = new Set(supplierLinks.filter((link) => link.isActive !== false).map((link) => link.productId));
  const sortedProducts = [...products].filter((product) => product.isActive).sort((a, b) => {
    const suggestedA = suggestedProductIds.has(a.id) ? 0 : 1;
    const suggestedB = suggestedProductIds.has(b.id) ? 0 : 1;
    return suggestedA - suggestedB || a.name.localeCompare(b.name);
  });

  const openPurchase = (supplierId = requestedSupplierId) => {
    const fallbackId = suppliers.find((supplier) => supplier.isActive)?.id || '';
    setPurchaseForm(emptyPurchase(supplierId || fallbackId));
    setDrawer('form');
  };

  const addPurchaseItem = () => {
    const used = new Set(purchaseForm.items.map((item) => item.productId));
    const product = sortedProducts.find((item) => !used.has(item.id));
    if (!product) return setError('No hay más productos disponibles para agregar');
    const link = supplierLinks.find((item) => item.productId === product.id);
    setPurchaseForm((current) => ({
      ...current,
      items: [...current.items, { productId: product.id, quantity: 1, unitCost: link?.lastCost ?? product.cost ?? 0 }]
    }));
  };

  const updatePurchaseItem = (index, field, value) => {
    setPurchaseForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
    }));
  };

  const savePurchase = async (confirm) => {
    if (!purchaseForm.supplierId || !purchaseForm.items.length) return setError('Seleccioná un proveedor y agregá al menos un producto');
    setSaving(true);
    setError('');
    try {
      await api.post('/purchases', { ...purchaseForm, status: confirm ? 'CONFIRMED' : 'DRAFT' });
      setDrawer('');
      showMessage(confirm ? 'Compra confirmada y stock actualizado' : 'Borrador guardado');
      await loadBase();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar la compra');
    } finally {
      setSaving(false);
    }
  };

  const confirmPurchase = async (purchase) => {
    if (!window.confirm('¿Confirmar esta compra? El stock se incrementará inmediatamente.')) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/purchases/${purchase.id}/confirm`);
      showMessage('Compra confirmada y stock actualizado');
      await loadBase();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo confirmar la compra');
    } finally {
      setSaving(false);
    }
  };

  const cancelPurchase = async (purchase) => {
    if (!window.confirm('¿Anular este borrador de compra?')) return;
    try {
      await api.post(`/purchases/${purchase.id}/cancel`);
      showMessage('Compra anulada');
      await loadBase();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo anular la compra');
    }
  };

  return (
    <div className="page suppliers-page">
      <header className="suppliers-header">
        <div><p className="suppliers-kicker">Abastecimiento</p><h1>Compras</h1><p>Registrá compras y reposiciones de stock</p></div>
        <button type="button" className="inventory-primary-action" onClick={() => openPurchase()}><Plus size={17} /> Registrar compra</button>
      </header>
      {error ? <p className="inventory-error">{error}</p> : null}
      {message ? <p className="inventory-success">{message}</p> : null}
      <section className="suppliers-metrics">
        <article><span>Compras del mes</span><strong>{metrics.month}</strong></article>
        <article><span>Total comprado</span><strong>{money.format(metrics.total)}</strong></article>
        <article><span>Compras pendientes</span><strong>{metrics.draft}</strong></article>
        <article><span>Compras confirmadas</span><strong>{metrics.confirmed}</strong></article>
      </section>
      <div className="card suppliers-workspace">
        <section className="suppliers-panel">
          <div className="purchase-filters">
            <label className="suppliers-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proveedor, producto u observación" /></label>
            <label>Estado
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                <option value="DRAFT">Borrador</option>
                <option value="CONFIRMED">Confirmada</option>
                <option value="CANCELLED">Anulada</option>
              </select>
            </label>
            <button type="button" className="suppliers-refresh" onClick={loadBase} disabled={loading}>{loading ? <LoaderCircle className="sales-action-spinner" size={16} /> : <RefreshCw size={16} />} Actualizar</button>
          </div>
          <PurchaseList
            purchases={filteredPurchases}
            loading={loading}
            saving={saving}
            money={money}
            dateTime={dateTime}
            onConfirm={confirmPurchase}
            onCancel={cancelPurchase}
            onDetail={(purchase) => { setSelectedPurchase(purchase); setDrawer('detail'); }}
          />
        </section>
      </div>
      {drawer === 'form' ? (
        <EntityDrawer eyebrow="Compras" title="Registrar compra" wide onClose={() => setDrawer('')}>
          <PurchaseForm
            value={purchaseForm}
            suppliers={suppliers}
            products={sortedProducts}
            suggestedProductIds={suggestedProductIds}
            saving={saving}
            money={money}
            onChange={setPurchaseForm}
            onSupplierChange={(supplierId) => setPurchaseForm((current) => ({ ...current, supplierId }))}
            onAddItem={addPurchaseItem}
            onUpdateItem={updatePurchaseItem}
            onRemoveItem={(index) => setPurchaseForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}
            onSave={savePurchase}
          />
        </EntityDrawer>
      ) : null}
      {drawer === 'detail' && selectedPurchase ? (
        <EntityDrawer eyebrow="Compras" title="Detalle de compra" wide onClose={() => setDrawer('')}>
          <PurchaseDetail purchase={selectedPurchase} money={money} dateTime={dateTime} />
        </EntityDrawer>
      ) : null}
    </div>
  );
}
