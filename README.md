# Audita · 0.2.0

Auditoria mensal de faturas com **processamento e dados financeiros exclusivamente locais**.
Interface web e mobile responsiva, com identidade B 2.0 Claro Premium.
SMS está desativado nesta etapa e reservado para a segunda fase.

[Abrir aplicativo](https://cmtepinho.github.io/audita/) ·
[Código público](https://github.com/cmtepinho/audita) ·
[Referência do protótipo](https://cmtepinho.github.io/audita/reference/index.original.html)

## Utilizar

1. Criar uma senha local com pelo menos 12 caracteres.
2. Escolher a competência e importar fatura Bradesco no layout exportado suportado.
3. Prosseguir diretamente para a análise das faturas.
4. Processar e conferir subtotais, total, lançamentos e evidências.
5. Revisar ocorrências e confirmar responsáveis e datas originais quando necessário.
6. Exportar backup criptografado e relatório local.

Dados são cifrados no navegador com AES-GCM. Senha/chave não são salvas nem enviadas.
Não há recuperação por servidor nem sincronização automática. Guardar senha e backups.
PDFs são lidos em memória e não entram no cache offline. O backup pode ser restaurado
manualmente em outro dispositivo, usando a mesma senha.

O aplicativo importa documentos e calcula resultados reais. A demonstração fictícia
continua separada na referência original. Nenhuma fatura de usuário é distribuída junto
com o aplicativo ou versionada neste repositório.

## Cobertura e limites

Suporta o layout Bradesco exportado com texto, tabela de lançamentos e Resumo das Despesas.
Outro layout, PDF digitalizado ou protegido por senha é sinalizado. Valores faturados são
BRL; valores originais em moeda estrangeira não são somados como despesas adicionais.
A conciliação não comprova autorização.

Ano de compra ausente no PDF é inferido pelo vencimento e indicado no detalhe. Parcelas
antigas exigem confirmação de data para conciliação confiável. Atalhos do iPhone e OCR
ainda não estão disponíveis. Não há contestação automática ou verificação externa de empresas.

[Funcionalidades, limites e validação](docs/versao-funcional.md).

## Desenvolvimento local

Usar Node 24 LTS para instalação/build e validação das dependências.

```sh
npm ci
npm run dev
```

Abrir [ambiente local](http://127.0.0.1:5173). Para outra porta:

```sh
AUDITA_PORT=5174 npm run dev
```

O servidor escuta somente em 127.0.0.1, entrega arquivos explicitamente permitidos e
não recebe uploads. Não expõe Git, documentos ou configuração. Não há registro de
service worker no desenvolvimento local, para evitar código antigo.

```sh
npm test
npm run check:reference
npm run check:privacy
```

O build em dist/ inclui apenas HTML, código empacotado, worker PDF.js, ícones,
manifesto, service worker e referência. dist/ e .build/ são gerados e ignorados.
O workflow instala dependências fixadas, executa verificações e publica somente dist/.

## Publicação e privacidade

Arquivos reais ficam em private/, fora do Git. public-files.json declara os únicos
arquivos permitidos. Hooks verificam conteúdo e histórico antes de envio. Ícones PNG
gerados do desenho do app têm hashes revisados; imagens pessoais não podem substituí-los
inadvertidamente. As verificações não dispensam revisão de conteúdo.

O histórico local original tem autoria privada e **não deve ser enviado**. A cópia pública
em .publish/audita usa identidade cmtepinho/noreply. Atualizações são transferidas pela
lista aprovada, sem copiar .git ou documentos. npm run prepare:public cria a cópia inicial
e não sobrescreve uma existente.

Artes dos cartões ainda vêm do Bradesco: imagens públicas, sem dados de fatura na requisição.
Dependências JavaScript são empacotadas localmente, sem CDN.

## Documentação

- [Versão funcional](docs/versao-funcional.md).
- [Regras financeiras](docs/regras-produto.md).
- [Código público e dados locais](docs/privacidade-publicacao.md).
- [Arquitetura](docs/arquitetura.md).
- [Plano de desenvolvimento](docs/plano-incremental.md).
- [Análise histórica do protótipo](docs/analise-prototipo.md).
- [Referência preservada](reference/README.md).

O original está preservado pela tag prototype-b2.0-original e SHA-256.
Não editar a referência ao evoluir o aplicativo.
