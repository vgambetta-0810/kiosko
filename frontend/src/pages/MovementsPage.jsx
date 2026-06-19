import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import InventoryMovementsHistory from '../components/inventory/InventoryMovementsHistory';
import { api } from '../services/api';

const emptyFilters = {
  productId: '',
  type: '',
  dateFrom: '',
  dateTo: ''
};

export default function MovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(() => ({
    productId: searchParams.get('productId') || '',
    type: searchParams.get('type') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || ''
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [movementsResponse, productsResponse] = await Promise.all([
          api.get('/stock/movements'),
          api.get('/products')
        ]);
        if (!active) return;
        setMovements(movementsResponse.data || []);
        setProducts(productsResponse.data || []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || 'No se pudo cargar el historial de movimientos');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleFilterChange = useCallback((event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return (
    <div className="page movements-page">
      <header className="movements-header">
        <div>
          <p className="inventory-kicker">Control de stock</p>
          <h1>Historial de Movimientos</h1>
          <p>Entradas, salidas, ajustes y reservas de stock</p>
        </div>
        <span className="inventory-header__status">{loading ? 'Actualizando...' : 'Historial sincronizado'}</span>
      </header>

      {error ? <p className="inventory-error">{error}</p> : null}

      <InventoryMovementsHistory
        movements={movements}
        products={products}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        loading={loading}
      />
    </div>
  );
}
