import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const colors = ['#17c3b2', '#5a9bff', '#ffc857', '#ff6b6b'];
const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));

export function SalesTrendChart({ data = [] }) {
  return (
    <div className="h-72 rounded-2xl border border-panelBorder bg-panelSoft p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Ventas por día (Bruto vs Neto)</h3>
      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={data}>
          <CartesianGrid stroke="#274268" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#9db6d8" />
          <YAxis stroke="#9db6d8" />
          <Tooltip formatter={(v) => formatMoney(v)} />
          <Legend />
          <Line type="monotone" dataKey="gross" name="Bruto" stroke="#5a9bff" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="net" name="Neto" stroke="#17c3b2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentMethodsChart({ data = [] }) {
  return (
    <div className="h-72 rounded-2xl border border-panelBorder bg-panelSoft p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Métodos de pago</h3>
      <ResponsiveContainer width="100%" height="88%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="method" outerRadius={90} innerRadius={52}>
            {data.map((entry, index) => <Cell key={entry.method} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => formatMoney(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlySalesChart({ data = [] }) {
  return (
    <div className="h-72 rounded-2xl border border-panelBorder bg-panelSoft p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Ventas por hora (picos)</h3>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data}>
          <CartesianGrid stroke="#274268" strokeDasharray="3 3" />
          <XAxis dataKey="hour" stroke="#9db6d8" />
          <YAxis stroke="#9db6d8" />
          <Tooltip formatter={(v) => formatMoney(v)} />
          <Legend />
          <Bar dataKey="net" name="Neto" fill="#17c3b2" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
