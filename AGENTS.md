# Instruções do projeto Audita

- Antes de alterar comportamento, ler `docs/regras-produto.md`,
  `docs/arquitetura.md` e `docs/plano-incremental.md`.
- Requisito atualizado: dados financeiros exclusivamente locais, inclusive se o
  código/site estiver no GitHub/Pages. Ler `docs/privacidade-publicacao.md`.
  Backend financeiro e sincronização em nuvem não estão autorizados nesse modo.
- Não publicar o histórico local original com autoria pessoal. Usar a cópia
  pública preparada com identidade cmtepinho/noreply. Todo arquivo público
  deve estar em `public-files.json` e ter conteúdo revisado.
- Preservar Design B 2.0 Claro Premium, as dez telas e os fluxos aprovados.
  Não reconstruir o frontend inteiro, remover recursos ou simplificar telas
  sem autorização do usuário. Evoluir em etapas verificáveis.
- Não editar `reference/index.original.html`. A tag
  `prototype-b2.0-original` preserva a referência inicial.
- Conciliação, reconhecimento, classificação e resolução de ocorrências
  são dimensões independentes. SMS coincidente não prova autorização;
  ausência de SMS não prova fraude.
- Cálculos financeiros determinísticos e exatos em centavos. IA não inventa
  lançamentos, valores ou estabelecimentos. Preservar fonte e versão das regras.
- Adicionais já integram o total da fatura. Parcelas válidas podem continuar
  em cartões cancelados. Não duplicar despesas, PDFs reimportados ou séries.
- Não enviar documentos financeiros reais a serviços externos sem autorização
  explícita. Não colocar dados reais em Git, logs, screenshots de entrega,
  fixtures ou telemetria. Guardar arquivos reais em `private/`.
- Não armazenar números completos de cartão, CVV ou outros dados desnecessários.
- Não apresentar dados de demonstração como resultado de processamento real.
- Usar `npm test` e `npm run check:reference` nesta etapa. Ao iniciar evolução
  do frontend, adaptar o teste de igualdade com o original e preservar o teste
  de integridade da referência. Adicionar verificações relevantes ao comportamento
  financeiro introduzido, sem confundir testes de caracterização com auditoria real.

