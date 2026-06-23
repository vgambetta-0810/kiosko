import { useState } from 'react';
import { api } from '../services/api';
import { blockNonIntegerKeys, isPositiveInteger, isUnsignedIntegerInput } from '../utils/quantity';

export default function ManualAdjustment({ onAdjust }) {
  const [form, setForm] = useState({ productId: '', type: 'IN', quantity: '', reason: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPositiveInteger(form.quantity)) {
      alert('La cantidad debe ser un número entero mayor a cero');
      return;
    }
    await api.post('/stock/adjust', { ...form, quantity: Number(form.quantity) });
    alert('Ajuste realizado');
    onAdjust();
    setForm({ productId: '', type: 'IN', quantity: '', reason: '' });
  };

  return (
    <div className="card">
      <h2>Ajuste manual de stock</h2>
      <form onSubmit={handleSubmit}>
        <input name="productId" placeholder="ID del producto" value={form.productId} onChange={handleChange} required />
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="IN">Incrementar stock</option>
          <option value="OUT">Disminuir stock</option>
        </select>
        <input name="quantity" type="number" min="1" step="1" placeholder="Cantidad" value={form.quantity} onKeyDown={blockNonIntegerKeys} onChange={(event) => isUnsignedIntegerInput(event.target.value) && handleChange(event)} required />
        <input name="reason" placeholder="Motivo" value={form.reason} onChange={handleChange} />
        <button type="submit">Ajustar</button>
      </form>
    </div>
  );
}
