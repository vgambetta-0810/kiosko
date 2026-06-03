import { useCallback, useMemo, useState } from 'react';
import { LOW_STOCK_LIMIT } from './useInventoryProducts';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const normalize = (value) => String(value || '').trim().toLowerCase();

const getStockStatus = (stock) => {
  const numericStock = Number(stock || 0);
  if (numericStock <= 0) return 'empty';
  if (numericStock <= LOW_STOCK_LIMIT) return 'low';
  return 'normal';
};

const compareValues = (left, right, direction) => {
  const multiplier = direction === 'asc' ? 1 : -1;
  if (typeof left === 'number' || typeof right === 'number') {
    return ((Number(left) || 0) - (Number(right) || 0)) * multiplier;
  }
  return String(left || '').localeCompare(String(right || '')) * multiplier;
};

export default function useInventoryFilters(products) {
  const [filters, setFilters] = useState({ search: '', category: '', stockStatus: 'all' });
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const categories = useMemo(() => {
    const names = products.map((product) => product.category).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const updateFilter = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  }, []);

  const updateSort = useCallback((key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const updatePageSize = useCallback((value) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const filteredProducts = useMemo(() => {
    const search = normalize(filters.search);
    const category = normalize(filters.category);

    return products.filter((product) => {
      const searchable = [product.sku, product.codigoBarras, product.name, product.category, product.productId]
        .map(normalize)
        .join(' ');
      const matchesSearch = search ? searchable.includes(search) : true;
      const matchesCategory = category ? normalize(product.category) === category : true;
      const matchesStock =
        filters.stockStatus === 'all' ? true : getStockStatus(product.stock) === filters.stockStatus;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [filters, products]);

  const sortedProducts = useMemo(() => {
    return filteredProducts.slice().sort((a, b) => {
      const key = sort.key;
      const left = key === 'status' ? getStockStatus(a.stock) : a[key];
      const right = key === 'status' ? getStockStatus(b.stock) : b[key];
      return compareValues(left, right, sort.direction);
    });
  }, [filteredProducts, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [pageSize, safePage, sortedProducts]);

  return {
    filters,
    categories,
    sort,
    page: safePage,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalItems: sortedProducts.length,
    totalPages,
    paginatedProducts,
    updateFilter,
    updateSort,
    setPage,
    updatePageSize
  };
}
