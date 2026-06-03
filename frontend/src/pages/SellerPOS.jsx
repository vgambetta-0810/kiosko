import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CheckoutStep from '../components/pos/CheckoutStep';
import QuantityModal from '../components/pos/QuantityModal';
import SalesTable from '../components/pos/SalesTable';
import SKUInput from '../components/pos/SKUInput';
import usePosKeyboard from '../hooks/usePosKeyboard';
import { api } from '../services/api';

const PRODUCT_LIMIT = 15;

const getEntityId = (entity) => entity?.id || entity?._id;

const normalizeScanValue = (value) => String(value || '').trim().toUpperCase();

const productMatchesQuery = (product, query) => {
  const normalizedQuery = normalizeScanValue(query);
  if (!normalizedQuery) return true;

  return [product.name, product.sku, product.codigoBarras, getEntityId(product)]
    .filter(Boolean)
    .some((value) => normalizeScanValue(value).includes(normalizedQuery));
};

const productMatchesExactCode = (product, query) => {
  const normalizedQuery = normalizeScanValue(query);
  if (!normalizedQuery) return false;

  return [product.sku, product.codigoBarras, getEntityId(product)]
    .filter(Boolean)
    .some((value) => normalizeScanValue(value) === normalizedQuery);
};

export default function SellerPOS() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [skuQuery, setSkuQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [status, setStatus] = useState('PAID');
  const [clientId, setClientId] = useState('');
  const [step, setStep] = useState('items');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [highlightedProductId, setHighlightedProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [message, setMessage] = useState('');

  const skuInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const highlightTimerRef = useRef(null);

  const isQuantityModalOpen = Boolean(selectedProduct);

  const focusSku = useCallback(() => {
    window.requestAnimationFrame(() => {
      skuInputRef.current?.focus();
      skuInputRef.current?.select();
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setMessage('');
      try {
        const [productsRes, clientsRes] = await Promise.all([api.get('/products'), api.get('/sales/clients')]);
        setProducts(productsRes.data.filter((product) => product.isActive));
        setClients(clientsRes.data);
      } catch (error) {
        setMessage(error?.response?.data?.message || 'No se pudo cargar la información del POS');
      }
    };

    load();
  }, []);

  useEffect(() => {
    focusSku();
  }, [focusSku]);

  useEffect(() => {
    if (!isQuantityModalOpen && step === 'items') focusSku();
  }, [focusSku, isQuantityModalOpen, step]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => productMatchesQuery(product, skuQuery)).slice(0, PRODUCT_LIMIT);
  }, [products, skuQuery]);

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.quantity * item.price, 0), [cart]);
  const safeDiscount = Number(discount) > subtotal ? subtotal : Number(discount) || 0;
  const finalTotal = Math.max(0, subtotal - safeDiscount);

  const flashUpdatedRow = useCallback((productId) => {
    setHighlightedProductId(productId);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedProductId(''), 900);
  }, []);

  const openQuantityModal = useCallback((product) => {
    setMessage('');
    setSelectedProduct(product);
  }, []);

  const closeQuantityModal = useCallback(() => {
    setSelectedProduct(null);
    setSkuQuery('');
  }, []);

  const resolveProductByQuery = useCallback(
    async (query) => {
      const exactLocal = products.find((product) => productMatchesExactCode(product, query));
      if (exactLocal) return exactLocal;

      const response = await api.get('/products/lookup', { params: { q: query } });
      const items = response.data?.items || [];
      if (items.length === 1) return items[0];

      const exactRemote = items.find((product) => productMatchesExactCode(product, query));
      if (exactRemote) return exactRemote;

      return null;
    },
    [products]
  );

  const handleSkuSubmit = useCallback(
    async (event) => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      const query = skuQuery.trim();
      if (!query) {
        setMessage('Ingresá o escaneá un SKU');
        focusSku();
        return;
      }

      setLookupLoading(true);
      setMessage('');

      try {
        const product = await resolveProductByQuery(query);
        if (!product) {
          setMessage('Producto no encontrado o búsqueda ambigua');
          focusSku();
          return;
        }
        openQuantityModal(product);
      } catch (error) {
        setMessage(error?.response?.data?.message || 'No se pudo buscar el producto');
        focusSku();
      } finally {
        setLookupLoading(false);
      }
    },
    [focusSku, openQuantityModal, resolveProductByQuery, skuQuery]
  );

  const addQuantityToCart = useCallback(
    (quantityValue) => {
      const quantity = Number(quantityValue);
      const productId = getEntityId(selectedProduct);

      if (!selectedProduct || !productId || Number.isNaN(quantity)) {
        setMessage('Cantidad inválida');
        return;
      }

      setCart((prev) => {
        const found = prev.find((item) => item.productId === productId);

        if (!found && quantity === 0) return prev;

        if (found) {
          const nextQuantity = found.quantity + quantity;
          if (nextQuantity === 0) return prev.filter((item) => item.productId !== productId);

          return prev.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item));
        }

        return [
          ...prev,
          {
            productId,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            codigoBarras: selectedProduct.codigoBarras,
            price: Number(selectedProduct.price) || 0,
            stock: Number(selectedProduct.stock) || 0,
            quantity
          }
        ];
      });

      flashUpdatedRow(productId);
      closeQuantityModal();
    },
    [closeQuantityModal, flashUpdatedRow, selectedProduct]
  );

  const updateQty = useCallback((productId, quantityValue) => {
    const quantity = Number(quantityValue);
    if (quantityValue === '' || Number.isNaN(quantity)) {
      setMessage('Ingresá una cantidad válida');
      return;
    }

    setMessage('');
    setCart((prev) => {
      if (quantity === 0) return prev.filter((item) => item.productId !== productId);
      return prev.map((item) => (item.productId === productId ? { ...item, quantity } : item));
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const goCheckout = useCallback(() => {
    if (!cart.length) {
      setMessage('Cargá al menos un producto');
      focusSku();
      return;
    }
    setMessage('');
    setStep('checkout');
  }, [cart.length, focusSku]);

  const goItems = useCallback(() => {
    setStep('items');
    setMessage('');
    focusSku();
  }, [focusSku]);

  const submitSale = useCallback(async () => {
    if (!cart.length) {
      setMessage('Cargá al menos un producto');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await api.post('/sales', {
        clientId: clientId || null,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        discount: safeDiscount,
        paymentMethod,
        status
      });

      setCart([]);
      setDiscount(0);
      setClientId('');
      setStatus('PAID');
      setPaymentMethod('CASH');
      setStep('items');
      setMessage('Venta registrada correctamente');

      const productsRes = await api.get('/products');
      setProducts(productsRes.data.filter((product) => product.isActive));
      focusSku();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'No se pudo registrar la venta');
    } finally {
      setLoading(false);
    }
  }, [cart, clientId, focusSku, paymentMethod, safeDiscount, status]);

  usePosKeyboard({
    isModalOpen: isQuantityModalOpen,
    onEscape: closeQuantityModal,
    onFocusSku: focusSku,
    onGoCheckout: goCheckout,
    onFinalize: submitSale,
    canGoCheckout: step === 'items' && cart.length > 0,
    canFinalize: step === 'checkout' && cart.length > 0 && !loading
  });

  return (
    <div className="page pos-page">
      <header className="pos-header">
        <div>
          <p className="pos-kicker">Caja registradora</p>
          <h1>Seller POS</h1>
        </div>
        <div className="pos-total-card">
          <span>Total</span>
          <strong>${finalTotal.toFixed(2)}</strong>
        </div>
      </header>

      <div className="card pos-card">
        {step === 'items' ? (
          <>
            <section className="pos-entry-panel">
              <SKUInput
                value={skuQuery}
                onChange={setSkuQuery}
                onSubmit={handleSkuSubmit}
                inputRef={skuInputRef}
                disabled={lookupLoading || loading}
                loading={lookupLoading}
              />

              <div className="pos-product-list">
                {filteredProducts.map((product) => (
                  <button key={getEntityId(product)} type="button" onClick={() => openQuantityModal(product)}>
                    <span>{product.name}</span>
                    <small>
                      {product.sku || product.codigoBarras || getEntityId(product)} · ${Number(product.price).toFixed(2)} · Stock {product.stock}
                    </small>
                  </button>
                ))}
              </div>
            </section>

            <SalesTable items={cart} highlightedProductId={highlightedProductId} onUpdateQty={updateQty} onRemove={removeItem} />

            <footer className="pos-actions">
              <div>
                <span>Subtotal</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              <button type="button" onClick={goCheckout} disabled={!cart.length}>
                Continuar
              </button>
            </footer>
          </>
        ) : (
          <CheckoutStep
            cart={cart}
            clients={clients}
            clientId={clientId}
            status={status}
            paymentMethod={paymentMethod}
            discount={discount}
            subtotal={subtotal}
            finalTotal={finalTotal}
            loading={loading}
            onBack={goItems}
            onSubmit={submitSale}
            onClientChange={setClientId}
            onStatusChange={setStatus}
            onPaymentMethodChange={setPaymentMethod}
            onDiscountChange={setDiscount}
          />
        )}

        {message ? <small className="pos-message">{message}</small> : null}
      </div>

      <QuantityModal
        isOpen={isQuantityModalOpen}
        product={selectedProduct}
        inputRef={quantityInputRef}
        onConfirm={addQuantityToCart}
        onCancel={closeQuantityModal}
      />
    </div>
  );
}
