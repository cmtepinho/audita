import {test} from 'node:test';
import assert from 'node:assert/strict';
import {money,sum,parseBradesco,duplicateGroups,redact,formatMoney} from '../.build/domain.mjs';
import {syntheticPages} from './fixture-layout.mjs';
test('centavos são exatos; sinais, agrupamento e limites são validados',()=>{
  assert.equal(money('R$ 1.234,56'),123456);assert.equal(money('-0,01'),-1);
  assert.equal(sum([money('0,10'),money('0,20')]),30);
  for(const value of ['12.34','1,234','1.23,00','NaN','9999999999999999999,99'])assert.throws(()=>money(value));
  assert.throws(()=>sum([Number.MAX_SAFE_INTEGER,1]));
  assert.equal(formatMoney(Number.MAX_SAFE_INTEGER),'R$ 90.071.992.547.409,91');
  assert.equal(formatMoney(-1),'-R$ 0,01');
});
test('export sintético fecha cartões, resumo e total sem duplicar saldo anterior',()=>{
  const r=parseBradesco(syntheticPages(),'synthetic');
  assert.equal(r.integrity,'verified');assert.equal(r.entries.length,7);assert.equal(r.calculatedMinor,6500);
  assert.deepEqual(r.cards.map(c=>c.differenceMinor),[0,0]);
  assert.equal(r.entries.filter(e=>e.kind==='balance').length,1);
  assert.deepEqual(r.entries.find(e=>e.kind==='installment').installment,{index:2,count:5});
  assert.equal(r.entries[2].date,'2026-10-01');assert.equal(r.entries[5].date,'2026-10-02');
  assert.equal(duplicateGroups(r.entries).length,1);
});
test('linha perdida, centavo divergente e página sem texto impedem integridade',()=>{
  const pages=syntheticPages();
  pages[0].tokens=pages[0].tokens.filter(t=>t.y!==250);
  assert.equal(parseBradesco(pages,'synthetic').integrity,'pending');
  const changed=syntheticPages();changed[0].tokens.find(t=>t.text==='30,00').text='30,01';
  assert.equal(parseBradesco(changed,'synthetic').integrity,'pending');
  const blank=syntheticPages();blank.push({page:2,width:612,height:792,tokens:[]});
  assert.equal(parseBradesco(blank,'synthetic').integrity,'pending');
});
test('ano não é inferido pela data de geração; layout desconhecido falha',()=>{
  const pages=syntheticPages();pages[0].tokens=pages[0].tokens.filter(t=>!t.text.includes('vencimento'));
  pages[0].tokens.push({text:'Data 10/10/2026',x:459,y:40,width:100,height:10});
  assert.equal(parseBradesco(pages,'synthetic').integrity,'pending');
  assert.throws(()=>parseBradesco([{page:1,width:612,height:792,tokens:[]}],'synthetic'),/Layout não suportado/);
  assert.equal(redact('COMPRA 4111 1111 1111 1111'),'COMPRA [número removido]');
});
