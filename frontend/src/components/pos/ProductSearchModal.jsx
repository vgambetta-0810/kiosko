import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getProductCodeLabel } from '../../utils/products';

const SEARCH_LIMIT = 40;

const getEntityId = (entity) => entity?.id || entity?._id;

const normalize = (value) => String(value || '').trim().toLocaleLowerCase('es');

const matchesProduct = (product, query, category) => {
  const normalizedQuery = normalize(query);
  const matchesQuery =
    !normalizedQuery ||
    [product.codigoBarras, product.sku, product.name, getEntityId(product)]
      .filter(Boolean)
      .some((value) => normalize(value).includes(normalizedQuery));
  const matchesCategory = category === 'ALL' || product.category === category;
  return matchesQuery && matchesCategory;
};

function ProductSearchTable({ highlightedId, onHighlight, onSelect, products }) {
  return (
    <div className="pos-search-table-wrapper">
      <table className="pos-search-table">
        <thead>
          <tr>
            <th>Codigo</th>
            <th>Nombre</th>
            <th>Categoria</th>
            <th>Precio</th>
            <th>Stock disponible</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const productId = getEntityId(product);
            const stock = Number(product.stock || 0);
            const disabled = stock <= 0;
            return (
              <tr
                key={productId}
                className={highlightedId === productId ? 'is-highlighted' : ''}
                onMouseEnter={() => onHighlight(productId)}
                onDoubleClick={() => !disabled && onSelect(product)}
              >
                <td>{getProductCodeLabel(product)}</td>
                <td>
                  <strong>{product.name}</strong>
                </td>
                <td>{product.category || 'Sin categoria'}</td>
                <td>${Number(product.price || 0).toFixed(2)}</td>
                <td>
                  <span className={`pos-search-stock ${disabled ? 'pos-search-stock--empty' : ''}`}>
                    {disabled ? 'Sin stock' : stock}
                  </span>
                </td>
                <td>
                  <button type="button" onClick={() => onSelect(product)} disabled={disabled}>
                    Seleccionar
                  </button>
                </td>
              </tr>
            );
          })}
          {!products.length ? (
            <tr>
              <td colSpan={6} className="pos-table__empty">
                No hay productos que coincidan con la busqueda
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ProductSearchModal({ isOpen, onClose, onSelect, products }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const categories = useMemo(() => {
    const names = products.map((product) => product.category).filter(Boolean);
    return ['ALL', ...Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'es'))];
  }, [products]);

  const results = useMemo(
    () => products.filter((product) => matchesProduct(product, query, category)).slice(0, SEARCH_LIMIT),
    [category, products, query]
  );

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setCategory('ALL');
    setHighlightedIndex(0);
    const focusId = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusId);
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [category, query]);

  if (!isOpen) return null;

  const highlightedProduct = results[highlightedIndex] || results[0] || null;
  const highlightedId = getEntityId(highlightedProduct);

  const selectProduct = (product) => {
    if (!product || Number(product.stock || 0) <= 0) return;
    onSelect(product);
  };

  const handleKeyDown = (event) => {
    const targetTag = event.target?.tagName;

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (targetTag === 'SELECT' || targetTag === 'BUTTON') return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && highlightedProduct) {
      event.preventDefault();
      selectProduct(highlightedProduct);
    }
  };

  const handleHighlight = (productId) => {
    const nextIndex = results.findIndex((product) => getEntityId(product) === productId);
    if (nextIndex >= 0) setHighlightedIndex(nextIndex);
  };

  return (
    <div className="pos-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="pos-search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-search-title"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pos-search-modal__header">
          <div>
            <h2 id="product-search-title">Buscar producto</h2>
            <p>Busca por codigo de barras o nombre</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar busqueda">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <section className="pos-search-modal__filters" aria-label="Filtros de productos">
          <label className="pos-search-field">
            <span>Producto</span>
            <div>
              <Search size={17} aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Codigo o nombre"
                autoComplete="off"
              />
            </div>
          </label>
          <label className="pos-search-category">
            <span>Categoria</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL' ? 'Todas' : item}
                </option>
              ))}
            </select>
          </label>
        </section>

        <ProductSearchTable
          highlightedId={highlightedId}
          onHighlight={handleHighlight}
          onSelect={selectProduct}
          products={results}
        />
      </section>
    </div>
  );
}

export default memo(ProductSearchModal);
