# Audita

Aplicativo de auditoria mensal de faturas de cartões de crédito.
Design aprovado: **B 2.0 · Claro Premium**.

Código público: [cmtepinho/audita](https://github.com/cmtepinho/audita).
Protótipo publicado: [Audita no GitHub Pages](https://cmtepinho.github.io/audita/).
Faturas, SMS e dados financeiros permanecem exclusivamente locais.

## Estado atual

Primeira missão de análise e preparação, em 12/10/2026.
O `index.html` original permanece intacto. As dez telas são navegáveis,
mas a extração de faturas, a conciliação e a auditoria ainda são simuladas.
Não há backend, banco de dados, autenticação nem persistência.

## Visualização local

Com Node.js e npm disponíveis:

```sh
npm run dev
```

Abrir [Audita local](http://127.0.0.1:5173).
A [referência original](http://127.0.0.1:5173/reference/index.original.html)
permite comparar futuras mudanças.
Para encerrar, usar `Ctrl+C`. Se a porta estiver ocupada:

```sh
AUDITA_PORT=5174 npm run dev
```

Esta preparação não instala dependências. O servidor usa apenas a biblioteca
padrão do Node, escuta em `127.0.0.1` e serve somente o protótipo e a referência.
Não recebe uploads nem expõe arquivos, documentos ou a pasta Git.
O navegador ainda solicita as imagens institucionais ao domínio
`assets.bradesco`, como previsto no HTML recebido. Nenhum documento é enviado
por esse fluxo. As imagens podem ficar indisponíveis sem conexão.

Ambiente encontrado e usado nesta etapa: Node 20.20.2 e npm local.
Para a implementação comercial, adotar Node 24 LTS, com versões fixadas no
projeto. Node 20 já está fora de suporte segundo a
[tabela oficial de versões](https://nodejs.org/en/about/previous-releases).

## Verificações

```sh
npm test
npm run check:reference
```

Os testes caracterizam o JavaScript do protótipo e verificam o servidor local.
Não comprovam extração de PDF, precisão financeira, acessibilidade ou compatibilidade
em iPhone. O teste que compara o frontend à referência é específico desta etapa;
na primeira alteração autorizada do frontend, substituí-lo por comparação visual
e manter a verificação do SHA-256 da referência.

## Documentação

- [Código público e dados locais](docs/privacidade-publicacao.md): requisito atualizado,
  verificações, cópia sem histórico pessoal e publicação limitada no Pages.
- [Análise integral do protótipo](docs/analise-prototipo.md): telas, interações e limitações.
- [Regras do produto](docs/regras-produto.md): invariantes financeiros e de auditoria.
- [Arquitetura proposta](docs/arquitetura.md): módulos, dados, segurança e migração.
- [Plano incremental](docs/plano-incremental.md): ordem, dependências e critérios de entrega.
- [Registro de validação](docs/validacao.md): evidências e limites desta primeira missão.
- [Brief original](docs/brief-original.md): instruções recebidas, sem alterações.
- [Referência preservada](reference/README.md): hash e recuperação pelo Git.

## Documentos financeiros

Manter documentos reais exclusivamente em `private/`, fora do versionamento.
O `.gitignore` também exclui PDFs, CSVs, planilhas, bancos locais e segredos.
Isso evita inclusão acidental comum, mas não substitui revisar `git diff --cached`
antes de cada commit. TXT de SMS deve ficar em `private/`, pois nem todo TXT é
financeiro e a extensão não é bloqueada globalmente.

Não enviar documentos financeiros para serviços externos sem autorização
explícita. Os testes futuros devem usar fixtures sintéticas ou sanitizadas,
revisadas antes de qualquer inclusão no repositório.

Requisito atual: dados financeiros permanecem exclusivamente locais mesmo com
o aplicativo no GitHub Pages. O plano com backend é uma alternativa futura,
condicionada a uma mudança expressa desse requisito. A publicação contém somente
o protótipo fictício; processamento e persistência reais ainda serão implementados.

```sh
npm run check:privacy
npm run prepare:public
```

O primeiro comando verifica o índice Git; o segundo cria uma cópia aprovada para
publicação em `.publish/audita`, com autoria pública e sem histórico pessoal.
Nenhum desses comandos envia arquivos ao GitHub.

A cópia pública inicial foi preparada e enviada a `cmtepinho/audita` em 12/10/2026.
Seu checkout está em `.publish/audita`. O projeto original mantém o histórico
local e não tem remoto público configurado. Atualizações devem transferir apenas
arquivos aprovados para esse checkout e gerar commits com identidade noreply;
nunca enviar o histórico original ou copiar diretórios de dados privados.

## Próxima etapa

Implementar um adaptador local para **um layout conhecido de fatura Bradesco**:
extrair lançamentos com referência de página e conferir totais. Ampliar para
vários PDFs e SMS após validar essa base. O parser ainda não foi implementado;
não foi fornecida uma fatura nesta primeira missão.

