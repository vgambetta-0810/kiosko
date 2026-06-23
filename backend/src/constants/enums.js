module.exports = {
  roles: {
    ADMIN: 'ADMIN',
    SELLER: 'SELLER',
    CLIENT: 'CLIENT',
    PARENT: 'PARENT'
  },
  paymentMethods: ['CASH', 'TRANSFER', 'CARD', 'MP'],
  stockMovementTypes: ['IN', 'OUT', 'RESERVED', 'RETURN', 'WASTE'],
  stockMovementReasons: [
    'SALE',
    'PURCHASE',
    'RESERVATION',
    'EXPIRED',
    'MANUAL_ADJUSTMENT',
    'BROKEN',
    'THEFT',
    'LOSS',
    'LOAD_ERROR',
    'INTERNAL_USE',
    'OTHER'
  ],
  accountMovementTypes: ['DEBT', 'PAYMENT', 'RECHARGE', 'DEDUCTION', 'CONSUMPTION', 'ADJUSTMENT'],
  accountOwnerTypes: ['CLIENT', 'SUPPLIER'],
  reservationStatus: ['ACTIVE', 'EXPIRED', 'RETURNED', 'COMPLETED']
};
