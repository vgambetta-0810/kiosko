export const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

export const isNonNegativeInteger = (value) => Number.isInteger(Number(value)) && Number(value) >= 0;

export const isUnsignedIntegerInput = (value) => /^\d*$/.test(String(value));

export const blockNonIntegerKeys = (event) => {
  if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
};
