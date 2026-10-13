import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderReport} from '../.build/report.mjs';
import {parseBradesco} from '../.build/domain.mjs';
import {syntheticPages} from './fixture-layout.mjs';
test('relatório separa dimensões e escapa conteúdo de PDF sem executar HTML',()=>{
  const doc={...parseBradesco(syntheticPages(),'synthetic'),name:'Documento sintético'};
  doc.entries[0].description='<img src="invalid" onerror="alert(1)">';
  const html=renderReport({month:'2026-10',documents:[doc],cardSettings:{},repayments:[],messages:[]},{verified:true});
  assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src'));
  assert.ok(html.includes('Conciliação não comprova autorização.'));
  assert.ok(html.includes('Reconhecimento'));assert.ok(html.includes('65,00'));
  const pending=renderReport({month:'2026-10',documents:[doc],cardSettings:{},repayments:[],messages:[]},{overlapping:true});
  assert.ok(pending.includes('A conferir'));
});
