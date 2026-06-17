import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarDays, CalendarRange, CheckCircle, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchableCreatableCombobox from '../components/common/SearchableCreatableCombobox';
import { api } from '../services/api';

const modes = [
  { key: 'day', label: 'Día', icon: Calendar },
  { key: 'week', label: 'Semana', icon: CalendarDays },
  { key: 'month', label: 'Mes', icon: CalendarRange }
];

const paymentLabels = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  BALANCE: 'Saldo/Tarjeta',
  MP: 'Mercado Pago'
};

const statusLabels = {
  PAID: 'Pagada',
  PENDING: 'Pendiente'
};

const statusFilters = [
  { key: 'ALL', label: 'Todas' },
  { key: 'PAID', label: 'Pagadas' },
  { key: 'PENDING', label: 'Pendientes' }
];

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value) => {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
};

const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getQuickRange = (mode, anchorValue) => {
  const anchor = parseInputDate(anchorValue);
  const from = new Date(anchor);
  const to = new Date(anchor);

  if (mode === 'week') {
    const day = from.getDay() || 7;
    from.setDate(from.getDate() - day + 1);
    to.setTime(from.getTime());
    to.setDate(from.getDate() + 6);
  }

  if (mode === 'month') {
    from.setDate(1);
    to.setFullYear(from.getFullYear(), from.getMonth() + 1, 0);
  }

  return { from: toInputDate(from), to: toInputDate(to) };
};

const getRequestRange = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return null;
  const from = startOfDay(parseInputDate(dateFrom));
  const to = endOfDay(parseInputDate(dateTo));
  return { from, to, fromParam: dateFrom, toParam: dateTo };
};

const summarize = (sales) =>
  sales.reduce(
    (acc, sale) => {
      const finalTotal = Number(sale.finalTotal || 0);
      acc.total += finalTotal;
      acc.count += 1;
      if (sale.status === 'PENDING') acc.pending += finalTotal;
      else acc.paid += finalTotal;
      return acc;
    },
    { total: 0, paid: 0, pending: 0, count: 0 }
  );

const getClientLabel = (client) => client?.name || '';
const getClientValue = (client) => client?.id || '';
const getClientDescription = (client) => {
  const email = client?.email?.endsWith('@clientes.local') ? '' : client?.email;
  const balance = moneyFormatter.format(Number(client?.balance || 0));
  return [email, `Saldo ${balance}`].filter(Boolean).join(' · ') || `Saldo ${balance}`;
};

