import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CheckoutStep from '../components/pos/CheckoutStep';
import QuantityModal from '../components/pos/QuantityModal';
import SalesTable from '../components/pos/SalesTable';
import BarcodeInput from '../components/pos/BarcodeInput';
import usePosKeyboard from '../hooks/usePosKeyboard';
import { api } from '../services/api';
import { getProductCodeLabel } from '../utils/products';

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
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [saleTypes, setSaleTypes] = useState([]);
  const [barcodeQuery, setBarcodeQuery] = useState('');
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
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [clientsError, setClientsError] = useState('');
  const [message, setMessage] = useState('');

  const barcodeInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const submitLockRef = useRef(false);

  const isQuantityModalOpen = Boolean(selectedProduct);

  const focusBarcode = useCallback(() => {
    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setMessage('');
      setOptionsLoading(true);
      setOptionsError('');
      setClientsError('');
      try {
        const [productsRes, clientsRes, paymentMethodsRes, saleTypesRes] = await Promise.all([
          api.get('/products'),
          api.get('/sales/clients'),
          api.get('/sales/options/payment-methods'),
          api.get('/sales/options/sale-types')
        ]);
        setProducts(productsRes.data.filter((product) => product.isActive));
        setClients(clientsRes.data);
        setPaymentMethods(paymentMethodsRes.data || []);
        setSaleTypes(saleTypesRes.data || []);
      } catch (error) {
        const loadError = error?.response?.data?.message || 'No se pudo cargar la información de ventas';
        setMessage(loadError);
        setOptionsError(loadError);
        setClientsError(loadError);
      } finally {
        setOptionsLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    focusBarcode();
  }, [focusBarcode]);

  useEffect(() => {
    if (!isQuantityModalOpen && step === 'items') focusBarcode();
  }, [focusBarcode, isQuantityModalOpen, step]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => productMatchesQuery(product, barcodeQuery)).slice(0, PRODUCT_LIMIT);
  }, [barcodeQuery, products]);

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
    setBarcodeQuery('');
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

  const goCheckout = useCallback(() => {
    if (!cart.length) {
      setMessage('Cargá al menos un producto');
      focusBarcode();
      return;
    }
    setMessage('');
    setStep('checkout');
  }, [cart.length, focusBarcode]);

  const handleBarcodeSubmit = useCallback(
    async (event) => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      const query = barcodeQuery.trim();
      if (!query) {
        goCheckout();
        return;
      }

      setLookupLoading(true);
      setMessage('');

      try {
        const product = await resolveProductByQuery(query);
        if (!product) {
          setMessage('Producto no encontrado o búsqueda ambigua');
          focusBarcode();
          return;
        }
        openQuantityModal(product);
      } catch (error) {
        setMessage(error?.response?.data?.message || 'No se pudo buscar el producto');
        focusBarcode();
      } finally {
        setLookupLoading(false);
      }
    },
    [barcodeQuery, focusBarcode, goCheckout, openQuantityModal, resolveProductByQuery]
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
            codigoBarras: selectedProduct.codigoBarras,
            legacyCode: selectedProduct.sku,
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

  const goItems = useCallback(() => {
    setStep('items');
    setMessage('');
    focusBarcode();
  }, [focusBarcode]);

  const createPaymentMethod = useCallback(async (name) => {
    const { data } = await api.post('/sales/options/payment-methods', { name });
    setPaymentMethods((current) => [...current.filter((option) => option.id !== data.id), data]);
    return data;
  }, []);

  const createSaleType = useCallback(async (name) => {
    const { data } = await api.post('/sales/options/sale-types', { name });
    setSaleTypes((current) => [...current.filter((option) => option.id !== data.id), data]);
    return data;
  }, []);

  const createClient = useCallback(async (name) => {
    const { data } = await api.post('/sales/clients', { name });
    setClients((current) => [...current.filter((client) => client.id !== data.id), data]);
    return data;
  }, []);

  const submitSale = useCallback(async () => {
    if (submitLockRef.current) return;
    if (!cart.length) {
      setMessage('Cargá al menos un producto');
      return;
    }
    if (!paymentMethod) {
      setMessage('Seleccioná un método de pago');
      return;
    }
    const selectedSaleType = saleTypes.find((option) => option.code === status);
    if (!selectedSaleType) {
      setMessage('Seleccioná un tipo de venta');
      return;
    }
    if (selectedSaleType.requiresClient && !clientId) {
      setMessage('El cliente es obligatorio para ventas fiadas');
      return;
    }

    submitLockRef.current = true;
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

      const [productsRes, clientsRes] = await Promise.all([api.get('/products'), api.get('/sales/clients')]);
      setProducts(productsRes.data.filter((product) => product.isActive));
      setClients(clientsRes.data);
      focusBarcode();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'No se pudo registrar la venta');
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }, [cart, clientId, focusBarcode, paymentMethod, safeDiscount, saleTypes, status]);

  usePosKeyboard({
    isModalOpen: isQuantityModalOpen,
    onEscape: closeQuantityModal,
    onFocusBarcode: focusBarcode,
    onGoCheckout: goCheckout,
    onFinalize: submitSale,
    canGoCheckout: step === 'items' && cart.length > 0,
    canFinalize: step === 'checkout' && cart.length > 0 && !loading
  });

  return (
    <div className="page pos-page">
      <header className="pos-header">
        <div>
          <p className="pos-kicker">Ventas</p>
          <h1>Nueva venta</h1>
        </div>
        <div className="pos-header__actions">
          <Link to="/ventas/historial" className="pos-history-link">
            Ver historial
          </Link>
          <div className="pos-total-card">
            <span>Total</span>
            <strong>${finalTotal.toFixed(2)}</strong>
          </div>
        </div>
      </header>

      <div className="card pos-card">
        {step === 'items' ? (
          <>
            <section className="pos-entry-panel">
              <BarcodeInput
                value={barcodeQuery}
                onChange={setBarcodeQuery}
                onSubmit={handleBarcodeSubmit}
                inputRef={barcodeInputRef}
                disabled={lookupLoading || loading}
                loading={lookupLoading}
              />

              <div className="pos-product-list">
                {filteredProducts.map((product) => (
                  <button key={getEntityId(product)} type="button" onClick={() => openQuantityModal(product)}>
                    <span>{product.name}</span>
                    <small>
                      {getProductCodeLabel(product)} · ${Number(product.price).toFixed(2)} · Stock {product.stock}
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
            paymentMethods={paymentMethods}
            saleTypes={saleTypes}
            clientId={clientId}
            status={status}
            paymentMethod={paymentMethod}
            discount={discount}
            subtotal={subtotal}
            finalTotal={finalTotal}
            loading={loading}
            optionsLoading={optionsLoading}
            optionsError={optionsError}
            clientsError={clientsError}
            onBack={goItems}
            onSubmit={submitSale}
            onClientChange={setClientId}
            onStatusChange={setStatus}
            onPaymentMethodChange={setPaymentMethod}
            onDiscountChange={setDiscount}
            onCreatePaymentMethod={createPaymentMethod}
            onCreateSaleType={createSaleType}
            onCreateClient={createClient}
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
