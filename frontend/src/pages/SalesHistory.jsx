import { useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarDays, CalendarRange, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const modes = [
  { key: 'day', label: 'Dia', icon: Calendar },
  { key: 'week', label: 'Semana', icon: CalendarDays },
  { key: 'month', label: 'Mes', icon: CalendarRange }
];

const paymentLabels = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  MP: 'Mercado Pago'
};

const statusLabels = {
  PAID: 'Pagada',
  PENDING: 'Pendiente'
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

const getRange = (mode, anchorValue) => {
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

  from.setHours(0, 0, 0, 0);
  return { dateFrom: from.toISOString(), dateTo: endOfDay(to).toISOString(), from, to: endOfDay(to) };
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

export default function SalesHistory() {
  const [mode, setMode] = useState('day');
  const [anchorDate, setAnchorDate] = useState(toInputDate(new Date()));
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const range = useMemo(() => getRange(mode, anchorDate), [anchorDate, mode]);
  const summary = useMemo(() => summarize(sales), [sales]);

  const loadSales = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/sales', {
        params: {
          dateFrom: range.dateFrom,
          dateTo: range.dateTo
        }
      });
      setSales(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [range.dateFrom, range.dateTo]);

  const rangeLabel =
    mode === 'day'
      ? range.from.toLocaleDateString('es-AR')
      : `${range.from.toLocaleDateString('es-AR')} - ${range.to.toLocaleDateString('es-AR')}`;

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
          <div className="sales-segmented" role="group" aria-label="Periodo">
            {modes.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <label className="sales-date-filter">
            <span>Fecha</span>
            <input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
          </label>

          <button type="button" className="sales-refresh" onClick={loadSales} disabled={loading} title="Actualizar ventas">
            <RefreshCw size={16} aria-hidden="true" />
            <span>Actualizar</span>
          </button>
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
                  </tr>
                ))}
                {!loading && sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="inventory-table__empty">
                      No hay ventas registradas para este periodo.
                    </td>
                  </tr>
                ) : null}
                {loading ? (
                  <tr>
                    <td colSpan={6} className="inventory-table__empty">
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
