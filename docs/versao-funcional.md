# Escopo vigente — 12/10/2026

Por decisão do usuário, a aplicação tem interface web ampla e mobile responsiva,
sem simulação de hardware de iPhone. A identidade Claro Premium é preservada.
SMS foi adiado para a segunda etapa: importação e conciliação SMS desativadas;
mensagens antigas permanecem cifradas no cofre e não participam dos resultados.
Fluxo atual: competência → PDFs → processamento → revisão e relatório.
As referências a SMS abaixo documentam a evolução futura, não o escopo ativo.

# Audita 0.2.0 · versão funcional local

O protótipo passou a usar dados importados pelo usuário. A referência B 2.0
permanece íntegra em `reference/`; identidade visual, navegação e as dez telas
foram mantidas. O motor foi separado em módulos, com domínio financeiro em
TypeScript. Não há backend financeiro, conta em nuvem ou envio de documentos.

## O que funciona

- Cofre local: senha definida pelo usuário, criptografia AES-GCM de 256 bits,
  chave derivada com PBKDF2/SHA-256 e salt aleatório. Senha/chave não são persistidas.
- Auditorias por competência, recuperação após recarga e bloqueio manual ou por
  inatividade. Dados cifrados em IndexedDB, separados do cache de código.
- PDFs Bradesco no layout exportado com tabela de lançamentos e Resumo das Despesas.
  Processamento no navegador com PDF.js e worker empacotado, sem CDN de JavaScript.
- Linhas, cartões, parcelas, créditos, pagamentos, saldo anterior e encargos
  identificados por descritores explícitos. Somente valores faturados em BRL.
- Conferência de subtotais, total, despesas e equação do resumo em centavos inteiros.
  Valores calculados e declarados são mantidos separados. Divergências ficam visíveis.
- Mesmo PDF não é duplicado, inclusive quando selecionado em outra competência.
  Sobreposição entre arquivos diferentes bloqueia o total consolidado até revisão.
- SMS desativado. O módulo de interpretação fica reservado para a segunda etapa.
  Mensagens já cifradas no cofre são preservadas, sem participar dos resultados.
- Possível duplicidade, compra posterior ao
  cancelamento informado e lançamento não reconhecido. Ausência de SMS não gera fraude.
- Reconhecimento, resolução de ocorrências, categoria e data original separados.
  Histórico registra as decisões; reimportação preserva reconhecimento pelo ID do documento.
- Sugestões locais de categoria e aprendizado de correções no mesmo cofre.
  Nome comercial é informado pelo usuário; razão social não é inventada.
- Carteira: modelo, titular/adicional, status, cancelamento, responsável e vínculo
  manual a cadastro de competência anterior. Imagens oficiais e personalização em sessão.
- Parcelas: índice/quantidade, projeção explicitamente estimada e vínculo manual
  a parcela anterior, com evidência e sem alterar reconhecimento.
- Adicionais: valor devido líquido de créditos, repasses positivos até o saldo,
  saldo pendente e histórico por competência. Repasses não alteram a despesa da fatura.
- Relatório completo, categorias calculadas, TXT local e impressão/salvamento em PDF
  pelo navegador, com fontes e decisões. Exportação não envia dados.
- Backup criptografado, restauração com senha e validação de formato, exclusão do
  cofre local e instalação como aplicativo onde o navegador permitir.
- Cache offline contém apenas código, worker e ícone; nunca documentos ou backups.

## Primeira utilização

1. Abrir o aplicativo e criar uma senha local com pelo menos 12 caracteres.
2. Criar auditoria e escolher o mês.
3. Selecionar a fatura em PDF e seguir diretamente para o processamento.
4. Processar, conferir documentos e revisar ocorrências.
5. Confirmar modelo/responsável dos cartões e datas de compras antigas quando necessário.
6. Exportar um backup criptografado. O mesmo backup pode ser transferido e
   restaurado manualmente em outro dispositivo, com a mesma senha.

Não há recuperação de senha por servidor. Limpar os dados do navegador sem
backup pode perder auditorias. A exclusão remove o cofre deste navegador, não
PDFs originais nem backups que o usuário salvou em suas pastas.

## Limites explícitos

- O layout Bradesco foi validado contra uma amostra local; isso não prova cobertura
  de todos os layouts/modelos/períodos. Layout desconhecido não recebe sucesso genérico.
- PDF digitalizado sem texto e PDF protegido por senha exigem outra cópia local;
  OCR e desbloqueio dentro do app ainda não estão disponíveis.
- Limites: 25 MB/100 páginas por PDF, 100 mil elementos de texto por documento,
  SMS indisponível nesta etapa.
- A tabela exportada omite ano nas compras. O ano é inferido pelo vencimento e
  indicado nos detalhes/relatório; parcelas antigas exigem confirmação para conciliação.
- Finais iguais em seções distintas geram pendência de identidade; não declarar
  essas seções automaticamente conferidas. Vínculos entre cartões são manuais.
- Estimativas futuras não confirmam valor definitivo de juros, câmbio ou parcelas.
- Atalhos do iPhone permanece em investigação. Não há importação direta do app Mensagens.
- Não há contestação junto ao banco, sincronização automática ou verificação externa de empresas.
- As artes oficiais ainda dependem de rede e das condições de uso do Bradesco.
- A interface foi conferida em larguras desktop/compacta; testes em iPhone físico,
  VoiceOver e revisão comercial de privacidade ainda não foram concluídos.

## Validação

- Domínio, tipos, servidor restrito, cofre, adulteração de backup, SMS, parcelas,
  classificação e escape de conteúdo no relatório têm testes automatizados.
- Testes antigos de navegação são caracterização da referência, não provas do motor.
- Fluxo de navegador com documento e mensagens inteiramente sintéticos:
  criação do cofre, importação, totais, revisão independente, repasses, recarga,
  exportação, exclusão e restauração do backup.
- Extração do layout e equações foram conferidas localmente contra a fatura fornecida.
  Arquivo, nomes, valores, datas, texto extraído e gabarito real não entram no Git.

Esta é uma versão funcional para o layout validado, não uma certificação de
precisão para qualquer PDF nem de conformidade jurídica/comercial.
