module.exports = {
  roles: {
    ADMIN: 'ADMIN',
    SELLER: 'SELLER',
    CLIENT: 'CLIENT',
    PARENT: 'PARENT'
  },
  paymentMethods: ['CASH', 'TRANSFER', 'CARD', 'MP'],
  stockMovementTypes: ['IN', 'OUT', 'RESERVED', 'RETURN'],
  accountMovementTypes: ['DEBT', 'PAYMENT', 'RECHARGE'],
  accountOwnerTypes: ['CLIENT', 'SUPPLIER'],
  reservationStatus: ['ACTIVE', 'EXPIRED', 'RETURNED', 'COMPLETED']
};
