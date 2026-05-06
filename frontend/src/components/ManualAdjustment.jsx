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
    alert('Adjustment done');
    onAdjust();
    setForm({ productId: '', quantity: '', reason: '' });
  };

  return (
    <div className="card">
      <h2>Manual Stock Adjustment</h2>
      <form onSubmit={handleSubmit}>
        <input name="productId" placeholder="Product ID" value={form.productId} onChange={handleChange} required />
        <input name="quantity" type="number" placeholder="Quantity (+ or -)" value={form.quantity} onChange={handleChange} required />
        <input name="reason" placeholder="Reason" value={form.reason} onChange={handleChange} />
        <button type="submit">Adjust</button>
      </form>
    </div>
  );
}