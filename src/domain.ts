export type Token = { text: string; x: number; y: number; width: number; height: number };
export type Page = { page: number; width: number; height: number; tokens: Token[] };
export type Entry = {
  id: string; cardLast4: string; date: string | null; description: string;
  amountMinor: number; kind: 'purchase' | 'installment' | 'credit' | 'payment' | 'balance' | 'fee' | 'tax' | 'interest';
  installment: { index: number; count: number } | null;
  source: { page: number; region: number[]; text: string };
  recognition: 'unset' | 'recognized' | 'unknown'; category: string;
  dateInferred?: boolean; dateConfirmed?: boolean;
};
export type Statement = {
  id: string; parserVersion: string; entries: Entry[];
  cards: { last4: string; declaredMinor: number; calculatedMinor: number; differenceMinor: number }[];
  declaredMinor: number | null; calculatedMinor: number;
  summary: Record<string, number>; warnings: string[];
  integrity: 'verified' | 'pending'; pages: number;
};

export function money(value: string): number {
  const clean = value.replace(/R\$|\s/g, '');
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/.test(clean)) throw new Error('Valor monetário inválido.');
  const negative = clean.startsWith('-');
  const digits = clean.replace(/[-.,]/g, '');
  const minor = Number(digits) * (negative ? -1 : 1);
  if (!Number.isSafeInteger(minor)) throw new Error('Valor fora do intervalo seguro.');
  return minor;
}
export function sum(values: number[]): number {
  let result = 0;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(result + value)) throw new Error('Soma fora do intervalo seguro.');
    result += value;
  }
  return result;
}
export function formatMoney(minor:number):string {
  if(!Number.isSafeInteger(minor))throw new Error('Valor monetário fora do intervalo seguro.');
  const value=BigInt(minor),absolute=value<0n?-value:value;
  return `${value<0n?'-':''}R$ ${(absolute/100n).toLocaleString('pt-BR')},${String(absolute%100n).padStart(2,'0')}`;
}
export function redact(text: string): string {
  return text.replace(/(?:\d[ -]?){13,19}/g, '[número removido]').replace(/\b(CVV|CVC)\s*[:=-]?\s*\d{3,4}\b/gi,'$1 [removido]');
}
export function lines(page: Page): Token[][] {
  const result: Token[][] = [];
  for (const token of [...page.tokens].filter(t => t.text.trim()).sort((a,b) => a.y-b.y || a.x-b.x)) {
    const last=result[result.length-1];
    const row=last&&Math.abs(last[0].y-token.y)<4?last:undefined;
    if (row) row.push(token); else result.push([token]);
  }
  return result.map(row => row.sort((a,b) => a.x-b.x));
}
const amountPattern = /^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/;
const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

