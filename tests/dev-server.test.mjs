import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createDevServer } from '../scripts/dev-server.mjs';

test('servidor local entrega HTML intacto e recusa acesso a documentos e escrita', async t => {
  const server = createDevServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const call = (path, method = 'GET', host = `127.0.0.1:${port}`) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers: { Host: host } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', data => { body += data; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
  const original = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const path of ['/', '/index.html', '/reference/index.original.html']) {
    const res = await call(path);
    assert.equal(res.status, 200);
    assert.equal(res.body, original);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(res.headers['referrer-policy'], 'no-referrer');
  }
  for (const path of ['/.git/config', '/private/fatura.pdf', '/docs/brief-original.md', '/package.json', '/../index.html', '/%2e%2e/index.html']) {
    assert.equal((await call(path)).status, 404, path);
  }
  assert.equal((await call('/%ZZ')).status, 400);
  assert.equal((await call('/', 'POST')).status, 405);
  assert.equal((await call('/', 'GET', 'external.example')).status, 403);
  assert.equal((await call('/', 'GET', `localhost:${port}`)).status, 200);
  assert.equal((await call('/', 'HEAD')).body, '');
});
