import {test} from 'node:test';
import assert from 'node:assert/strict';
import {suggestCategory,ruleKey} from '../src/classification.js';
test('sugestões locais são limitadas; parcela não muda a chave aprendida',()=>{
  assert.equal(suggestCategory('SUPERMERCADO EXEMPLO'),'Supermercado');
  assert.equal(suggestCategory('LOJA NÃO IDENTIFICADA'),'Não classificado');
  assert.equal(ruleKey('LOJA EXEMPLO ( 02/05 )'),ruleKey('LOJA EXEMPLO ( 03/05 )'));
});
