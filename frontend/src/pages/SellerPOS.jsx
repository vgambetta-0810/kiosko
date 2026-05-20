import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import SKUInput from '../components/pos/SKUInput';
import QuantityModal from '../components/pos/QuantityModal';
import SalesTable from '../components/pos/SalesTable';
import CheckoutStep from '../components/pos/CheckoutStep';
import usePosKeyboard from '../hooks/usePosKeyboard';

const HIGHLIGHT_MS = 900;
const STEP_CAPTURE = 'CAPTURE';
const STEP_CHECKOUT = 'CHECKOUT';

const normalizeText = (value) => String(value || '').trim();

export default function SellerPOS() {
  const [clients, setClients] = useState([]);
  const [skuInput, setSkuInput] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [status, setStatus] = useState('PAID');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState('');
  const [step, setStep] = useState(STEP_CAPTURE);

  const skuInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const lookupInFlightRef = useRef(false);

  const focusSku = useCallback(() => {
    const input = skuInputRef.current;
    if (!input) return;
    input.focus();
    input.select?.();
  }, []);

  const handleModalCancel = useCallback(() => {
    setIsQtyModalOpen(false);
    setSelectedProduct(null);
    setError('');
    setTimeout(() => focusSku(), 0);
  }, [focusSku]);

  const goToCheckout = useCallback(() => {
    if (!cart.length) {
      setError('Agrega al menos un producto antes de continuar');
      return;
    }
    setStep(STEP_CHECKOUT);
    setError('');
  }, [cart.length]);

  const backToCapture = useCallback(() => {
    setStep(STEP_CAPTURE);
    setError('');
    setTimeout(() => focusSku(), 0);
  }, [focusSku]);

  const subtotal = useMemo(() => cart.reduce((acc, i) => acc + i.quantity * i.price, 0), [cart]);
  const safeDiscount = Number(discount) > subtotal ? subtotal : Number(discount) || 0;
  const finalTotal = Math.max(0, subtotal - safeDiscount);

  const canGoCheckout = step === STEP_CAPTURE && !isQtyModalOpen && cart.length > 0 && !loading;
  const canFinalize = step === STEP_CHECKOUT && !isQtyModalOpen && !loading;

  const submitSale = useCallback(async () => {
    if (!cart.length) return setMessage('Add at least one product');
    if (status === 'PENDING' && !clientId) return setMessage('Client is required for pending sales');

    setLoading(true);
    setMessage('');
    setError('');
    try {
      await api.post('/sales', {
        clientId: clientId || null,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        discount: safeDiscount,
        paymentMethod,
        status
      });
      setCart([]);
      setDiscount(0);
      setClientId('');
      setStatus('PAID');
      setPaymentMethod('CASH');
      setMessage('Sale registered successfully');
      setSkuInput('');
      setStep(STEP_CAPTURE);
      setTimeout(() => focusSku(), 0);
    } catch (apiError) {
      setMessage(apiError?.response?.data?.message || 'Failed to register sale');
    } finally {
      setLoading(false);
    }
  }, [cart, clientId, discount, focusSku, paymentMethod, safeDiscount, status]);

  usePosKeyboard({
    isModalOpen: isQtyModalOpen,
    onEscape: handleModalCancel,
    onFocusSku: focusSku,
    onGoCheckout: goToCheckout,
    onFinalize: submitSale,
    canGoCheckout,
    canFinalize
  });

  useEffect(() => {
    const load = async () => {
      try {
        const clientsRes = await api.get('/sales/clients');
        setClients(clientsRes.data);
      } catch (_error) {
        setError('No se pudieron cargar clientes');
      }
    };
    load();
    setTimeout(() => focusSku(), 0);
  }, [focusSku]);

  useEffect(() => {
    if (!highlightedProductId) return undefined;
    const timer = setTimeout(() => setHighlightedProductId(''), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightedProductId]);

  const addOrUpdateCartLine = useCallback((product, quantityDelta) => {
    const parsedQty = Number(quantityDelta);
    if (!Number.isFinite(parsedQty) || parsedQty === 0) {
      setError('La cantidad no puede ser 0');
      return false;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (!existing) {
        return [...prev, { productId: product.id, name: product.name, price: product.price, stock: product.stock, quantity: parsedQty }];
      }

      return prev
        .map((item) => {
          if (item.productId !== product.id) return item;
          return { ...item, quantity: item.quantity + parsedQty };
        })
        .filter((item) => item.quantity !== 0);
    });

    setHighlightedProductId(product.id);
    setMessage(`Actualizado: ${product.name} (${parsedQty > 0 ? '+' : ''}${parsedQty})`);
    setError('');
    return true;
  }, []);

  const lookupProduct = useCallback(async (query) => {
    const { data } = await api.get('/products/lookup', { params: { q: query } });
    const items = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) return null;
    return items[0];
  }, []);

  const handleSkuSubmit = useCallback(
    async (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();

      if (isQtyModalOpen || step !== STEP_CAPTURE) return;
      if (lookupInFlightRef.current) return;

      const rawValue = normalizeText(skuInput);
      if (!rawValue) {
        setError('Ingresa un SKU o nombre de producto');
        return;
      }

      lookupInFlightRef.current = true;
      setError('');
      setMessage('');

      try {
        const product = await lookupProduct(rawValue);
        if (!product) {
          setError('Producto no encontrado');
          return;
        }

        setSelectedProduct(product);
        setIsQtyModalOpen(true);
      } catch (_error) {
        setError('No se pudo buscar el producto');
      } finally {
        lookupInFlightRef.current = false;
      }
    },
    [isQtyModalOpen, lookupProduct, skuInput, step]
  );

  const handleModalConfirm = useCallback(
    (quantityValue) => {
      if (!selectedProduct) return;
      const success = addOrUpdateCartLine(selectedProduct, quantityValue);
      if (!success) return;

      setIsQtyModalOpen(false);
      setSelectedProduct(null);
      setSkuInput('');
      setTimeout(() => focusSku(), 0);
    },
    [addOrUpdateCartLine, selectedProduct, focusSku]
  );

  const updateQty = useCallback((productId, quantity) => {
    const numeric = Number(quantity);
    if (!Number.isFinite(numeric)) return;

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          if (numeric === 0) return null;
          return { ...item, quantity: numeric };
        })
        .filter(Boolean)
    );

    setHighlightedProductId(productId);
    setError('');
  }, []);

  const removeItem = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    setError('');
  }, []);

  return (
    <div className="page">
      <h1>Seller POS</h1>
      <div className="card pos-card">
        <div className="pos-steps">
          <span className={step === STEP_CAPTURE ? 'is-active' : ''}>1. Carga</span>
          <span className={step === STEP_CHECKOUT ? 'is-active' : ''}>2. Resumen</span>
        </div>
        <div className="pos-shortcuts">Atajos: F2 foco SKU, F4 siguiente, Ctrl+Enter finalizar, Esc cancelar modal</div>

        {step === STEP_CAPTURE ? (
          <>
            <SKUInput value={skuInput} onChange={setSkuInput} onSubmit={handleSkuSubmit} inputRef={skuInputRef} disabled={loading} />
            <SalesTable
              items={cart}
              highlightedProductId={highlightedProductId}
              onUpdateQty={updateQty}
              onRemove={removeItem}
            />
            <div className="pos-capture-footer">
              <div>Subtotal: ${subtotal.toFixed(2)}</div>
              <button type="button" onClick={goToCheckout} disabled={!cart.length || loading}>Siguiente</button>
            </div>
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
            onBack={backToCapture}
            onSubmit={submitSale}
            onClientChange={setClientId}
            onStatusChange={setStatus}
            onPaymentMethodChange={setPaymentMethod}
            onDiscountChange={setDiscount}
          />
        )}

        {error ? <small className="pos-feedback pos-feedback--error">{error}</small> : null}
        {!error && message ? <small className="pos-feedback">{message}</small> : null}
      </div>

      <QuantityModal
        isOpen={isQtyModalOpen}
        product={selectedProduct}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        inputRef={quantityInputRef}
      />
    </div>
  );
}
