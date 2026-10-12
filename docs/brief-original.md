# PROJETO AUDITA

Você será o desenvolvedor principal e arquiteto de software
do Audita, um aplicativo premium de auditoria mensal
de faturas de cartões de crédito.

Este projeto foi idealizado e teve seu design aprovado
em uma longa conversa no ChatGPT.

O protótipo funcional está no arquivo index.html,
na pasta deste projeto.

IMPORTANTE:
NÃO reconstrua o aplicativo do zero.
NÃO altere a identidade visual aprovada.
NÃO remova funcionalidades existentes.
NÃO simplifique telas sem minha autorização.

Primeiro, analise integralmente o código existente.

==================================================
1. CONCEITO DO PRODUTO
==================================================

O Audita não é um gerenciador financeiro tradicional.

É um aplicativo de auditoria inteligente de faturas
de cartões de crédito.

O usuário não precisa registrar compras diariamente.

Uma vez por mês, após o fechamento da fatura, ele:

1. Seleciona o mês da auditoria.
2. Importa uma ou várias faturas em PDF.
3. Importa o histórico de SMS das compras.
4. O aplicativo interpreta os documentos.
5. Concilia SMS, compras e parcelas.
6. Identifica estabelecimentos e categorias.
7. Detecta possíveis cobranças duplicadas.
8. Identifica possíveis irregularidades.
9. Separa despesas por cartão e responsável.
10. Produz um relatório mensal consolidado.

O objetivo é automatizar ao máximo a conferência
e apresentar somente as ocorrências que realmente
precisam da atenção do usuário.

==================================================
2. IDENTIDADE VISUAL APROVADA
==================================================

Design B 2.0, estilo Claro Premium.

Características:

- Interface predominantemente branca.
- Azul-marinho como cor principal.
- Tipografia sofisticada.
- Cartões com cantos arredondados.
- Sombras discretas.
- Gráficos minimalistas.
- Excelente experiência mobile.
- Layout responsivo para iPhone e desktop.
- Navegação simples e intuitiva.

Na tela inicial, existe um cartão principal grande
e os demais cartões aparecem em miniaturas.

Utilizar imagens reais dos modelos de cartões,
mantendo a proporção de aproximadamente 1,586:1.

Modelos prioritários:

- Bradesco Aeternum titular.
- Bradesco Aeternum adicionais.
- Bradesco Visa Infinite titular.
- Bradesco Visa Infinite adicionais.

Existe um problema visual conhecido:
a imagem do Aeternum está deslocada.
Esse problema será corrigido posteriormente,
sem modificar o restante do layout.

==================================================
3. TELAS JÁ APROVADAS
==================================================

1. Tela inicial.
2. Nova auditoria.
3. Importação de faturas.
4. Importação de SMS.
5. Processamento da auditoria.
6. Revisão de ocorrências.
7. Detalhes da transação.
8. Carteira de cartões.
9. Gestão dos adicionais.
10. Relatório mensal.

Preservar a experiência e a navegação existentes.

==================================================
4. REGRAS DA AUDITORIA
==================================================

A auditoria será EQUILIBRADA.

O sistema deve automatizar conciliações confiáveis,
mas nunca confundir conciliação com autorização.

Cada transação possui dimensões independentes:

CONCILIAÇÃO:
Verifica correspondência entre documentos,
mensagens e compras anteriores.

RECONHECIMENTO:
Registra se o usuário reconhece ou não a compra.

CLASSIFICAÇÃO:
Identifica estabelecimento, categoria e responsável.

REGRAS IMPORTANTES:

- SMS e fatura coincidentes não comprovam autorização.
- Ausência de SMS não significa fraude.
- Compras parceladas precisam ser corretamente vinculadas.
- Detectar possíveis compras duplicadas.
- Identificar divergências de valor.
- Investigar compras inesperadas em cartões cancelados.
- Identificar estabelecimentos por nome comercial
  e razão social quando houver dados confiáveis.
- Categorizar automaticamente os gastos.
- Aprender com correções do usuário.
- Permitir revisão de ocorrências por prioridade.
- Evitar excesso de alertas.
- Preservar evidências e decisões anteriores.
- Conferir a integridade e os totais das faturas.

Os cálculos financeiros precisam ser determinísticos.
IA pode auxiliar na interpretação, mas nunca inventar
lançamentos, estabelecimentos ou valores.

==================================================
5. CARTÕES E FATURAS
==================================================

Uma auditoria mensal pode conter várias faturas.

Suportar:

- Cartões titulares.
- Cartões adicionais.
- Cartões ativos.
- Cartões cancelados.
- Cartões substituídos.
- Parcelamentos remanescentes.
- Múltiplos PDFs por auditoria.

O cartão antigo cancelado pode continuar apresentando
parcelas válidas durante vários meses.

Cartões adicionais terão responsáveis individuais.

Controlar:

- Compras de cada adicional.
- Parcelas futuras.
- Valores devidos.
- Repasses recebidos.
- Saldo pendente.
- Histórico de pagamentos.

Os gastos dos adicionais já fazem parte do total
das faturas e não devem ser somados novamente.

==================================================
6. IMPORTAÇÃO DE DOCUMENTOS
==================================================

Prioridade inicial: faturas do Bradesco.

Precisamos implementar:

- Leitura de PDFs.
- Extração confiável dos lançamentos.
- Identificação de cartões.
- Tratamento de compras parceladas.
- Identificação de estornos e ajustes.
- Conferência dos totais.
- Importação de histórico de SMS.
- Conciliação entre as fontes.

A importação de SMS pelo Atalhos do iPhone
será investigada posteriormente.

Inicialmente, suportar importação por arquivo.

==================================================
7. SEGURANÇA
==================================================

O projeto poderá ser disponibilizado comercialmente.

Considerar desde o início:

- Privacidade financeira.
- LGPD.
- Proteção dos documentos.
- Isolamento dos dados dos usuários.
- Armazenamento seguro.
- Histórico de alterações.
- Exclusão de dados.
- Não armazenar números completos dos cartões,
  CVV ou outras informações desnecessárias.

Não enviar documentos financeiros reais para serviços
externos sem minha autorização explícita.

==================================================
8. SUA PRIMEIRA MISSÃO
==================================================

1. Inspecione todo o index.html.
2. Entenda as telas e funcionalidades existentes.
3. Identifique o que é funcional e o que é simulado.
4. Preserve o protótipo original como referência.
5. Inicialize o versionamento Git local.
6. Documente as regras do produto.
7. Proponha uma arquitetura moderna e escalável.
8. Defina um plano incremental de desenvolvimento.
9. Prepare um ambiente local para visualização e testes.
10. Priorize uma primeira auditoria funcional com
    fatura PDF do Bradesco.

Não reescreva imediatamente todo o frontend.

Explique qual arquitetura você recomenda e por quê,
identifique riscos e dependências e proponha a ordem
de implementação.

Depois da análise, vamos desenvolver o aplicativo
em etapas, testando cada funcionalidade.

Quero um produto comercial de altíssima qualidade,
não apenas uma demonstração visual.