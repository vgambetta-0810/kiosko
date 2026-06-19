import { memo, useEffect, useMemo, useRef, useState } from 'react';
import SearchableCreatableCombobox from '../common/SearchableCreatableCombobox';

const getOptionLabel = (option) => option?.name || '';
const getOptionCode = (option) => option?.code || '';
const getClientId = (client) => client?.id || '';
const getSaleTypeDescription = (option) => (option?.requiresClient ? 'Requiere cliente' : 'No requiere cliente');
const balancePaymentCodes = new Set(['BALANCE', 'SALDO', 'TARJETA', 'SALDO_TARJETA']);
const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2
});

const getClientDescription = (client) => {
  const email = client?.email?.endsWith('@clientes.local') ? '' : client?.email;
  const balance = moneyFormatter.format(Number(client?.balance || 0));
  return [email, `Saldo ${balance}`].filter(Boolean).join(' · ') || `Saldo ${balance}`;
};

function CheckoutStep({
  cart,
  clients,
  paymentMethods,
  saleTypes,
  clientId,
  status,
  paymentMethod,
  discount,
  subtotal,
  finalTotal,
  loading,
  optionsLoading,
  optionsError,
  clientsError,
  onBack,
  onSubmit,
  onClientChange,
  onStatusChange,
  onPaymentMethodChange,
  onDiscountChange,
  onCreatePaymentMethod,
  onCreateSaleType,
  onCreateClient
}) {
  const formRef = useRef(null);
  const discountRef = useRef(null);
  const paymentMethodRef = useRef(null);
  const saleTypeRef = useRef(null);
  const clientRef = useRef(null);
  const [validationErrors, setValidationErrors] = useState({});

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((option) => option.code === paymentMethod) || null,
    [paymentMethod, paymentMethods]
  );
  const selectedSaleType = useMemo(() => saleTypes.find((option) => option.code === status) || null, [saleTypes, status]);
  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId) || null, [clientId, clients]);
  const usesBalance = Boolean(selectedPaymentMethod && balancePaymentCodes.has(selectedPaymentMethod.code));
  const clientRequired = Boolean(selectedSaleType?.requiresClient || usesBalance);

  useEffect(() => {
    const focusId = window.setTimeout(() => {
      discountRef.current?.focus();
      discountRef.current?.select();
    }, 0);
    return () => window.clearTimeout(focusId);
  }, []);

  const focus = (ref) => {
    window.requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.select?.();
    });
  };

  const clearValidation = (field) => {
    setValidationErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;

    const nextErrors = {};
    if (!selectedPaymentMethod) nextErrors.paymentMethod = 'Seleccioná un método de pago';
    if (!selectedSaleType) nextErrors.saleType = 'Seleccioná un tipo de venta';
    if (usesBalance && status !== 'PAID') nextErrors.saleType = 'El pago con saldo debe ser de contado';
    if (clientRequired && !selectedClient) nextErrors.client = usesBalance ? 'Seleccioná un cliente para pagar con saldo' : 'El cliente es obligatorio para ventas fiadas';
    if (usesBalance && selectedClient && Number(selectedClient.balance || 0) < finalTotal) nextErrors.client = 'Saldo insuficiente para esta venta';
    setValidationErrors(nextErrors);

    if (nextErrors.paymentMethod) return focus(paymentMethodRef);
    if (nextErrors.saleType) return focus(saleTypeRef);
    if (nextErrors.client) return focus(clientRef);
    onSubmit();
  };

  return (
    <form ref={formRef} className="pos-checkout" onSubmit={handleSubmit}>
      <h3>Resumen de venta</h3>
      <div className="pos-checkout__summary">
        <div>Items: {cart.length}</div>
        <div>Subtotal: ${subtotal.toFixed(2)}</div>
        <div>Total final: ${finalTotal.toFixed(2)}</div>
      </div>

      <label>
        Descuento
        <input
          ref={discountRef}
          type="number"
          min="0"
          max={subtotal}
          value={discount}
          onChange={(event) => onDiscountChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            focus(paymentMethodRef);
          }}
        />
      </label>

      <SearchableCreatableCombobox
        id="sale-payment-method"
        label="Método de pago"
        inputRef={paymentMethodRef}
        selectedOption={selectedPaymentMethod}
        options={paymentMethods}
        placeholder="Selecciona un método de pago"
        loading={optionsLoading}
        error={validationErrors.paymentMethod || optionsError}
        disabled={loading}
        required
        showSearchIcon={false}
        getOptionLabel={getOptionLabel}
        getOptionValue={getOptionCode}
        onSelect={(option) => {
          clearValidation('paymentMethod');
          onPaymentMethodChange(option.code);
        }}
        onCreate={onCreatePaymentMethod}
        onClear={() => onPaymentMethodChange('')}
        onEnterNext={() => focus(saleTypeRef)}
      />

      <SearchableCreatableCombobox
        id="sale-type"
        label="Tipo de venta"
        inputRef={saleTypeRef}
        selectedOption={selectedSaleType}
        options={saleTypes}
        placeholder="Selecciona un tipo de venta"
        loading={optionsLoading}
        error={validationErrors.saleType || optionsError}
        disabled={loading}
        required
        showSearchIcon={false}
        getOptionLabel={getOptionLabel}
        getOptionValue={getOptionCode}
        getOptionDescription={getSaleTypeDescription}
        onSelect={(option) => {
          clearValidation('saleType');
          clearValidation('client');
          onStatusChange(option.code);
        }}
        onCreate={onCreateSaleType}
        onClear={() => onStatusChange('')}
        onEnterNext={() => focus(clientRef)}
      />

      <SearchableCreatableCombobox
        id="sale-client"
        label={clientRequired ? 'Cliente' : 'Cliente (opcional)'}
        inputRef={clientRef}
        selectedOption={selectedClient}
        options={clients}
        placeholder="Selecciona o busca un cliente"
        error={validationErrors.client || clientsError}
        disabled={loading}
        required={clientRequired}
        showSearchIcon={false}
        getOptionLabel={getOptionLabel}
        getOptionValue={getClientId}
        getOptionDescription={getClientDescription}
        onSelect={(client) => {
          clearValidation('client');
          onClientChange(client.id);
        }}
        onCreate={onCreateClient}
        onClear={() => onClientChange('')}
        onEnterNext={() => formRef.current?.requestSubmit()}
      />

      <div className="pos-checkout__actions">
        <button type="button" className="pos-modal__cancel" onClick={onBack} disabled={loading}>
          Volver
        </button>
        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Finalizar'}
        </button>
      </div>
    </form>
  );
}

export default memo(CheckoutStep);
