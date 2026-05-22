import { useState } from 'react';
import { api } from '../services/api';

export default function ManualAdjustment({ onAdjust }) {
  const [form, setForm] = useState({ productId: '', quantity: '', reason: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/stock/adjust', { ...form, quantity: parseInt(form.quantity) });
    alert('Ajuste realizado');
    onAdjust();
    setForm({ productId: '', quantity: '', reason: '' });
  };

  return (
    <div className="card">
      <h2>Ajuste manual de stock</h2>
      <form onSubmit={handleSubmit}>
        <input name="productId" placeholder="ID del producto" value={form.productId} onChange={handleChange} required />
        <input name="quantity" type="number" placeholder="Cantidad (+ o -)" value={form.quantity} onChange={handleChange} required />
        <input name="reason" placeholder="Motivo" value={form.reason} onChange={handleChange} />
        <button type="submit">Ajustar</button>
      </form>
    </div>
  );
}
