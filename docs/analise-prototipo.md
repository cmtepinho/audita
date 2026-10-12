# Análise do protótipo existente

Data: 12/10/2026. Escopo: leitura integral das 116 linhas / 63.036 bytes de
`index.html`, incluindo CSS, HTML, dados, handlers, funções e modais.
O arquivo foi mantido byte a byte. Não houve correção visual nesta etapa.

## Estrutura

HTML único sem dependências JavaScript importadas. CSS inline, JavaScript
clássico inline, handlers `onclick`, renderização por templates e `innerHTML`.
`state` é um objeto em memória; `cards`, `issues` e `categories` são dados fixos.
`render()` monta a tela, navegação lateral, rodapé e overlay. `go()` muda a tela
e zera o scroll. Não há roteador por URL, histórico de navegação do navegador,
API, banco, service worker, telemetria ou chamada a IA.

Tokens visuais: branco, azul-marinho, azul de ação, bordas claras, sombras
discretas, raio de 19 px. Desktop apresenta o aplicativo dentro de uma moldura
de telefone e navegação lateral; até 850 px a moldura desaparece e o conteúdo
ocupa a tela. Há tratamentos de `safe-area` para mobile.
`DM Sans` e `Manrope` aparecem no CSS, mas não são carregadas por `@font-face`
ou stylesheet externo; normalmente são usadas as fontes de sistema.

## Telas e funcionalidades

| Tela / função | O que funciona na demonstração | O que falta para o produto |
| --- | --- | --- |
| Inicial / `home` | Troca do cartão principal, miniaturas, atalhos, pendências atualizadas pelas decisões | Totais, parcelas, categorias e percentual reais |
| Nova auditoria / `start` | Seleção de mês e navegação pelos passos | Criar auditoria, validar competência, propagar mês e salvar rascunho |
| Faturas / `invoices` | Escolher vários PDFs, listar nomes/tamanhos, remover itens | Guardar bytes, validar documento, extrair páginas, identificar cartões e totais |
| SMS / `sms` | Alternar métodos, selecionar arquivo e manter texto colado em memória | Ler TXT/CSV, normalizar mensagens, preservar evidências; Atalhos não implementado |
| Processamento / `processing` | Lista de verificações previstas e passagem à revisão | Processamento, progresso, erros, cancelamento e resultados calculados |
| Revisão / `review` | Cinco ocorrências, filtros, contagens e acesso aos detalhes | Motor de regras, prioridade explicável e decisões persistidas |
| Transação / `transaction` | Evidências fictícias em modais, reconhecer/não reconhecer e conclusões | Evidências dos documentos reais; campos independentes e histórico de alterações |
| Carteira / `wallet` | Seleção, filtros, arte oficial e imagem personalizada via FileReader | Cadastro/edição reais, ciclo de vida, substituição, persistência e vínculo a pessoa |
| Adicionais / `additional` | Tabs, detalhes ilustrativos, validação de valor e atualização do saldo de repasse | Compras reais, registros individuais de repasse, histórico, competência e responsável |
| Relatório / `report` | Quatro tabs, contagens, navegação e exportação TXT local | Todos os lançamentos, métricas derivadas, totais conferidos e exportação profissional |

Modais examinados: evidências SMS/fatura, resolver ocorrência, repasse,
detalhes de adicional, exportação, configurações, integridade, estabelecimentos,
histórico de decisões, filtros e cadastro. Cadastro e configuração são mensagens
de demonstração; não alteram cartões nem responsáveis.

## Dados e fluxos reais dentro da demonstração

- Quatro cartões fictícios, cinco ocorrências e seis categorias.
- `addFiles()` retém nome, tamanho formatado e flag `demo`; não guarda o objeto
  `File` nem seus bytes. Verifica extensão, não assinatura PDF ou estrutura.
- SMS por arquivo retém somente um booleano. Texto colado fica em `state.smsText`.
- Imagem personalizada é lida como Data URL e mantida em `state.images` durante
  a sessão. É o único fluxo que lê o conteúdo de um arquivo.
- `markIssue()` substitui um valor de `statuses[id]`. Contagens passam a considerar
  a ocorrência resolvida quando há qualquer valor nesse campo.
