import {money,redact,type Entry} from './domain.js';
export type Message={id:string;date:string;last4:string;amountMinor:number;text:string};
const normal=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function parseSms(text:string):{messages:Message[];rejected:number;rejectedMessages:string[]} {
  const messages:Message[]=[],seen=new Set();let rejected=0;const rejectedMessages:string[]=[];
  const reject=(line:string)=>{rejected++;if(rejectedMessages.length<500)rejectedMessages.push(redact(line).slice(0,2000));};
  for(const line of text.split(/\r?\n/).filter(s=>s.trim())) {
    if(!/COMPRA/i.test(line)||/RECUSAD|NEGAD|CANCELAD|ESTORNAD/i.test(line)){reject(line);continue;}
    const date=line.match(/(\d{2})\/(\d{2})\/(20\d{2})/);
    const card=line.match(/(?:FINAL|CART[AÃ]O(?:\s+FINAL)?)\s*[:*\s-]*?(\d{4})(?!\d)/i);
    const amount=line.match(/R\$\s*(-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})/);
    if(!date||!card||!amount){reject(line);continue;}
    const iso=`${date[3]}-${date[2]}-${date[1]}`;
    const valid=new Date(iso+'T12:00:00Z');
    if(!Number.isFinite(valid.getTime())||valid.toISOString().slice(0,10)!==iso){reject(line);continue;}
    const amountMinor=money(amount[1]);
    const safe=redact(line).slice(0,2000),id=normal(safe);
    if(seen.has(id))continue;seen.add(id);
    messages.push({id,date:iso,last4:card[1],amountMinor,text:safe});
  }
  return {messages,rejected,rejectedMessages};
}
export function reconcile(entries:Entry[],messages:Message[]) {
  const indexed=new Map<string,Message[]>(),texts=new Map<string,string>();
  for(const m of messages){const key=m.last4+'|'+m.date;indexed.set(key,[...(indexed.get(key)||[]),m]);texts.set(m.id,normal(m.text));}
  const candidates=new Map<string,Message[]>();
  const sameAmount=(e:Entry,m:Message)=>m.amountMinor===e.amountMinor||!!e.installment&&Number.isSafeInteger(e.amountMinor*e.installment.count)&&m.amountMinor===e.amountMinor*e.installment.count;
  for(const e of entries) {
    const description=normal(e.description.replace(/\(\s*\d+\/\d+\s*\)/g,''));
    const matches=(indexed.get(e.cardLast4+'|'+e.date)||[]).filter(m=>sameAmount(e,m)&&description.length>=3&&texts.get(m.id)!.includes(description));
    candidates.set(e.id,matches);
  }
  return new Map(entries.map(e=>{
    const found=candidates.get(e.id)||[];
    const message=found.length===1?found[0]:null;
    const contenders=message?entries.filter(other=>(candidates.get(other.id)||[]).some(m=>m.id===message.id)).length:0;
    const uncertainYear=e.kind==='installment'&&e.dateInferred&&!e.dateConfirmed;
    const status=message&&contenders===1&&!uncertainYear?'matched':found.length?'ambiguous':messages.length?'unmatched':'not-evaluated';
    const desc=normal(e.description.replace(/\(\s*\d+\/\d+\s*\)/g,''));
    const divergences=(indexed.get(e.cardLast4+'|'+e.date)||[]).filter(m=>m.amountMinor!==e.amountMinor&&desc.length>=3&&texts.get(m.id)!.includes(desc));
    return [e.id,{status,message:status==='matched'?message:null,divergence:e.kind!=='installment'&&!uncertainYear&&found.length===0&&divergences.length===1?divergences[0]:null}];
  }));
}

// Fase 1: nenhuma mensagem antiga ou nova participa da auditoria ativa.
export function reconcileInvoicesOnly(entries:Entry[]) { return reconcile(entries,[]); }
