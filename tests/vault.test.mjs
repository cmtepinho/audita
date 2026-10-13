import {test} from 'node:test';
import assert from 'node:assert/strict';
import {derive,seal,open} from '../src/vault.js';
test('cofre cifrado não contém texto financeiro e recusa senha incorreta ou adulteração',async()=>{
  const salt=crypto.getRandomValues(new Uint8Array(16)),password='senha-sintetica-de-teste';
  const key=await derive(password,salt),value={version:1,description:'COMPRA SINTETICA PRIVADA',amountMinor:1234};
  const encrypted=await seal(value,key,salt);
  assert.ok(!JSON.stringify(encrypted).includes(value.description));
  assert.deepEqual((await open(encrypted,password)).value,value);
  await assert.rejects(open(encrypted,'outra-senha-sintetica'));
  const corrupted={...encrypted,data:(encrypted.data[0]==='A'?'B':'A')+encrypted.data.slice(1)};
  await assert.rejects(open(corrupted,password));
  await assert.rejects(derive('curta',salt));
});
