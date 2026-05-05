import { useState } from 'react';
import { api } from '../services/api';

export default function SellerPOS() {
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);

  const quickSale = async () => {
    await api.post('/sales', { items: [{ product: productId, quantity: Number(qty) }], paymentMethod: 'CARD' });
    alert('Sale registered');
  };

  return (
    <div className="page">
      <h1>Seller POS</h1>
      <div className="card">
        <input placeholder="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button onClick={quickSale}>Charge</button>
      </div>
    </div>
  );
}
