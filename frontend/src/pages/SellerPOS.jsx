import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

export default function SellerPOS() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [status, setStatus] = useState('PAID');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const [productsRes, clientsRes] = await Promise.all([api.get('/products'), api.get('/sales/clients')]);
      setProducts(productsRes.data.filter((p) => p.isActive));
      setClients(clientsRes.data);
    };
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 15);
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 15);
  }, [products, search]);

  const subtotal = useMemo(() => cart.reduce((acc, i) => acc + i.quantity * i.price, 0), [cart]);
  const safeDiscount = Number(discount) > subtotal ? subtotal : Number(discount) || 0;
  const finalTotal = Math.max(0, subtotal - safeDiscount);

  const addToCart = (product) => {
    setMessage('');
    setCart((prev) => {
      const found = prev.find((i) => i.productId === product._id);
      if (found) {
        return prev.map((i) => {
          if (i.productId !== product._id) return i;
          const nextQty = i.quantity + 1;
          return { ...i, quantity: Math.min(nextQty, product.stock) };
        });
      }
      return [...prev, { productId: product._id, name: product.name, price: product.price, stock: product.stock, quantity: 1 }];
    });
  };

  const updateQty = (productId, quantity) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const numeric = Number(quantity);
          if (!numeric || numeric <= 0) return null;
          return { ...i, quantity: Math.min(numeric, i.stock) };
        })
        .filter(Boolean)
    );
  };

  const removeItem = (productId) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const submitSale = async () => {
    if (!cart.length) return setMessage('Add at least one product');
    setLoading(true);
    setMessage('');
    try {
      await api.post('/sales', {
        clientId: clientId || null,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        discount: safeDiscount,
        paymentMethod,
        status
      });
      setCart([]);
      setDiscount(0);
      setClientId('');
      setStatus('PAID');
      setPaymentMethod('CASH');
      setMessage('Sale registered successfully');
      const productsRes = await api.get('/products');
      setProducts(productsRes.data.filter((p) => p.isActive));
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Failed to register sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Seller POS</h1>
      <div className="card">
        <input
          placeholder="Search product by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filteredProducts.length === 1) addToCart(filteredProducts[0]);
          }}
        />
        <div>
          {filteredProducts.map((p) => (
            <button key={p._id} type="button" onClick={() => addToCart(p)} style={{ margin: '4px' }}>
              {p.name} (${p.price}) Stock: {p.stock}
            </button>
          ))}
        </div>

        <h3>Cart</h3>
        {cart.map((item) => (
          <div key={item.productId} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 40px', gap: '8px', alignItems: 'center' }}>
            <span>{item.name} (${item.price})</span>
            <input
              type="number"
              min="1"
              max={item.stock}
              value={item.quantity}
              onChange={(e) => updateQty(item.productId, e.target.value)}
            />
            <span>${item.quantity * item.price}</span>
            <button type="button" onClick={() => removeItem(item.productId)}>X</button>
          </div>
        ))}

        <label>
          Discount
          <input type="number" min="0" max={subtotal} value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>

        <label>
          Payment Method
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="CASH">CASH</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="CARD">CARD</option>
            <option value="MP">MP</option>
          </select>
        </label>

        <label>
          Sale Type
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="PAID">Paid</option>
            <option value="PENDING">Fiado (Pending)</option>
          </select>
        </label>

        <label>
          Client (optional, required for fiado)
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
        </label>

        <div>Subtotal: ${subtotal.toFixed(2)}</div>
        <div>Final total: ${finalTotal.toFixed(2)}</div>

        <button onClick={submitSale} disabled={loading}>{loading ? 'Saving...' : 'Confirm sale'}</button>
        {message ? <small>{message}</small> : null}
      </div>
    </div>
  );
}
