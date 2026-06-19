import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Plus, RefreshCw, Search, TriangleAlert } from 'lucide-react';
import EntityDrawer from '../components/common/EntityDrawer';
import WasteForm from '../components/waste/WasteForm';
import { api } from '../services/api';
import { formatDateTime, toLocalDateTimeInput } from '../utils/dateTime';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const reasonLabels = {
  EXPIRED: 'Vencido',
  BROKEN: 'Roto',
  THEFT: 'Robo',
  LOSS: 'Pérdida',
  LOAD_ERROR: 'Error de carga',
  INTERNAL_USE: 'Consumo interno',
  OTHER: 'Otro'
};

const emptyWaste = () => ({ productId: '', quantity: '', reason: '', note: '', date: toLocalDateTimeInput(), requestId: crypto.randomUUID() });

export default function WastePage() {
  const [waste, setWaste] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ productId: '', reason: '', from: '', to: '' });
  const [form, setForm] = useState(emptyWaste);
  const [drawer, setDrawer] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const [wasteResponse, productResponse] = await Promise.all([
        api.get('/waste', { params }),
        api.get('/products')
      ]);
      setWaste(wasteResponse.data || []);
      setProducts((productResponse.data || []).filter((product) => product.isActive !== false));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo cargar el historial de mermas');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const metrics = useMemo(() => {
    const now = new Date();
    const monthWaste = waste.filter((item) => {
      const date = new Date(item.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const counts = monthWaste.reduce((result, item) => {
      result[item.reason] = (result[item.reason] || 0) + 1;
      return result;
    }, {});
    const frequentReason = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      records: monthWaste.length,
      products: monthWaste.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      value: monthWaste.reduce((sum, item) => sum + Number(item.totalCost || 0), 0),
      reason: frequentReason ? reasonLabels[frequentReason] : 'Sin datos'
    };
  }, [waste]);

  const createWaste = async (event) => {
    event.preventDefault();
    const product = products.find((item) => item.id === form.productId);
    if (!product) return setError('Seleccioná un producto');
    if (Number(form.quantity) > Number(product.stock)) return setError(`La cantidad no puede superar el stock disponible (${product.stock})`);
    const selectedDate = new Date(form.date);
    if (!form.date || Number.isNaN(selectedDate.getTime())) return setError('Ingresá una fecha y hora válidas');
    if (selectedDate.getTime() > Date.now()) return setError('La fecha y hora de la merma no puede ser futura');
    setSaving(true);
    setError('');
    try {
      await api.post('/waste', { ...form, date: selectedDate.toISOString(), quantity: Number(form.quantity) });
      setDrawer('');
      setForm(emptyWaste());
      setMessage('Merma registrada y stock actualizado');
      window.setTimeout(() => setMessage(''), 3500);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo registrar la merma');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page waste-page">
      <header className="waste-header">
        <div>
          <p className="inventory-kicker">Control de pérdidas</p>
          <h1>Merma</h1>
          <p>Registrá bajas de stock por vencimientos, pérdidas, roturas o imprevistos</p>
        </div>
        <button type="button" className="inventory-primary-action" onClick={() => { setForm(emptyWaste()); setDrawer('form'); }}>
          <Plus size={17} /> Nueva merma
        </button>
      </header>

      {error ? <p className="inventory-error">{error}</p> : null}
      {message ? <p className="inventory-success">{message}</p> : null}

      <section className="waste-metrics">
        <article><span>Mermas del mes</span><strong>{metrics.records}</strong></article>
        <article><span>Productos dados de baja</span><strong>{metrics.products}</strong></article>
        <article><span>Valor perdido</span><strong>{money.format(metrics.value)}</strong></article>
        <article><span>Motivo más frecuente</span><strong>{metrics.reason}</strong></article>
      </section>

      <section className="card waste-history">
        <div className="waste-filters">
          <label className="waste-filter-search"><Search size={17} />
            <select value={filters.productId} onChange={(event) => setFilters((current) => ({ ...current, productId: event.target.value }))}>
              <option value="">Todos los productos</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <label>Motivo
            <select value={filters.reason} onChange={(event) => setFilters((current) => ({ ...current, reason: event.target.value }))}>
              <option value="">Todos</option>
              {Object.entries(reasonLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label>Desde<input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
          <label>Hasta<input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
          <button type="button" className="suppliers-refresh" onClick={loadData}><RefreshCw size={16} /> Actualizar</button>
        </div>

        <div className="waste-table-wrap">
          <table className="inventory-table waste-table">
            <thead><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Motivo</th><th>Valor perdido</th><th>Usuario</th><th>Observación</th><th>Acciones</th></tr></thead>
            <tbody>
              {!loading && waste.map((item) => (
                <tr key={item.id}>
                  <td data-label="Fecha">{formatDateTime(item.date)}</td>
                  <td data-label="Producto"><strong>{item.product?.name || 'Producto no disponible'}</strong></td>
                  <td data-label="Cantidad">{item.quantity}</td>
                  <td data-label="Motivo"><span className={`waste-reason waste-reason--${item.reason.toLowerCase()}`}>{reasonLabels[item.reason] || item.reason}</span></td>
                  <td data-label="Valor perdido">{money.format(item.totalCost || 0)}</td>
                  <td data-label="Usuario">{item.createdBy?.name || 'Sistema'}</td>
                  <td data-label="Observación">{item.note || '-'}</td>
                  <td data-label="Acciones"><button className="waste-detail-button" type="button" onClick={() => { setSelected(item); setDrawer('detail'); }}><Eye size={16} /> Ver</button></td>
                </tr>
              ))}
              {!loading && !waste.length ? <tr><td colSpan="8" className="inventory-table__empty">No hay mermas registradas para los filtros seleccionados</td></tr> : null}
              {loading ? <tr><td colSpan="8" className="inventory-table__empty">Cargando mermas...</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {drawer === 'form' ? (
        <EntityDrawer eyebrow="Inventario" title="Nueva merma" wide onClose={() => !saving && setDrawer('')}>
          <WasteForm products={products} value={form} onChange={setForm} onSubmit={createWaste} saving={saving} money={money} />
        </EntityDrawer>
      ) : null}
      {drawer === 'detail' && selected ? (
        <EntityDrawer eyebrow="Auditoría de stock" title="Detalle de merma" onClose={() => setDrawer('')}>
          <div className="waste-detail">
            <TriangleAlert size={32} />
            <dl>
              <div><dt>Producto</dt><dd>{selected.product?.name}</dd></div>
              <div><dt>Fecha</dt><dd>{formatDateTime(selected.date)}</dd></div>
              <div><dt>Motivo</dt><dd>{reasonLabels[selected.reason]}</dd></div>
              <div><dt>Cantidad</dt><dd>{selected.quantity}</dd></div>
              <div><dt>Stock</dt><dd>{selected.previousStock} → {selected.newStock}</dd></div>
              <div><dt>Costo unitario</dt><dd>{money.format(selected.unitCost)}</dd></div>
              <div><dt>Valor perdido</dt><dd>{money.format(selected.totalCost)}</dd></div>
              <div><dt>Registrado por</dt><dd>{selected.createdBy?.name || 'Sistema'}</dd></div>
              <div><dt>Observación</dt><dd>{selected.note || 'Sin observación'}</dd></div>
            </dl>
          </div>
        </EntityDrawer>
      ) : null}
    </div>
  );
}
