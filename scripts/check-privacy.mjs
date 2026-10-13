import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {createHash} from 'node:crypto';

const approved = new Set(JSON.parse(readFileSync(new URL('../public-files.json', import.meta.url), 'utf8')));
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const history = process.argv.includes('--history');
const refs = history ? git(['rev-list', '--all']).trim().split('\n').filter(Boolean) : [null];
let problems = 0;
const mediaHashes={
  'assets/icon-192.png':'cf31d1662331bf5dfc25d633bb994a2f9d25b05f3b3b9aa02f75763234afb5f9',
  'assets/icon-512.png':'3f0e74b73264474d4ccf09781fa329da5391a4a516cdecedc5e631b45c401719'
};

for (const ref of refs) {
  const files = git(ref ? ['ls-tree', '-r', '--name-only', '-z', ref] : ['ls-files', '-z']).split('\0').filter(Boolean);
  for (const file of files) {
    if (!approved.has(file)) {
      console.error('Bloqueado: há um arquivo fora da lista pública revisada.');
      problems++;
      continue;
    }
    if(mediaHashes[file]){
      const buffer=execFileSync('git',['show',ref?`${ref}:${file}`:`:${file}`]);
      if(createHash('sha256').update(buffer).digest('hex')!==mediaHashes[file]){console.error('Bloqueado: ícone público não corresponde ao desenho revisado.');problems++;}
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
