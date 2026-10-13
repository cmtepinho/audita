// Documento inteiramente sintético. Nenhum valor ou descritor provém de fatura real.
export function syntheticPages() {
  const tokens=[];
  const token=(text,x,y)=>tokens.push({text,x,y,width:50,height:10});
  token('Fatura',271,40);token('Data de vencimento: 10/10/2026',200,90);
  token('Data Lançamentos Valor (R$)',36,120);
  token('Fatura do cartão de crédito: Final 1111 | Modelo',68,150);token('Valor da fatura: R$ 50,00',478,150);
  token('01',46,170);token('OUT',45,184);
  const entry=(description,amount,y)=>{token(description,111,y);token(amount,538,y);};
  entry('Saldo anterior','100,00',178);
  entry('PAGTO FATURA','-100,00',210);
  entry('LOJA EXEMPLO','10,00',250);
  entry('LOJA EXEMPLO','10,00',290);
  entry('LOJA INTERNACIONAL','30,00',330);
  token('Fatura do cartão de crédito: Final 2222 | Modelo',68,380);token('Valor da fatura: R$ 15,00',478,380);
  token('02',46,400);token('OUT',45,414);
  entry('SERVICO EXEMPLO ( 02/05 )','20,00',408);
  entry('ESTORNO EXEMPLO','-5,00',450);
  token('Total da fatura: R$ 65,00',300,490);
  token('Resumo das Despesas Real',36,520);
  token('Saldo anterior 100,00',36,540);
  token('(-)Pagamentos/Créditos: 105,00',36,560);
  token('(+)Despesas locais: 40,00',36,580);
  token('Despesas no exterior: 30,00',36,600);
  token('(=)Total da fatura: 65,00',36,620);
  return [{page:1,width:612,height:792,tokens}];
}