export default function SalesHistory() {
  const [mode, setMode] = useState('day');
  const today = useMemo(() => toInputDate(new Date()), []);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientsError, setClientsError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingSaleId, setUpdatingSaleId] = useState('');

  const range = useMemo(() => getRequestRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const dateValidationError = useMemo(() => {
    if (!dateFrom || !dateTo) return 'Selecciona Desde y Hasta para consultar ventas';
    if (parseInputDate(dateFrom) > parseInputDate(dateTo)) return 'Desde no puede ser mayor que Hasta';
    return '';
  }, [dateFrom, dateTo]);
  const summary = useMemo(() => summarize(sales), [sales]);

  const loadClients = useCallback(async (query = '') => {
    setClientsLoading(true);
    setClientsError('');
    try {
      const { data } = await api.get('/sales/clients', { params: query ? { q: query } : undefined });
      setClients(data || []);
    } catch (err) {
      setClientsError(err?.response?.data?.message || 'No se pudieron cargar los clientes');
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    if (dateValidationError || !range) {
      setSales([]);
      setError(dateValidationError);
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const { data } = await api.get('/sales', {
        params: {
          from: range.fromParam,
          to: range.toParam,
          ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
          ...(selectedClient ? { clientId: selectedClient.id } : {})
        }
      });
      setSales(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  }, [dateValidationError, range, selectedClient, statusFilter]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const markSalePaid = async (sale) => {
    if (updatingSaleId) return;
    if (!window.confirm('¿Confirmar que esta venta fue pagada?')) return;

    setUpdatingSaleId(sale.id);
    setError('');
    setSuccessMessage('');
    try {
      const { data } = await api.patch(`/sales/${sale.id}/status`, { status: 'paid' });
      setSales((current) => {
        const updated = current.map((item) => (item.id === data.id ? data : item));
        return statusFilter === 'PENDING' ? updated.filter((item) => item.id !== data.id) : updated;
      });
      setSuccessMessage('Venta marcada como pagada');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo marcar la venta como pagada');
    } finally {
      setUpdatingSaleId('');
    }
  };

  const applyQuickRange = (nextMode) => {
    const anchor = dateFrom || dateTo || today;
    const quickRange = getQuickRange(nextMode, anchor);
    setMode(nextMode);
    setDateFrom(quickRange.from);
    setDateTo(quickRange.to);
  };

  const handleDateFromChange = (value) => {
    setMode('custom');
    setDateFrom(value);
  };

  const handleDateToChange = (value) => {
    setMode('custom');
    setDateTo(value);
  };

  const rangeLabel = range
    ? dateFrom === dateTo
      ? range.from.toLocaleDateString('es-AR')
      : `${range.from.toLocaleDateString('es-AR')} - ${range.to.toLocaleDateString('es-AR')}`
    : 'Rango incompleto';

  return (
    <div className="page sales-page">
      <header className="sales-header">
        <div>
          <p className="sales-kicker">Registro comercial</p>
          <h1>Historial de ventas</h1>
        </div>
        <div className="sales-header__actions">
          <Link to="/ventas" className="sales-new-link">
            Nueva venta
          </Link>
          <span className="sales-header__status">{loading ? 'Actualizando...' : rangeLabel}</span>
        </div>
      </header>

      {error ? <p className="inventory-error">{error}</p> : null}
      {successMessage ? <p className="inventory-success">{successMessage}</p> : null}

      <section className="sales-metrics" aria-label="Resumen de ventas">
        <article className="sales-metric">
          <span>Total vendido</span>
          <strong>{moneyFormatter.format(summary.total)}</strong>
        </article>
        <article className="sales-metric">
          <span>Ventas</span>
          <strong>{summary.count}</strong>
        </article>
        <article className="sales-metric">
          <span>Cobrado</span>
          <strong>{moneyFormatter.format(summary.paid)}</strong>
        </article>
        <article className="sales-metric sales-metric--pending">
          <span>Pendiente</span>
          <strong>{moneyFormatter.format(summary.pending)}</strong>
        </article>
      </section>

      <div className="card sales-workspace">
        <section className="sales-toolbar" aria-label="Filtros de ventas">
          <div className="sales-filter-group sales-filter-group--period">
            <span>Periodo</span>
            <div className="sales-segmented" role="group" aria-label="Periodo">
              {modes.map(({ key, label, icon: Icon }) => (
                <button key={key} type="button" className={mode === key ? 'active' : ''} onClick={() => applyQuickRange(key)}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sales-filter-group sales-filter-group--status">
            <span>Estado</span>
            <div className="sales-segmented sales-segmented--status" role="group" aria-label="Estado">
              {statusFilters.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={statusFilter === option.key ? 'active' : ''}
                  onClick={() => setStatusFilter(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="sales-date-filter sales-date-filter--from">
            <span>Desde</span>
            <input type="date" value={dateFrom} onChange={(event) => handleDateFromChange(event.target.value)} />
          </label>

          <label className="sales-date-filter sales-date-filter--to">
            <span>Hasta</span>
            <input type="date" value={dateTo} onChange={(event) => handleDateToChange(event.target.value)} />
          </label>

          <div className="sales-client-filter">
            <SearchableCreatableCombobox
              id="sales-history-client"
              label="Cliente"
              selectedOption={selectedClient}
              options={clients}
              placeholder="Buscar cliente"
              loading={clientsLoading}
              error={clientsError}
              allowCreate={false}
              getOptionLabel={getClientLabel}
              getOptionValue={getClientValue}
              getOptionDescription={getClientDescription}
              onSearch={loadClients}
              onSelect={setSelectedClient}
              onClear={() => setSelectedClient(null)}
            />
          </div>

          <span className="sales-active-range">Rango activo: {rangeLabel}</span>
        </section>

        <div className="sales-table-card">
          <div className="inventory-table-scroll">
            <table className="inventory-table sales-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Productos</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.createdAt ? dateFormatter.format(new Date(sale.createdAt)) : '-'}</td>
                    <td>
                      {(sale.items || []).map((item) => (
                        <span key={`${sale.id}-${item.productId}`} className="sales-product-line">
                          {item.product?.name || 'Producto'} x{item.quantity}
                        </span>
                      ))}
                    </td>
                    <td>{sale.client?.name || 'Sin cliente'}</td>
                    <td>{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</td>
                    <td>
                      <span className={`sales-status sales-status--${String(sale.status || '').toLowerCase()}`}>
                        {statusLabels[sale.status] || sale.status}
                      </span>
                    </td>
                    <td>
                      <strong>{moneyFormatter.format(Number(sale.finalTotal || 0))}</strong>
                    </td>
                    <td>
                      {sale.status === 'PENDING' ? (
                        <button
                          type="button"
                          className="sales-mark-paid"
                          onClick={() => markSalePaid(sale)}
                          disabled={Boolean(updatingSaleId)}
                        >
                          {updatingSaleId === sale.id ? (
                            <LoaderCircle size={15} className="sales-action-spinner" aria-hidden="true" />
                          ) : (
                            <CheckCircle size={15} aria-hidden="true" />
                          )}
                          <span>{updatingSaleId === sale.id ? 'Marcando...' : 'Marcar pagada'}</span>
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!loading && sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="inventory-table__empty">
                      No hay ventas para el período seleccionado
                    </td>
                  </tr>
                ) : null}
                {loading ? (
                  <tr>
                    <td colSpan={7} className="inventory-table__empty">
                      Cargando ventas...
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
