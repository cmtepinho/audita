import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const original = await readFile(new URL('../reference/index.original.html', import.meta.url));
const expected = '0f904d68bdfebcfdf474c74e0e794ca38932a8a243a48079008ddbfd44714328';
if (createHash('sha256').update(original).digest('hex') !== expected) {
  throw new Error('A referência original foi alterada. Restaure a cópia da tag prototype-b2.0-original.');
}
console.log('Referência original íntegra (SHA-256 confirmado).');
