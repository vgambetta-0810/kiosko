import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Link2, LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';
import SearchableCreatableCombobox from '../components/common/SearchableCreatableCombobox';
import { api } from '../services/api';
import { blockNonIntegerKeys, isPositiveInteger, isUnsignedIntegerInput } from '../utils/quantity';

const tabs = [
  { key: 'directory', label: 'Listado' },
  { key: 'reservations', label: 'Reservas' },
  { key: 'products', label: 'Productos' },
  { key: 'balance', label: 'Saldo / Tarjeta' }
];

const identityFilters = [
  { key: 'ALL', label: 'Todos' },
  { key: 'WITH_ACCOUNT', label: 'Con cuenta' },
  { key: 'WITHOUT_ACCOUNT', label: 'Sin cuenta' },
  { key: 'POSSIBLE_DUPLICATE', label: 'Posibles duplicados' },
  { key: 'MERGED', label: 'Fusionados' }
];

const reservationStatuses = [
  { key: 'ALL', label: 'Todas' },
  { key: 'ACTIVE', label: 'Activas' },
  { key: 'RETIRED', label: 'Retiradas' },
  { key: 'CANCELLED', label: 'Canceladas' }
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

const identityStatusLabels = {
  WITH_ACCOUNT: 'Con cuenta',
  WITHOUT_ACCOUNT: 'Sin cuenta',
  POSSIBLE_DUPLICATE: 'Posible duplicado',
  MERGED: 'Fusionado'
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

const todayInput = () => new Date().toISOString().slice(0, 10);
const getClientLabel = (client) => client?.name || '';
const getClientValue = (client) => client?.id || '';
const getClientDescription = (client) => {
  const parts = [];
  if (client?.phone) parts.push(client.phone);
  if (client?.cardId) parts.push(`Tarjeta ${client.cardId}`);
  parts.push(moneyFormatter.format(Number(client?.balance || 0)));
  return parts.join(' · ');
};
const getProductLabel = (product) => product?.name || '';
const getProductValue = (product) => product?.id || '';
const getProductDescription = (product) => `${moneyFormatter.format(Number(product?.price || 0))} · Stock ${product?.stock ?? 0}`;

const emptyClientForm = { name: '', email: '', phone: '', cardId: '' };
const emptyReservationForm = { client: null, product: null, quantity: 1, expiresAt: todayInput(), status: 'ACTIVE' };
const emptyBalanceForm = { client: null, operation: 'RECHARGE', amount: '', paymentMethod: 'Efectivo', notes: '' };
const balanceOperationLabels = {
  RECHARGE: 'Cargar saldo',
  DEDUCTION: 'Descontar saldo',
  ADJUSTMENT: 'Ajustar saldo'
};
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

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState('directory');
  const [clients, setClients] = useState([]);
  const [summary, setSummary] = useState({ totalClients: 0, clientsWithBalance: 0, activeReservations: 0, totalBalance: 0 });
  const [products, setProducts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [productRecords, setProductRecords] = useState([]);
  const [balanceData, setBalanceData] = useState(null);
  const [clientQuery, setClientQuery] = useState('');
  const [identityFilter, setIdentityFilter] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reservationStatus, setReservationStatus] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [clientMatchDialog, setClientMatchDialog] = useState({ open: false, matches: [], payload: null });
  const [linkDialog, setLinkDialog] = useState({ open: false, client: null, clientSummary: null, candidates: [], selected: null, query: '', loading: false });
  const [reservationForm, setReservationForm] = useState(emptyReservationForm);
  const [balanceForm, setBalanceForm] = useState(emptyBalanceForm);
  const [saving, setSaving] = useState(false);

  const selectedClientId = selectedClient?.id || '';
  const selectedProductId = selectedProduct?.id || '';

  const filteredClients = useMemo(() => {
    const query = clientQuery.trim().toLocaleLowerCase('es');
    if (!query) return clients;
    return clients.filter((client) =>
      [client.name, client.email, client.phone, client.cardId].filter(Boolean).some((value) => String(value).toLocaleLowerCase('es').includes(query))
    );
  }, [clientQuery, clients]);

  const loadClients = useCallback(async (query = '') => {
    const params = {
      ...(query ? { q: query } : {}),
      ...(identityFilter !== 'ALL' ? { identityStatus: identityFilter } : {})
    };
    const { data } = await api.get('/clients', { params: Object.keys(params).length ? params : undefined });
    setClients(data.clients || []);
    setSummary(data.summary || {});
    return data.clients || [];
  }, [identityFilter]);

  const loadProducts = useCallback(async () => {
    const { data } = await api.get('/products');
    setProducts((data || []).filter((product) => product.isActive));
  }, []);

  const loadReservations = useCallback(async () => {
    const { data } = await api.get('/reservations', {
      params: {
        ...(selectedClientId ? { clientId: selectedClientId } : {}),
        ...(reservationStatus !== 'ALL' ? { status: reservationStatus } : {})
      }
    });
    setReservations(data || []);
  }, [reservationStatus, selectedClientId]);

  const loadProductRecords = useCallback(async () => {
    const { data } = await api.get('/clients/products', {
      params: {
        ...(selectedClientId ? { clientId: selectedClientId } : {}),
        ...(selectedProductId ? { productId: selectedProductId } : {})
      }
    });
    setProductRecords(data || []);
  }, [selectedClientId, selectedProductId]);

  const loadBalance = useCallback(async () => {
    if (!selectedClientId) {
      setBalanceData(null);
      return;
    }
    const { data } = await api.get(`/clients/${selectedClientId}/balance-movements`);
    setBalanceData(data);
  }, [selectedClientId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        loadClients(),
        loadProducts(),
        activeTab === 'reservations' ? loadReservations() : Promise.resolve(),
        activeTab === 'products' ? loadProductRecords() : Promise.resolve(),
        activeTab === 'balance' ? loadBalance() : Promise.resolve()
      ]);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadBalance, loadClients, loadProductRecords, loadProducts, loadReservations]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const reloadCurrentTab = async () => {
    const loadedClients = await loadClients();
    if (selectedClientId) {
      const nextClient = loadedClients.find((client) => client.id === selectedClientId);
      if (nextClient) setSelectedClient(nextClient);
    }
    if (activeTab === 'reservations') await loadReservations();
    if (activeTab === 'products') await loadProductRecords();
    if (activeTab === 'balance') await loadBalance();
  };

  const createClient = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/clients', clientForm);
      setSelectedClient(data);
      setClientForm(emptyClientForm);
      setDrawer(null);
      setMessage('Cliente creado correctamente');
      await reloadCurrentTab();
    } catch (err) {
      const details = err?.response?.data?.details;
      if (err?.response?.status === 409 && details?.code === 'CLIENT_IDENTITY_MATCH') {
        setClientMatchDialog({ open: true, matches: details.matches || [], payload: clientForm });
        setError('');
      } else {
        setError(err?.response?.data?.message || 'No se pudo crear el cliente');
      }
    } finally {
      setSaving(false);
    }
  };

  const resolveClientMatch = async (duplicateAction, match = null) => {
    if (duplicateAction === 'cancel') {
      setClientMatchDialog({ open: false, matches: [], payload: null });
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        ...(clientMatchDialog.payload || clientForm),
        duplicateAction,
        ...(match ? { linkClientId: match.id } : {})
      };
      const { data } = await api.post('/clients', payload);
      setSelectedClient(data);
      setClientForm(emptyClientForm);
      setClientMatchDialog({ open: false, matches: [], payload: null });
      setDrawer(null);
      setMessage(duplicateAction === 'link' ? 'Cliente vinculado correctamente' : 'Cliente creado igualmente');
      await reloadCurrentTab();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo resolver la coincidencia');
    } finally {
      setSaving(false);
    }
  };

  const loadLinkCandidates = async (client, query = '') => {
    setLinkDialog((current) => ({ ...current, client, query, loading: true, open: true, selected: null }));
    try {
      const { data } = await api.get(`/clients/${client.id}/link-candidates`, { params: query ? { q: query } : undefined });
      const candidates = data.candidates || [];
      setLinkDialog({
        open: true,
        client: data.client || client,
        clientSummary: data.clientSummary || null,
        candidates,
        selected: candidates.find((candidate) => candidate.suggested) || candidates[0] || null,
        query,
        loading: false
      });
    } catch (err) {
      setLinkDialog({ open: false, client: null, clientSummary: null, candidates: [], selected: null, query: '', loading: false });
      setError(err?.response?.data?.message || 'No se pudieron cargar las cuentas para vincular');
    }
  };

  const confirmLinkUser = async () => {
    if (!linkDialog.client || !linkDialog.selected) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post(`/clients/${linkDialog.client.id}/link-user`, {
        userId: linkDialog.selected.id,
        mergeClientId: linkDialog.selected.id
      });
      setSelectedClient(data);
      setLinkDialog({ open: false, client: null, clientSummary: null, candidates: [], selected: null, query: '', loading: false });
      setMessage('Cuenta vinculada y datos fusionados correctamente');
      await reloadCurrentTab();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo vincular la cuenta');
    } finally {
      setSaving(false);
    }
  };

  const createReservation = async (event) => {
    event.preventDefault();
    if (!reservationForm.client || !reservationForm.product) {
      setError('Seleccioná cliente y producto para crear la reserva');
      return;
    }
    if (!isPositiveInteger(reservationForm.quantity)) {
      setError('La cantidad debe ser un número entero mayor a cero');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/reservations', {
        client: reservationForm.client.id,
        items: [
          {
            product: reservationForm.product.id,
            quantity: Number(reservationForm.quantity),
            price: Number(reservationForm.product.price || 0)
          }
        ],
        expiresAt: reservationForm.expiresAt
      });
      if (reservationForm.status !== 'ACTIVE') {
        await api.patch(`/reservations/${data.id}/status`, { status: reservationForm.status });
      }
      setReservationForm(emptyReservationForm);
      setDrawer(null);
      setMessage('Reserva creada correctamente');
      await Promise.all([loadProducts(), loadReservations(), loadClients()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la reserva');
    } finally {
      setSaving(false);
    }
  };

  const modifyBalance = async (event) => {
    event.preventDefault();
    if (!balanceForm.client) {
      setError('Seleccioná un cliente');
      return;
    }
    const amount = Number(balanceForm.amount);
    if (!Number.isFinite(amount) || amount < 0 || (balanceForm.operation !== 'ADJUSTMENT' && amount <= 0)) {
      setError(balanceForm.operation === 'ADJUSTMENT' ? 'Ingresá el nuevo saldo' : 'Ingresá un monto mayor a cero');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post(`/clients/${balanceForm.client.id}/balance-movements`, {
        operation: balanceForm.operation,
        amount,
        paymentMethod: balanceForm.paymentMethod,
        notes: balanceForm.notes
      });
      setSelectedClient(balanceForm.client);
      setBalanceForm(emptyBalanceForm);
      setDrawer(null);
      setMessage(`${balanceOperationLabels[balanceForm.operation]} registrado correctamente`);
      await reloadCurrentTab();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo modificar el saldo');
    } finally {
      setSaving(false);
    }
  };

  const changeReservationStatus = async (reservation, status) => {
    setError('');
    setMessage('');
    try {
      await api.patch(`/reservations/${reservation.id}/status`, { status });
      setMessage('Reserva actualizada');
      await Promise.all([loadProducts(), loadReservations(), loadProductRecords()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar la reserva');
    }
  };

  return (
    <div className="page clients-page">
      <header className="clients-header">
        <div>
          <p className="clients-kicker">Administración</p>
          <h1>Clientes</h1>
          <p>Gestión de clientes, reservas, productos y saldo</p>
        </div>
        <button type="button" className="inventory-primary-action" onClick={() => setDrawer('client')}>
          <Plus size={17} aria-hidden="true" />
          <span>Nuevo cliente</span>
        </button>
      </header>

      {error ? <p className="inventory-error">{error}</p> : null}
      {message ? <p className="inventory-success">{message}</p> : null}

      <section className="clients-metrics" aria-label="Resumen de clientes">
        <article className="clients-metric">
          <span>Total clientes</span>
          <strong>{summary.totalClients || 0}</strong>
        </article>
        <article className="clients-metric clients-metric--balance">
          <span>Clientes con saldo</span>
          <strong>{summary.clientsWithBalance || 0}</strong>
        </article>
        <article className="clients-metric">
          <span>Reservas activas</span>
          <strong>{summary.activeReservations || 0}</strong>
        </article>
        <article className="clients-metric clients-metric--money">
          <span>Saldo total cargado</span>
          <strong>{moneyFormatter.format(Number(summary.totalBalance || 0))}</strong>
        </article>
      </section>

      <div className="card clients-workspace">
        <section className="clients-toolbar" aria-label="Filtros de clientes">
          <label className="clients-search">
            <span>Buscar cliente</span>
            <div>
              <Search size={17} aria-hidden="true" />
              <input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Nombre, teléfono, email o tarjeta" />
            </div>
          </label>

          <SearchableCreatableCombobox
            id="clients-filter-client"
            label="Cliente seleccionado"
            selectedOption={selectedClient}
            options={filteredClients}
            placeholder="Filtrar por cliente"
            allowCreate={false}
            getOptionLabel={getClientLabel}
            getOptionValue={getClientValue}
            getOptionDescription={getClientDescription}
            onSearch={loadClients}
            onSelect={setSelectedClient}
            onClear={() => setSelectedClient(null)}
          />

          <button type="button" className="sales-refresh" onClick={refresh} disabled={loading}>
            {loading ? <LoaderCircle size={16} className="sales-action-spinner" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
            <span>Actualizar</span>
          </button>
        </section>

        <nav className="clients-tabs" aria-label="Secciones de clientes">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'directory' ? (
          <section className="clients-tab-panel">
            <div className="clients-panel-header">
              <div>
                <h2>Listado de clientes</h2>
                <p>{summary.possibleDuplicates ? `${summary.possibleDuplicates} posibles duplicados para revisar.` : 'Clientes registrados y fichas creadas manualmente.'}</p>
              </div>
              <div className="clients-status-tabs" role="group" aria-label="Estado de cuenta">
                {identityFilters.map((option) => (
                  <button key={option.key} type="button" className={identityFilter === option.key ? 'active' : ''} onClick={() => setIdentityFilter(option.key)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="clients-table-card">
              <table className="inventory-table clients-table client-directory-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th>Saldo</th>
                    <th>Coincidencias</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <strong>{client.name}</strong>
                        <span>{client.cardId ? `Tarjeta ${client.cardId}` : 'Sin tarjeta'}</span>
                      </td>
                      <td>
                        <strong>{client.email || 'Sin email'}</strong>
                        <span>{client.phone || 'Sin telefono'}</span>
                      </td>
                      <td>
                        <span className={`client-status client-status--${String(client.identityStatus || '').toLowerCase()}`}>
                          {identityStatusLabels[client.identityStatus] || 'Sin cuenta'}
                        </span>
                      </td>
                      <td>{moneyFormatter.format(Number(client.balance || 0))}</td>
                      <td>{client.possibleDuplicate ? (client.duplicateReasons || []).join(', ') || 'Datos similares' : '-'}</td>
                      <td>
                        <div className="clients-row-actions">
                          {!client.hasAccessAccount && !client.mergedIntoClientId ? (
                            <button type="button" onClick={() => loadLinkCandidates(client)}>
                              <Link2 size={15} aria-hidden="true" />
                              <span>Vincular cuenta</span>
                            </button>
                          ) : null}
                          {!client.mergedIntoClientId ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClient(client);
                                setActiveTab('balance');
                              }}
                            >
                              Ver saldo
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="inventory-table__empty">
                        No hay clientes para los filtros seleccionados
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'reservations' ? (
          <section className="clients-tab-panel">
            <div className="clients-panel-header">
              <div>
                <h2>Reservas</h2>
                <p>Reservas asociadas a alumnos y clientes.</p>
              </div>
              <button
                type="button"
                className="inventory-primary-action"
                onClick={() => {
                  setReservationForm((current) => ({ ...current, client: selectedClient || current.client }));
                  setDrawer('reservation');
                }}
              >
                <Plus size={17} aria-hidden="true" />
                <span>Nueva reserva</span>
              </button>
            </div>

            <div className="clients-status-tabs" role="group" aria-label="Estado de reservas">
              {reservationStatuses.map((option) => (
                <button key={option.key} type="button" className={reservationStatus === option.key ? 'active' : ''} onClick={() => setReservationStatus(option.key)}>
                  {option.label}
                </button>
              ))}
            </div>

            <div className="clients-table-card">
              <table className="inventory-table clients-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td>{reservation.client?.name || 'Sin cliente'}</td>
                      <td>{(reservation.items || []).map((item) => item.product?.name || 'Producto').join(', ')}</td>
                      <td>{(reservation.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</td>
                      <td>{reservation.expiresAt ? dateFormatter.format(new Date(reservation.expiresAt)) : '-'}</td>
                      <td>
                        <span className={`client-status client-status--${String(reservation.status || '').toLowerCase()}`}>
                          {statusLabels[reservation.status] || reservation.status}
                        </span>
                      </td>
                      <td>
                        {reservation.status === 'ACTIVE' ? (
                          <div className="clients-row-actions">
                            <button type="button" onClick={() => changeReservationStatus(reservation, 'RETIRED')}>
                              Retirada
                            </button>
                            <button type="button" onClick={() => changeReservationStatus(reservation, 'CANCELLED')}>
                              Cancelar
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!loading && reservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="inventory-table__empty">
                        No hay reservas para los filtros seleccionados
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
                <p>Historial de compras y reservas por cliente.</p>
              </div>
              <SearchableCreatableCombobox
                id="clients-product-filter"
                label="Producto"
                selectedOption={selectedProduct}
                options={products}
                placeholder="Filtrar producto"
                allowCreate={false}
                getOptionLabel={getProductLabel}
                getOptionValue={getProductValue}
                getOptionDescription={getProductDescription}
                onSelect={setSelectedProduct}
                onClear={() => setSelectedProduct(null)}
              />
            </div>

            <div className="clients-table-card">
              <table className="inventory-table clients-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.client?.name || 'Sin cliente'}</td>
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
                  {!loading && productRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="inventory-table__empty">
                        No hay productos asociados al filtro seleccionado
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
                <p>{selectedClient ? `Saldo actual: ${moneyFormatter.format(Number(balanceData?.account?.balance || selectedClient.balance || 0))}` : 'Seleccioná un cliente para ver movimientos.'}</p>
              </div>
              <div className="clients-row-actions">
                {Object.entries(balanceOperationLabels).map(([operation, label]) => (
                  <button
                    key={operation}
                    type="button"
                    className={operation === 'RECHARGE' ? 'inventory-primary-action' : undefined}
                    onClick={() => {
                      setBalanceForm({ ...emptyBalanceForm, client: selectedClient, operation });
                      setDrawer('balance');
                    }}
                  >
                    {operation === 'RECHARGE' ? <CreditCard size={17} aria-hidden="true" /> : null}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="clients-table-card">
              <table className="inventory-table clients-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Saldo resultante</th>
                    <th>Administrador</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {(balanceData?.movements || []).map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.createdAt ? dateFormatter.format(new Date(movement.createdAt)) : '-'}</td>
                      <td>
                        <span className={`client-status client-status--${String(movement.type || '').toLowerCase()}`}>
                          {statusLabels[movement.type] || movement.type}
                        </span>
                      </td>
                      <td>{movementDelta(movement) >= 0 ? '+' : '-'} {moneyFormatter.format(Math.abs(movementDelta(movement)))}</td>
                      <td>{movement.balanceAfter === null || movement.balanceAfter === undefined ? '-' : moneyFormatter.format(Number(movement.balanceAfter || 0))}</td>
                      <td>{movement.createdBy?.name || 'Sistema'}</td>
                      <td>{movement.notes || '-'}</td>
                    </tr>
                  ))}
                  {selectedClient && !loading && !balanceData?.movements?.length ? (
                    <tr>
                      <td colSpan={6} className="inventory-table__empty">
                        Este cliente todavía no tiene movimientos de saldo
                      </td>
                    </tr>
                  ) : null}
                  {!selectedClient ? (
                    <tr>
                      <td colSpan={6} className="inventory-table__empty">
                        Seleccioná un cliente para ver saldo y movimientos
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      {drawer === 'client' ? (
        <Drawer title="Nuevo cliente" onClose={() => setDrawer(null)}>
          <form className="client-form" onSubmit={createClient}>
            <label>
              Nombre completo
              <input required value={clientForm.name} onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              Email opcional
              <input type="email" value={clientForm.email} onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label>
              Teléfono opcional
              <input value={clientForm.phone} onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label>
              Identificador / tarjeta
              <input value={clientForm.cardId} onChange={(event) => setClientForm((current) => ({ ...current, cardId: event.target.value }))} />
            </label>
            <button type="submit" className="inventory-primary-action" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear cliente'}
            </button>
          </form>
        </Drawer>
      ) : null}

      {linkDialog.open ? (
        <div className="client-match-backdrop" role="presentation" onMouseDown={() => setLinkDialog({ open: false, client: null, clientSummary: null, candidates: [], selected: null, query: '', loading: false })}>
          <section className="client-match-dialog client-link-dialog" role="dialog" aria-modal="true" aria-label="Vincular cuenta" onMouseDown={(event) => event.stopPropagation()}>
            <header className="client-match-dialog__header">
              <div>
                <h2>Vincular cuenta</h2>
                <p>SeleccionÃ¡ la cuenta registrada que corresponde a {linkDialog.client?.name}.</p>
              </div>
              <button type="button" onClick={() => setLinkDialog({ open: false, client: null, clientSummary: null, candidates: [], selected: null, query: '', loading: false })} aria-label="Cancelar">
                X
              </button>
            </header>

            <form
              className="client-link-search"
              onSubmit={(event) => {
                event.preventDefault();
                if (linkDialog.client) loadLinkCandidates(linkDialog.client, linkDialog.query);
              }}
            >
              <label>
                Buscar cuenta
                <input value={linkDialog.query} onChange={(event) => setLinkDialog((current) => ({ ...current, query: event.target.value }))} placeholder="Nombre o email" />
              </label>
              <button type="submit" disabled={linkDialog.loading}>
                {linkDialog.loading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            <div className="client-link-grid">
              <div className="client-match-list">
                {linkDialog.candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`client-link-candidate ${linkDialog.selected?.id === candidate.id ? 'is-selected' : ''}`}
                    onClick={() => setLinkDialog((current) => ({ ...current, selected: candidate }))}
                  >
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{candidate.email || 'Sin email'}</small>
                    </span>
                    {candidate.suggested ? <em>Coincidencia sugerida</em> : null}
                    <small>{[candidate.phone, candidate.matchReasons?.join(', ')].filter(Boolean).join(' - ') || 'Sin datos extra'}</small>
                  </button>
                ))}
                {!linkDialog.loading && linkDialog.candidates.length === 0 ? <p className="client-link-empty">No hay cuentas registradas disponibles para vincular.</p> : null}
              </div>

              <aside className="client-link-summary" aria-label="Resumen de vinculacion">
                <h3>ConfirmaciÃ³n</h3>
                <dl>
                  <div>
                    <dt>Cliente existente</dt>
                    <dd>{linkDialog.client?.name || '-'}</dd>
                  </div>
                  <div>
                    <dt>Telefono</dt>
                    <dd>{linkDialog.client?.phone || '-'}</dd>
                  </div>
                  <div>
                    <dt>Saldo</dt>
                    <dd>{moneyFormatter.format(Number(linkDialog.clientSummary?.balance || linkDialog.client?.balance || 0))}</dd>
                  </div>
                  <div>
                    <dt>Reservas</dt>
                    <dd>{linkDialog.clientSummary?.reservationCount ?? '-'}</dd>
                  </div>
                  <div>
                    <dt>Movimientos</dt>
                    <dd>{linkDialog.clientSummary?.movementCount ?? '-'}</dd>
                  </div>
                  <div>
                    <dt>Cuenta a vincular</dt>
                    <dd>{linkDialog.selected ? `${linkDialog.selected.name} - ${linkDialog.selected.email}` : '-'}</dd>
                  </div>
                  <div>
                    <dt>Registro</dt>
                    <dd>{linkDialog.selected?.createdAt ? dateFormatter.format(new Date(linkDialog.selected.createdAt)) : '-'}</dd>
                  </div>
                </dl>
                <p>Esta acciÃ³n asociarÃ¡ la cuenta seleccionada con este cliente. El cliente podrÃ¡ ver sus reservas, saldo y movimientos desde su panel.</p>
              </aside>
            </div>

            <footer className="client-match-actions">
              <button type="button" onClick={() => setLinkDialog({ open: false, client: null, clientSummary: null, candidates: [], selected: null, query: '', loading: false })} disabled={saving}>
                Cancelar
              </button>
              <button type="button" className="inventory-primary-action" onClick={confirmLinkUser} disabled={saving || !linkDialog.selected}>
                {saving ? 'Vinculando...' : 'Confirmar vinculaciÃ³n'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {clientMatchDialog.open ? (
        <div className="client-match-backdrop" role="presentation" onMouseDown={() => resolveClientMatch('cancel')}>
          <section className="client-match-dialog" role="dialog" aria-modal="true" aria-label="Coincidencias de cliente" onMouseDown={(event) => event.stopPropagation()}>
            <header className="client-match-dialog__header">
              <div>
                <h2>Se encontró una persona ya registrada</h2>
                <p>Revisá los datos antes de decidir si corresponde vincular este cliente al usuario existente.</p>
              </div>
              <button type="button" onClick={() => resolveClientMatch('cancel')} aria-label="Cancelar">
                X
              </button>
            </header>

            <div className="client-match-list">
              {clientMatchDialog.matches.map((match) => (
                <article key={match.id} className="client-match-item">
                  <div>
                    <strong>{match.name}</strong>
                    <span>{match.email || 'Sin email visible'}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Teléfono</dt>
                      <dd>{match.phone || '-'}</dd>
                    </div>
                    <div>
                      <dt>Documento</dt>
                      <dd>{match.cardId || '-'}</dd>
                    </div>
                    <div>
                      <dt>Creación</dt>
                      <dd>{match.createdAt ? dateFormatter.format(new Date(match.createdAt)) : '-'}</dd>
                    </div>
                    <div>
                      <dt>Ventas</dt>
                      <dd>{match.salesCount || 0}</dd>
                    </div>
                  </dl>
                  <p>Coincidencias: {(match.matchReasons || []).join(', ') || 'datos similares'}</p>
                  <button type="button" className="inventory-primary-action" disabled={saving} onClick={() => resolveClientMatch('link', match)}>
                    Vincular
                  </button>
                </article>
              ))}
            </div>

            <footer className="client-match-actions">
              <button type="button" onClick={() => resolveClientMatch('create')} disabled={saving}>
                Crear igualmente
              </button>
              <button type="button" onClick={() => resolveClientMatch('cancel')} disabled={saving}>
                Cancelar
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {drawer === 'reservation' ? (
        <Drawer title="Nueva reserva" onClose={() => setDrawer(null)}>
          <form className="client-form" onSubmit={createReservation}>
            <SearchableCreatableCombobox
              id="reservation-client"
              label="Cliente"
              selectedOption={reservationForm.client}
              options={clients}
              placeholder="Seleccionar cliente"
              allowCreate={false}
              getOptionLabel={getClientLabel}
              getOptionValue={getClientValue}
              getOptionDescription={getClientDescription}
              onSelect={(client) => setReservationForm((current) => ({ ...current, client }))}
              onClear={() => setReservationForm((current) => ({ ...current, client: null }))}
            />
            <SearchableCreatableCombobox
              id="reservation-product"
              label="Producto"
              selectedOption={reservationForm.product}
              options={products}
              placeholder="Seleccionar producto"
              allowCreate={false}
              getOptionLabel={getProductLabel}
              getOptionValue={getProductValue}
              getOptionDescription={getProductDescription}
              onSelect={(product) => setReservationForm((current) => ({ ...current, product }))}
              onClear={() => setReservationForm((current) => ({ ...current, product: null }))}
            />
            <label>
              Cantidad
              <input min="1" step="1" type="number" value={reservationForm.quantity} onKeyDown={blockNonIntegerKeys} onChange={(event) => isUnsignedIntegerInput(event.target.value) && setReservationForm((current) => ({ ...current, quantity: event.target.value }))} />
            </label>
            <label>
              Fecha
              <input type="date" value={reservationForm.expiresAt} onChange={(event) => setReservationForm((current) => ({ ...current, expiresAt: event.target.value }))} />
            </label>
            <label>
              Estado
              <select value={reservationForm.status} onChange={(event) => setReservationForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="ACTIVE">Activa</option>
                <option value="RETIRED">Retirada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </label>
            <button type="submit" className="inventory-primary-action" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear reserva'}
            </button>
          </form>
        </Drawer>
      ) : null}

      {drawer === 'balance' ? (
        <Drawer title={balanceOperationLabels[balanceForm.operation]} onClose={() => setDrawer(null)}>
          <form className="client-form" onSubmit={modifyBalance}>
            <SearchableCreatableCombobox
              id="balance-client"
              label="Cliente"
              selectedOption={balanceForm.client || selectedClient}
              options={clients}
              placeholder="Seleccionar cliente"
              allowCreate={false}
              getOptionLabel={getClientLabel}
              getOptionValue={getClientValue}
              getOptionDescription={getClientDescription}
              onSelect={(client) => setBalanceForm((current) => ({ ...current, client }))}
              onClear={() => setBalanceForm((current) => ({ ...current, client: null }))}
            />
            <label>
              Operación
              <select value={balanceForm.operation} onChange={(event) => setBalanceForm((current) => ({ ...current, operation: event.target.value }))}>
                {Object.entries(balanceOperationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              {balanceForm.operation === 'ADJUSTMENT' ? 'Nuevo saldo' : 'Monto'}
              <input min={balanceForm.operation === 'ADJUSTMENT' ? '0' : '0.01'} step="0.01" type="number" value={balanceForm.amount} onChange={(event) => setBalanceForm((current) => ({ ...current, amount: event.target.value }))} required />
            </label>
            {balanceForm.operation === 'RECHARGE' ? (
              <label>
                Medio de carga
                <select value={balanceForm.paymentMethod} onChange={(event) => setBalanceForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Mercado Pago</option>
                  <option>Tarjeta</option>
                </select>
              </label>
            ) : null}
            <label>
              Observación
              <textarea rows={3} value={balanceForm.notes} onChange={(event) => setBalanceForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <button type="submit" className="inventory-primary-action" disabled={saving}>
              {saving ? 'Guardando...' : balanceOperationLabels[balanceForm.operation]}
            </button>
          </form>
        </Drawer>
      ) : null}
    </div>
  );
}
