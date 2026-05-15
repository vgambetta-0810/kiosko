import { useEffect, useState } from 'react';
import { api } from '../services/api';
import MovementHistory from '../components/MovementHistory';
import ManualAdjustment from '../components/ManualAdjustment';

export default function StockDashboard() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data);
  };

  const loadMovements = async (productId) => {
    const res = await api.get(`/stock/product/${productId}`);
    setSelectedProduct(res.data.product);
    setMovements(res.data.movements);
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = async () => {
    const query = new URLSearchParams(filters).toString();
    const res = await api.get(`/stock/movements?${query}`);
    setMovements(res.data);
    setSelectedProduct(null);
  };

  return (
    <div className="page">
      <h1>Stock Management</h1>
      <div className="card">
        <h2>Products</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td>{p.name}</td>
                <td style={{ color: p.stock <= 10 ? 'red' : 'green' }}>{p.stock}</td>
                <td>
                  <button onClick={() => loadMovements(p.id)}>View History</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ManualAdjustment onAdjust={loadProducts} />
      <MovementHistory
        movements={movements}
        selectedProduct={selectedProduct}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApplyFilters={applyFilters}
      />
    </div>
  );
}
