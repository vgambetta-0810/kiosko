import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));
const formatNumber = (value) => new Intl.NumberFormat('es-AR').format(Number(value || 0));

const getTrend = (change) => {
  if (change > 0) return { icon: TrendingUp, className: 'analytics-trend analytics-trend--up', sign: '+' };
  if (change < 0) return { icon: TrendingDown, className: 'analytics-trend analytics-trend--down', sign: '' };
  return { icon: Minus, className: 'analytics-trend analytics-trend--flat', sign: '' };
};

export default function KpiCard({ title, value, type = 'money', change = 0, icon: Icon, sparkline = [] }) {
  const trend = getTrend(change);
  const TrendIcon = trend.icon;
  const maxSpark = Math.max(...sparkline.map((point) => Number(point.net || point.amount || 0)), 1);

  return (
    <article className="inventory-metric analytics-kpi-card">
      <div className="analytics-kpi-card__header">
        <span>{title}</span>
        <span className="analytics-kpi-card__icon" aria-hidden="true">{Icon ? <Icon size={16} /> : null}</span>
      </div>
      <strong>{type === 'money' ? formatMoney(value) : formatNumber(value)}</strong>
      <div className="analytics-kpi-card__footer">
        <div className={trend.className}>
          <TrendIcon size={14} aria-hidden="true" />
          <span>{trend.sign}{Number(change || 0).toFixed(1)}% vs ayer</span>
        </div>
        <div className="analytics-sparkline" aria-hidden="true">
          {sparkline.slice(-12).map((point, index) => (
            <span
              key={`${title}-${index}`}
              style={{ height: `${Math.max(15, Math.min(100, (Number(point.net || point.amount || 0) / maxSpark) * 100))}%` }}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
