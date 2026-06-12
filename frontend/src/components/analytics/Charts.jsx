import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const colors = ['#17c3b2', '#5a9bff', '#ffc857', '#ff6b6b'];
const axisColor = '#4e5f76';
const gridColor = '#d8e0ec';
const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));

const tooltipStyle = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-soft)'
};

function ChartPanel({ title, children, isEmpty, className = '' }) {
  return (
    <article className={`analytics-chart-panel ${className}`.trim()}>
      <h3>{title}</h3>
      {isEmpty ? <p className="analytics-empty-state">Sin datos en el rango seleccionado.</p> : children}
    </article>
  );
}

export function SalesTrendChart({ data = [] }) {
  return (
    <ChartPanel title="Ventas por dia" isEmpty={!data.length} className="analytics-chart-panel--primary">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={axisColor} />
          <YAxis stroke={axisColor} />
          <Tooltip formatter={(value) => formatMoney(value)} contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="gross" name="Bruto" stroke="#5a9bff" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="net" name="Neto" stroke="#17c3b2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function PaymentMethodsChart({ data = [] }) {
  return (
    <ChartPanel title="Metodos de pago" isEmpty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="method" outerRadius="78%" innerRadius="46%">
            {data.map((entry, index) => <Cell key={entry.method} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(value)} contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function HourlySalesChart({ data = [] }) {
  return (
    <ChartPanel title="Ventas por hora" isEmpty={!data.length} className="analytics-chart-panel--compact">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey="hour" stroke={axisColor} />
          <YAxis stroke={axisColor} />
          <Tooltip formatter={(value) => formatMoney(value)} contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="net" name="Neto" fill="#17c3b2" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
