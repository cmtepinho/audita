import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
// Lista explícita: nunca servir o diretório inteiro nem documentos financeiros.
const routes = new Map([
  ['/', new URL('index.html', root)],
  ['/index.html', new URL('index.html', root)],
  ['/reference/index.original.html', new URL('reference/index.original.html', root)]
]);

export function createDevServer() {
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const authority = req.headers.host;
    const addresses = serverAddresses(res.socket?.localPort);
    if (!addresses.has(authority)) {
      res.writeHead(403);
      res.end('Host não permitido.');
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Este servidor não recebe documentos.');
      return;
    }
    let path;
    try {
      // Não normalizar segmentos: qualquer caminho fora da lista é recusado.
      path = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
      res.writeHead(400);
      res.end('URL inválida.');
      return;
    }
    if (path === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    const file = routes.get(path);
    if (!file) {
      res.writeHead(404);
      res.end('Página não encontrada.');
      return;
    }
    try {
      const html = await readFile(file);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : html);
    } catch {
      res.writeHead(500);
      res.end('Não foi possível abrir o protótipo local.');
    }
  });
}

function serverAddresses(port) {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.AUDITA_PORT || 5173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('AUDITA_PORT deve ser um inteiro de 1 a 65535.');
  }
  const server = createDevServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? 'Porta ocupada. Execute AUDITA_PORT=5174 npm run dev.'
      : `Falha no servidor local: ${error.code || 'erro desconhecido'}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Audita: http://127.0.0.1:${port}`);
    console.log(`Referência: http://127.0.0.1:${port}/reference/index.original.html`);
    console.log('Protótipo demonstrativo. Apenas acesso local; sem recebimento de arquivos.');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close());
  }
}
