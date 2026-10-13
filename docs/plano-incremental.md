# Escopo vigente — 12/10/2026

Por decisão do usuário, a aplicação tem interface web ampla e mobile responsiva,
sem simulação de hardware de iPhone. A identidade Claro Premium é preservada.
SMS foi adiado para a segunda etapa: importação e conciliação SMS desativadas;
mensagens antigas permanecem cifradas no cofre e não participam dos resultados.
Fluxo atual: competência → PDFs → processamento → revisão e relatório.
As referências a SMS abaixo documentam a evolução futura, não o escopo ativo.

# Plano incremental

Requisito atualizado: dados financeiros exclusivamente locais. A primeira
importação e o motor rodam no dispositivo. A etapa 6 com backend/multiusuário
abaixo é alternativa condicionada a autorização futura; para o modo atual,
substituí-la por persistência local, exclusão e backup sob controle do usuário.
Ver `privacidade-publicacao.md`. Isso não reduz os critérios financeiros.

Construir e validar uma capacidade por etapa. Estimativas de calendário só
devem ser feitas após inspecionar exemplos de documentos e o primeiro parser.
O frontend aprovado continua sendo referência em todas as etapas.

| Etapa | Entrega | Critério de conclusão | Dependências |
| --- | --- | --- | --- |
| 0 · Análise e preparação | Git local, referência original, documentos e preview | HTML íntegro; telas inventariadas; checks locais executáveis | Concluída nesta missão |
| 1 · Primeira fatura Bradesco | Adaptador de um layout nativo + domínio de valores + visão de conferência na tela existente | Linhas identificadas, fonte por página, centavos corretos, total/subtotais conferidos e falhas visíveis | Exemplo local ou sanitizado representativo e total esperado |
| 2 · Várias faturas e cartões | Consolidação, idempotência, seções de adicionais, cancelamento e substituição | PDFs sobrepostos não dobram despesa; adicional não é somado novamente; erros de um PDF não ficam ocultos | Etapa 1 validada e fixtures de variações |
| 3 · SMS por arquivo | TXT/CSV, normalização, evidências e conciliação inicial | Correspondências e ambiguidades explicadas; ausência de SMS não vira fraude | Amostras do formato de exportação |
| 4 · Histórico e parcelas | Compra original, séries, parcelas atuais e projeções | Vincular 02/05 e 03/05 entre meses; parcelas legítimas após cancelamento; não reutilizar SMS para compras independentes | Histórico de pelo menos dois meses, sintético ou sanitizado |
| 5 · Motor de ocorrências e revisão | Duplicidade, divergência, cartões cancelados, classificação, decisões independentes | Cada alerta tem evidência/motivo; alterar categoria não apaga reconhecimento; reprocessar preserva decisões | Etapas 2–4 e casos esperados |
| 6 · Persistência e multiusuário | API, banco, autenticação, storage privado e jobs duráveis | Recuperar sessão; impedir acessos cruzados; excluir dados; retomar jobs; testar restauração | Identidade/hospedagem e política de retenção definidas |
| 7 · Adicionais e relatório | Repasses individuais, saldos, histórico e relatório completo/PDF | Soma por responsável fecha com fatura; repasse não altera despesa; histórico e exportação reproduzem dados | Modelo financeiro validado e persistência |
| 8 · Qualidade comercial | Performance, acessibilidade, Safari/iPhone, observabilidade e operação | Fluxos ponta a ponta, regressão visual, limites, recuperação e revisão de privacidade | Todas as capacidades anteriores |

Revisar segurança em cada etapa; etapa 6 não é o início dessa preocupação.
A etapa 1 é local e de uso individual controlado. Antes de disponibilizar
importação para outras pessoas ou persistir documentos reais, antecipar os
controles da etapa 6. Extração e domínio podem ganhar TypeScript já na etapa 1;
React entra quando extrair componentes ajudar a entrega, sem migração geral
como pré-requisito. Correção visual do Aeternum cabe em uma mudança pontual,
separada do motor, na etapa posterior combinada com o usuário.

## Primeira entrega funcional: escopo exato

Começar com PDF nativo de um layout Bradesco conhecido, em BRL. Extração local,
sem IA e sem OCR no primeiro corte. Permitir uma auditoria sem SMS e indicar
“conciliação sem fonte SMS”, mantendo reconhecimento não informado.