export function parseBradesco(pages: Page[], id: string): Statement {
  const rows = pages.flatMap(page => lines(page).map(tokens => ({ page, tokens, text: tokens.map(t=>t.text).join(' ') })));
  const joined = rows.map(r=>r.text).join('\n');
  if (!/Data\s+Lan[cç]amentos/i.test(joined) || !/Resumo das Despesas\s+Real/i.test(joined) || !/Final\s+\d{4}/i.test(joined)) {
    throw new Error('Layout não suportado. Use a fatura Bradesco exportada com tabela de lançamentos e resumo das despesas.');
  }
  const warnings: string[] = [];
  const warn = (s:string) => { if (!warnings.includes(s)) warnings.push(s); };
  const result: Statement = { id, parserVersion:'bradesco-export@1', entries:[], cards:[], declaredMinor:null,
    calculatedMinor:0, summary:{}, warnings, integrity:'pending', pages:pages.length };
  const dueRow=rows.find(r=>/Data\s+(?:de\s+)?vencimento/i.test(r.text));
  const reference=dueRow?.text.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
  const referenceYear = reference ? Number(reference.slice(-4)) : null;
  const referenceMonth = reference ? Number(reference.slice(3,5)) : null;
  if (!referenceYear) warn('Ano da fatura não identificado.');
  let activeCard = '';
  let date: string | null = null;
  let summaryMode = false;
  const declared = new Map<string, number>();
  let tableSeen = false;
  const dateEvents = new Map<number, { y:number; day:number; month:number }[]>();
  for (const page of pages) {
    const left = page.tokens.filter(t=>t.x<page.width*.14);
    const events = left.filter(t=>/^\d{1,2}$/.test(t.text)).flatMap(day => {
      const month = left.find(t=>months.includes(normalized(t.text)) && Math.abs(t.y-day.y)<18);
      return month ? [{y:(day.y+month.y)/2,day:Number(day.text),month:months.indexOf(normalized(month.text))+1}] : [];
    });
    dateEvents.set(page.page,events.sort((a,b)=>a.y-b.y));
    if (page.tokens.length<5) warn(`Página ${page.page} sem texto suficiente; leitura incompleta.`);
  }
  for (const {page,tokens,text} of rows) {
    const y=tokens[0].y;
    const vals=text.match(/(?:R\$\s*)?-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}/g)||[];
    const value=vals.length ? money(vals[vals.length-1]) : null;
    if (/Resumo das Despesas/i.test(text)) { summaryMode=true; continue; }
    if (summaryMode) {
      if (value!==null) {
        if (/^Saldo anterior/i.test(text)) result.summary.previous=value;
        else if (/Pagamentos\/Cr[eé]ditos/i.test(text)) result.summary.payments=value;
        else if (/Despesas locais/i.test(text)) result.summary.domestic=value;
        else if (/Despesas no exterior/i.test(text)) result.summary.foreign=value;
        else if (/Total da fatura/i.test(text)) result.summary.total=value;
      }
      continue;
    }
    if (/Data\s+Lan[cç]amentos/i.test(text)) {tableSeen=true;continue;}
    const card=text.match(/Final\s+(\d{4})/i);
    if (card && /Valor da fatura/i.test(text) && value!==null) {
      activeCard=card[1];
      date=null;
      if (declared.has(activeCard)) warn('Final de cartão repetido em seções distintas; confirme a identidade antes de consolidar.');
      declared.set(activeCard,value);
      continue;
    }
    if (/Total da fatura/i.test(text) && value!==null) {
      result.declaredMinor=value; continue;
    }
    if (!tableSeen || !activeCard) continue;
    const desc=tokens.filter(t=>t.x>=page.width*.16 && t.x<page.width*.50).map(t=>t.text).join(' ').trim();
    const amount=tokens.find(t=>t.x>page.width*.82 && amountPattern.test(t.text));
    if (!amount) {
      if(desc)warn(`Linha de descrição sem valor reconhecido na página ${page.page}.`);
      continue;
    }
    if (!desc) {warn(`Linha monetária não interpretada na página ${page.page}.`);continue;}
    const event=[...(dateEvents.get(page.page)||[])].reverse().find(e=>e.y<=y+5);
    if (event && referenceYear && referenceMonth) {
      const year=event.month>referenceMonth ? referenceYear-1 : referenceYear;
      const iso=`${year}-${String(event.month).padStart(2,'0')}-${String(event.day).padStart(2,'0')}`;
      const check=new Date(iso+'T12:00:00Z');
      date=Number.isFinite(check.getTime()) && check.toISOString().slice(0,10)===iso ? iso : null;
    }
    if (!date) warn(`Data não identificada em lançamento na página ${page.page}.`);
    const installment=desc.match(/\(\s*(\d{1,2})\/(\d{1,2})\s*\)/);
    let part=installment ? {index:Number(installment[1]),count:Number(installment[2])} : null;
    if (part && (part.index<1 || part.index>part.count)) {warn('Índice de parcela inválido.');part=null;}
    const minor=money(amount.text);
    const kind=/^(PAGTO|PGTO|PAGAMENTO)\b/i.test(desc) && minor<0 ? 'payment' : minor<0 ? 'credit' : /^SALDO\s+ANTERIOR$/i.test(desc) ? 'balance' : part ? 'installment' : /^IOF\b/i.test(desc)?'tax':/^(JUROS|ENCARGOS)\b/i.test(desc)?'interest':/^(ANUIDADE|TARIFA)\b/i.test(desc)?'fee':'purchase';
    const description=redact(desc);
    result.entries.push({id:`${id}:${page.page}:${Math.round(y*10)}`,cardLast4:activeCard,date,description,
      amountMinor:minor,kind,installment:part,
      source:{page:page.page,region:[tokens[0].x,y,amount.x+amount.width,y+Math.max(...tokens.map(t=>t.height))],
        text:`${date?date.slice(8,10)+'/'+date.slice(5,7):'Data não identificada'} · ${description} · R$ ${amount.text}`},
      dateInferred:true,dateConfirmed:false,
      recognition:'unset',category:kind==='payment'?'Pagamento':kind==='credit'?'Crédito':kind==='balance'?'Saldo anterior':kind==='tax'?'Impostos e taxas':kind==='interest'?'Encargos financeiros':kind==='fee'?'Tarifas':'Não classificado'});
  }
  if (!result.entries.length) warn('Nenhum lançamento interpretado.');
  const required=['previous','payments','domestic','foreign','total'];
  if (required.some(k=>result.summary[k]===undefined)) warn('Resumo financeiro incompleto.');
  else {
    const s=result.summary;
    if (sum([s.previous,-s.payments,s.domestic,s.foreign])!==s.total) warn('Equação do resumo financeiro divergente.');
    if (result.declaredMinor!==null && result.declaredMinor!==s.total) warn('Totais declarados divergentes entre páginas.');
    result.declaredMinor=s.total;
  }
  result.calculatedMinor=sum(result.entries.map(e=>e.amountMinor));
  // Neste layout exportado, saldo anterior e pagamentos já são linhas da tabela.
  const adjusted=result.calculatedMinor;
  for (const [last4,total] of declared) {
    const entries=result.entries.filter(e=>e.cardLast4===last4);
    const calculated=sum(entries.map(e=>e.amountMinor));
    result.cards.push({last4,declaredMinor:total,calculatedMinor:calculated,differenceMinor:calculated-total});
    if(calculated!==total) warn('Subtotal de cartão divergente; confira as linhas extraídas.');
  }
  result.calculatedMinor=adjusted;
  if(result.declaredMinor===null || adjusted!==result.declaredMinor) warn('Total calculado diverge do total da fatura.');
  if(sum(result.cards.map(c=>c.declaredMinor))!==result.declaredMinor) warn('Soma das seções não corresponde à fatura.');
  const positive=sum(result.entries.filter(e=>e.amountMinor>0&&e.kind!=='balance').map(e=>e.amountMinor));
  if(result.summary.domestic!==undefined && result.summary.foreign!==undefined && positive!==sum([result.summary.domestic,result.summary.foreign])) {
    warn('Despesas exigem conferência do resumo.');
  }
  if(sum(result.entries.filter(e=>e.kind==='balance').map(e=>e.amountMinor))!==result.summary.previous) warn('Saldo anterior não corresponde às linhas da fatura.');
  if(-sum(result.entries.filter(e=>e.amountMinor<0).map(e=>e.amountMinor))!==result.summary.payments) warn('Pagamentos e créditos não correspondem ao resumo.');
  result.integrity=warnings.length===0?'verified':'pending';
  return result;
}

export function duplicateGroups(entries: Entry[]): string[][] {
  const groups=new Map<string,string[]>();
  for(const e of entries.filter(e=>(e.kind==='purchase'||e.kind==='installment') && e.date)) {
    const key=[e.cardLast4,e.date,normalized(e.description),e.amountMinor].join('|');
    groups.set(key,[...(groups.get(key)||[]),e.id]);
  }
  return [...groups.values()].filter(g=>g.length>1);
}
