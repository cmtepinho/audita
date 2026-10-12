import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const approved = new Set(JSON.parse(readFileSync(new URL('../public-files.json', import.meta.url), 'utf8')));
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const history = process.argv.includes('--history');
const refs = history ? git(['rev-list', '--all']).trim().split('\n').filter(Boolean) : [null];
let problems = 0;

for (const ref of refs) {
  const files = git(ref ? ['ls-tree', '-r', '--name-only', '-z', ref] : ['ls-files', '-z']).split('\0').filter(Boolean);
  for (const file of files) {
    if (!approved.has(file)) {
      console.error('Bloqueado: há um arquivo fora da lista pública revisada.');
      problems++;
      continue;
    }
    const content = git(['show', ref ? `${ref}:${file}` : `:${file}`]);
    // Não imprimir trechos: um diagnóstico não deve revelar o segredo encontrado.
    const suspicious = [
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
      /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
      /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
      /\bAKIA[A-Z0-9]{16}\b/,
      /\/Users\/[^\s/]+\//
    ];
    const emails = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    if (suspicious.some(pattern => pattern.test(content)) || emails.some(email => email !== 'cmtepinho@users.noreply.github.com')) {
      console.error(`Bloqueado: possível dado pessoal ou segredo em arquivo aprovado${ref ? ' no histórico' : ''}. Revisar localmente sem publicar.`);
      problems++;
    }
  }
  if (ref) {
    const identities = git(['show', '-s', '--format=%an%n%ae%n%cn%n%ce', ref]).trim().split('\n');
    if (identities[0] !== 'cmtepinho' || identities[2] !== 'cmtepinho' ||
        identities[1] !== 'cmtepinho@users.noreply.github.com' || identities[3] !== 'cmtepinho@users.noreply.github.com') {
      console.error('Bloqueado: histórico contém autoria fora da identidade pública cmtepinho/noreply. Usar a cópia preparada para publicação.');
      problems++;
    }
  }
}

if (problems) {
  process.exitCode = 1;
} else {
  console.log(`Lista pública e padrões básicos de privacidade conferidos${history ? ', incluindo histórico e autoria' : ' no índice Git'}.`);
  console.log('A verificação é preventiva; novos arquivos e conteúdos ainda precisam de revisão humana.');
}
