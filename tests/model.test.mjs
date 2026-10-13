import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateModel} from '../src/model.js';
import {parseBradesco} from '../.build/domain.mjs';
import {syntheticPages} from './fixture-layout.mjs';
const model=()=>({version:1,activeId:'audit-synthetic',audits:[{id:'audit-synthetic',month:'2026-10',documents:[{...parseBradesco(syntheticPages(),'synthetic'),name:'Documento sintético'}],messages:[],resolutions:{},cardSettings:{},repayments:[],history:[]}]});
test('backup permite modelo válido e rejeita IDs de script, valores inseguros e cartões inválidos',()=>{
  assert.equal(validateModel(model()),true);
  for(const corrupt of [m=>m.audits[0].documents[0].entries[0].id="');alert(1)//",m=>m.audits[0].documents[0].cards[0].last4='invalid',m=>m.audits[0].documents[0].entries[0].amountMinor=0.1,m=>m.activeId='missing',m=>m.audits[0].month='2026-99']){
    const m=model();corrupt(m);assert.equal(validateModel(m),false);
  }
});
