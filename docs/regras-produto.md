# Regras do produto

Fonte: brief recebido, preservado em `brief-original.md`. Regras abaixo orientam
a implementação; detalhes adicionais são propostas técnicas quando indicados.

## Finalidade e experiência

Audita é auditoria mensal de faturas. Não exige registro diário de compras.
Fluxo: escolher competência → importar um ou mais PDFs → importar SMS por
arquivo → interpretar → conferir integridade → conciliar → revisar ocorrências
priorizadas → emitir relatório consolidado.

Manter Design B 2.0 Claro Premium, as dez telas aprovadas, cartão principal e
miniaturas, imagens reais com proporção aproximada de 1,586:1 e experiência
iPhone/desktop. Não reconstruir, remover recursos ou simplificar telas sem
autorização. Corrigir o Aeternum em uma etapa visual pontual posterior.

## Dimensões independentes

| Dimensão | Pergunta | Estado proposto |
| --- | --- | --- |
| Conciliação | Os registros correspondem? | não avaliada, conciliada, parcial, divergente, sem correspondência, ambígua |
| Reconhecimento | O usuário reconhece a compra? | não informado, reconhecida, não reconhecida |
| Classificação | Qual estabelecimento, categoria e responsável? | campos próprios com origem, confiança e correção manual |
| Ocorrência | Qual problema exige atenção? | aberta, em revisão, explicada, confirmada, encerrada com decisão explícita |

Uma transação pode ter várias ocorrências. Alterar categoria ou responsável
não altera reconhecimento. Resolver duplicidade não confirma autorização.
Revisar uma compra não reconhecida não equivale a eliminar seu acompanhamento.
Nenhuma ação contesta, bloqueia ou cancela compras junto ao banco nesta fase.

## Auditoria equilibrada

- Coincidência entre SMS e fatura confirma correspondência, nunca autorização.
- Ausência de SMS é falta de evidência; isoladamente, não indica fraude.
- Correspondências inequívocas podem ser automáticas. Ambiguidades exigem revisão.
- Possível duplicidade é hipótese apoiada por evidências, nunca exclusão automática.
- Divergência deve preservar os dois valores e considerar estornos, ajustes,
  gorjetas, câmbio e parcelamento antes de concluir.
- Nome comercial e razão social só podem ser afirmados com fonte confiável.
  Descritor original permanece registrado. Não inventar identificações.
- Sugestões de categoria e responsável guardam origem e confiança. Correções
  aprendidas são limitadas ao usuário/conta e não contaminam outros usuários.
- Cada alerta informa regra, versão, documentos e motivo. Agrupar alertas
  redundantes; elevar prioridade pelo risco e evidência, não só por falta de SMS.
- Reprocessamento preserva decisões anteriores; invalidar ou reaplicar uma
  decisão exige correspondência confiável e histórico da mudança.

## Cartões, adicionais e parcelas

Suportar titular/adicional, ativo/cancelado/substituído e relação entre cartão
anterior e novo. Guardar final de quatro dígitos, modelo e identificador interno;
o final não é uma chave única. Responsáveis têm identidade própria e vínculos
com vigência temporal.

Cartão cancelado pode conter parcelas válidas de compras anteriores. Para alerta
de compra inesperada, comparar data original da compra com data de cancelamento;
data de lançamento sozinha não basta. Se datas estiverem ausentes, registrar
incerteza. Cartão substituído não perde histórico ou séries de parcelamento.

Separar compra original, série de parcelas e lançamentos mensais. Não contar o
valor integral da compra e suas parcelas como despesas simultâneas da mesma fatura.
SMS da compra original pode apoiar a série, sem exigir outro SMS a cada mês.
Parcelas futuras são projeções identificadas e não entram no total atual.

Adicionais: compras, parcelas futuras, valor devido, repasses recebidos,
saldo pendente e histórico por pessoa/competência. Seus gastos já integram a
fatura titular: divisão por responsável é uma partição, não acréscimo ao total.
Repasses são liquidação de uma obrigação entre pessoas, não redução de despesa
da fatura nem nova despesa. Definir política de créditos, excedentes e estornos
na etapa de repasses; não assumir que todo crédito é receita.

## Valores e integridade

- Representar BRL em centavos inteiros; validar intervalo seguro. Usar decimal
  exato quando taxas/câmbio exigirem mais casas, com arredondamento explícito.
- Cálculos determinísticos: mesma entrada + mesma versão de regra = mesmo resultado.
- IA pode sugerir interpretação; não gera lançamentos, valores ou estabelecimentos
  sem evidência verificável. Totais são calculados por código.
- Preservar sinal, moeda, valor original, valor faturado e tipo: compra, parcela,
  estorno, pagamento, juros, tarifa, imposto ou ajuste.
- Conferir total por fatura e subtotais por cartão. O total impresso pode incluir
  saldo anterior, pagamentos, créditos e encargos: a equação deve respeitar o
  layout da fatura. Nunca tratar todo número monetário do PDF como lançamento.
- Separar totais declarados, calculados, diferença em centavos e itens não
  interpretados. Para BRL já arredondado no documento, exigir igualdade em
  centavos; exceções justificadas devem ficar visíveis, sem “ajuste” inventado.
- Documento incompleto ou divergente permanece “integridade pendente”; bloquear
  a conclusão como conferida até revisão. Não usar total coincidente como única
  prova: omissões compensadas podem esconder erro de extração.
- Detectar arquivo repetido por hash e considerar reemissões/versionamento;
  arquivos diferentes podem conter os mesmos lançamentos. Não duplicar despesas
  nem confundir páginas repetidas com cobranças duplicadas reais.

## Privacidade e evidências

Não enviar documentos financeiros reais a serviços externos sem autorização
explícita. Priorizar processamento local na validação inicial. Não armazenar PAN
completo, CVV ou dados desnecessários; mascarar identificadores na extração.
PDF bruto pode conter dados excessivos: mantê-lo restrito e apenas pelo tempo
definido, com minimização e política de retenção antes da operação comercial.

Isolar usuários, criptografar documentos persistidos e limitar acesso. Não
colocar PDF, SMS, nomes de arquivos financeiros ou texto extraído em logs,
telemetria, commits ou ferramentas externas. Rastrear correções e decisões
sem transformar histórico em retenção ilimitada: exclusão deve abranger originais,
derivados, filas, índices e backups conforme política definida.

A preparação técnica não comprova conformidade com LGPD. Bases legais, retenção,
termos e obrigações precisam ser definidas para o serviço comercial com revisão
apropriada antes do lançamento.

