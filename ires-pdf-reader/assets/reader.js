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
 toolbar.append(previous,current,total,next,minus,zoomLabel,plus);
 const viewport=el('div','ires-pdf-pages');const canvas=el('canvas');viewport.append(canvas);
 content.append(toolbar,viewport);
 try{
  if(!config.pdfjsUrl||!config.workerUrl)throw Error('Libreria PDF.js non configurata');
  const pdfjs=await import(config.pdfjsUrl);
  if(token!==session)return;
  pdfjs.GlobalWorkerOptions.workerSrc=config.workerUrl;
  const task=pdfjs.getDocument({url:url});
  const doc=await task.promise;if(token!==session){doc.destroy();return;}
  status.remove();total.textContent='/ '+doc.numPages;current.max=String(doc.numPages);
  let page=1,scale=1.2,renderId=0;
  async function paint(){
   const id=++renderId;
   const number=Math.min(doc.numPages,Math.max(1,Number(page)||1));page=number;current.value=String(number);
   zoomLabel.textContent=Math.round(scale/1.2*100)+'%';
   const p=await doc.getPage(number);if(token!==session||id!==renderId)return;
   const vp=p.getViewport({scale:scale*window.devicePixelRatio});
   canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
   canvas.style.width=(vp.width/window.devicePixelRatio)+'px';canvas.style.height=(vp.height/window.devicePixelRatio)+'px';
   const context=canvas.getContext('2d');await p.render({canvasContext:context,viewport:vp}).promise;
  }
  previous.onclick=()=>{page--;paint().catch(fail);};
  next.onclick=()=>{page++;paint().catch(fail);};
  current.onchange=()=>{page=Number(current.value);paint().catch(fail);};
  minus.onclick=()=>{scale=Math.max(.6,scale-.2);paint().catch(fail);};
  plus.onclick=()=>{scale=Math.min(3,scale+.2);paint().catch(fail);};
  await paint();
 }catch(error){if(token!==session)return;fail(error);}
 function fail(error){
  if(token!==session)return;
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
