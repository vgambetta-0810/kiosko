import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  useEffect(() => { api.get('/products').then((r) => setProducts(r.data)); }, []);
  return (
    <div className="page">
      <h1>Panel de administración</h1>
      <nav>
        <Link to="/stock">Gestión de stock</Link>
      </nav>
      <p>Productos: {products.length}</p>
      <ul>{products.map((p) => <li key={p._id}>{p.name} - Stock: {p.stock}</li>)}</ul>
    </div>
  );
}
