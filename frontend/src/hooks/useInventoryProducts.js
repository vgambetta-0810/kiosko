import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

export const LOW_STOCK_LIMIT = 10;

export const getProductId = (product) => product?.id || product?._id;

const isActiveReservation = (reservation) => reservation.status === 'ACTIVE' || reservation.status === 'RESERVED';

export default function useInventoryProducts() {
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementFilters, setMovementFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productsRes, purchasesRes, reservationsRes] = await Promise.all([
        api.get('/products'),
        api.get('/purchases'),
        api.get('/reservations')
      ]);
      setProducts(productsRes.data || []);
      setPurchases(purchasesRes.data || []);
      setReservations(reservationsRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los datos de inventario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const reservedByProductId = useMemo(() => {
    return reservations.reduce((acc, reservation) => {
      if (!isActiveReservation(reservation)) return acc;
      (reservation.items || []).forEach((item) => {
        const productId = item.product?.id || item.product;
        if (!productId) return;
        acc[productId] = (acc[productId] || 0) + Number(item.quantity || 0);
      });
      return acc;
    }, {});
  }, [reservations]);

  const supplierByProductId = useMemo(() => {
    return purchases
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .reduce((acc, purchase) => {
        const supplierName = purchase.supplier?.name || 'Proveedor no definido';
        const supplierPhone = purchase.supplier?.phone ? ` | Tel: ${purchase.supplier.phone}` : '';
        const supplierContact = `${supplierName}${supplierPhone}`;

        (purchase.items || []).forEach((item) => {
          const productId = item.product?.id || item.product;
          if (productId && !acc[productId]) acc[productId] = supplierContact;
        });

        return acc;
      }, {});
  }, [purchases]);

  const productsWithInventory = useMemo(() => {
    return products.map((product) => {
      const productId = getProductId(product);
      const stock = Number(product.stock || 0);
      const reserved = Number(reservedByProductId[productId] || 0);

      return {
        ...product,
        productId,
        stock,
        reserved,
        available: Math.max(0, stock - reserved),
        supplierName: supplierByProductId[productId] || 'Sin compras registradas'
      };
    });
  }, [products, reservedByProductId, supplierByProductId]);

  const metrics = useMemo(() => {
    return productsWithInventory.reduce(
      (acc, product) => {
        acc.totalProducts += 1;
        acc.outOfStock += product.stock <= 0 ? 1 : 0;
        acc.lowStock += product.stock > 0 && product.stock <= LOW_STOCK_LIMIT ? 1 : 0;
        acc.inventoryValue += product.stock * Number(product.cost || 0);
        acc.potentialSalesValue += product.stock * Number(product.price || 0);
        acc.reservedUnits += product.reserved;
        return acc;
      },
      {
        totalProducts: 0,
        outOfStock: 0,
        lowStock: 0,
        inventoryValue: 0,
        potentialSalesValue: 0,
        reservedUnits: 0
      }
    );
  }, [productsWithInventory]);

  const loadMovements = useCallback(async (productId) => {
    const res = await api.get(`/stock/product/${productId}`);
    setSelectedProduct(res.data.product);
    setMovements(res.data.movements || []);
  }, []);

  const handleMovementFilterChange = useCallback((event) => {
    const { name, value } = event.target;
    setMovementFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const applyMovementFilters = useCallback(async () => {
    const query = new URLSearchParams(movementFilters).toString();
    const res = await api.get(`/stock/movements?${query}`);
    setMovements(res.data || []);
    setSelectedProduct(null);
  }, [movementFilters]);

  return {
    products: productsWithInventory,
    metrics,
    reservations,
    selectedProduct,
    movements,
    movementFilters,
    loading,
    error,
    message,
    setMessage,
    reload: loadInventory,
    loadMovements,
    handleMovementFilterChange,
    applyMovementFilters
  };
}
