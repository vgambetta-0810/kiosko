import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestId } from '../src/utils/requestId.js';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('genera requestId UUID v4 aun cuando Web Crypto no está disponible', () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  try {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    const ids = Array.from({ length: 100 }, createRequestId);

    assert.ok(ids.every((id) => uuidV4.test(id)));
    assert.equal(new Set(ids).size, ids.length);
  } finally {
    if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
  }
});
