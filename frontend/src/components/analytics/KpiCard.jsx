import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));
const formatNumber = (value) => new Intl.NumberFormat('es-AR').format(Number(value || 0));

const getTrend = (change) => {
  if (change > 0) return { icon: TrendingUp, color: 'text-emerald-300', sign: '+' };
  if (change < 0) return { icon: TrendingDown, color: 'text-rose-300', sign: '' };
  return { icon: Minus, color: 'text-slate-300', sign: '' };
};

export default function KpiCard({ title, value, type = 'money', change = 0, icon: Icon, sparkline = [] }) {
  const TrendIcon = getTrend(change).icon;
  const trendColor = getTrend(change).color;
  const trendSign = getTrend(change).sign;
  const maxSpark = Math.max(...sparkline.map((s) => Number(s.net || s.amount || 0)), 1);

  return (
    <article className="rounded-2xl border border-panelBorder bg-panelSoft/90 p-4 shadow-glow transition-all duration-300 hover:-translate-y-0.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-300">{title}</span>
        <div className="rounded-xl bg-slate-900/60 p-2 text-cyan-300">{Icon ? <Icon size={16} /> : null}</div>
      </div>
      <div className="text-2xl font-semibold text-white">{type === 'money' ? formatMoney(value) : formatNumber(value)}</div>
      <div className="mt-2 flex items-center justify-between">
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon size={14} />
          <span>{trendSign}{Number(change || 0).toFixed(1)}% vs ayer</span>
        </div>
        <div className="flex h-8 items-end gap-1">
          {sparkline.slice(-12).map((point, idx) => (
            <span key={`${title}-${idx}`} className="w-1.5 rounded-sm bg-cyan-300/70" style={{ height: `${Math.max(15, Math.min(100, (Number(point.net || point.amount || 0) / maxSpark) * 100))}%` }} />
          ))}
        </div>
      </div>
    </article>
  );
}