Na tela de faturas: distinguir exemplo de arquivo real, guardar bytes apenas
durante o processamento local e apresentar status. Na tela de processamento:
progresso real e falhas. No resultado: lançamentos efetivamente extraídos,
evidências e integridade. Ocorrências que dependem de SMS/histórico ficam
explicitamente não avaliadas. Nunca preencher lacunas com os cinco exemplos.
Dados demonstrativos devem existir em modo separado, identificado.

Critérios obrigatórios:

- Extrair cada linha esperada do exemplo, incluindo descrições quebradas,
  parcela e crédito presentes; comparar com gabarito revisado.
- Exibir o final de cartão e seção de origem, sem armazenar número completo.
- Não capturar limite de crédito, ofertas ou totais como compras.
- Conferir equação da fatura em centavos e subtotais das seções presentes.
- Gerar pendência para página/seção não interpretada, mesmo quando o total fecha.
- Mostrar falha explícita para layout desconhecido, PDF corrompido ou sem texto.
- Reimportar o mesmo documento sem duplicar despesas.
- Não emitir “auditoria completa” quando apenas a importação foi verificada.
- Executar sem envio externo de documentos, com requisições da aplicação
  verificadas. As artes externas do protótipo são uma dependência separada.

## Estratégia de testes

Testar invariantes e cenários que podem causar dinheiro ou evidências incorretos:

1. **Valores:** vírgula decimal, negativos, zero, limites, sinal e soma exata.
2. **PDF:** gabarito de entradas/páginas/totais; duplicação de página; descrição
   multilinha; layout desconhecido; documento protegido, corrompido e sem texto.
3. **Integridade:** saldo anterior, pagamento, crédito e encargo; discrepância
   de um centavo; omissões de mesmo valor que se compensam.
4. **Conciliação:** dois candidatos parecidos; SMS único e duas compras;
   divergência; ano/virada de mês; parcela posterior sem novo SMS.
5. **Cartões:** final igual em cartões distintos; adicional; substituição;
   compra anterior ao cancelamento versus compra posterior; data ausente.
6. **Decisões:** reconhecer, classificar e resolver sem sobrescrever dimensões;
   reprocessar mantendo autoria e evidências.
7. **Adicionais:** repartição do total; repasse parcial; estorno; histórico por
   competência; nenhum acréscimo duplicado à despesa consolidada.
8. **Segurança:** acesso cruzado em API/banco/storage/worker; logs minimizados;
   limite de arquivo; exclusão de derivados e restauração controlada.
9. **Interface:** fluxo completo, retorno às telas, arquivos removidos, falhas
   recuperáveis, foco/teclado, VoiceOver e comparação visual iPhone/desktop.

Fixtures precisam ser sintéticas ou sanitizadas e revisadas. Exemplos reais
ficam em `private/` e não são enviados a ferramentas externas. Testes existentes
nesta missão são de caracterização do protótipo e preview; não são os testes
do motor descritos acima.

## Riscos prioritários

| Risco | Consequência | Resposta |
| --- | --- | --- |
| Layout Bradesco varia | Extração parcial parecendo correta | Adaptadores versionados, cobertura explícita e bloqueio de integridade |
| Dados financeiros interpretados com heurística excessiva | Valor ou compra inventados | Evidência por linha, domínio determinístico e revisão de incertezas |
| Compra parcelada confundida com cobrança duplicada | Alertas indevidos ou omissão | Série histórica separada dos lançamentos e regra explicável |
| Cancelamento sem data original | Acusação indevida de irregularidade | Guardar vigência e incerteza; considerar atraso/ajuste |
| Reimportação/reamissão | Despesa contabilizada duas vezes | Hash + identidade/versionamento da fatura + revisão de sobreposição |
| Reconhecimento confundido com conciliação | Compra não autorizada marcada como segura | Campos e ações independentes, testes de transição |
| Dados expostos na operação | Violação de privacidade | Isolamento, minimização, acesso restrito, retenção/exclusão e testes |
| Migração visual ampla antes de validar domínio | Perda de design e esforço sem auditoria | Preservar referência e evoluir pequenas partes com critérios objetivos |

