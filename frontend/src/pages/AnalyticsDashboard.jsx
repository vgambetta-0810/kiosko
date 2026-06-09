import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Wallet, Receipt, ShoppingBag, Clock3, HandCoins } from 'lucide-react';
import { api } from '../services/api';
import FilterBar from '../components/analytics/FilterBar';
import KpiCard from '../components/analytics/KpiCard';
import { SalesTrendChart, PaymentMethodsChart, HourlySalesChart } from '../components/analytics/Charts';
import { ProductRanking, FinanceStrip } from '../components/analytics/FinancePanels';

const today = new Date().toISOString().slice(0, 10);

export default function AnalyticsDashboard() {
  const [filters, setFilters] = useState({ preset: 'today', dateFrom: today, dateTo: today, sellerId: '', clientId: '' });
  const [metadata, setMetadata] = useState({ sellers: [], clients: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetadata = async () => {
    try {
      const { data: meta } = await api.get('/analytics/filters');
      setMetadata(meta);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los filtros de analitica');
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters };
      const { data: analytics } = await api.get('/analytics/dashboard', { params });
      setData(analytics);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar la analitica');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMetadata(); }, []);
  useEffect(() => { loadAnalytics(); }, []);

  const kpis = data?.kpis || {};
  const changes = data?.changes || {};
  const daily = data?.charts?.dailySales || [];

  const cards = useMemo(() => [
    { title: 'Ventas netas', key: 'netSales', icon: Wallet, type: 'money' },
    { title: 'Ventas brutas', key: 'grossSales', icon: Receipt, type: 'money' },
    { title: 'Descuentos totales', key: 'totalDiscount', icon: HandCoins, type: 'money' },
    { title: 'Cantidad de ventas', key: 'salesCount', icon: ShoppingBag, type: 'number' },
    { title: 'Ventas pendientes', key: 'pendingAmount', icon: Clock3, type: 'money' },
    { title: 'Total cobrado', key: 'paidAmount', icon: BarChart3, type: 'money' }
  ], []);

  return (
    <main className="page analytics-page">
      <header className="inventory-header analytics-header">
        <div>
          <p className="inventory-kicker">Gestion comercial</p>
          <h1>Analitica</h1>
          <p className="analytics-header__summary">Ventas, cobranzas, deuda, descuentos y devoluciones del kiosko.</p>
        </div>
        <span className="inventory-header__status">{loading ? 'Actualizando...' : 'Datos sincronizados'}</span>
      </header>

      {error ? <p className="inventory-error" role="alert">{error}</p> : null}

      <div className="card analytics-workspace">
        <FilterBar
          filters={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          sellers={metadata.sellers}
          clients={metadata.clients}
          onApply={loadAnalytics}
          loading={loading}
        />

        {loading ? (
          <section className="analytics-loading" aria-busy="true" aria-label="Cargando analitica">
            {cards.map((card) => (
              <article key={card.key} className="inventory-metric analytics-skeleton">
                <span>{card.title}</span>
                <strong>Cargando...</strong>
              </article>
            ))}
          </section>
        ) : null}

        {!loading && data ? (
          <>
            <section className="analytics-kpis" aria-label="Metricas principales">
              {cards.map((card) => (
                <KpiCard key={card.key} title={card.title} value={kpis[card.key]} type={card.type} change={changes[card.key]} icon={card.icon} sparkline={daily} />
              ))}
            </section>

            <FinanceStrip finance={data.finance} />

            <section className="analytics-grid" aria-label="Graficos de ventas">
              <SalesTrendChart data={data.charts?.dailySales} />
              <PaymentMethodsChart data={data.charts?.paymentMethods} />
              <HourlySalesChart data={data.charts?.hourlySales} />
              <ProductRanking title="Top productos vendidos" rows={data.charts?.topProducts} />
            </section>

            <section className="analytics-grid" aria-label="Devoluciones">
              <article className="analytics-panel">
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
              </article>

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
