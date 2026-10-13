export function validateModel(value) {
  const id=x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,256}$/.test(x);
  const text=(x,max=2000)=>typeof x==='string'&&x.length<=max;
  const amount=x=>Number.isSafeInteger(x);
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const list=(x,max)=>Array.isArray(x)&&x.length<=max;
  const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(new Date(x+'T12:00:00Z').getTime())&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
  const entry=e=>object(e)&&id(e.id)&&/^\d{4}$/.test(e.cardLast4)&&text(e.description)&&text(e.category,80)&&amount(e.amountMinor)&&
    (e.date===null||date(e.date))&&['purchase','installment','credit','payment','balance','fee','tax','interest'].includes(e.kind)&&['unset','recognized','unknown'].includes(e.recognition)&&
    (e.installment===null||object(e.installment)&&Number.isInteger(e.installment.index)&&Number.isInteger(e.installment.count)&&e.installment.index>=1&&e.installment.index<=e.installment.count&&e.installment.count<=99)&&
    object(e.source)&&Number.isInteger(e.source.page)&&e.source.page>=1&&text(e.source.text)&&list(e.source.region,4)&&e.source.region.length===4&&e.source.region.every(Number.isFinite)&&
    (e.merchantName===undefined||text(e.merchantName,100))&&(e.previousEntryId===undefined||e.previousEntryId===null||id(e.previousEntryId))&&
    (e.dateConfirmed===undefined||typeof e.dateConfirmed==='boolean')&&(e.dateInferred===undefined||typeof e.dateInferred==='boolean');
  if(!object(value)||value.version!==1||!list(value.audits,240)||(value.activeId!==null&&!id(value.activeId)))return false;
  for(const a of value.audits){
    if(!object(a)||!id(a.id)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(a.month)||!list(a.documents,100)||!object(a.resolutions)||!object(a.cardSettings)||!list(a.repayments,10000)||!list(a.history,50000))return false;
    if(a.documents.some(d=>!object(d)||!id(d.id)||!text(d.name,500)||!['verified','pending'].includes(d.integrity)||!Number.isInteger(d.pages)||d.pages<1||d.pages>100||!amount(d.calculatedMinor)||(d.declaredMinor!==null&&!amount(d.declaredMinor))||!list(d.entries,50000)||!d.entries.every(entry)||!list(d.cards,100)||d.cards.some(c=>!/^\d{4}$/.test(c.last4)||!amount(c.calculatedMinor)||!amount(c.declaredMinor)||!amount(c.differenceMinor))||!list(d.warnings,500)||!d.warnings.every(w=>text(w))))return false;
    if(Object.entries(a.resolutions).some(([k,v])=>!id(k)||!['expected','confirmed',null].includes(v)))return false;
    if(Object.entries(a.cardSettings).some(([k,c])=>!id(k)||!object(c)||!text(c.name,80)||!text(c.person,100)||!['','aeternum','visa-infinite'].includes(c.model)||!['Não definido','Titular','Adicional'].includes(c.type)||!['Não confirmado','Ativo','Cancelado com parcelas','Substituído'].includes(c.status)||(c.cancelledDate&&!date(c.cancelledDate))))return false;
    if(a.repayments.some(r=>!id(r.id)||!id(r.cardId)||!amount(r.amountMinor)||r.amountMinor<=0||!text(r.date,40)||!Number.isFinite(Date.parse(r.date))))return false;
    if(a.history.some(h=>!object(h)||!id(h.id)||!text(h.type,80)||!(h.value===null||text(h.value))||!Number.isFinite(Date.parse(h.date))))return false;
    if(a.messages!==undefined&&(!list(a.messages,50000)||a.messages.some(m=>!text(m.id,2000)||!date(m.date)||!/^\d{4}$/.test(m.last4)||!amount(m.amountMinor)||!text(m.text))))return false;
    if(a.smsRejected!==undefined&&(!list(a.smsRejected,500)||!a.smsRejected.every(line=>text(line))))return false;
    if(a.recognitions&&(!object(a.recognitions)||Object.entries(a.recognitions).some(([k,v])=>!id(k)||!['unset','recognized','unknown'].includes(v))))return false;
    if(a.dateCorrections&&(!object(a.dateCorrections)||Object.entries(a.dateCorrections).some(([k,v])=>!id(k)||!date(v))))return false;
  }
  if(value.activeId!==null&&!value.audits.some(a=>a.id===value.activeId))return false;
  if(value.rules&&(!object(value.rules)||Object.entries(value.rules).some(([k,v])=>!text(k)||!text(v,80))))return false;
  if(value.merchants&&(!object(value.merchants)||Object.entries(value.merchants).some(([k,v])=>!text(k)||!text(v,100))))return false;
  return true;
}
