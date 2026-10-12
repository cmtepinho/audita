import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(root, '.publish/audita');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
if (git(['status', '--porcelain']).trim()) throw new Error('Commitar e revisar as mudanças locais antes de preparar a cópia pública.');
execFileSync(process.execPath, [resolve(root, 'scripts/check-privacy.mjs')], { cwd: root, stdio: 'inherit' });
const files = JSON.parse(await readFile(resolve(root, 'public-files.json'), 'utf8'));
await mkdir(dirname(target), { recursive: true });
await mkdir(target); // Nunca apagar ou sobrescrever uma cópia existente automaticamente.
for (const file of files) {
  const output = resolve(target, file);
  if (!output.startsWith(target + '/')) throw new Error('Caminho inválido na lista pública.');
  await mkdir(dirname(output), { recursive: true });
  const content = execFileSync('git', ['show', `HEAD:${file}`], { cwd: root });
  await writeFile(output, content);
}
for (const file of ['.githooks/pre-commit', '.githooks/pre-push']) await chmod(resolve(target, file), 0o755);
const localGit = args => execFileSync('git', args, { cwd: target, stdio: 'pipe' });
localGit(['init', '-b', 'main']);
localGit(['config', 'user.name', 'cmtepinho']);
localGit(['config', 'user.email', 'cmtepinho@users.noreply.github.com']);
localGit(['config', 'core.hooksPath', '.githooks']);
localGit(['add', '--', ...files]);
const publicIdentity = {
  ...process.env,
  GIT_AUTHOR_NAME: 'cmtepinho', GIT_AUTHOR_EMAIL: 'cmtepinho@users.noreply.github.com',
  GIT_COMMITTER_NAME: 'cmtepinho', GIT_COMMITTER_EMAIL: 'cmtepinho@users.noreply.github.com'
};
execFileSync('git', ['commit', '-m', 'chore: initial public Audita source without private history'], {
  cwd: target, env: publicIdentity, stdio: 'inherit'
});
localGit(['tag', 'prototype-b2.0-original']);
execFileSync(process.execPath, [resolve(target, 'scripts/check-privacy.mjs'), '--history'], { cwd: target, stdio: 'inherit' });
console.log('Cópia pública preparada em .publish/audita, sem remoto e sem envio ao GitHub.');
console.log('O histórico original e dados locais permanecem no projeto de origem.');
