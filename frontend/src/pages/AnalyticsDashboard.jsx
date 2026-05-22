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
    const { data: meta } = await api.get('/analytics/filters');
    setMetadata(meta);
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters };
      const { data: analytics } = await api.get('/analytics/dashboard', { params });
      setData(analytics);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar analitica');
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
    { title: 'Ventas netas del dia', key: 'netSales', icon: Wallet, type: 'money' },
    { title: 'Ventas brutas', key: 'grossSales', icon: Receipt, type: 'money' },
    { title: 'Descuentos totales', key: 'totalDiscount', icon: HandCoins, type: 'money' },
    { title: 'Cantidad de ventas', key: 'salesCount', icon: ShoppingBag, type: 'number' },
    { title: 'Ventas pendientes', key: 'pendingAmount', icon: Clock3, type: 'money' },
    { title: 'Total cobrado', key: 'paidAmount', icon: BarChart3, type: 'money' }
  ], []);

  return (
    <main className="dark min-h-screen bg-gradient-to-b from-slate-950 via-[#0d1b2f] to-slate-950 px-4 py-6 text-ink md:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header>
          <h1 className="text-2xl font-semibold text-white">Dashboard Analítico</h1>
          <p className="text-sm text-slate-300">Lectura rápida de ventas, cobranzas, deuda, descuentos y devoluciones.</p>
        </header>

        <FilterBar
          filters={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          sellers={metadata.sellers}
          clients={metadata.clients}
          onApply={loadAnalytics}
        />

        {loading ? <p className="rounded-xl bg-panelSoft p-4 text-slate-300">Cargando analítica...</p> : null}
        {error ? <p className="rounded-xl bg-rose-900/40 p-4 text-rose-200">{error}</p> : null}

        {!loading && data ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <KpiCard key={card.key} title={card.title} value={kpis[card.key]} type={card.type} change={changes[card.key]} icon={card.icon} sparkline={daily} />
              ))}
            </section>

            <FinanceStrip finance={data.finance} />

            <section className="grid gap-3 lg:grid-cols-2">
              <SalesTrendChart data={data.charts?.dailySales} />
              <PaymentMethodsChart data={data.charts?.paymentMethods} />
              <HourlySalesChart data={data.charts?.hourlySales} />
              <ProductRanking title="Top productos vendidos" rows={data.charts?.topProducts} />
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-2xl border border-panelBorder bg-panelSoft p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-200">Devoluciones</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-900/60 p-3">
                    <p className="text-xs uppercase text-slate-400">Cantidad devuelta</p>
                    <p className="text-xl font-semibold text-rose-300">{data.charts?.returns?.quantity || 0} u.</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-3">
                    <p className="text-xs uppercase text-slate-400">Monto perdido</p>
                    <p className="text-xl font-semibold text-rose-300">${Number(data.charts?.returns?.amount || 0).toLocaleString('es-AR')}</p>
                  </div>
                </div>
              </article>

              <ProductRanking title="Productos más devueltos" rows={data.charts?.returns?.topReturnedProducts} showAmount />
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
