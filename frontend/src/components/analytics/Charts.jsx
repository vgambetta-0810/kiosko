import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));

const readCssVariable = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const useChartTheme = () => {
  const { theme } = useTheme();

  return useMemo(() => {
    const textColor = readCssVariable('--text-primary');

    return {
      axisColor: readCssVariable('--chart-axis'),
      gridColor: readCssVariable('--chart-grid'),
      colors: [
        readCssVariable('--chart-series-a'),
        readCssVariable('--chart-series-b'),
        readCssVariable('--chart-series-c'),
        readCssVariable('--chart-series-d')
      ],
      legendStyle: { color: textColor },
      tooltipStyle: {
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface)',
        color: textColor,
        boxShadow: 'var(--shadow-soft)'
      }
    };
  }, [theme]);
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
  const chartTheme = useChartTheme();

  return (
    <ChartPanel title="Ventas por dia" isEmpty={!data.length} className="analytics-chart-panel--primary">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={chartTheme.gridColor} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={chartTheme.axisColor} />
          <YAxis stroke={chartTheme.axisColor} />
          <Tooltip formatter={(value) => formatMoney(value)} contentStyle={chartTheme.tooltipStyle} />
          <Legend wrapperStyle={chartTheme.legendStyle} />
          <Line type="monotone" dataKey="gross" name="Bruto" stroke={chartTheme.colors[1]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="net" name="Neto" stroke={chartTheme.colors[0]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function PaymentMethodsChart({ data = [] }) {
  const chartTheme = useChartTheme();

  return (
    <ChartPanel title="Metodos de pago" isEmpty={!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="method" outerRadius="78%" innerRadius="46%">
            {data.map((entry, index) => <Cell key={entry.method} fill={chartTheme.colors[index % chartTheme.colors.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(value)} contentStyle={chartTheme.tooltipStyle} />
          <Legend wrapperStyle={chartTheme.legendStyle} />
        </PieChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function HourlySalesChart({ data = [] }) {
  const chartTheme = useChartTheme();

  return (
    <ChartPanel title="Ventas por hora" isEmpty={!data.length} className="analytics-chart-panel--compact">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={chartTheme.gridColor} strokeDasharray="3 3" />
          <XAxis dataKey="hour" stroke={chartTheme.axisColor} />
          <YAxis stroke={chartTheme.axisColor} />
          <Tooltip formatter={(value) => formatMoney(value)} contentStyle={chartTheme.tooltipStyle} />
          <Legend wrapperStyle={chartTheme.legendStyle} />
          <Bar dataKey="net" name="Neto" fill={chartTheme.colors[0]} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
