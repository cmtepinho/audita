# Validação da primeira missão

Data: 12/10/2026. Apenas dados demonstrativos; nenhum documento financeiro
real foi processado ou enviado para serviços externos.

## Código e referência

- Leitura integral de `index.html`: 116 linhas, 63.036 bytes.
- Original copiado para `reference/index.original.html` sem transformação.
- SHA-256 dos dois arquivos confirmado:
  `0f904d68bdfebcfdf474c74e0e794ca38932a8a243a48079008ddbfd44714328`.
- Git local inicializado em `main`; commit da referência `4786be0` e tag
  `prototype-b2.0-original`. Nenhum remoto, push ou publicação criado.

## Verificações automatizadas

`npm test`: **6 testes aprovados, 0 falhas**.

1. Servidor entrega HTML original sem alterações; bloqueia acesso a documentos,
   arquivos de configuração, Git, caminhos fora da lista e métodos de escrita.
2. Referência confere com SHA-256 recebido; frontend está idêntico nesta etapa.
3. As dez funções de tela e variantes de relatório, carteira, SMS e adicionais
   renderizam com um DOM mínimo em memória.
4. Decisão atualiza contagem; reconhecimento e evidência de não autorização
   aparecem; reinício remove decisões.
5. Repasse positivo permitido atualiza saldo; excesso, negativo, zero e valor
   inválido são recusados.
6. Seleção de PDF guarda apenas metadados; remoção funciona.

`npm run check:reference`: referência íntegra.

Os testes do protótipo executam JavaScript real com elementos DOM simulados;
não verificam layout, eventos completos do navegador nem precisão de extração.
O servidor é testado por requisições HTTP reais em porta temporária local.

## Navegador

Preview aberto no navegador integrado em `http://127.0.0.1:5173/`.
Verificado o caminho inicial → nova auditoria → faturas → SMS → processamento
→ revisão → detalhe → reconhecer → revisão → relatório. A contagem passou de
5 pendentes / 0 resolvidas para 4 pendentes / 1 resolvida.

Isso também reproduziu a limitação do modelo: reconhecer a compra Spotify
resolve a ocorrência de possível duplicidade, sem decisão específica sobre as
duas cobranças. O problema foi documentado, não corrigido no original.

Depois, o preview foi recarregado para restaurar a demonstração original e
deixado na tela inicial. Conferidas visualmente a apresentação com navegação
lateral em largura desktop e a apresentação compacta sem moldura.
O Aeternum deslocado permanece visível, como solicitado para correção futura.

Capturas locais (ignoradas no Git):

- `test-results/preview-desktop.jpg`
- `test-results/preview-mobile.jpg`

O override compacto solicitado ao navegador foi 390 × 844; a superfície
integrada reportou 433 × 937 CSS px. Nessa superfície, `scrollWidth` do documento
foi igual à largura reportada (433), sem overflow horizontal de página.
O override foi removido ao terminar. Isso é uma conferência responsiva básica,
não um teste de Safari, dispositivo iPhone, teclado ou VoiceOver.

## Limites e próxima validação

Sem fatura Bradesco fornecida, não foi possível avaliar layout de PDF, completude
de extração, precisão monetária, OCR ou conciliação real. Nenhum desses componentes
foi implementado nesta missão. O próximo incremento está definido em
`plano-incremental.md`, com gabarito por lançamento e conferência de totais.

Node 20.20.2 foi o runtime local já disponível. A proposta comercial usa
Node 24 LTS; esta etapa não alterou instalações globais nem adicionou dependências.

