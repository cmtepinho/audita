import './app.css';
import { parseBradesco, sum, duplicateGroups, money, redact,formatMoney } from './domain.ts';
import { extractPdf } from './pdf.js';
import * as storage from './storage.js';
import * as vault from './vault.js';
import {reconcileInvoicesOnly} from './sms.ts';
import {validateModel} from './model.js';
import {renderReport} from './report.js';
import {suggestCategory,ruleKey} from './classification.js';
if('serviceWorker' in navigator&&location.hostname!=='127.0.0.1'&&location.hostname!=='localhost')navigator.serviceWorker.register(new URL('../sw.js',import.meta.url)).catch(()=>{});

const bridge=window.AuditaPrototype;
const {esc,fmt,ico,header,sec,cardArt:prototypeArt,lineButton}=bridge.ui;
const cardArt=(card,mini=false)=>card.model?prototypeArt(card,mini):`<div class="${mini?'mini-card-art':'card-top'} dark"><span class="bank">◒ bradesco</span><span class="${mini?'tiny':'card-name'}">Modelo a confirmar</span><span class="${mini?'tiny':'pan'}">•••• ${card.last}</span>${state.images[card.id]?`<img class="official-image custom-image" src="${state.images[card.id]}" alt="Imagem personalizada do cartão">`:''}</div>`;
const state=bridge.state;
const format=formatMoney;
const quantity=(n,singular,plural=singular+'s')=>`${n} ${n===1?singular:plural}`;
const monthNow=()=>`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
const monthLabel=value=>new Date(value+'-15T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
let model={version:1,audits:[],activeId:null};
let queue=[];
let busy=false;
let progress='';
let reportFocus=null;
let saveQueue=Promise.resolve();
let storageAvailable=true;
let envelope=null,key=null,salt=null,locked=true,unlocking=false;
try { envelope=await storage.load(); }
catch {storageAvailable=false;}
const active=()=>model.audits.find(a=>a.id===model.activeId);
const entries=()=>active()?.documents.flatMap(d=>d.entries)||[];
const cardKey=(doc,last4)=>`${doc.id}:${last4}`;
const configurations=()=>active()?.cardSettings||{};
const configFor=entry=>configurations()[cardKey(active().documents.find(d=>d.entries.some(e=>e.id===entry.id)),entry.cardLast4)]||{};
function saveApp() {
  const snapshot=structuredClone(model);
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{if(!key)throw new Error();envelope=await vault.seal(snapshot,key,salt);await storage.save(envelope);}).catch(()=>{
    storageAvailable=false;window.toast('Não foi possível salvar. Exporte um backup antes de fechar.');
  });
  return saveQueue;
}
function event(type,id,value) {
  active().history.push({date:new Date().toISOString(),type,id,value});
  saveApp();
}
function createAudit(month) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return window.toast('Selecione um mês válido.');
  const existing=model.audits.find(a=>a.month===month);
  if(existing) model.activeId=existing.id;
  else {
    const audit={id:crypto.randomUUID(),month,documents:[],messages:[],smsRejected:[],resolutions:{},cardSettings:{},repayments:[],history:[]};
    model.audits.push(audit);model.activeId=audit.id;
  }
  queue=[];saveApp();window.go('invoices');
}
function total() {return sum((active()?.documents||[]).map(d=>d.declaredMinor??d.calculatedMinor));}
function totalDisplay(){return overlap()||active()?.documents.some(d=>d.declaredMinor===null)?'A conferir':format(total());}
function overlap() {
  const seen=new Map();
  for(const d of active()?.documents||[]) for(const e of d.entries) {
    const key=[e.cardLast4,e.date,e.description,e.amountMinor].join('|');
    if(seen.has(key)&&seen.get(key)!==d.id) return true;
    seen.set(key,d.id);
  }
  return false;
}
function integrity() {return !!active()?.documents.length && !overlap() && active().documents.every(d=>d.integrity==='verified');}
function cards() {
  return (active()?.documents||[]).flatMap(d=>d.cards.map(c=>{
    const id=cardKey(d,c.last4),settings=configurations()[id]||{};
    return {id,last:c.last4,name:settings.name||'Cartão Bradesco',short:settings.name||`Final ${c.last4}`,
      type:settings.type||'Não definido',model:settings.model||'',theme:'dark',status:settings.status||'Não confirmado',
      totalMinor:c.declaredMinor,settings,doc:d};
  }));
}
function matches(){
  // SMS suspenso na fase 1; mensagens antigas são preservadas no cofre.
  const result=reconcileInvoicesOnly(entries());
  for(const e of entries().filter(e=>e.installment&&e.previousEntryId)) {
    const previous=model.audits.filter(a=>a.month<active().month).flatMap(a=>a.documents.flatMap(d=>d.entries)).find(p=>p.id===e.previousEntryId);
    if(previous?.installment&&ruleKey(previous.description)===ruleKey(e.description)&&previous.installment.count===e.installment.count&&previous.installment.index<e.installment.index){
      const match=result.get(e.id);if(match.status!=='matched')result.set(e.id,{...match,status:'history',previous});
    }
  }
  return result;
}
function occurrences() {
  const result=duplicateGroups(entries()).map(group=>({id:'duplicate:'+group[0],group,type:'Possível duplicidade',level:'high',entry:entries().find(e=>e.id===group[0]),description:`${group.length} lançamentos com o mesmo cartão, data, descritor e valor. Verifique as evidências.`}));
  for(const e of entries().filter(e=>e.recognition==='unknown')) result.push({id:'unknown:'+e.id,group:[e.id],type:e.kind==='purchase'||e.kind==='installment'?'Compra não reconhecida':'Lançamento não reconhecido',level:'high',entry:e,description:'Reconhecimento informado por você. Esta marcação não contesta a compra junto ao banco.'});
  for(const [id,match] of matches())if(match.divergence){const e=entries().find(e=>e.id===id);result.push({id:'divergence:'+id,group:[id],type:'Valor divergente',level:'review',entry:e,description:`Fatura ${format(e.amountMinor)} e SMS ${format(match.divergence.amountMinor)}. Verifique ajustes e parcelas.`});}
  for(const e of entries().filter(e=>e.kind==='purchase'||e.kind==='installment'&&e.installment?.index===1)) {
    const config=configFor(e);
    if(config.status==='Cancelado com parcelas'&&config.cancelledDate&&e.date&&e.date>config.cancelledDate)result.push({id:'cancelled:'+e.id,group:[e.id],type:'Cartão cancelado',level:'high',entry:e,description:'Data do lançamento posterior ao cancelamento informado. Verifique se é compra nova, ajuste ou lançamento tardio.'});
  }
  return result;
}
const empty=(title,text,button=true)=>`<div class="center-empty"><span class="round-icon" style="margin:auto">${ico('file')}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${button?'<button class="primary" onclick="go(\'start\')">Nova auditoria mensal →</button>':''}</div>`;
const privacy=()=>`<div class="note">${storageAvailable?'Dados salvos apenas neste navegador.':'Armazenamento indisponível: dados somente nesta sessão.'} PDFs são lidos no dispositivo e não são enviados. Guarde um backup antes de limpar os dados do navegador.</div>`;
const localBadge=()=>`<span class="badge ${integrity()?'':'amber'}">${integrity()?'Totais conferidos':'Integridade pendente'}</span>`;
const transactionList=(list)=>list.map(e=>lineButton(esc(e.description),`${e.date||'Data pendente'} · Final ${e.cardLast4} · ${format(e.amountMinor)}`,e.kind==='credit'?'refresh':'file',`Audita.openEntry('${e.id}')`)).join('');
function home() {
  if(locked)return `<div class="topline"><h2>Seu Audita</h2><div class="subtitle">Auditoria privada neste dispositivo</div></div><div class="card-surface"><span class="round-icon">${ico('shield')}</span><h3>${envelope?'Desbloquear auditorias':'Proteger seus dados locais'}</h3><p class="subtitle">${envelope?'Informe sua senha local para abrir o cofre.':'Crie uma senha com pelo menos 12 caracteres. Os dados financeiros serão criptografados antes de serem salvos neste navegador.'}</p><label class="field-label" for="vault-password">Senha local</label><input id="vault-password" class="input" type="password" autocomplete="${envelope?'current-password':'new-password'}" minlength="12" onkeydown="if(event.key==='Enter')Audita.unlock()">${envelope?'':'<label class="field-label" for="vault-confirm">Confirmar senha</label><input id="vault-confirm" class="input" type="password" autocomplete="new-password">'}<div style="height:14px"></div><button class="primary" onclick="Audita.unlock()">${envelope?'Desbloquear':'Criar cofre local'}</button><p class="subtitle">A senha não é enviada nem salva. Não há recuperação automática. Guarde sua senha e exporte backups criptografados.</p></div>${privacy()}<div style="height:12px"></div><label class="outline" style="display:block;text-align:center">Restaurar backup criptografado<input type="file" accept=".json,application/json" hidden onchange="Audita.restore(event)"></label>${envelope?'<button class="outline danger-outline" style="margin-top:12px" onclick="setModal(\'deleteLocal\')">Excluir cofre deste dispositivo</button>':''}`;
  const allCards=cards(),selected=allCards.find(c=>c.id===state.selectedCard)||allCards[0];
  const pending=occurrences().filter(o=>!active().resolutions[o.id]||o.id.startsWith('unknown:'));
  return `<div class="topline row between"><div><div class="subtitle">Suas faturas, sob controle.</div><h2>Meus cartões</h2></div><span class="badge blue">Local</span></div>`+
    `<div class="dashboard-layout"><section class="dashboard-main" aria-label="Resumo da auditoria">`+(selected?`<div class="card-art-top">${cardArt(selected)}</div><div class="card-thumbs">${allCards.filter(c=>c.id!==selected.id).map(c=>`<button class="thumb-button" onclick="state.selectedCard='${c.id}';render()">${cardArt(c,true)}<div class="thumb-text">Final ${c.last}</div></button>`).join('')}</div>`:empty('Sua primeira auditoria','Importe a fatura fechada para organizar cartões, lançamentos e evidências.',false))+
    (active()?`${sec(monthLabel(active().month),'Ver relatório',"go('report')")}<div class="card-surface"><div class="subtitle">Total declarado das faturas</div><div class="amount">${totalDisplay()}</div><div class="row between"><span class="subtitle">${quantity(active().documents.length,'documento')} · ${quantity(entries().length,'lançamento')}</span>${localBadge()}</div></div><div class="grid3"><button class="metric" onclick="go('review')"><div class="subtitle">Ocorrências</div><div class="metric-value">${pending.length} para revisar</div></button><button class="metric" onclick="go('report')"><div class="subtitle">Conciliação</div><div class="metric-value">${[...matches().values()].filter(m=>m.status==='history').length} no histórico</div></button><button class="metric" onclick="go('additional')"><div class="subtitle">Adicionais</div><div class="metric-value">${quantity(allCards.filter(c=>c.type==='Adicional').length,'cartão','cartões')}</div></button></div>`:'')+
    `${active()?.documents.length?sec('Categorias do mês','Ver análise',"state.reportTab='Categorias';go('report')")+categoryChart():''}</section><section class="dashboard-aside" aria-label="Auditorias e cofre">${sec('Auditorias neste dispositivo')}<div class="stack">${model.audits.map(a=>lineButton(esc(monthLabel(a.month)),`${quantity(a.documents.length,'documento')}`,'calendar',`Audita.selectAudit('${a.id}')`)).join('')}<button class="primary" onclick="go('start')">${ico('plus',15)} Nova auditoria mensal</button></div><div style="height:12px"></div>${privacy()}${sec('Seus dados')}<div class="stack"><button class="outline" onclick="Audita.backup()">Exportar backup criptografado</button><button class="outline" onclick="Audita.lock()">Bloquear cofre local</button><button class="outline danger-outline" onclick="setModal('deleteLocal')">Excluir dados deste dispositivo</button></div></section></div>`;
}
function start() {
  return header('Nova auditoria')+`<div class="card-surface"><label class="field-label" for="audit-month">Mês da auditoria</label><input id="audit-month" class="input" type="month" value="${active()?.month||monthNow()}"></div><div class="progress-steps">${[['Faturas','Importe todas as faturas deste fechamento.'],['Processamento','Extração local, cartões, parcelas, créditos e conferência dos totais.'],['Resultado','Revise evidências e reconheça as compras separadamente.']].map(([n,t],i)=>`<div class="step ${i===0?'active':''}"><span class="step-num">${i+1}</span><div><h4>${n}</h4><p>${t}</p></div></div>`).join('')}</div>${privacy()}<div class="sticky-btn"><button class="primary" onclick="Audita.createAudit(document.getElementById('audit-month').value)">Continuar →</button></div>`;
}
function invoices() {
  if(!active()) return header('Faturas')+empty('Escolha o mês','Crie uma auditoria antes de importar PDFs.');
  return header('1. Faturas do mês')+`<p class="subtitle">${esc(monthLabel(active().month))} · Bradesco exportado com texto selecionável.</p><div class="uploadbox"><span class="round-icon" style="margin:auto">${ico('file')}</span><h3>Adicionar faturas</h3><p>Até 25 MB e 100 páginas por PDF. Nenhum upload.</p><button type="button" onclick="document.getElementById('pdfFiles').click()">Escolher arquivos</button><input id="pdfFiles" type="file" accept="application/pdf,.pdf" multiple hidden onchange="addFiles(event)" ${busy?'disabled':''}></div>${sec('Faturas adicionadas')}${active().documents.map(d=>`<div class="file-row"><span class="round-icon">${ico('file')}</span><div class="name">${esc(d.name)}<div class="meta">${quantity(d.pages,'página')} · ${quantity(d.entries.length,'lançamento')} · ${d.integrity==='verified'?'Totais conferidos':'Conferência pendente'}</div></div><button class="remove" aria-label="Remover documento" onclick="Audita.removeDocument('${d.id}')">×</button></div>`).join('')}${queue.map((f,i)=>`<div class="file-row"><div class="name">${esc(f.file.name)}<div class="meta">${esc(f.status)}</div></div><button class="remove" aria-label="Remover arquivo" onclick="removeFile(${i})" ${busy?'disabled':''}>×</button></div>`).join('')}<div class="note">Esta primeira versão interpreta o layout exportado do Bradesco. Outro layout ou PDF digitalizado será sinalizado; não será substituído por dados de exemplo.</div><div class="sticky-btn"><button class="primary" onclick="go('processing')" ${!queue.length&&!active().documents.length?'disabled':''}>Continuar →</button></div>`;
}
function sms() {
  return header('SMS · próxima etapa')+'<div class="note">Importação de SMS desativada nesta etapa. Continue a auditoria com suas faturas em PDF.</div><button class="primary" onclick="go(\'invoices\')">Ir para faturas</button>';
}

function processing() {
  return header('2. Análise da fatura')+`<div class="center-empty"><span class="round-icon" style="width:67px;height:67px;margin:auto">${ico('spark',32)}</span><h3>${busy?'Lendo no dispositivo…':'Pronto para a auditoria'}</h3><p>${busy?esc(progress):'Vamos extrair as linhas e conferir cada seção com o resumo da fatura. Os valores são calculados em centavos.'}</p></div><div class="card-surface">${[['file','Páginas e linhas da fatura'],['cards','Seções e finais de cartão'],['refresh','Parcelas, pagamentos e créditos'],['checkCircle','Subtotais e total em centavos'],['alert','Possíveis duplicidades']].map(([ic,t])=>`<div class="tableline"><span class="row">${ico(ic,16)} ${t}</span></div>`).join('')}</div><div class="note">Conferir documentos não confirma autorização. Reconhecimento das compras é uma decisão independente.</div><div class="sticky-btn"><button class="primary" onclick="Audita.process()" ${busy||!active()?'disabled':''}>${busy?'Processando…':queue.length?'Processar faturas →':'Ver resultado →'}</button></div>`;
}
async function process() {
  if(busy||!active())return;
  if(!queue.length) return window.go('report');
  busy=true;window.go('processing');
  for(const item of queue) {
    if(item.status==='Importado')continue;
    progress='Preparando PDF';window.render();
    try {
      const {hash,pages}=await extractPdf(item.file,(page,count)=>{progress=`Página ${page} de ${count}`;window.render();});
      const existing=model.audits.find(a=>a.documents.some(d=>d.id===hash));
      if(existing) {item.status=`Documento já importado em ${monthLabel(existing.month)}; não duplicado.`;continue;}
      const statement=parseBradesco(pages,hash);
      for(const entry of statement.entries){const rule=model.rules?.[ruleKey(entry.description)];if(rule)entry.category=rule;else if(entry.kind==='purchase'||entry.kind==='installment')entry.category=suggestCategory(entry.description);entry.merchantName=model.merchants?.[ruleKey(entry.description)]||'';entry.recognition=active().recognitions?.[entry.id]||'unset';const correctedDate=active().dateCorrections?.[entry.id];if(correctedDate){entry.date=correctedDate;entry.dateConfirmed=true;}}
      active().documents.push({...statement,name:redact(item.file.name)});
      item.status='Importado';
      await saveApp();
    } catch(error) {item.status=error.message;}
  }
  busy=false;
  const errors=queue.some(item=>item.status!=='Importado'&&!item.status.startsWith('Documento já'));
  queue=queue.filter(item=>item.status!=='Importado'&&!item.status.startsWith('Documento já'));
  window.go(errors?'invoices':'report');
  if(errors)window.toast('Um ou mais documentos precisam de atenção. Veja a lista de faturas.');
}
function review() {
  if(!active())return header('Revisão de ocorrências')+empty('Nenhuma auditoria','Importe uma fatura para revisar.');
  const all=occurrences(),resolved=o=>!!active().resolutions[o.id]&&!o.id.startsWith('unknown:');
  const filtered=all.filter(o=>state.reviewFilter==='all'||state.reviewFilter==='resolved'&&resolved(o)||state.reviewFilter==='high'&&!resolved(o)||state.reviewFilter==='review'&&!resolved(o)&&o.level!=='high');
  return header('Revisão de ocorrências')+`<div class="card-surface"><div class="row between"><b>${all.filter(o=>!resolved(o)).length} para revisar</b><span class="badge grey">Reconhecimento separado</span></div></div><div class="filter-pills">${[['all','Todas'],['high','Prioridade alta'],['review','Para revisar'],['resolved','Revisadas']].map(([key,name])=>`<button class="${state.reviewFilter===key?'active':''}" onclick="state.reviewFilter='${key}';render()">${name}</button>`).join('')}</div>${filtered.length?filtered.map(o=>`<button class="issue ${resolved(o)?'resolved':''}" style="width:100%;text-align:left" onclick="Audita.openEntry('${o.entry.id}','${o.id}')"><div class="row between"><b class="issue-title">${esc(o.type)}</b><b>${format(o.entry.amountMinor)}</b></div><p>${esc(o.description)}</p><div class="small">${esc(o.entry.description)} · ${o.entry.date} · Final ${o.entry.cardLast4}</div><span class="badge ${resolved(o)?'':'amber'}">${resolved(o)?'Revisada':'Pendente'}</span></button>`).join(''):empty('Nenhuma ocorrência neste filtro','Isso não confirma o reconhecimento de todas as compras.',false)}${integrity()?'':`<div class="note">Há pendências de integridade. Veja a conferência dos documentos antes de concluir a auditoria.</div>`}<button class="outline" onclick="go('report')">Ver relatório completo →</button>`;
}
let selectedEntry=null,selectedOccurrence=null;
function transaction() {
  const e=entries().find(e=>e.id===selectedEntry);
  if(!e)return header('Detalhes da transação')+empty('Selecione um lançamento','Abra um lançamento no relatório.',false);
  const names={unset:'Não informado',recognized:'Reconhecida',unknown:'Não reconhecida'};
  const document=active().documents.find(d=>d.entries.some(t=>t.id===e.id));
  const group=occurrences().find(o=>o.id===selectedOccurrence);
  const match=matches().get(e.id);
  const reconciliation={history:'Vinculada ao histórico',matched:'Conciliada',ambiguous:'Ambígua',unmatched:'Sem correspondência','not-evaluated':'Não avaliada'};
  const previous=model.audits.filter(a=>a.month<active().month).flatMap(a=>a.documents.flatMap(d=>d.entries.map(item=>({...item,month:a.month}))));
  const baseName=s=>s.replace(/\(\s*\d+\/\d+\s*\)/g,'').trim().toUpperCase();
  const candidates=e.installment?previous.filter(item=>item.installment&&item.cardLast4===e.cardLast4&&baseName(item.description)===baseName(e.description)&&item.installment.count===e.installment.count&&item.installment.index<e.installment.index):[];
  const historyPanel=e.installment?`<div class="card-surface"><b class="small">Histórico do parcelamento</b><p class="subtitle">Vincule somente após confirmar o cartão e a compra. O vínculo não altera seu reconhecimento.</p><label class="field-label" for="series-history">Compra/parcela anterior</label><select id="series-history" class="select"><option value="">Sem vínculo confirmado</option>${candidates.map(p=>`<option value="${p.id}" ${e.previousEntryId===p.id?'selected':''}>${esc(monthLabel(p.month))} · parcela ${p.installment.index}/${p.installment.count} · ${format(p.amountMinor)}</option>`).join('')}</select><button class="link" onclick="Audita.linkHistory()">Salvar vínculo</button></div>`:'';
  return header('Detalhes da transação')+`${group?`<div class="issue"><b>${esc(group.type)}</b><p>${esc(group.description)}</p></div>`:''}<div class="card-surface"><div class="page-title">${esc(e.merchantName||e.description)}</div>${e.merchantName?`<div class="subtitle">Descritor original: ${esc(e.description)}</div>`:''}<div class="amount" style="margin:14px 0">${format(e.amountMinor)}</div><div class="subtitle">${e.date||'Data pendente'} · Final ${e.cardLast4}</div>${e.dateInferred&&!e.dateConfirmed?'<p class="subtitle">Ano inferido da data de vencimento. Confirme a data original, especialmente em parcelas antigas.</p>':''}${e.installment?`<span class="badge blue">Parcela ${e.installment.index}/${e.installment.count}</span>`:''}</div>${sec('Evidências')}${match.previous?`<div class="card-surface"><b class="small">Histórico confirmado por você</b><div class="receipt">${esc(match.previous.source.text)}</div></div>`:''}${match.message||match.divergence?`<div class="card-surface"><b class="small">Mensagem SMS</b><div class="receipt">${esc((match.message||match.divergence).text)}</div></div>`:''}<div class="card-surface"><div class="subtitle">${esc(document.name)} · página ${e.source.page}</div><div class="receipt">${esc(e.source.text)}</div>${group&&group.group.length>1?group.group.filter(id=>id!==e.id).map(id=>{const other=entries().find(t=>t.id===id);return `<div class="divider"></div><div class="subtitle">Outra cobrança · página ${other.source.page}</div><div class="receipt">${esc(other.source.text)}</div>`;}).join(''):''}</div><div class="card-surface"><div class="tableline"><span>Conciliação de fontes</span><b>${match.status==='history'?reconciliation.history:'SMS desativado nesta etapa'}</b></div><div class="tableline"><span>Reconhecimento</span><b>${names[e.recognition]}</b></div><label class="field-label" for="entry-date">Confirmar data original da compra</label><input id="entry-date" class="input" type="date" value="${e.date||''}"><button class="link" onclick="Audita.confirmDate()">Salvar data confirmada</button><label class="field-label" for="entry-merchant">Nome comercial informado por você</label><input id="entry-merchant" class="input" value="${esc(e.merchantName||'')}" placeholder="Opcional; descritor original permanece preservado"><label class="field-label" for="entry-category">Categoria (sugestão local, editável)</label><input id="entry-category" class="input" value="${esc(e.category)}"><button class="link" onclick="Audita.category()">Salvar categoria</button></div><div class="grid2"><button class="primary" style="background:#149768" onclick="markIssue('recognized')">Reconheço</button><button class="outline danger-outline" onclick="markIssue('unknown')">Não reconheço</button></div><button class="subtle-btn" style="padding:12px" onclick="markIssue('unset')">Limpar reconhecimento</button>${group&&!group.id.startsWith('unknown:')?`<div class="note">Reconhecer a compra não resolve esta ocorrência. Após conferir as duas evidências, registre sua conclusão.</div><div class="stack" style="margin-top:12px"><button class="outline" onclick="Audita.resolve('expected')">Ocorrência explicada / esperada</button><button class="outline danger-outline" onclick="Audita.resolve('confirmed')">Confirmei o problema</button><button class="subtle-btn" onclick="Audita.resolve(null)">Reabrir ocorrência</button></div>`:''}${historyPanel}${sec('Histórico de decisões')}<div class="card-surface">${active().history.filter(h=>h.id===e.id||h.id===selectedOccurrence).map(h=>`<div class="tableline"><span>${new Date(h.date).toLocaleString('pt-BR')} · ${esc(h.type)}</span><b>${esc(({recognized:'Reconhecida',unknown:'Não reconhecida',unset:'Não informado',expected:'Explicada',confirmed:'Problema confirmado'})[h.value]||h.value||'Reaberta')}</b></div>`).join('')||'<span class="subtitle">Nenhuma decisão registrada.</span>'}</div>`;
}
function wallet() {
  const all=cards().filter(c=>state.cardTab==='Todos'||state.cardTab==='Titular'&&c.type==='Titular'||state.cardTab==='Adicionais'&&c.type==='Adicional'||state.cardTab==='Cancelados'&&['Cancelado com parcelas','Substituído'].includes(c.status)),selected=all.find(c=>c.id===state.selectedCard)||all[0];
  const tabs=`<div class="tabs">${['Todos','Titular','Adicionais','Cancelados'].map(t=>`<button class="${state.cardTab===t?'active':''}" onclick="state.cardTab='${t}';render()">${t}</button>`).join('')}</div>`;
  if(!selected)return `<div class="topline"><h2>Meus cartões</h2></div>`+tabs+empty('Nenhum cartão neste filtro','Importe uma fatura ou confirme o tipo dos cartões em Todos.',false);
  state.selectedCard=selected.id;
    let future=null;
    try{future=sum(selected.doc.entries.filter(e=>e.cardLast4===selected.last&&e.installment&&e.amountMinor>0).map(e=>e.amountMinor*(e.installment.count-e.installment.index)));}catch{/* Nunca aproximar um valor fora do intervalo seguro. */}
  return `<div class="topline row between"><h2>Meus cartões</h2><button class="link" onclick="setModal('cardSettings')">Editar</button></div>${tabs}<div class="card-art-top">${cardArt(selected)}</div><div class="row between"><div><b>${esc(selected.name)}</b><div class="subtitle">Final ${selected.last} · ${esc(selected.type)}</div></div><span class="badge grey">${esc(selected.status)}</span></div><div class="card-thumbs" style="margin:12px 0">${all.map(c=>`<button class="thumb-button ${c.id===selected.id?'selected':''}" onclick="state.selectedCard='${c.id}';render()">${cardArt(c,true)}<div class="thumb-text">Final ${c.last}</div></button>`).join('')}</div>${sec('Resumo deste cartão')}<div class="card-surface"><div class="subtitle">Subtotal declarado nesta fatura</div><div class="amount-md">${format(selected.totalMinor)}</div><div class="divider"></div><div class="subtitle">Projeção das parcelas identificadas</div><div class="amount-md">${future===null?'Não disponível':format(future)}</div><p class="subtitle">Estimativa pelo valor da parcela atual. Confira o vínculo ao histórico nos detalhes da compra.</p>${lineButton('Configurações','Modelo, status e responsável','settings',"setModal('cardSettings')")}${lineButton('Personalizar imagem','Somente nesta sessão; sem dados sensíveis','upload','uploadCardImage()')}${lineButton('Histórico de faturas','Consultar a auditoria selecionada','file',"go('report')")}</div>`;
}
function categoryChart(){
  if(overlap())return '<div class="note">Categorias consolidadas aguardam revisão de documentos sobrepostos.</div>';
  const categories=new Map(),colors=['#297cdf','#efaa34','#41b68d','#9571e8','#9cc0ee','#cad5e4'];
  for(const e of entries().filter(e=>e.kind==='purchase'||e.kind==='installment'))categories.set(e.category,sum([categories.get(e.category)||0,e.amountMinor]));
  const amount=sum([...categories.values()]);let start=0;
  const segments=[...categories].map(([,value],i)=>{const end=start+value/(amount||1)*100,s=`${colors[i%colors.length]} ${start}% ${end}%`;start=end;return s;});
  return `<div class="card-surface"><div class="chart-flex"><div class="donut" style="background:${amount?'conic-gradient('+segments.join(',')+')':'#edf1f6'}"><div class="donut-inside">${format(amount)}<span>Compras positivas</span></div></div><div class="legend">${[...categories].map(([name,value],i)=>`<div class="legend-line"><i class="dot" style="background:${colors[i%colors.length]}"></i><span style="overflow:hidden;text-overflow:ellipsis;min-width:0">${esc(name)}</span><b>${Math.round(value/(amount||1)*100)}%</b></div>`).join('')}</div></div><div class="subtitle" style="margin-top:12px">Créditos, pagamentos e saldo anterior são apresentados separadamente no relatório.</div></div>`;
}
function additional() {
  if(!active())return header('Cartões adicionais')+empty('Nenhuma auditoria','Importe uma fatura para identificar os adicionais.');
  if(overlap())return header('Cartões adicionais')+'<div class="note">Revise os documentos sobrepostos antes de calcular valores devidos.</div>';
  const list=cards().filter(c=>c.type==='Adicional');
  const title=state.screen==='report'?'':header('Cartões adicionais');
  const tabs=`<div class="segmented" style="margin-bottom:14px">${['Pessoas','Cartões','Histórico'].map(t=>`<button class="${state.extraTab===t?'active':''}" onclick="state.extraTab='${t}';render()">${t}</button>`).join('')}</div>`;
  if(state.extraTab==='Cartões')return title+tabs+list.map(c=>lineButton(esc(c.name),`Final ${c.last} · ${esc(c.settings.person||'Sem responsável')}`,'cards',`state.cardTab='Todos';state.selectedCard='${c.id}';go('wallet')`)).join('');
  if(state.extraTab==='Histórico')return title+tabs+`<div class="card-surface"><b class="small">Repasses recebidos</b>${active().repayments.map(r=>`<div class="tableline"><span>${new Date(r.date).toLocaleDateString('pt-BR')} · ${esc(list.find(c=>c.id===r.cardId)?.settings.person||'Adicional')}</span><b>${format(r.amountMinor)}</b></div>`).join('')||'<p class="subtitle">Nenhum repasse registrado nesta competência.</p>'}</div>`;
  return title+tabs+`${!list.length?empty('Defina os responsáveis','Na carteira, edite cada cartão identificado e marque os adicionais e seus responsáveis.',false):''}${list.map(c=>{
    const due=sum(c.doc.entries.filter(e=>e.cardLast4===c.last&&e.kind!=='balance'&&e.kind!=='payment').map(e=>e.amountMinor));
    const received=sum(active().repayments.filter(r=>r.cardId===c.id).map(r=>r.amountMinor));
    return `<div class="card-surface"><b>${esc(c.settings.person||'Responsável não informado')}</b><div class="subtitle">Final ${c.last}</div><div class="grid3" style="margin:14px 0">${[['Devido',due],['Recebido',received],['Pendente',due-received]].map(([label,value])=>`<div><div class="micro muted">${label}</div><b class="small">${format(value)}</b></div>`).join('')}</div><button class="outline" onclick="Audita.repaymentCard='${c.id}';setModal('repay')">Registrar repasse</button>${active().repayments.filter(r=>r.cardId===c.id).map(r=>`<div class="tableline"><span>${new Date(r.date).toLocaleDateString('pt-BR')}</span><b>${format(r.amountMinor)}</b></div>`).join('')}</div>`;
  }).join('')}<div class="note">Os gastos dos adicionais já fazem parte da fatura consolidada. Repasses não alteram o total da fatura.</div>`;
}
function report() {
  if(!active()?.documents.length)return header('Relatório mensal')+empty('Nenhuma fatura processada','Importe e processe uma fatura para gerar o relatório.');
  const list=entries(),grouped=new Map();
  for(const e of list.filter(e=>!['balance','payment'].includes(e.kind)))grouped.set(e.category,sum([grouped.get(e.category)||0,e.amountMinor]));
  return header(monthLabel(active().month),`<button class="back" aria-label="Exportar relatório" onclick="downloadSummary()">${ico('download')}</button>`)+`<button class="outline" onclick="Audita.printReport()">Imprimir / salvar relatório PDF</button><div class="tabs">${['Resumo','Lançamentos','Categorias','Adicionais'].map(t=>`<button class="${state.reportTab===t?'active':''}" onclick="state.reportTab='${t}';render()">${t}</button>`).join('')}</div>`+
  (state.reportTab==='Lançamentos'?transactionList(list):state.reportTab==='Categorias'?categoryChart()+`<div class="card-surface">${[...grouped].map(([name,value])=>`<div class="tableline"><span>${esc(name)}</span><b>${format(value)}</b></div>`).join('')}</div>`:state.reportTab==='Adicionais'?additional():`<div class="report-summary"><div class="subtitle">Total declarado das faturas</div><div class="amount">${totalDisplay()}</div><div class="row between"><span class="subtitle">${quantity(active().documents.length,'documento')} · ${quantity(list.length,'lançamento')}</span>${localBadge()}</div></div>${overlap()?'<div class="note">Há lançamentos coincidentes entre PDFs. Confirme se são reemissões ou documentos sobrepostos antes de consolidar.</div>':''}${sec('Integridade dos documentos')}${active().documents.map(d=>`<div class="card-surface"><b class="small">${esc(d.name)}</b><div class="tableline"><span>Total declarado</span><b>${d.declaredMinor===null?'Não identificado':format(d.declaredMinor)}</b></div><div class="tableline"><span>Total calculado</span><b>${format(d.calculatedMinor)}</b></div>${d.cards.map(c=>`<div class="tableline"><span>Final ${c.last4}</span><b>${format(c.calculatedMinor)}${c.differenceMinor?' · divergente':' · confere'}</b></div>`).join('')}${d.warnings.map(w=>`<p class="subtitle" style="color:var(--amber)">${esc(w)}</p>`).join('')}</div>`).join('')}<div class="grid2"><button class="outline" onclick="go('review')">${quantity(occurrences().length,'ocorrência')}</button><button class="outline" onclick="state.reportTab='Lançamentos';render()">Ver lançamentos</button></div><div class="note" style="margin-top:12px">${[...matches().values()].filter(m=>['matched','history'].includes(m.status)).length} lançamentos vinculados ao histórico. SMS desativado nesta etapa. Histórico de parcelas requer confirmação de vínculo. ${list.filter(e=>e.recognition==='recognized').length} compras/lançamentos reconhecidos por você; ${list.filter(e=>e.recognition==='unknown').length} não reconhecidos. Totais conferidos não comprovam autorização.</div>`);
}
function modalContent() {
  const c=cards().find(c=>c.id===state.selectedCard),settings=c?.settings||{};
  let content='';
  if(state.modal==='cardSettings'&&c)content=`<h3>Configurações do cartão</h3><p>Confirme os dados. A identificação por final pertence a esta seção da fatura; vínculo entre meses será tratado com histórico.</p><label class="field-label" for="card-previous">Vincular cadastro anterior (confirme o cartão)</label><select id="card-previous" class="select" onchange="Audita.inheritCard(this.value)"><option value="">Sem vínculo confirmado</option>${model.audits.filter(a=>a.month<active().month).flatMap(a=>a.documents.flatMap(d=>d.cards.map(prior=>{const id=cardKey(d,prior.last4);return `<option value="${id}" ${settings.previousCardId===id?'selected':''}>${esc(monthLabel(a.month))} · Final ${prior.last4}</option>`;}))).join('')}</select><label class="field-label" for="card-name">Nome do cartão</label><input id="card-name" class="input" value="${esc(settings.name||'')}"><label class="field-label" for="card-model">Modelo</label><select id="card-model" class="select"><option value="">Não definido</option><option value="aeternum" ${settings.model==='aeternum'?'selected':''}>Bradesco Aeternum</option><option value="visa-infinite" ${settings.model==='visa-infinite'?'selected':''}>Bradesco Visa Infinite</option></select><label class="field-label" for="card-type">Tipo</label><select id="card-type" class="select">${['Não definido','Titular','Adicional'].map(v=>`<option ${settings.type===v?'selected':''}>${v}</option>`).join('')}</select><label class="field-label" for="card-status">Status</label><select id="card-status" class="select">${['Não confirmado','Ativo','Cancelado com parcelas','Substituído'].map(v=>`<option ${settings.status===v?'selected':''}>${v}</option>`).join('')}</select><label class="field-label" for="card-cancelled">Data do cancelamento (se houver)</label><input id="card-cancelled" class="input" type="date" value="${esc(settings.cancelledDate||'')}"><label class="field-label" for="card-person">Responsável</label><input id="card-person" class="input" value="${esc(settings.person||'')}"><div style="height:14px"></div><button class="primary" onclick="Audita.saveCard()">Salvar neste dispositivo</button>`;
  else if(state.modal==='repay')content=`<h3>Registrar repasse</h3><label class="field-label" for="repay-value">Valor em reais</label><input class="input" id="repay-value" inputmode="decimal" placeholder="100,00"><div style="height:12px"></div><button class="primary" onclick="Audita.saveRepayment()">Salvar recebimento</button>`;
  else if(state.modal==='deleteLocal')content=`<h3>Excluir dados locais?</h3><p>Isso remove as auditorias, decisões e repasses deste navegador. Exporte um backup antes se quiser recuperá-los.</p><button class="outline" onclick="Audita.backup()">Exportar backup</button><div style="height:12px"></div><button class="primary" style="background:var(--red)" onclick="Audita.deleteLocal()">Excluir todos os dados locais</button>`;
  else content='<h3>Informações</h3><p>Selecione um cartão ou lançamento para consultar os detalhes.</p>';
  return `<div class="modal-backdrop" onclick="closeModal()"><div class="modal" role="dialog" aria-modal="true" aria-label="Configurações" onclick="event.stopPropagation()"><button class="modal-close" aria-label="Fechar" onclick="closeModal()">${ico('close',16)}</button>${content}</div></div>`;
}
function download(content,name,type) {
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
window.Audita={
  createAudit, process,
  readSms(text){return window.toast('SMS estará disponível em uma etapa futura.');},

  async importSms(){window.toast('SMS estará disponível em uma etapa futura.');},
  async unlock(){if(unlocking)return;unlocking=true;const button=document.querySelector('#screen .primary');if(button){button.disabled=true;button.textContent='Abrindo cofre…';}try{
    const password=document.getElementById('vault-password').value;
    if(envelope){const opened=await vault.open(envelope,password);if(!validateModel(opened.value))throw new Error('Cofre incompatível ou corrompido. Seus dados foram preservados.');model=opened.value;key=opened.key;salt=opened.salt;}
    else {if(password!==document.getElementById('vault-confirm').value)throw new Error('As senhas precisam coincidir.');salt=crypto.getRandomValues(new Uint8Array(16));key=await vault.derive(password,salt);await saveApp();}
    locked=false;window.go('home');
  }catch(error){key=null;salt=null;if(button){button.disabled=false;button.textContent=envelope?'Desbloquear':'Criar cofre local';}window.toast(error.message||'Não foi possível desbloquear.');}finally{unlocking=false;}},
  async lock(){if(busy)return;await saveQueue;this.closeReport();key=null;salt=null;model={version:1,audits:[],activeId:null};queue=[];state.images={};selectedEntry=null;selectedOccurrence=null;locked=true;window.go('home');},
  selectAudit(id){if(busy)return;model.activeId=id;queue=[];state.selectedCard='';saveApp();window.go('home');},
  openEntry(id,occurrence=null){selectedEntry=id;selectedOccurrence=occurrence;state.returnTo=state.screen;window.go('transaction');},
  confirmDate(){const e=entries().find(e=>e.id===selectedEntry),date=document.getElementById('entry-date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return window.toast('Informe uma data válida.');e.date=date;e.dateConfirmed=true;active().dateCorrections||={};active().dateCorrections[e.id]=date;event('Data original confirmada',e.id,date);window.render();},
  linkHistory(){const e=entries().find(e=>e.id===selectedEntry);e.previousEntryId=document.getElementById('series-history').value||null;event('Vínculo de parcela',e.id,e.previousEntryId?'Confirmado':'Removido');window.render();},
  category(){const e=entries().find(e=>e.id===selectedEntry);e.category=redact(document.getElementById('entry-category').value.trim().slice(0,80))||'Não classificado';e.merchantName=redact(document.getElementById('entry-merchant').value.trim().slice(0,100));model.merchants||={};model.merchants[ruleKey(e.description)]=e.merchantName;model.rules||={};model.rules[ruleKey(e.description)]=e.category;event('Categoria',e.id,e.category);window.render();},
  resolve(value){if(!selectedOccurrence)return;active().resolutions[selectedOccurrence]=value;event('Ocorrência',selectedOccurrence,value);window.render();},
  removeDocument(id){if(busy)return;active().documents=active().documents.filter(d=>d.id!==id);event('Documento removido',id,null);window.render();},
  inheritCard(id){const prior=model.audits.flatMap(a=>Object.entries(a.cardSettings)).find(([key])=>key===id)?.[1];if(!prior)return;for(const [field,value] of Object.entries({name:prior.name,model:prior.model,type:prior.type,status:prior.status,cancelled:prior.cancelledDate,person:prior.person}))document.getElementById('card-'+field).value=value||'';},
  saveCard(){const id=state.selectedCard;active().cardSettings[id]={name:redact(document.getElementById('card-name').value.slice(0,80)),previousCardId:document.getElementById('card-previous').value||null,model:document.getElementById('card-model').value,type:document.getElementById('card-type').value,status:document.getElementById('card-status').value,cancelledDate:document.getElementById('card-cancelled').value,person:redact(document.getElementById('card-person').value.slice(0,100))};event('Configuração de cartão',id,'Atualizada');window.closeModal();window.render();},
  saveRepayment(){try{
    const amountMinor=money(document.getElementById('repay-value').value),c=cards().find(c=>c.id===this.repaymentCard);
    const due=sum(c.doc.entries.filter(e=>e.cardLast4===c.last&&e.kind!=='payment'&&e.kind!=='balance').map(e=>e.amountMinor));
    const received=sum(active().repayments.filter(r=>r.cardId===c.id).map(r=>r.amountMinor));
    if(amountMinor<=0||amountMinor>due-received)throw new Error();
    const rep={id:crypto.randomUUID(),cardId:c.id,amountMinor,date:new Date().toISOString()};active().repayments.push(rep);event('Repasse',rep.id,'Registrado');window.closeModal();window.render();
  }catch{window.toast('Informe um valor positivo, com duas casas decimais, até o saldo restante.');}},
  closeReport(){document.getElementById('audita-report-preview')?.remove();document.getElementById('audita-report-style')?.remove();reportFocus?.focus();reportFocus=null;},
  printReport(){
    if(!active())return;this.closeReport();
    reportFocus=document.activeElement;
    const parsed=new DOMParser().parseFromString(renderReport(active(),{verified:integrity(),overlapping:overlap(),matches:matches()}),'text/html');
    const view=document.createElement('section');view.id='audita-report-preview';view.setAttribute('aria-label','Prévia do relatório');view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');
    view.innerHTML='<button class="outline" style="width:auto" onclick="Audita.closeReport()">← Voltar ao Audita</button>'+parsed.body.innerHTML;
    const style=document.createElement('style');style.id='audita-report-style';style.textContent=`
    #audita-report-preview{position:fixed;inset:0;z-index:50;overflow:auto;background:white;color:#102341;padding:28px;font:12px/1.5 system-ui}
    #audita-report-preview h1{font-size:28px}#audita-report-preview h2{font-size:19px}#audita-report-preview h3{font-size:14px;margin-top:24px}
    #audita-report-preview .summary{background:#f4f7fc;border:1px solid #e8edf5;border-radius:12px;padding:18px}#audita-report-preview .total{font-size:25px;font-weight:800}
    #audita-report-preview table{width:100%;min-width:900px;border-collapse:collapse;table-layout:fixed}#audita-report-preview td,#audita-report-preview th{padding:7px;text-align:left;border-bottom:1px solid #e8edf5;overflow-wrap:anywhere}
    #audita-report-preview th{background:#f7f9fc}#audita-report-preview thead{display:table-header-group}#audita-report-preview tr{break-inside:avoid}
    #audita-report-preview button{padding:10px;border-radius:8px;border:1px solid #dce6f3;background:#102341;color:white;cursor:pointer}
    @page{size:A4 landscape;margin:14mm}@media print{body>.workspace,body>input,body>noscript{display:none!important}body{background:white!important}#audita-report-preview{position:static;padding:0;overflow:visible;font-size:10px}#audita-report-preview table{min-width:0}#audita-report-preview button{display:none}#audita-report-preview .summary,#audita-report-preview th{print-color-adjust:exact}}
    `;document.head.append(style);document.body.append(view);view.scrollTop=0;view.querySelector('button')?.focus();
  },
  async backup(){try{await saveQueue;if(key)envelope=await vault.seal(model,key,salt);if(!envelope)return window.toast('Crie ou desbloqueie um cofre primeiro.');download(JSON.stringify(envelope),'audita-backup-criptografado.json','application/json');}catch{window.toast('Não foi possível gerar o backup. Seus dados atuais foram preservados.');}},
  async restore(ev){try{
    const file=ev.target.files[0];if(!file||file.size>110*1024*1024)throw new Error();
    const encrypted=JSON.parse(await file.text());
    // Restore into an empty device only: never overwrite existing decisions silently.
    if(envelope)return window.toast('Exporte e exclua o cofre atual antes de restaurar outro backup.');
    const password=document.getElementById('vault-password')?.value;
    const opened=await vault.open(encrypted,password);
    const value=opened.value;
    if(!validateModel(value))throw new Error();
    model=value;key=opened.key;salt=opened.salt;locked=false;queue=[];await saveApp();window.go('home');window.toast('Backup restaurado neste dispositivo.');
  }catch{window.toast('Backup inválido ou incompatível. Seus dados atuais foram preservados.');}},
  async deleteLocal(){if(busy)return;try{await saveQueue;await storage.clear();this.closeReport();model={version:1,audits:[],activeId:null};queue=[];state.images={};key=null;salt=null;envelope=null;locked=true;window.closeModal();window.go('home');window.toast('Dados locais excluídos.');}catch{window.toast('Não foi possível excluir. Tente novamente.');}}
};
bridge.install({home,start,invoices,sms,processing,review,transaction,wallet,additional,report,modalContent,
  addFiles(ev){if(busy)return;for(const file of ev.target.files||[])queue.push({file,status:'Selecionado; aguardando leitura local'});window.render();},
  removeFile(index){if(busy)return;queue.splice(index,1);window.render();},
  markIssue(value){const e=entries().find(e=>e.id===selectedEntry);if(!e)return;e.recognition=value;active().recognitions||={};active().recognitions[e.id]=value;event('Reconhecimento',e.id,value);window.render();window.toast('Reconhecimento salvo; ocorrências mantêm decisão independente.');},
  downloadSummary(){if(!active())return;const a=active();download(['AUDITA — RELATÓRIO LOCAL',monthLabel(a.month),`Total declarado: ${totalDisplay()}`,`Integridade: ${integrity()?'totais conferidos':'pendente'}`,`Histórico de parcelas (SMS desativado): ${[...matches().values()].filter(m=>['matched','history'].includes(m.status)).length} correspondências confiáveis`,'',...entries().map(e=>`${e.date||'Data pendente'} | ${e.description} | ${format(e.amountMinor)} | Final ${e.cardLast4} | ${({unset:'Não informado',recognized:'Reconhecida',unknown:'Não reconhecida'})[e.recognition]}`)].join('\n'),`audita-${a.month}.txt`,'text/plain;charset=utf-8');},
  resetDemo(){window.open('reference/index.original.html','_blank','noopener');}
});
const baseRender=window.render;window.render=()=>{const hadFocus=document.activeElement!==document.body;baseRender();document.getElementById('screen').classList.toggle('vault-view',locked);if(hadFocus&&document.activeElement===document.body)document.getElementById('screen').focus({preventScroll:true});};
state.screen='home';state.modal='';state.toast='';state.selectedCard='';window.render();
const baseGo=window.go;
window.go=(screen)=>{if(screen==='sms')return window.toast('SMS estará disponível em uma etapa futura.');if(busy&&screen!=='processing')return window.toast('Aguarde a importação terminar.');if(locked&&screen!=='home')return window.toast('Desbloqueie o cofre local primeiro.');baseGo(screen);};
// Diálogos: foco inicial, retenção de Tab e retorno ao controle de origem.
let modalTrigger=null;
const baseModal=window.setModal,baseCloseModal=window.closeModal;
window.setModal=name=>{modalTrigger=document.activeElement;baseModal(name);const dialog=document.querySelector('.modal');if(dialog)dialog.setAttribute('aria-label',dialog.querySelector('h3')?.textContent||'Audita');document.querySelector('.modal button,.modal input,.modal select')?.focus();};
window.closeModal=()=>{baseCloseModal();if(modalTrigger?.isConnected)modalTrigger.focus();modalTrigger=null;};
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||!state.modal)return;
  const controls=[...document.querySelectorAll('.modal button,.modal input,.modal select,.modal textarea,.modal a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){window.Audita.closeReport();window.closeModal();}});
let idleTimer;
function armIdle(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!locked&&!busy)window.Audita.lock();else armIdle();},10*60*1000);}
for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,armIdle,{passive:true});
armIdle();
document.getElementById('card-image').addEventListener('change',event=>{
  const file=event.target.files?.[0];
  if(file&&(file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))){event.stopImmediatePropagation();window.toast('Use PNG, JPEG ou WebP até 5 MB, sem números completos ou verso do cartão.');}
},true);
