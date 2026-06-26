import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('el panel del cliente mantiene saldo en modo solo lectura', async () => {
  const source = await readFile(new URL('../src/pages/ClientPanel.jsx', import.meta.url), 'utf8');

  assert.equal(source.includes('/client/me/balance-charge'), false);
  assert.equal(source.includes('Cargar saldo'), false);
  assert.equal(source.includes('balanceForm'), false);
  assert.equal(source.includes('Saldo disponible'), true);
  assert.equal(source.includes('Ultima carga'), true);
  assert.equal(source.includes('Ultimo consumo'), true);
  assert.equal(source.includes('Ver movimientos'), true);
});
