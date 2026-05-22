import { useCallback, useEffect, useMemo, useState } from 'react';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import { api } from '../services/api';
import MovementHistory from '../components/MovementHistory';

export default function StockDashboard() {
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState({});
  const [productFilters, setProductFilters] = useState({ name: '', category: '', stock: 'all' });
  const [newProduct, setNewProduct] = useState({ name: '', codigoBarras: '', price: '', cost: '', stock: '' });
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [createError, setCreateError] = useState('');
  const LOW_STOCK_LIMIT = 10;
  const CRITICAL_STOCK_LIMIT = 5;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [productsRes, purchasesRes, reservationsRes] = await Promise.all([
          api.get('/products'),
          api.get('/purchases'),
          api.get('/reservations')
        ]);
        setProducts(productsRes.data);
        setPurchases(purchasesRes.data);
        setReservations(reservationsRes.data);
      } catch (err) {
        setLoadError(err?.response?.data?.message || 'No se pudieron cargar los datos de inventario');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const loadMovements = useCallback(async (productId) => {
    const res = await api.get(`/stock/product/${productId}`);
    setSelectedProduct(res.data.product);
    setMovements(res.data.movements);
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const applyFilters = async () => {
    const query = new URLSearchParams(filters).toString();
    const res = await api.get(`/stock/movements?${query}`);
    setMovements(res.data);
    setSelectedProduct(null);
  };

  const handleProductFilterChange = useCallback((e) => {
    setProductFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleNewProductChange = useCallback((e) => {
    setNewProduct((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const searchCategories = useCallback(async (query = '') => {
    setCategoryLoading(true);
    try {
      const res = await api.get('/categories', { params: { q: query } });
      setCategories(res.data || []);
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  const createProduct = async (e) => {
    e.preventDefault();
    setCreatingProduct(true);
    setCreateError('');

    try {
      const currentSelection = selectedCategory[0];
      const selectedCategoryName = currentSelection?.customOption
        ? String(currentSelection.label || '').trim()
        : String(currentSelection?.name || '').trim();
      const typedCategoryName = String(categoryInput || '').trim();
      const finalCategoryName = selectedCategoryName || typedCategoryName;

      if (!finalCategoryName) {
        setCreateError('La categoria es obligatoria');
        setCreatingProduct(false);
        return;
      }

      let categoryId = currentSelection?.id;
      if (!UUID_REGEX.test(String(categoryId || ''))) categoryId = null;
      if (!categoryId) {
        const existing = categories.find((c) => String(c.name || '').toLowerCase() === finalCategoryName.toLowerCase());
        if (existing?.id) {
          categoryId = existing.id;
        } else {
          const createdCategoryRes = await api.post('/categories', { name: finalCategoryName });
          categoryId = createdCategoryRes.data.id;
        }
      }

      await api.post('/products', {
        name: newProduct.name.trim(),
        codigoBarras: newProduct.codigoBarras.trim(),
        categoryId,
        price: Number(newProduct.price),
        cost: Number(newProduct.cost),
        stock: newProduct.stock === '' ? 0 : Number(newProduct.stock)
      });

      setNewProduct({ name: '', codigoBarras: '', price: '', cost: '', stock: '' });
      setSelectedCategory([]);
      setCategoryInput('');
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'No se pudo crear el producto');
    } finally {
      setCreatingProduct(false);
    }
  };

  const reservedByProductId = useMemo(() => reservations.reduce((acc, reservation) => {
    const isReserved = reservation.status === 'ACTIVE' || reservation.status === 'RESERVED';
    if (!isReserved) return acc;
    (reservation.items || []).forEach((item) => {
      const productId = item.product?.id || item.product;
      if (!productId) return;
      acc[productId] = (acc[productId] || 0) + Number(item.quantity || 0);
    });
    return acc;
  }, {}), [reservations]);

  const filteredProducts = useMemo(() => products.filter((p) => {
    const stockValue = Number(p.stock || 0);
    const matchesName = p.name.toLowerCase().includes(productFilters.name.trim().toLowerCase());
    const matchesCategory = productFilters.category
      ? p.category.toLowerCase().includes(productFilters.category.trim().toLowerCase())
      : true;

    let matchesStock = true;
    if (productFilters.stock === 'low') matchesStock = stockValue <= LOW_STOCK_LIMIT;
    if (productFilters.stock === 'available') matchesStock = stockValue > LOW_STOCK_LIMIT;
    if (productFilters.stock === 'critical') matchesStock = stockValue <= CRITICAL_STOCK_LIMIT;
    if (productFilters.stock === 'empty') matchesStock = stockValue <= 0;

    return matchesName && matchesCategory && matchesStock;
  }), [products, productFilters]);

  const lastSupplierByProductId = useMemo(() => purchases
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .reduce((acc, purchase) => {
      const supplierName = purchase.supplier?.name || 'Proveedor no definido';
      const supplierPhone = purchase.supplier?.phone ? ` | Tel: ${purchase.supplier.phone}` : '';
      const supplierContact = `${supplierName}${supplierPhone}`;
      (purchase.items || []).forEach((item) => {
        const productId = item.product?.id || item.product;
        if (productId && !acc[productId]) acc[productId] = supplierContact;
      });
      return acc;
    }, {}), [purchases]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => Number(p.stock || 0) < LOW_STOCK_LIMIT),
    [products]
  );
  const criticalStockProducts = useMemo(
    () => products.filter((p) => Number(p.stock || 0) <= CRITICAL_STOCK_LIMIT),
    [products]
  );
  const totalReservedUnits = useMemo(
    () => Object.values(reservedByProductId).reduce((sum, qty) => sum + Number(qty || 0), 0),
    [reservedByProductId]
  );
  const activeReservationsCount = useMemo(
    () => reservations.filter((r) => r.status === 'ACTIVE' || r.status === 'RESERVED').length,
    [reservations]
  );
  const totalProducts = products.length;

  return (
    <div className="page">
      <h1>Gestion de Inventario</h1>
      {loading ? <p>Cargando datos de inventario...</p> : null}
      {loadError ? <p>{loadError}</p> : null}
      {!loading && !loadError ? (
        <div className="card">
          <h2>Resumen operativo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div><strong>Productos cargados:</strong> {totalProducts}</div>
            <div><strong>Stock critico:</strong> {criticalStockProducts.length}</div>
            <div><strong>Stock bajo:</strong> {lowStockProducts.length}</div>
            <div><strong>Reservas activas:</strong> {activeReservationsCount}</div>
            <div><strong>Unidades reservadas:</strong> {totalReservedUnits}</div>
          </div>
        </div>
      ) : null}
      {lowStockProducts.length > 0 ? (
        <div className="card">
          <h2>Stock bajo</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades restantes</th>
                <th>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.map((p) => (
                <tr key={`low-${p.id || p._id}`} style={{ borderBottom: '1px solid #ddd' }}>
                  <td>{p.name}</td>
                  <td style={{ color: Number(p.stock) <= CRITICAL_STOCK_LIMIT ? 'darkred' : 'red', fontWeight: 700 }}>{p.stock}</td>
                  <td>{lastSupplierByProductId[p.id || p._id] || 'Sin compras registradas'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="card">
        <h2>Productos</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
          <input
            name="name"
            value={productFilters.name}
            onChange={handleProductFilterChange}
            placeholder="Filtrar por nombre"
          />
          <input
            name="category"
            value={productFilters.category}
            onChange={handleProductFilterChange}
            placeholder="Filtrar por categoria"
          />
          <select name="stock" value={productFilters.stock} onChange={handleProductFilterChange}>
            <option value="all">Todos los stocks</option>
            <option value="critical">Stock critico ({'<='} 5)</option>
            <option value="low">Stock bajo ({'<'} 10)</option>
            <option value="available">Stock saludable ({'>='} 10)</option>
            <option value="empty">Sin stock</option>
          </select>
        </div>

        <form onSubmit={createProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16, alignItems: 'start' }}>
          <input name="name" value={newProduct.name} onChange={handleNewProductChange} placeholder="Nombre" required />
          <input name="codigoBarras" value={newProduct.codigoBarras} onChange={handleNewProductChange} placeholder="Codigo de barras" />
          <AsyncTypeahead
            id="new-product-category"
            isLoading={categoryLoading}
            minLength={0}
            allowNew
            onFocus={() => searchCategories('')}
            onSearch={searchCategories}
            options={categories}
            labelKey="name"
            selected={selectedCategory}
            onChange={setSelectedCategory}
            onInputChange={setCategoryInput}
            className="category-typeahead"
            newSelectionPrefix="Crear categoria: "
            placeholder="Categoria"
            promptText="Escribi para buscar categoria"
            searchText="Buscando categorias..."
            emptyLabel="Sin coincidencias. Presiona Enter para crear."
          />
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={newProduct.price}
            onChange={handleNewProductChange}
            placeholder="Precio de venta (kiosco)"
            required
          />
          <input
            name="cost"
            type="number"
            min="0"
            step="0.01"
            value={newProduct.cost}
            onChange={handleNewProductChange}
            placeholder="Precio de compra (kiosco)"
            required
          />
          <input name="stock" type="number" min="0" step="1" value={newProduct.stock} onChange={handleNewProductChange} placeholder="Stock inicial" />
          <button type="submit" disabled={creatingProduct}>{creatingProduct ? 'Agregando...' : 'Agregar producto'}</button>
        </form>
        {createError ? <p>{createError}</p> : null}

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Codigo de barras</th>
              <th>Categoria</th>
              <th>Precio de venta</th>
              <th>Precio de compra</th>
              <th>Stock</th>
              <th>Reservado</th>
              <th>Disponible venta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id || p._id} style={{ borderBottom: '1px solid #ddd' }}>
                <td>{p.name}</td>
                <td>{p.codigoBarras || '-'}</td>
                <td>{p.category}</td>
                <td>${Number(p.price || 0).toFixed(2)}</td>
                <td>${Number(p.cost || 0).toFixed(2)}</td>
                <td style={{ color: p.stock <= 10 ? 'red' : 'green' }}>{p.stock}</td>
                <td>{reservedByProductId[p.id || p._id] || 0}</td>
                <td>{Math.max(0, Number(p.stock || 0) - Number(reservedByProductId[p.id || p._id] || 0))}</td>
                <td>
                  <button onClick={() => loadMovements(p.id || p._id)}>Ver historial</button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9}>No hay productos que coincidan con los filtros.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <MovementHistory
        movements={movements}
        selectedProduct={selectedProduct}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApplyFilters={applyFilters}
      />
      <div className="card">
        <h2>Reservas de clientes</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Vence</th>
              <th>Productos</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id || r._id} style={{ borderBottom: '1px solid #ddd' }}>
                <td>{r.client?.name || 'Sin cliente'}</td>
                <td>{r.status}</td>
                <td>${Number(r.total || 0).toFixed(2)}</td>
                <td>{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '-'}</td>
                <td>
                  {(r.items || [])
                    .map((item) => `${item.product?.name || 'Producto'} x${item.quantity}`)
                    .join(', ')}
                </td>
              </tr>
            ))}
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={5}>No hay reservas registradas.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}


