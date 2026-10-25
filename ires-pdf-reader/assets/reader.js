(function(){
'use strict';
let active=null,lastFocus=null,session=0;
const config=window.iresPdfReader||{};
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function close(){session++;if(!active)return;active.remove();active=null;document.body.style.overflow='';document.removeEventListener('keydown',keys);if(lastFocus&&lastFocus.focus)lastFocus.focus();}
function keys(e){if(e.key==='Escape'){close();return;}if(e.key==='Tab'&&active){const controls=[...active.querySelectorAll('a,button,input')].filter(x=>!x.disabled);if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
async function render(url,title,root,token){
 const content=el('div','ires-pdf-viewer');root.append(content);
 const status=el('div','ires-pdf-status','Caricamento documento…');content.append(status);
 const toolbar=el('div','ires-pdf-controls');
 const previous=el('button','','‹');previous.type='button';previous.setAttribute('aria-label','Pagina precedente');
 const current=el('input');current.type='number';current.min='1';current.value='1';current.setAttribute('aria-label','Numero pagina');
 const total=el('span','','/ …');
 const next=el('button','','›');next.type='button';next.setAttribute('aria-label','Pagina successiva');
 const minus=el('button','','−');minus.type='button';minus.setAttribute('aria-label','Riduci zoom');
 const zoomLabel=el('span','','100%');
 const plus=el('button','','+');plus.type='button';plus.setAttribute('aria-label','Aumenta zoom');
 const fit=el('button','','Adatta');fit.type='button';fit.setAttribute('aria-label','Adatta alla larghezza');
 const share=el('button','','Condividi pagina');share.type='button';share.setAttribute('aria-label','Copia collegamento alla pagina corrente');
 toolbar.append(previous,current,total,next,minus,zoomLabel,plus,fit,share);
 const viewport=el('div','ires-pdf-pages');const canvas=el('canvas');viewport.append(canvas);
 content.append(toolbar,viewport);
 try{
  if(!config.pdfjsUrl||!config.workerUrl)throw Error('Libreria PDF.js non configurata');
  const pdfjs=window.pdfjsLib;
  if(!pdfjs)throw Error('PDF.js non caricato: verifica la risposta del file pdf.min.js');
  if(token!==session)return;
  pdfjs.GlobalWorkerOptions.workerSrc=config.workerUrl;
  const task=pdfjs.getDocument({url:url});
  const doc=await task.promise;if(token!==session){doc.destroy();return;}
  status.remove();total.textContent='/ '+doc.numPages;current.max=String(doc.numPages);
  const storageKey='ires-pdf-page:'+url;
  let remembered=1;try{remembered=Number(localStorage.getItem(storageKey))||1;}catch(_error){}
  const fromHash=Number(new URLSearchParams(location.hash.slice(1)).get('page'));
  let page=fromHash>0?fromHash:remembered,scale=1.2,renderId=0,renderTask=null;
  let queue=Promise.resolve();
  async function paint(){
   const id=++renderId;
   const number=Math.min(doc.numPages,Math.max(1,Number(page)||1));page=number;current.value=String(number);
   zoomLabel.textContent=Math.round(scale/1.2*100)+'%';
   const p=await doc.getPage(number);if(token!==session||id!==renderId)return;
   const vp=p.getViewport({scale:scale*window.devicePixelRatio});
   canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
   canvas.style.width=(vp.width/window.devicePixelRatio)+'px';canvas.style.height=(vp.height/window.devicePixelRatio)+'px';
   const context=canvas.getContext('2d');
   renderTask=p.render({canvasContext:context,viewport:vp});await renderTask.promise;
   if(id===renderId){try{localStorage.setItem(storageKey,String(number));}catch(_error){}}
   renderTask=null;
  }
  function schedule(){queue=queue.catch(()=>{}).then(()=>{if(token===session)return paint();}).catch(fail);}
  previous.onclick=()=>{page=Math.max(1,page-1);schedule();};
  next.onclick=()=>{page=Math.min(doc.numPages,page+1);schedule();};
  current.onchange=()=>{page=Math.min(doc.numPages,Math.max(1,Number(current.value)||1));schedule();};
  minus.onclick=()=>{scale=Math.max(.6,scale-.2);schedule();};
  plus.onclick=()=>{scale=Math.min(3,scale+.2);schedule();};
  fit.onclick=()=>{const available=Math.max(240,viewport.clientWidth-32);doc.getPage(page).then(p=>{scale=Math.min(3,Math.max(.4,available/p.getViewport({scale:1}).width));schedule();}).catch(fail);};
  share.onclick=async()=>{const link=new URL(location.href);link.hash='page='+page;try{await navigator.clipboard.writeText(link.href);share.textContent='Link copiato';setTimeout(()=>{share.textContent='Condividi pagina';},1800);}catch(_error){window.prompt('Copia il collegamento:',link.href);}};
  viewport.setAttribute('tabindex','0');viewport.setAttribute('aria-label','Documento PDF: usa le frecce per cambiare pagina');
  viewport.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();next.click();}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();previous.click();}});
  await paint();
 }catch(error){if(token!==session)return;fail(error);}
 function fail(error){
  if(token!==session)return;
  if(!status.isConnected)content.prepend(status);
  status.textContent='Visualizzatore avanzato non disponibile. Apertura con il lettore del browser.';
  status.style.display='block';toolbar.remove();viewport.remove();
  const iframe=el('iframe','ires-pdf-fallback');iframe.title=title;iframe.src=url;content.append(iframe);
  if(window.console)console.warn('IRES PDF Reader',error);
 }
}
function open(url,title,button){
 close();const token=++session;lastFocus=button||document.activeElement;
 const overlay=el('div','ires-pdf-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title);
 const bar=el('div','ires-pdf-toolbar');const heading=el('strong','',title);
 const download=el('a','','Scarica PDF');download.href=url;download.setAttribute('download','');
 const exit=el('button','ires-pdf-close','Chiudi');exit.type='button';exit.onclick=close;
 bar.append(heading,download,exit);overlay.append(bar);document.body.append(overlay);
 active=overlay;document.body.style.overflow='hidden';document.addEventListener('keydown',keys);exit.focus();
 render(url,title,overlay,token);
}
document.addEventListener('click',e=>{const button=e.target.closest('.ires-pdf-open');if(!button)return;const url=button.getAttribute('data-pdf');if(!url)return;e.preventDefault();open(url,button.getAttribute('data-title')||'Documento PDF',button);});
if(document.body.classList.contains('ires-pdf-dedicated')){
 const root=document.querySelector('.ires-pdf-dedicated-root');
 if(root){const token=++session;render(root.dataset.pdf,root.dataset.title||'Documento PDF',root,token);}
}
})();