- `saveRepay()` valida número positivo e limite de saldo, então incrementa um
  agregado em memória. Não cria registro individual.
- `downloadSummary()` cria Blob TXT com dados fictícios e decisões atuais.
- `resetDemo()` limpa decisões, arquivos selecionados e repasses, mas preserva
  imagens. Por usar spread de `state`, também mantém mês, transação e alguns
  campos não sobrescritos. Atualizar a página perde todo o estado.

## Riscos e inconsistências observadas

1. **Separação das decisões incompleta** — a explicação visual distingue
   conciliação de reconhecimento, mas o modelo reúne reconhecimento, resolução,
   estabelecimento e responsável em um só `statuses[id]`. Identificar uma loja
   pode apagar um reconhecimento anterior; reconhecer a compra também resolve
   a possível duplicidade sem verificar as duas cobranças; marcar “não reconheço” remove a
   ocorrência da fila pendente. No produto, compra não reconhecida exige um
   acompanhamento próprio, mesmo após revisão.
2. **Mês escolhido não chega ao resultado** — `state.month` é escrito no select,
   mas as demais telas e exportação continuam em outubro de 2026. Ao renderizar
   novamente, o select também não restaura explicitamente o mês escolhido.
3. **Resultados não correspondem aos arquivos** — mesmo sem faturas é possível
   prosseguir e ver as mesmas cinco ocorrências. Os avisos de simulação são
   claros; ainda assim, nunca usar esse fluxo como auditoria real.
4. **Gráfico fixo** — o donut usa cinco segmentos CSS com percentuais fixos,
   enquanto a legenda apresenta seis categorias. As categorias somam R$ 8.450,
   mas o desenho não representa seus valores.
5. **Contagens com bases distintas** — relatório/exportação informam 118
   lançamentos e 112 conciliados; revisão informa 113 sem pendência e 5
   ocorrências. Isso não prova erro (conciliação e pendência são dimensões
   diferentes), mas não existem 118 registros nem relações suficientes para
   demonstrar a coerência. Calcular cada métrica a partir dos registros reais.
6. **Histórico de repasses fixo** — totais mudam, mas a aba Histórico continua
   mostrando R$ 500 e R$ 300. Não há data, autoria, estorno ou lista de repasses.
7. **Precisão financeira** — montantes são `Number` em reais e há tolerância
   `0.001` em repasses. O produto usará centavos inteiros e fórmulas versionadas.
8. **Parcelas futuras sem fonte** — R$ 3.620 é compatível com os dois cartões
   titulares do exemplo, mas não há séries que comprovem inclusão dos adicionais
   nem as 24 parcelas anunciadas. Evitar somar visões agregadas e componentes.
9. **Aeternum deslocado** — há duas definições anteriores e uma correção posterior
   com rotação de 59°. Na regra final, `inset:auto` vem após `left:50%; top:50%`
   e redefine esses valores. É um ponto para investigar na correção posterior,
   junto às dimensões da imagem institucional, sem mexer no layout geral.
10. **Artes externas** — imagens vêm de `assets.bradesco`; erro apenas esconde a
    imagem e revela o desenho CSS. Revisar disponibilidade e direitos de uso
    antes do lançamento comercial. A cópia do HTML não preserva as imagens.
11. **Interações e acessibilidade** — ocorrências são `div` clicáveis; vários
    botões de ícone não têm nome acessível; modais não gerenciam foco, Escape
    ou semântica de diálogo. Falta validação em VoiceOver e teclado.
12. **Manutenção e segurança futuras** — `esc()` protege vários textos, mas
    templates/handlers inline e `innerHTML` demandam cuidado ao conectar dados
    reais. Migrar para renderização segura e política de conteúdo restrita.

## Conclusão técnica

A base é uma referência valiosa de navegação e identidade visual, com
interações locais demonstrativas. Não existe motor financeiro escondido que
possa ser ativado: ele precisa ser construído e ligado progressivamente às telas.
Preservar o frontend até validar importação e dados reduz o risco de implementar
novamente a aparência sem resolver a auditoria.

