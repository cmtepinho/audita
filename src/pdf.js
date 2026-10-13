import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.mjs', import.meta.url).href;

export async function extractPdf(file, progress = () => {}) {
  if (file.size > 25 * 1024 * 1024) throw new Error('O limite por PDF é 25 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-')) throw new Error('Arquivo sem assinatura PDF válida.');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
  let pdf;
  const timer=setTimeout(()=>task.destroy(),60000);
  try {
    pdf=await task.promise;
    if(pdf.numPages>100) throw new Error('O limite por PDF é 100 páginas.');
    const pages=[];
    for(let n=1;n<=pdf.numPages;n++) {
      const page=await pdf.getPage(n),viewport=page.getViewport({scale:1});
      const text=await page.getTextContent();
      if(text.items.length>20000||pages.reduce((n,p)=>n+p.tokens.length,0)+text.items.length>100000)throw new Error('Documento excede o limite de elementos de texto.');
      pages.push({page:n,width:viewport.width,height:viewport.height,tokens:text.items.filter(i=>i.str!==undefined).map(i=>({
        text:i.str,x:i.transform[4],y:viewport.height-i.transform[5]-Math.abs(i.transform[3]),width:i.width,height:i.height
      }))});
      progress(n,pdf.numPages);
      page.cleanup();
    }
    return {hash,pages};
  } catch(error) {
    if(error?.name==='PasswordException') throw new Error('PDF protegido por senha. Exporte uma cópia desbloqueada localmente.');
    throw new Error('Não foi possível ler o PDF. Verifique o arquivo, o limite de páginas e se há texto selecionável.');
  } finally {clearTimeout(timer);await task.destroy();}
}
