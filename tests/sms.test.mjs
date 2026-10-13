import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSms,reconcile} from '../.build/sms.mjs';
import {parseBradesco} from '../.build/domain.mjs';
import {syntheticPages} from './fixture-layout.mjs';
test('SMS concilia com descritor, cartão, data e valor sem mudar reconhecimento',()=>{
  const entries=parseBradesco(syntheticPages(),'synthetic').entries;
  entries[5].dateConfirmed=true;
  const parsed=parseSms('COMPRA APROVADA CARTAO FINAL 2222 EM 02/10/2026 R$ 20,00 SERVICO EXEMPLO');
  const r=reconcile(entries,parsed.messages);
  assert.equal(r.get(entries[5].id).status,'matched');assert.equal(entries[5].recognition,'unset');
  assert.equal(reconcile(entries,[]).get(entries[0].id).status,'not-evaluated');
});
test('parcela com ano inferido não recebe conciliação confiável sem confirmação',()=>{
  const entries=parseBradesco(syntheticPages(),'synthetic').entries;
  const messages=parseSms('COMPRA APROVADA FINAL 2222 EM 02/10/2026 R$ 20,00 SERVICO EXEMPLO').messages;
  assert.equal(reconcile(entries,messages).get(entries[5].id).status,'ambiguous');
});
test('SMS único não explica duas compras; divergência mantém valores independentes',()=>{
  const entries=parseBradesco(syntheticPages(),'synthetic').entries;
  const sms=parseSms('COMPRA APROVADA FINAL 1111 EM 01/10/2026 R$ 10,00 LOJA EXEMPLO').messages;
  assert.equal(reconcile(entries,sms).get(entries[2].id).status,'ambiguous');
  const changed=parseSms('COMPRA APROVADA FINAL 1111 EM 01/10/2026 R$ 29,00 LOJA INTERNACIONAL').messages;
  assert.equal(reconcile(entries,changed).get(entries[4].id).divergence.amountMinor,2900);
});
test('SMS da compra integral pode explicar a parcela; diferença isolada não gera falso alerta',()=>{
  const entries=parseBradesco(syntheticPages(),'synthetic').entries;entries[5].dateConfirmed=true;
  const total=parseSms('COMPRA APROVADA FINAL 2222 EM 02/10/2026 R$ 100,00 SERVICO EXEMPLO').messages;
  assert.equal(reconcile(entries,total).get(entries[5].id).status,'matched');
  const uncertain=parseSms('COMPRA APROVADA FINAL 2222 EM 02/10/2026 R$ 99,00 SERVICO EXEMPLO').messages;
  assert.equal(reconcile(entries,uncertain).get(entries[5].id).divergence,null);
});
test('data impossível, recusa e formato desconhecido não criam compras',()=>{
  assert.equal(parseSms('COMPRA RECUSADA FINAL 1111 EM 01/10/2026 R$ 10,00 LOJA').messages.length,0);
  assert.equal(parseSms('COMPRA FINAL 1111 EM 31/02/2026 R$ 10,00 LOJA').rejected,1);
  assert.equal(parseSms('qualquer texto sem dados').rejected,1);
});
