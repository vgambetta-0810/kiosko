import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, LoaderCircle, PackageCheck, RefreshCw, Search, TicketCheck } from 'lucide-react';
import { api } from '../services/api';
import { blockNonIntegerKeys, isPositiveInteger, isUnsignedIntegerInput } from '../utils/quantity';

const tabs = [
  { key: 'reservations', label: 'Reservas' },
  { key: 'products', label: 'Productos' },
  { key: 'balance', label: 'Saldo / Tarjeta' },
  { key: 'notifications', label: 'Notificaciones' }
];

const statusLabels = {
  ACTIVE: 'Activa',
  RETIRED: 'Retirada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Vencida',
  RETURNED: 'Devuelta',
  COMPRADO: 'Comprado',
  RESERVADO: 'Reservado',
  RETIRADO: 'Retirado',
  CANCELADO: 'Cancelado',
  PENDIENTE: 'Pendiente',
  RECHARGE: 'Carga',
  CONSUMPTION: 'Consumo',
  PAYMENT: 'Pago',
  DEBT: 'Deuda',
  DEDUCTION: 'Descuento',
  ADJUSTMENT: 'Ajuste'
};

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

const sumReservationItems = (reservation) => (reservation.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
const reservationProducts = (reservation) => (reservation.items || []).map((item) => item.product?.name || 'Producto').join(', ');
const normalize = (value) => String(value || '').trim().toLocaleLowerCase('es');
const movementDelta = (movement) => {
  if (movement.delta !== null && movement.delta !== undefined) return Number(movement.delta);
  return ['PAYMENT', 'CONSUMPTION', 'DEDUCTION'].includes(movement.type)
    ? -Number(movement.amount || 0)
    : Number(movement.amount || 0);
};

function Drawer({ title, children, onClose }) {
  return (
    <div className="client-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="client-drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="client-drawer__header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            X
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

export default function ClientPanel() {
  const [activeTab, setActiveTab] = useState('products');
  const [dashboard, setDashboard] = useState({ summary: { balance: 0, activeReservations: 0, productRecords: 0, unreadNotifications: 0 } });
  const [reservations, setReservations] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [productHistory, setProductHistory] = useState([]);
  const [balanceData, setBalanceData] = useState({ account: { balance: 0 }, movements: [] });
  const [notifications, setNotifications] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reserveQuantity, setReserveQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [drawer, setDrawer] = useState(null);

  const summary = dashboard.summary || {};
  const activeReservations = useMemo(() => reservations.filter((reservation) => reservation.status === 'ACTIVE').length, [reservations]);
  const unreadNotifications = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);
  const visibleBalance = Number(balanceData?.account?.balance ?? summary.balance ?? 0);
  const balanceMovements = balanceData?.movements || [];
  const lastRecharge = balanceMovements.find((movement) => movement.type === 'RECHARGE');
  const lastConsumption = balanceMovements.find((movement) => ['CONSUMPTION', 'PAYMENT'].includes(movement.type));
  const visibleCards = dashboard.clients || [];
  const cardStatus = !visibleCards.some((client) => client.cardId)
    ? 'Sin tarjeta asociada'
    : visibleCards.every((client) => client.isActive !== false)
      ? 'Activa'
      : 'Inactiva';

  const categories = useMemo(() => {
    const names = catalog.map((product) => product.category).filter(Boolean);
    return ['ALL', ...Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'es'))];
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const query = normalize(productQuery);
    return catalog.filter((product) => {
      const matchesQuery = !query || [product.name, product.category, product.codigoBarras, product.sku].filter(Boolean).some((value) => normalize(value).includes(query));
      const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [catalog, categoryFilter, productQuery]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, reservationsRes, productsRes, historyRes, balanceRes, notificationsRes] = await Promise.all([
        api.get('/client/me'),
        api.get('/client/me/reservations'),
        api.get('/client/me/products'),
        api.get('/client/me/product-history'),
        api.get('/client/me/balance'),
        api.get('/client/me/notifications')
      ]);
      setDashboard(meRes.data || {});
      setReservations(reservationsRes.data || []);
      setCatalog(productsRes.data || []);
      setProductHistory(historyRes.data || []);
      setBalanceData(balanceRes.data || { account: { balance: 0 }, movements: [] });
      setNotifications(notificationsRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar tu panel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refreshAfterOperation = async () => {
    const [meRes, reservationsRes, productsRes, historyRes, balanceRes] = await Promise.all([
      api.get('/client/me'),
      api.get('/client/me/reservations'),
      api.get('/client/me/products'),
      api.get('/client/me/product-history'),
      api.get('/client/me/balance')
    ]);
    setDashboard(meRes.data || {});
    setReservations(reservationsRes.data || []);
    setCatalog(productsRes.data || []);
    setProductHistory(historyRes.data || []);
    setBalanceData(balanceRes.data || { account: { balance: 0 }, movements: [] });
  };

  const openReserveDrawer = (product) => {
    setSelectedProduct(product);
    setReserveQuantity(1);
    setError('');
    setMessage('');
    setDrawer('reserve');
  };

  const confirmReservation = async (event) => {
    event.preventDefault();
    if (!selectedProduct) return;
    const quantity = Number(reserveQuantity);
    if (!isPositiveInteger(reserveQuantity)) {
      setError('La cantidad debe ser un número entero mayor a cero');
      return;
    }
    if (quantity > Number(selectedProduct.stock || 0)) {
      setError('No hay stock suficiente para esa cantidad');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post('/client/me/reservations', { productId: selectedProduct.id, quantity });
      setMessage('Reserva creada correctamente');
      setDrawer(null);
      setSelectedProduct(null);
      await refreshAfterOperation();
      setActiveTab('reservations');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la reserva');
    } finally {
      setSaving(false);
    }
  };

  const cancelReservation = async (reservation) => {
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.patch(`/client/me/reservations/${reservation.id}/cancel`);
      setMessage('Reserva cancelada correctamente');
      await refreshAfterOperation();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cancelar la reserva');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page clients-page client-panel-page">
      <header className="clients-header">
        <div>
          <p className="clients-kicker">Mi cuenta</p>
          <h1>Panel de cliente</h1>
          <p>Consultá tus reservas, productos y saldo disponible</p>
        </div>
        <button type="button" className="sales-refresh" onClick={loadDashboard} disabled={loading}>
          {loading ? <LoaderCircle size={16} className="sales-action-spinner" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
          <span>Actualizar</span>
        </button>
      </header>

      {error ? <p className="inventory-error">{error}</p> : null}
      {message ? <p className="inventory-success">{message}</p> : null}

      <section className="clients-metrics" aria-label="Resumen de mi cuenta">
        <article className="clients-metric clients-metric--money">
          <span>Saldo disponible</span>
          <strong>{moneyFormatter.format(visibleBalance)}</strong>
        </article>
        <article className="clients-metric">
          <span>Reservas activas</span>
          <strong>{activeReservations || summary.activeReservations || 0}</strong>
        </article>
        <article className="clients-metric clients-metric--balance">
          <span>Productos comprados/reservados</span>
          <strong>{productHistory.length || summary.productRecords || 0}</strong>
        </article>
        <article className="clients-metric">
          <span>Notificaciones pendientes</span>
          <strong>{unreadNotifications || summary.unreadNotifications || 0}</strong>
        </article>
      </section>

      <div className="card clients-workspace">
        <nav className="clients-tabs" aria-label="Secciones del panel de cliente">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'reservations' ? (
          <section className="clients-tab-panel">
            <div className="clients-panel-header">
              <div>
                <h2>Reservas</h2>
                <p>Seguimiento de productos reservados para tu cuenta.</p>
              </div>
              <TicketCheck size={28} className="client-panel-icon" aria-hidden="true" />
            </div>

            <div className="clients-table-card">
              <table className="inventory-table clients-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Total</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => {
                    const firstItem = reservation.items?.[0];
                    const quantity = sumReservationItems(reservation);
                    const price = Number(firstItem?.price || 0);
                    return (
                      <tr key={reservation.id}>
                        <td>{reservationProducts(reservation)}</td>
                        <td>{quantity}</td>
                        <td>{moneyFormatter.format(price)}</td>
                        <td>{moneyFormatter.format(Number(reservation.total || quantity * price))}</td>
                        <td>{reservation.createdAt ? dateFormatter.format(new Date(reservation.createdAt)) : '-'}</td>
                        <td>
                          <span className={`client-status client-status--${String(reservation.status || '').toLowerCase()}`}>
                            {statusLabels[reservation.status] || reservation.status}
                          </span>
                        </td>
                        <td>
                          {reservation.status === 'ACTIVE' ? (
                            <button type="button" className="client-secondary-action" onClick={() => cancelReservation(reservation)} disabled={saving}>
                              Cancelar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && reservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="inventory-table__empty">
                        Todavía no tenés reservas
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'products' ? (
          <section className="clients-tab-panel">
            <div className="clients-panel-header">
              <div>
                <h2>Productos</h2>
                <p>Catálogo disponible para reservar desde tu cuenta.</p>
              </div>
              <PackageCheck size={28} className="client-panel-icon" aria-hidden="true" />
            </div>

            <section className="client-product-filters" aria-label="Filtros de productos">
              <label className="clients-search">
                <span>Buscar producto</span>
                <div>
                  <Search size={17} aria-hidden="true" />
                  <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Nombre, categoría o código" />
                </div>
              </label>
              <label className="client-filter-field">
                <span>Categoría</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'ALL' ? 'Todas' : category}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <div className="client-product-grid">
              {filteredCatalog.map((product) => {
                const stock = Number(product.stock || 0);
                const available = product.isActive && stock > 0;
                return (
                  <article key={product.id} className="client-product-card">
                    <div className="client-product-card__header">
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.category || 'Sin categoría'}</span>
                      </div>
                      <span className={`client-status ${available ? 'client-status--active' : 'client-status--cancelled'}`}>{available ? 'Disponible' : 'Sin stock'}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Precio</dt>
                        <dd>{moneyFormatter.format(Number(product.price || 0))}</dd>
                      </div>
                      <div>
                        <dt>Stock</dt>
                        <dd>{stock}</dd>
                      </div>
                      <div>
                        <dt>Código</dt>
                        <dd>{product.codigoBarras || product.sku || '-'}</dd>
                      </div>
                    </dl>
                    <button type="button" className="inventory-primary-action" onClick={() => openReserveDrawer(product)} disabled={!available}>
                      {available ? 'Reservar' : 'Sin stock'}
                    </button>
                  </article>
                );
              })}
              {!loading && filteredCatalog.length === 0 ? <p className="inventory-table__empty">No hay productos disponibles</p> : null}
            </div>

            <div className="clients-panel-header client-history-header">
              <div>
                <h2>Historial</h2>
                <p>Productos comprados o reservados asociados a tu cuenta.</p>
              </div>
            </div>
            <div className="clients-table-card">
              <table className="inventory-table clients-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productHistory.map((record) => (
                    <tr key={record.id}>
                      <td>{record.product?.name || 'Producto'}</td>
                      <td>{record.quantity}</td>
                      <td>{moneyFormatter.format(Number(record.price || 0))}</td>
                      <td>{record.date ? dateFormatter.format(new Date(record.date)) : '-'}</td>
                      <td>
                        <span className={`client-status client-status--${String(record.status || '').toLowerCase()}`}>
                          {statusLabels[record.status] || record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && productHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="inventory-table__empty">
                        Todavía no hay productos asociados a tu cuenta
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'balance' ? (
          <section className="clients-tab-panel">
            <div className="clients-panel-header">
              <div>
                <h2>Saldo / Tarjeta</h2>
                <p>Consulta de saldo y movimientos de tu cuenta.</p>
              </div>
            </div>

            <article className="client-balance-card">
              <span>Saldo disponible</span>
              <strong>{moneyFormatter.format(visibleBalance)}</strong>
            </article>

            <section className="clients-metrics" aria-label="Resumen de saldo">
              <article className="clients-metric">
                <span>Última carga</span>
                <strong>{lastRecharge?.createdAt ? dateFormatter.format(new Date(lastRecharge.createdAt)) : 'Sin cargas'}</strong>
              </article>
              <article className="clients-metric">
                <span>Último consumo</span>
                <strong>{lastConsumption?.createdAt ? dateFormatter.format(new Date(lastConsumption.createdAt)) : 'Sin consumos'}</strong>
              </article>
              <article className="clients-metric">
                <span>Estado de la tarjeta</span>
                <strong>{cardStatus}</strong>
              </article>
            </section>

            <div className="clients-table-card">
              <table className="inventory-table clients-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Saldo resultante</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.createdAt ? dateFormatter.format(new Date(movement.createdAt)) : '-'}</td>
                      <td>
                        <span className={`client-status client-status--${String(movement.type || '').toLowerCase()}`}>
                          {statusLabels[movement.type] || movement.type}
                        </span>
                      </td>
                      <td>{movementDelta(movement) >= 0 ? '+' : '-'} {moneyFormatter.format(Math.abs(movementDelta(movement)))}</td>
                      <td>{movement.balanceAfter === null || movement.balanceAfter === undefined ? '-' : moneyFormatter.format(Number(movement.balanceAfter || 0))}</td>
                      <td>{movement.notes || '-'}</td>
                    </tr>
                  ))}
                  {!loading && !balanceMovements.length ? (
                    <tr>
                      <td colSpan={5} className="inventory-table__empty">
                        Todavía no hay movimientos de saldo
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'notifications' ? (
          <section className="clients-tab-panel">
            <div className="clients-panel-header">
              <div>
                <h2>Notificaciones</h2>
                <p>Avisos y novedades vinculadas a tu cuenta.</p>
              </div>
              <Bell size={28} className="client-panel-icon" aria-hidden="true" />
            </div>

            <div className="client-notifications">
              {notifications.map((notification) => (
                <article key={notification.id} className={`client-notification${notification.read ? '' : ' is-unread'}`}>
                  <div>
                    <strong>{notification.title || 'Notificación'}</strong>
                    <p>{notification.message}</p>
                  </div>
                  <span>{notification.createdAt ? dateFormatter.format(new Date(notification.createdAt)) : '-'}</span>
                </article>
              ))}
              {!loading && notifications.length === 0 ? <p className="inventory-table__empty">No tenés notificaciones por ahora</p> : null}
            </div>
          </section>
        ) : null}
      </div>

      {drawer === 'reserve' && selectedProduct ? (
        <Drawer title="Confirmar reserva" onClose={() => setDrawer(null)}>
          <form className="client-form" onSubmit={confirmReservation}>
            <div className="client-drawer-summary">
              <strong>{selectedProduct.name}</strong>
              <span>{moneyFormatter.format(Number(selectedProduct.price || 0))} · Stock {selectedProduct.stock}</span>
            </div>
            <label>
              Cantidad a reservar
              <input min="1" max={selectedProduct.stock} step="1" type="number" value={reserveQuantity} onKeyDown={blockNonIntegerKeys} onChange={(event) => isUnsignedIntegerInput(event.target.value) && setReserveQuantity(event.target.value)} />
            </label>
            <div className="client-drawer-total">
              <span>Total estimado</span>
              <strong>{moneyFormatter.format(Number(selectedProduct.price || 0) * Number(reserveQuantity || 0))}</strong>
            </div>
            <button type="submit" className="inventory-primary-action" disabled={saving}>
              {saving ? 'Reservando...' : 'Confirmar reserva'}
            </button>
          </form>
        </Drawer>
      ) : null}

    </div>
  );
}
