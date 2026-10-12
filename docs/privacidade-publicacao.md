# Código público, dados locais

O GitHub deve receber apenas o código, documentação técnica revisada e dados
fictícios do protótipo. Faturas, SMS, decisões, repasses reais, bancos de dados,
imagens pessoais, backups e credenciais ficam exclusivamente no computador.

## Separação preparada

- `private/`, `data/`, `uploads/`, resultados e formatos financeiros ficam ignorados.
- `public-files.json` contém a lista explícita de arquivos autorizados para a cópia
  pública. Arquivo novo fora dessa lista bloqueia a verificação, mesmo com `git add -f`.
- Hooks locais verificam o índice antes de commit e todo o histórico antes de push.
- A verificação procura também padrões básicos de segredo, e-mail e caminho pessoal,
  sem imprimir o conteúdo suspeito. Ela não identifica qualquer dado pessoal possível;
  revisar conteúdo continua obrigatório. Hooks podem ser desativados; não são uma
  garantia absoluta contra publicação indevida.
- O workflow Pages publica somente `index.html` e `.nojekyll`, não a raiz inteira.
  Os outros arquivos aprovados ficam visíveis no repositório público, não no artefato do site.
- Nunca incorporar dados reais em HTML, JavaScript, fixtures, documentação ou screenshots
  versionadas. `.gitignore` não protege conteúdo colocado dentro de arquivo permitido.

## Histórico e autoria

Os commits locais iniciais usam a autoria configurada no computador. Não publicar
esse histórico, pois pode expor nome/e-mail pessoal. `npm run prepare:public`
gera uma cópia em `.publish/audita`, com histórico novo e autoria `cmtepinho`
usando o endereço noreply do GitHub. Não copia `.git`, documentos privados ou
arquivos fora da lista. O original e sua tag continuam no projeto local.

A cópia tem uma nova tag `prototype-b2.0-original` apontando para o snapshot
público completo; o hash do HTML original permanece o mesmo. Os hashes de commits
citados nos documentos de análise referem-se ao histórico local preservado.

Preparar não cria repositório remoto nem faz push. A cópia é uma separação inicial,
não sincronização automática: antes de publicar mudanças posteriores, definir qual
checkout mantém o histórico público e executar a verificação novamente. Não ligar
o histórico local antigo ao remoto público sem tratar a autoria.

## Uso do aplicativo hospedado

O protótipo atual contém somente dados fictícios e não envia PDFs/SMS selecionados.
Não tem auditoria real nem persistência. Para o requisito de dados exclusivamente
locais, a implementação hospedada deve extrair PDFs/SMS no navegador e guardar
resultados localmente, por exemplo em IndexedDB, com exportação/importação de backup
sob controle do usuário. Isso precisa ser implementado e testado; ainda não existe.

Não haverá sincronização automática entre dispositivos, processamento financeiro
em backend ou envio a IA externa nesse modo. Qualquer mudança desse requisito
precisa ser explicitamente combinada. A arquitetura com API/PostgreSQL descrita
anteriormente fica como alternativa futura para outro modo de operação.

O navegador baixa o aplicativo do GitHub Pages e atualmente solicita artes ao
Bradesco. Essas requisições de infraestrutura envolvem metadados de acesso normais,
como endereço IP; “dados financeiros locais” não significa navegação sem rede.
Importação, persistência, logs e dependências futuras devem ser verificados para
impedir que conteúdo financeiro saia do dispositivo.

## GitHub Pages

GitHub Free permite Pages em repositórios públicos; GitHub Pro também permite
repositórios privados. O site geralmente é público mesmo quando seu repositório
é privado. [Documentação oficial](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

Para um projeto comercial, código público pode ser copiado/consultado por terceiros.
Dados financeiros devem continuar locais independentemente da visibilidade do código.
