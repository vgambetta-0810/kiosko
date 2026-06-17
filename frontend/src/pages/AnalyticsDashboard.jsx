import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Wallet, ShoppingBag, Clock3 } from 'lucide-react';
import { api } from '../services/api';
import FilterBar from '../components/analytics/FilterBar';
import KpiCard from '../components/analytics/KpiCard';
import DashboardSummary from '../components/analytics/DashboardSummary';
import DashboardSecondaryMetrics from '../components/analytics/DashboardSecondaryMetrics';
import { SalesTrendChart, PaymentMethodsChart, HourlySalesChart } from '../components/analytics/Charts';
import { ProductRanking } from '../components/analytics/FinancePanels';

const formatDateInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset) => {
  const now = new Date();
  const from = new Date(now);

  if (preset === 'week') from.setDate(now.getDate() - 6);
  if (preset === 'month') from.setDate(now.getDate() - 29);

  return {
    dateFrom: formatDateInput(from),
    dateTo: formatDateInput(now)
  };
};

const createInitialFilters = () => ({ preset: 'today', ...getPresetRange('today'), sellerId: '', clientId: '' });
const presetSummaryLabels = {
  today: 'Hoy',
  week: 'Semana actual',
  month: 'Ultimos 30 dias',
  custom: 'Periodo'
};

const isValidDateRange = ({ dateFrom, dateTo }) => {
  if (!dateFrom || !dateTo) return false;
  const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
  const toTime = new Date(`${dateTo}T00:00:00`).getTime();
  return !Number.isNaN(fromTime) && !Number.isNaN(toTime) && fromTime <= toTime;
};

export default function AnalyticsDashboard() {
  const [filters, setFilters] = useState(createInitialFilters);
  const [metadata, setMetadata] = useState({ sellers: [], clients: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastRequestKey = useRef('');

  const loadMetadata = async () => {
    try {
      const { data: meta } = await api.get('/analytics/filters');
      setMetadata(meta);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los filtros de analitica');
    }
  };

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => {
      if (key === 'preset') {
        return { ...prev, preset: value, ...(value === 'custom' ? {} : getPresetRange(value)) };
      }

      if (key === 'dateFrom' || key === 'dateTo') {
        return { ...prev, preset: 'custom', [key]: value };
      }

      return { ...prev, [key]: value };
    });
  }, []);

  useEffect(() => { loadMetadata(); }, []);
  useEffect(() => {
    if (!isValidDateRange(filters)) {
      lastRequestKey.current = '';
      setLoading(false);
      setError(filters.dateFrom && filters.dateTo ? 'La fecha desde no puede ser posterior a la fecha hasta.' : '');
      return undefined;
    }

    const params = { ...filters };
    const requestKey = JSON.stringify(params);
    if (requestKey === lastRequestKey.current) return undefined;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      lastRequestKey.current = requestKey;
      setLoading(true);
      setError('');

      try {
        const { data: analytics } = await api.get('/analytics/dashboard', { params, signal: controller.signal });
        setData(analytics);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        setError(err?.response?.data?.message || 'No se pudo cargar la analitica');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [filters]);

  const kpis = data?.kpis || {};
  const initialLoading = loading && !data;
  const refreshing = loading && Boolean(data);
  const noResults = Boolean(data) && Number(kpis.salesCount || 0) === 0;
  const periodLabel = presetSummaryLabels[filters.preset] || 'Periodo';

  const metricCards = useMemo(() => [
    { title: 'Ventas netas', key: 'netSales', icon: Wallet, type: 'money' },
    { title: 'Cantidad de ventas', key: 'salesCount', icon: ShoppingBag, type: 'number' },
    { title: 'Total cobrado', key: 'paidAmount', icon: BarChart3, type: 'money' },
    { title: 'Deuda pendiente', key: 'pendingAmount', icon: Clock3, type: 'money' }
  ], []);
  const secondaryMetrics = useMemo(() => [
    { label: 'Ventas brutas', value: kpis.grossSales, type: 'money' },
    { label: 'Descuentos', value: kpis.totalDiscount, type: 'money' },
    { label: 'Ventas pendientes', value: kpis.pendingCount, type: 'number' },
    { label: 'Perdida por devoluciones', value: data?.finance?.returnsLost, type: 'money' }
  ], [data?.finance?.returnsLost, kpis.grossSales, kpis.pendingCount, kpis.totalDiscount]);

  return (
    <main className="page analytics-page">
      <header className="inventory-header analytics-header">
        <div>
          <p className="inventory-kicker">Gestion comercial</p>
          <h1>Inicio</h1>
        </div>
        <div className="analytics-header__tools">
          <FilterBar
            filters={filters}
            onChange={updateFilter}
            sellers={metadata.sellers}
            clients={metadata.clients}
          />
          <span className="inventory-header__status">{loading ? 'Actualizando...' : 'Datos sincronizados'}</span>
        </div>
      </header>

      {error ? <p className="inventory-error" role="alert">{error}</p> : null}

      <div className="analytics-workspace">
        {refreshing ? (
          <p className="analytics-refresh-status" aria-live="polite">
            <span aria-hidden="true" />
            Actualizando...
          </p>
        ) : null}

        {initialLoading ? (
          <section className="analytics-loading" aria-busy="true" aria-label="Cargando analitica">
            {metricCards.map((card) => (
              <article key={card.key} className="inventory-metric analytics-skeleton">
                <span>{card.title}</span>
                <strong>Cargando...</strong>
              </article>
            ))}
          </section>
        ) : null}

        {data ? (
          <>
            {noResults && !refreshing ? (
              <p className="inventory-table__empty">No hay resultados para los filtros seleccionados.</p>
            ) : null}

            <DashboardSummary periodLabel={periodLabel} kpis={kpis} />

            <section className="analytics-chart-grid analytics-chart-grid--primary" aria-label="Graficos principales">
              <SalesTrendChart data={data.charts?.dailySales} />
              <PaymentMethodsChart data={data.charts?.paymentMethods} />
            </section>

            <section className="analytics-chart-grid analytics-chart-grid--ranking" aria-label="Productos principales">
              <ProductRanking title="Top productos vendidos" rows={data.charts?.topProducts} className="analytics-panel--priority" />
            </section>

            <DashboardSecondaryMetrics metrics={secondaryMetrics}>
              {metricCards.map((card) => (
                <KpiCard key={card.key} title={card.title} value={kpis[card.key]} type={card.type} icon={card.icon} />
              ))}
            </DashboardSecondaryMetrics>

            <section className="analytics-chart-grid analytics-chart-grid--details" aria-label="Graficos complementarios">
              <HourlySalesChart data={data.charts?.hourlySales} />
              <section className="analytics-panel analytics-panel--returns">
                <h3>Devoluciones</h3>
                <div className="analytics-return-grid">
                  <div className="analytics-summary-box analytics-summary-box--danger">
                    <span>Cantidad devuelta</span>
                    <strong>{data.charts?.returns?.quantity || 0} u.</strong>
                  </div>
                  <div className="analytics-summary-box analytics-summary-box--danger">
                    <span>Monto perdido</span>
                    <strong>${Number(data.charts?.returns?.amount || 0).toLocaleString('es-AR')}</strong>
                  </div>
                </div>
              </section>

              <ProductRanking title="Productos mas devueltos" rows={data.charts?.returns?.topReturnedProducts} showAmount />
            </section>
          </>
        ) : null}

        {!loading && !data && !error ? (
          <p className="inventory-table__empty">No hay datos de analitica para el rango seleccionado.</p>
        ) : null}
      </div>
    </main>
  );
}
