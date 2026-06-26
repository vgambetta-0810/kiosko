import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, LoaderCircle, PackagePlus, RefreshCw, Search, TicketCheck } from 'lucide-react';
import { api } from '../services/api';
import { blockNonIntegerKeys, isPositiveInteger, isUnsignedIntegerInput } from '../utils/quantity';

const ClientPanelContext = createContext(null);

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
  ADJUSTMENT: 'Ajuste',
  RESERVATION_CREATED: 'Reserva creada',
  RESERVATION_CANCELLED: 'Reserva cancelada',
  RESERVATION_RETIRED: 'Reserva retirada',
  RESERVATION_EXPIRED: 'Reserva vencida',
  RESERVATION_RETURNED: 'Reserva devuelta'
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
const isReservationCancellable = (reservation) => ['ACTIVE', 'PENDING', 'PENDIENTE'].includes(String(reservation.status || '').toUpperCase());
const movementDelta = (movement) => {
  if (movement.delta !== null && movement.delta !== undefined) return Number(movement.delta);
  return ['PAYMENT', 'CONSUMPTION', 'DEDUCTION'].includes(movement.type)
    ? -Number(movement.amount || 0)
    : Number(movement.amount || 0);
};

const isConsumptionMovement = (movement) => ['CONSUMPTION', 'PAYMENT', 'DEDUCTION', 'DEBT'].includes(movement.type);

function useClientPanel() {
  const context = useContext(ClientPanelContext);
  if (!context) throw new Error('useClientPanel debe usarse dentro de ClientPanel');
  return context;
}

function ClientSummaryCards() {
  const { activeReservations, dashboard, notifications, productHistory, visibleBalance } = useClientPanel();
  const summary = dashboard.summary || {};
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  return (
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
  );
}

