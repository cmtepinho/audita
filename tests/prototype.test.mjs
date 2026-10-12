import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Caracterização do JavaScript existente; não substitui testes em navegador.
function prototype() {
  const elements = new Map();
  const context = vm.createContext({
    document: { getElementById(id) {
      if (!elements.has(id)) elements.set(id, {
        innerHTML: '', scrollTop: 0, value: '', addEventListener() {}, click() {}
      });
      return elements.get(id);
    } },
    setTimeout() {}, Blob, URL
  });
  vm.runInContext(script, context);
  return { run: code => vm.runInContext(code, context), elements };
}

test('snapshot original permanece íntegro e frontend está inalterado nesta etapa', async () => {
  const original = await readFile(new URL('../reference/index.original.html', import.meta.url));
  assert.equal(createHash('sha256').update(original).digest('hex'),
    '0f904d68bdfebcfdf474c74e0e794ca38932a8a243a48079008ddbfd44714328');
  assert.equal(html, original.toString());
});

test('dez telas e variantes de relatório, carteira, SMS e adicionais renderizam', () => {
  const { run, elements } = prototype();
  for (const screen of ['home', 'start', 'invoices', 'sms', 'processing', 'review', 'transaction', 'wallet', 'additional', 'report']) {
    run(`go('${screen}')`);
    assert.ok(elements.get('screen').innerHTML.length > 100, screen);
  }
  for (const tab of ['Resumo', 'Lançamentos', 'Categorias', 'Adicionais']) {
    assert.ok(run(`state.reportTab='${tab}'; report()`).length > 100);
  }
  for (const tab of ['Todos', 'Titular', 'Adicionais', 'Cancelados']) {
    run(`chooseCardTab('${tab}')`);
    assert.ok(run('wallet()').length > 100);
  }
  for (const tab of ['Pessoas', 'Cartões', 'Histórico']) {
    assert.ok(run(`state.extraTab='${tab}'; additional()`).length > 100);
  }
  assert.match(run("state.smsMethod='file'; sms()"), /smsFiles/);
});

test('revisão altera contagem, preserva distinção de autorização e reinício limpa decisões', () => {
  const { run } = prototype();
  assert.equal(run('issues.filter(i=>!state.statuses[i.id]).length'), 5);
  run("openIssue(1);markIssue('recognized')");
  assert.equal(run('issues.filter(i=>!state.statuses[i.id]).length'), 4);
  assert.match(run('transaction()'), /Reconhecida/);
  run("markIssue('unknown')");
  assert.match(run('transaction()'), /Não reconhecida/);
  run("setModal('evidenceSms')");
  assert.match(run('modalContent()'), /não confirma/);
  run('resetDemo()');
  assert.equal(run('Object.keys(state.statuses).length'), 0);
});

test('repasse positivo até o saldo atualiza saldo; excesso e negativo são recusados', () => {
  const { run, elements } = prototype();
  run("document.getElementById('repay-value')");
  elements.get('repay-value').value = '100';
  run('saveRepay(0)');
  assert.equal(run('state.repay[0]'), 600);
  for (const invalid of ['-1', '221', 'abc', '0']) {
    elements.get('repay-value').value = invalid;
    run('saveRepay(0)');
    assert.equal(run('state.repay[0]'), 600);
  }
});

test('seleção de PDF retém apenas metadados; arquivo pode ser removido', () => {
  const { run } = prototype();
  run("addFiles({target:{files:[{name:'teste.pdf',size:1024},{name:'outro.txt',size:100}]}})");
  assert.equal(run('state.files.length'), 3);
  assert.equal(run('state.files[2].name'), 'teste.pdf');
  assert.equal(run('state.files[2].demo'), false);
  assert.equal(run("Object.keys(state.files[2]).sort().join(',')"), 'demo,name,size');
  run('removeFile(2)');
  assert.equal(run('state.files.length'), 2);
});
