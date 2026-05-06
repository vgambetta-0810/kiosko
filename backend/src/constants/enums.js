module.exports = {
  roles: {
    ADMIN: 'ADMIN',
    SELLER: 'SELLER',
    CLIENT: 'CLIENT',
    PARENT: 'PARENT'
  },
  paymentMethods: ['CASH', 'TRANSFER', 'CARD', 'MP'],
  stockMovementTypes: ['IN', 'OUT', 'RESERVED', 'RETURN'],
  stockMovementReasons: ['SALE', 'PURCHASE', 'RESERVATION', 'EXPIRED', 'MANUAL_ADJUSTMENT'],
  accountMovementTypes: ['DEBT', 'PAYMENT', 'RECHARGE'],
  accountOwnerTypes: ['CLIENT', 'SUPPLIER'],
  reservationStatus: ['ACTIVE', 'EXPIRED', 'RETURNED', 'COMPLETED']
};