function ClientReservationHistory() {
  const { cancelReservation, loading, reservations, saving } = useClientPanel();

  return (
    <div className="clients-table-card">
      <table className="inventory-table clients-table client-reservations-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => {
            const firstItem = reservation.items?.[0];
            const quantity = sumReservationItems(reservation);
            const price = Number(firstItem?.price || 0);
            const canCancel = isReservationCancellable(reservation);
            return (
              <tr key={reservation.id}>
                <td>{reservation.createdAt ? dateFormatter.format(new Date(reservation.createdAt)) : '-'}</td>
                <td>{reservationProducts(reservation)}</td>
                <td>{quantity}</td>
                <td>{moneyFormatter.format(price)}</td>
                <td>{moneyFormatter.format(Number(reservation.total || quantity * price))}</td>
                <td>
                  <span className={`client-status client-status--${String(reservation.status || '').toLowerCase()}`}>
                    {statusLabels[reservation.status] || reservation.status}
                  </span>
                </td>
                <td>
                  {canCancel ? (
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
                Todavia no tenes reservas
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function ClientReservationsPage() {
  return (
    <section className="clients-tab-panel">
      <div className="clients-panel-header client-reservations-header">
        <div>
          <h2>Reservas</h2>
          <p>Consulta tus reservas y realiza nuevos pedidos</p>
        </div>
        <Link to="/client/reservas/nueva" className="inventory-primary-action client-new-reservation-action">
          <PackagePlus size={17} aria-hidden="true" />
          <span>Nueva reserva</span>
        </Link>
      </div>

      <ClientSummaryCards />

      <div className="clients-panel-header client-history-header">
        <div>
          <h2>Historial de reservas</h2>
        </div>
        <TicketCheck size={28} className="client-panel-icon" aria-hidden="true" />
      </div>

      <ClientReservationHistory />
    </section>
  );
}

function ReservationQuantityInput({ disabled, max, onChange, value }) {
  return (
    <input
      className="client-quantity-input"
      disabled={disabled}
      inputMode="numeric"
      min="1"
      max={max}
      step="1"
      type="number"
      value={value}
      onKeyDown={blockNonIntegerKeys}
      onChange={(event) => isUnsignedIntegerInput(event.target.value) && onChange(event.target.value)}
      aria-label="Cantidad a reservar"
    />
  );
}

function ReservableProductsTable({ onReserve, quantities, quantityErrors, setQuantity }) {
  const {
    filteredCatalog,
    loading,
    saving
  } = useClientPanel();

  return (
    <div className="clients-table-card">
      <table className="inventory-table clients-table client-products-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoria</th>
            <th>Codigo</th>
            <th>Precio</th>
            <th>Stock disponible</th>
            <th>Cantidad a reservar</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          {filteredCatalog.map((product) => {
            const stock = Number(product.stock || 0);
            const available = product.isActive && stock > 0;
            const quantity = quantities[product.id] ?? '1';
            return (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                </td>
                <td>{product.category || 'Sin categoria'}</td>
                <td>{product.codigoBarras || product.sku || '-'}</td>
                <td>{moneyFormatter.format(Number(product.price || 0))}</td>
                <td>
                  <span className={`client-status ${available ? 'client-status--active' : 'client-status--cancelled'}`}>
                    {available ? stock : 'Sin stock'}
                  </span>
                </td>
                <td>
                  <ReservationQuantityInput
                    disabled={!available || saving}
                    max={stock}
                    value={quantity}
                    onChange={(nextValue) => setQuantity(product.id, nextValue)}
                  />
                  {quantityErrors[product.id] ? <span className="client-quantity-error">{quantityErrors[product.id]}</span> : null}
                </td>
                <td>
                  <button type="button" className="inventory-primary-action" onClick={() => onReserve(product)} disabled={!available || saving}>
                    {saving ? 'Reservando...' : 'Reservar'}
                  </button>
                </td>
              </tr>
            );
          })}
          {!loading && filteredCatalog.length === 0 ? (
            <tr>
              <td colSpan={7} className="inventory-table__empty">
                No hay productos disponibles
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function NewReservationPage() {
  const navigate = useNavigate();
  const {
    categories,
    categoryFilter,
    createReservation,
    loading,
    productQuery,
    setCategoryFilter,
    setProductQuery,
    setShowAvailableOnly,
    showAvailableOnly
  } = useClientPanel();
  const [quantities, setQuantities] = useState({});
  const [quantityErrors, setQuantityErrors] = useState({});

  const setQuantity = (productId, value) => {
    setQuantities((current) => ({ ...current, [productId]: value }));
    setQuantityErrors((current) => ({ ...current, [productId]: '' }));
  };

  const reserveProduct = async (product) => {
    const quantityValue = quantities[product.id] ?? '1';
    const quantity = Number(quantityValue);
    if (!isPositiveInteger(quantityValue)) {
      setQuantityErrors((current) => ({ ...current, [product.id]: 'Debe ser un entero mayor a cero' }));
      return;
    }
    if (quantity > Number(product.stock || 0)) {
      setQuantityErrors((current) => ({ ...current, [product.id]: 'No puede superar el stock' }));
      return;
    }

    await createReservation(product, quantity);
  };

  return (
    <section className="clients-tab-panel">
      <div className="clients-panel-header">
        <div>
          <h2>Nueva reserva</h2>
          <p>Selecciona productos disponibles para reservar</p>
        </div>
        <button type="button" className="client-back-action" onClick={() => navigate('/client/reservas')}>
          <ArrowLeft size={17} aria-hidden="true" />
          <span>Volver</span>
        </button>
      </div>

      <section className="client-product-filters" aria-label="Filtros de productos">
        <label className="clients-search">
          <span>Buscar producto</span>
          <div>
            <Search size={17} aria-hidden="true" />
            <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Nombre, categoria o codigo" />
          </div>
        </label>
        <label className="client-filter-field">
          <span>Categoria</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'ALL' ? 'Todas' : category}
              </option>
            ))}
          </select>
        </label>
        <label className="client-checkbox-filter">
          <input type="checkbox" checked={showAvailableOnly} onChange={(event) => setShowAvailableOnly(event.target.checked)} />
          <span>Solo disponibles</span>
        </label>
      </section>

      {loading ? <p className="inventory-table__empty">Cargando productos...</p> : null}
      <ReservableProductsTable
        onReserve={reserveProduct}
        quantities={quantities}
        quantityErrors={quantityErrors}
        setQuantity={setQuantity}
      />
    </section>
  );
}

export function ClientBalancePage() {
  const { balanceMovements, cardStatus, lastConsumption, lastRecharge, loading, visibleBalance } = useClientPanel();
  const latestRecharges = balanceMovements.filter((movement) => movement.type === 'RECHARGE').slice(0, 5);
  const latestConsumptions = balanceMovements.filter(isConsumptionMovement).slice(0, 5);

  return (
    <section className="clients-tab-panel">
      <div className="clients-panel-header">
        <div>
          <h2>Saldo / Tarjeta</h2>
          <p>Consulta de saldo y actividad reciente de tu cuenta.</p>
        </div>
        <Link to="/client/movimientos" className="inventory-primary-action">
          Ver movimientos
        </Link>
      </div>

      <article className="client-balance-card">
        <span>Saldo disponible</span>
        <strong>{moneyFormatter.format(visibleBalance)}</strong>
      </article>

      <section className="clients-metrics" aria-label="Resumen de saldo">
        <article className="clients-metric">
          <span>Ultima carga</span>
          <strong>{lastRecharge?.createdAt ? dateFormatter.format(new Date(lastRecharge.createdAt)) : 'Sin cargas'}</strong>
        </article>
        <article className="clients-metric">
          <span>Ultimo consumo</span>
          <strong>{lastConsumption?.createdAt ? dateFormatter.format(new Date(lastConsumption.createdAt)) : 'Sin consumos'}</strong>
        </article>
        <article className="clients-metric">
          <span>Estado de la tarjeta</span>
          <strong>{cardStatus}</strong>
        </article>
      </section>

      <section className="client-balance-lists">
        <div className="clients-table-card">
          <table className="inventory-table clients-table clients-table--compact">
            <thead>
              <tr>
                <th>Ultimas cargas</th>
                <th>Monto</th>
                <th>Saldo resultante</th>
              </tr>
            </thead>
            <tbody>
              {latestRecharges.map((movement) => (
                <tr key={movement.id}>
                  <td>{movement.createdAt ? dateFormatter.format(new Date(movement.createdAt)) : '-'}</td>
                  <td>+ {moneyFormatter.format(Number(movement.amount || 0))}</td>
                  <td>{movement.balanceAfter === null || movement.balanceAfter === undefined ? '-' : moneyFormatter.format(Number(movement.balanceAfter || 0))}</td>
                </tr>
              ))}
              {!loading && latestRecharges.length === 0 ? (
                <tr>
                  <td colSpan={3} className="inventory-table__empty">
                    Todavia no hay cargas
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="clients-table-card">
          <table className="inventory-table clients-table clients-table--compact">
            <thead>
              <tr>
                <th>Ultimos consumos</th>
                <th>Monto</th>
                <th>Saldo resultante</th>
              </tr>
            </thead>
            <tbody>
              {latestConsumptions.map((movement) => {
                const delta = movementDelta(movement);
                return (
                  <tr key={movement.id}>
                    <td>{movement.createdAt ? dateFormatter.format(new Date(movement.createdAt)) : '-'}</td>
                    <td>{delta >= 0 ? '+' : '-'} {moneyFormatter.format(Math.abs(delta))}</td>
                    <td>{movement.balanceAfter === null || movement.balanceAfter === undefined ? '-' : moneyFormatter.format(Number(movement.balanceAfter || 0))}</td>
                  </tr>
                );
              })}
              {!loading && latestConsumptions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="inventory-table__empty">
                    Todavia no hay consumos
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export function ClientMovementsPage() {
  const { balanceMovements, loading, reservations } = useClientPanel();
  const movements = useMemo(() => {
    const accountRows = balanceMovements.map((movement) => {
      const delta = movementDelta(movement);
      const isRecharge = movement.type === 'RECHARGE';
      return {
        id: `account-${movement.id}`,
        date: movement.createdAt,
        type: movement.type,
        detail: isRecharge ? movement.notes || 'Carga realizada por administracion' : movement.notes || 'Operacion de cuenta',
        amount: `${delta >= 0 ? '+' : '-'} ${moneyFormatter.format(Math.abs(delta))}`,
        balanceAfter: movement.balanceAfter === null || movement.balanceAfter === undefined ? '-' : moneyFormatter.format(Number(movement.balanceAfter || 0))
      };
    });

    const reservationRows = reservations.flatMap((reservation) => {
      const quantity = sumReservationItems(reservation);
      const total = moneyFormatter.format(Number(reservation.total || 0));
      const base = {
        date: reservation.createdAt,
        detail: reservationProducts(reservation),
        amount: `${quantity} u. / ${total}`,
        balanceAfter: '-'
      };
      const rows = [{ ...base, id: `reservation-created-${reservation.id}`, type: 'RESERVATION_CREATED' }];
      if (reservation.status && reservation.status !== 'ACTIVE') {
        rows.push({
          ...base,
          id: `reservation-status-${reservation.id}`,
          date: reservation.updatedAt || reservation.createdAt,
          type: `RESERVATION_${reservation.status}`
        });
      }
      return rows;
    });

    return [...accountRows, ...reservationRows].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [balanceMovements, reservations]);

  return (
    <section className="clients-tab-panel">
      <div className="clients-panel-header">
        <div>
          <h2>Movimientos</h2>
          <p>Consulta tus consumos, cargas y operaciones de tu cuenta</p>
        </div>
      </div>

      <div className="clients-table-card">
        <table className="inventory-table clients-table client-movements-table">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Tipo</th>
              <th>Detalle</th>
              <th>Importe / cantidad</th>
              <th>Saldo resultante</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>{movement.date ? dateFormatter.format(new Date(movement.date)) : '-'}</td>
                <td>
                  <span className={`client-status client-status--${String(movement.type || '').toLowerCase()}`}>
                    {statusLabels[movement.type] || movement.type}
                  </span>
                </td>
                <td>{movement.detail || '-'}</td>
                <td>{movement.amount || '-'}</td>
                <td>{movement.balanceAfter}</td>
              </tr>
            ))}
            {!loading && movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="inventory-table__empty">
                  Todavia no hay movimientos para mostrar
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ClientNotificationsPage() {
  const { loading, notifications } = useClientPanel();

  return (
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
              <strong>{notification.title || 'Notificacion'}</strong>
              <p>{notification.message}</p>
            </div>
            <span>{notification.createdAt ? dateFormatter.format(new Date(notification.createdAt)) : '-'}</span>
          </article>
        ))}
        {!loading && notifications.length === 0 ? <p className="inventory-table__empty">No tenes notificaciones por ahora</p> : null}
      </div>
    </section>
  );
}

export default function ClientPanel() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({ summary: { balance: 0, activeReservations: 0, productRecords: 0, unreadNotifications: 0 } });
  const [reservations, setReservations] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [productHistory, setProductHistory] = useState([]);
  const [balanceData, setBalanceData] = useState({ account: { balance: 0 }, movements: [] });
  const [notifications, setNotifications] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const summary = dashboard.summary || {};
  const activeReservations = useMemo(() => reservations.filter((reservation) => reservation.status === 'ACTIVE').length, [reservations]);
  const visibleBalance = Number(balanceData?.account?.balance ?? summary.balance ?? 0);
  const balanceMovements = balanceData?.movements || [];
  const lastRecharge = balanceMovements.find((movement) => movement.type === 'RECHARGE');
  const lastConsumption = balanceMovements.find(isConsumptionMovement);
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
      const matchesAvailability = !showAvailableOnly || Number(product.stock || 0) > 0;
      return matchesQuery && matchesCategory && matchesAvailability;
    });
  }, [catalog, categoryFilter, productQuery, showAvailableOnly]);

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

  const refreshAfterOperation = useCallback(async () => {
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
  }, []);

  const createReservation = useCallback(async (product, quantity) => {
    if (!product) return false;
    if (!isPositiveInteger(quantity)) {
      setError('La cantidad debe ser un numero entero mayor a cero');
      return false;
    }
    if (Number(quantity) > Number(product.stock || 0)) {
      setError('No hay stock suficiente para esa cantidad');
      return false;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post('/client/me/reservations', { productId: product.id, quantity: Number(quantity) });
      setMessage('Reserva creada correctamente');
      await refreshAfterOperation();
      navigate('/client/reservas');
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la reserva');
      return false;
    } finally {
      setSaving(false);
    }
  }, [navigate, refreshAfterOperation]);

  const cancelReservation = useCallback(async (reservation) => {
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
  }, [refreshAfterOperation, saving]);

  const contextValue = useMemo(
    () => ({
      activeReservations,
      balanceMovements,
      cancelReservation,
      cardStatus,
      categories,
      categoryFilter,
      createReservation,
      dashboard,
      filteredCatalog,
      lastConsumption,
      lastRecharge,
      loading,
      notifications,
      productHistory,
      productQuery,
      reservations,
      saving,
      setCategoryFilter,
      setProductQuery,
      setShowAvailableOnly,
      showAvailableOnly,
      visibleBalance
    }),
    [
      activeReservations,
      balanceMovements,
      cardStatus,
      cancelReservation,
      categories,
      categoryFilter,
      createReservation,
      dashboard,
      filteredCatalog,
      lastConsumption,
      lastRecharge,
      loading,
      notifications,
      productHistory,
      productQuery,
      reservations,
      saving,
      showAvailableOnly,
      visibleBalance
    ]
  );

  return (
    <ClientPanelContext.Provider value={contextValue}>
      <div className="page clients-page client-panel-page">
        <header className="clients-header">
          <div>
            <p className="clients-kicker">Mi cuenta</p>
            <h1>Panel de cliente</h1>
            <p>Consulta tus reservas, saldo y movimientos.</p>
          </div>
          <button type="button" className="sales-refresh" onClick={loadDashboard} disabled={loading}>
            {loading ? <LoaderCircle size={16} className="sales-action-spinner" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
            <span>Actualizar</span>
          </button>
        </header>

        {error ? <p className="inventory-error">{error}</p> : null}
        {message ? <p className="inventory-success">{message}</p> : null}

        <div className="card clients-workspace">
          <Outlet />
        </div>
      </div>
    </ClientPanelContext.Provider>
  );
}
