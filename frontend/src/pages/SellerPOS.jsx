import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CheckoutStep from '../components/pos/CheckoutStep';
import ProductSearchModal from '../components/pos/ProductSearchModal';
import QuantityModal from '../components/pos/QuantityModal';
import SalesTable from '../components/pos/SalesTable';
import BarcodeInput from '../components/pos/BarcodeInput';
import usePosKeyboard from '../hooks/usePosKeyboard';
import { api } from '../services/api';
import { isPositiveInteger } from '../utils/quantity';

const getEntityId = (entity) => entity?.id || entity?._id;

const normalizeScanValue = (value) => String(value || '').trim().toUpperCase();

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
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [step, setStep] = useState('items');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
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
  const isAnyModalOpen = isQuantityModalOpen || isProductSearchOpen;

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
        const loadError = error?.response?.data?.message || 'No se pudo cargar la informacion de ventas';
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
    if (!isAnyModalOpen && step === 'items') focusBarcode();
  }, [focusBarcode, isAnyModalOpen, step]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

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

  const openProductSearch = useCallback(() => {
    if (step !== 'items' || loading) return;
    setMessage('');
    setIsProductSearchOpen(true);
  }, [loading, step]);

  const closeProductSearch = useCallback(() => {
    setIsProductSearchOpen(false);
    focusBarcode();
  }, [focusBarcode]);

  const selectProductFromSearch = useCallback(
    (product) => {
      setIsProductSearchOpen(false);
      openQuantityModal(product);
    },
    [openQuantityModal]
  );

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
      setMessage('Carga al menos un producto');
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
          setMessage('Producto no encontrado o busqueda ambigua');
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

  useEffect(() => {
    if (step !== 'items') return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'F1') return;
      if (isAnyModalOpen || loading) return;
      event.preventDefault();
      openProductSearch();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnyModalOpen, loading, openProductSearch, step]);

  const addQuantityToCart = useCallback(
    (quantityValue) => {
      const quantity = Number(quantityValue);
      const productId = getEntityId(selectedProduct);

      if (!selectedProduct || !productId || !isPositiveInteger(quantityValue)) {
        setMessage('La cantidad debe ser un numero entero mayor a cero');
        return;
      }

      const found = cart.find((item) => item.productId === productId);
      const nextQuantity = (found?.quantity || 0) + quantity;
      if (nextQuantity > Number(selectedProduct.stock || 0)) {
        setMessage(`Stock insuficiente. Disponible: ${selectedProduct.stock}`);
        return;
      }

      setCart((prev) => {
        if (found) {
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
    [cart, closeQuantityModal, flashUpdatedRow, selectedProduct]
  );

  const updateQty = useCallback((productId, quantityValue) => {
    const quantity = Number(quantityValue);
    if (!isPositiveInteger(quantityValue)) {
      setMessage('La cantidad debe ser un numero entero mayor a cero');
      return;
    }

    setMessage('');
    setCart((prev) => {
      const currentItem = prev.find((item) => item.productId === productId);
      if (currentItem && quantity > currentItem.stock) {
        setMessage(`Stock insuficiente. Disponible: ${currentItem.stock}`);
        return prev;
      }
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
      setMessage('Carga al menos un producto');
      return;
    }
    if (!paymentMethod) {
      setMessage('Selecciona un metodo de pago');
      return;
    }
    const selectedSaleType = saleTypes.find((option) => option.code === status);
    if (!selectedSaleType) {
      setMessage('Selecciona un tipo de venta');
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
      setStatus('');
      setPaymentMethod('');
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
    isModalOpen: isAnyModalOpen,
    onEscape: isProductSearchOpen ? closeProductSearch : closeQuantityModal,
    onFocusBarcode: focusBarcode,
    onGoCheckout: goCheckout,
    onFinalize: submitSale,
    canGoCheckout: step === 'items' && cart.length > 0 && !isProductSearchOpen,
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
                onOpenSearch={openProductSearch}
                inputRef={barcodeInputRef}
                disabled={lookupLoading || loading}
                loading={lookupLoading}
              />
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
      <ProductSearchModal
        isOpen={isProductSearchOpen}
        products={products}
        onClose={closeProductSearch}
        onSelect={selectProductFromSearch}
      />
    </div>
  );
}
