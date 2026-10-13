import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('cache offline ignora documentos, backups, outros sites e URLs com parâmetros',async()=>{
  const handlers={},cached=[];
  const cache={addAll:async urls=>cached.push(...urls),match:async()=>new Response('APP_STATIC'),put:async()=>{}};
  const context=vm.createContext({URL,Response,Set,
    self:{registration:{scope:'https://example.test/audita/'},location:{origin:'https://example.test'},skipWaiting:async()=>{},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn},
    caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},fetch:async()=>{throw new Error('offline');}
  });
  vm.runInContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),context);
  let install;handlers.install({waitUntil:value=>install=value});await install;
  assert.ok(cached.includes('./assets/pdf.worker.mjs'));
  for(const path of ['private/fatura.pdf','audita-backup.json','index.html?private=synthetic']) {
    let intercepted=false;
    handlers.fetch({request:{method:'GET',url:'https://example.test/audita/'+path},respondWith(){intercepted=true;}});
    assert.equal(intercepted,false);
  }
  let response;handlers.fetch({request:{method:'GET',url:'https://example.test/audita/index.html'},respondWith:value=>response=value});
  assert.equal(await (await response).text(),'APP_STATIC');
});
