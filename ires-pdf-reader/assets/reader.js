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
 const search=el('input','ires-pdf-search');search.type='search';search.placeholder='Cerca nel documento';search.setAttribute('aria-label','Cerca testo nel PDF');
 const find=el('button','','Cerca');find.type='button';find.setAttribute('aria-label','Cerca nel documento');
 const searchInfo=el('span','ires-pdf-search-info');searchInfo.setAttribute('role','status');
 const share=el('button','','Condividi pagina');share.type='button';share.setAttribute('aria-label','Copia collegamento alla pagina corrente');
 toolbar.append(previous,current,total,next,minus,zoomLabel,plus,fit,share,search,find,searchInfo);
 const mode=el('button','','Scorrimento continuo');mode.type='button';mode.setAttribute('aria-pressed','false');
 const fullscreen=el('button','','Schermo intero');fullscreen.type='button';
 toolbar.prepend(mode,fullscreen);
 const sidebarToggle=el('button','','☰ Pagine');sidebarToggle.type='button';sidebarToggle.setAttribute('aria-expanded','false');sidebarToggle.setAttribute('aria-label','Mostra miniature e indice');
 toolbar.prepend(sidebarToggle);
 const workspace=el('div','ires-pdf-workspace');
 const sidebar=el('aside','ires-pdf-sidebar');sidebar.setAttribute('aria-label','Navigazione documento');sidebar.hidden=true;
 const tabs=el('div','ires-pdf-side-tabs');
 const thumbsTab=el('button','','Miniature');thumbsTab.type='button';
 const outlineTab=el('button','','Indice');outlineTab.type='button';
 const thumbList=el('div','ires-pdf-thumb-list');const outlineList=el('div','ires-pdf-outline-list');outlineList.hidden=true;
 tabs.append(thumbsTab,outlineTab);sidebar.append(tabs,thumbList,outlineList);
 const viewport=el('div','ires-pdf-pages');const canvas=el('canvas');viewport.append(canvas);
 workspace.append(sidebar,viewport);content.append(toolbar,workspace);
 sidebarToggle.onclick=()=>{sidebar.hidden=!sidebar.hidden;sidebarToggle.setAttribute('aria-expanded',String(!sidebar.hidden));};
 thumbsTab.onclick=()=>{thumbList.hidden=false;outlineList.hidden=true;};
 outlineTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=false;};
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
  let continuous=false, slots=[],scrollTimer=null,scrollBusy=false,scrollAgain=false,modeEpoch=0;
  const stack=el('div','ires-pdf-continuous');stack.hidden=true;viewport.append(stack);
  const dpr=()=>Math.min(window.devicePixelRatio||1,2);
  async function setupContinuous(){
   const epoch=++modeEpoch;
   const first=await doc.getPage(1);if(token!==session||epoch!==modeEpoch)return;
   const natural=first.getViewport({scale:1});
   stack.replaceChildren();slots=[];
   const width=natural.width*scale,height=natural.height*scale;
   for(let n=1;n<=doc.numPages;n++){
    const slot=el('section','ires-pdf-page-slot');slot.dataset.page=String(n);
    slot.style.width=width+'px';slot.style.height=height+'px';
    slot.setAttribute('aria-label','Pagina '+n);
    const label=el('span','ires-pdf-page-number','Pagina '+n);
    slot.append(label);stack.append(slot);slots.push(slot);
   }
   viewport.scrollTop=0;
   const selected=slots[Math.min(doc.numPages,Math.max(1,page))-1];
   if(selected)viewport.scrollTop=selected.offsetTop-stack.offsetTop;
   refreshVisible();
  }
  async function refreshVisible(){
   if(!continuous||token!==session)return;
   if(scrollBusy){scrollAgain=true;return;}
   scrollBusy=true;
   try{
    const epoch=modeEpoch;
    const top=viewport.scrollTop,bottom=top+viewport.clientHeight;
    const center=top+viewport.clientHeight/2;
    let nearest=page,dist=Infinity;
    const wanted=[];
    for(let i=0;i<slots.length;i++){
     const slot=slots[i],y=slot.offsetTop-stack.offsetTop,h=slot.offsetHeight;
     const delta=Math.abs(y+h/2-center);
     if(delta<dist){dist=delta;nearest=i+1;}
     if(y<bottom+viewport.clientHeight&&y+h>top-viewport.clientHeight)wanted.push(i);
     else if(slot.querySelector('canvas'))slot.querySelector('canvas').remove();
    }
    page=nearest;current.value=String(page);
    try{localStorage.setItem(storageKey,String(page));}catch(_error){}
    for(const i of wanted){
     if(token!==session||epoch!==modeEpoch||!continuous)break;
     const slot=slots[i];if(slot.querySelector('canvas'))continue;
     const p=await doc.getPage(i+1);if(token!==session||epoch!==modeEpoch||!continuous)break;
     const vp=p.getViewport({scale:scale*dpr()});
     const c=el('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);
     c.style.width=(vp.width/dpr())+'px';c.style.height=(vp.height/dpr())+'px';
     slot.prepend(c);
     try{await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;}
     catch(error){c.remove();console.warn('IRES PDF Reader page render',error);}
    }
   }finally{scrollBusy=false;if(scrollAgain){scrollAgain=false;refreshVisible();}}
  }
  viewport.addEventListener('scroll',()=>{if(!continuous)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(refreshVisible,100);},{passive:true});
  function navigate(){if(continuous){const slot=slots[page-1];if(slot)viewport.scrollTop=slot.offsetTop-stack.offsetTop;refreshVisible();}else schedule();}
  mode.onclick=()=>{
   continuous=!continuous;modeEpoch++;
   mode.setAttribute('aria-pressed',String(continuous));
   mode.textContent=continuous?'Pagina singola':'Scorrimento continuo';
   canvas.hidden=continuous;stack.hidden=!continuous;
   if(continuous)setupContinuous().catch(fail);else{stack.replaceChildren();slots=[];schedule();}
  };
  fullscreen.onclick=async()=>{
   try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}
   catch(error){console.warn('IRES PDF Reader fullscreen',error);}
  };
  function zoomChanged(){if(continuous)setupContinuous().catch(fail);else schedule();}

  let thumbCount=0,thumbBusy=false;
  const moreThumbs=el('button','ires-pdf-more-thumbs','Carica altre pagine');moreThumbs.type='button';
  async function loadThumbnails(){
   if(thumbBusy||token!==session)return;
   thumbBusy=true;moreThumbs.disabled=true;
   const until=Math.min(doc.numPages,thumbCount+16);
   for(let n=thumbCount+1;n<=until;n++){
    if(token!==session)break;
    const button=el('button','ires-pdf-thumb');button.type='button';button.setAttribute('aria-label','Vai a pagina '+n);
    const thumbCanvas=el('canvas');const label=el('span','',String(n));button.append(thumbCanvas,label);thumbList.insertBefore(button,moreThumbs);
    button.onclick=()=>{page=n;navigate();if(window.matchMedia('(max-width: 720px)').matches){sidebar.hidden=true;sidebarToggle.setAttribute('aria-expanded','false');}};
    try{
     const p=await doc.getPage(n);if(token!==session)break;
     const vp=p.getViewport({scale:.18});thumbCanvas.width=Math.ceil(vp.width);thumbCanvas.height=Math.ceil(vp.height);
     await p.render({canvasContext:thumbCanvas.getContext('2d'),viewport:vp}).promise;
    }catch(error){console.warn('IRES PDF Reader thumbnail',error);}
    thumbCount=n;
   }
   moreThumbs.hidden=thumbCount>=doc.numPages;moreThumbs.disabled=false;thumbBusy=false;
  }
  thumbList.append(moreThumbs);moreThumbs.onclick=loadThumbnails;
  loadThumbnails();
  function appendOutline(items,parent,depth){
   items.forEach(item=>{
    const button=el('button','ires-pdf-outline-item',item.title||'Sezione');button.type='button';
    button.style.paddingLeft=(12+Math.min(depth,5)*14)+'px';parent.append(button);
    button.onclick=async()=>{try{const dest=typeof item.dest==='string'?await doc.getDestination(item.dest):item.dest;if(!dest)return;const ref=dest[0];const index=await doc.getPageIndex(ref);page=index+1;navigate();}catch(error){console.warn('IRES PDF Reader outline',error);}};
    if(item.items&&item.items.length)appendOutline(item.items,parent,depth+1);
   });
  }
  doc.getOutline().then(items=>{if(token!==session)return;if(items&&items.length)appendOutline(items,outlineList,0);else outlineList.append(el('p','ires-pdf-empty','Questo PDF non contiene un indice navigabile.'));}).catch(()=>{outlineList.append(el('p','ires-pdf-empty','Indice non disponibile.'));});
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
   if(id===renderId){try{localStorage.setItem(storageKey,String(number));}catch(_error){} thumbList.querySelectorAll('.ires-pdf-thumb').forEach((b,i)=>{b.classList.toggle('is-current',i+1===number);});}
   renderTask=null;
  }
  function schedule(){queue=queue.catch(()=>{}).then(()=>{if(token===session)return paint();}).catch(fail);}
  previous.onclick=()=>{page=Math.max(1,page-1);navigate();};
  next.onclick=()=>{page=Math.min(doc.numPages,page+1);navigate();};
  current.onchange=()=>{page=Math.min(doc.numPages,Math.max(1,Number(current.value)||1));navigate();};
  minus.onclick=()=>{scale=Math.max(.6,scale-.2);zoomChanged();};
  plus.onclick=()=>{scale=Math.min(3,scale+.2);zoomChanged();};
  fit.onclick=()=>{const available=Math.max(240,viewport.clientWidth-32);doc.getPage(page).then(p=>{scale=Math.min(3,Math.max(.4,available/p.getViewport({scale:1}).width));zoomChanged();}).catch(fail);};
  let searching=false;
  async function searchDocument(){
   const query=search.value.trim().toLocaleLowerCase();if(!query||searching)return;
   searching=true;find.disabled=true;searchInfo.textContent='Ricerca in corso…';
   try{
    for(let step=1;step<=doc.numPages;step++){
     if(token!==session)return;
     const n=((page-1+step)%doc.numPages)+1;
     const pdfPage=await doc.getPage(n);
     const textContent=await pdfPage.getTextContent();
     const text=textContent.items.map(item=>item.str||'').join(' ').toLocaleLowerCase();
     if(text.includes(query)){
      page=n;navigate();searchInfo.textContent='Trovato a pagina '+n;return;
     }
    }
    searchInfo.textContent='Nessuna corrispondenza';
   }catch(error){searchInfo.textContent='Ricerca non disponibile';console.warn('IRES PDF Reader search',error);}
   finally{searching=false;find.disabled=false;}
  }
  find.onclick=searchDocument;
  search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchDocument();}});
  share.onclick=async()=>{const link=new URL(location.href);link.hash='page='+page;try{await navigator.clipboard.writeText(link.href);share.textContent='Link copiato';setTimeout(()=>{share.textContent='Condividi pagina';},1800);}catch(_error){window.prompt('Copia il collegamento:',link.href);}};
  viewport.setAttribute('tabindex','0');viewport.setAttribute('aria-label','Documento PDF: usa le frecce per cambiare pagina');
  viewport.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();next.click();}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();previous.click();}});
  await paint();
 }catch(error){if(token!==session)return;fail(error);}
 function fail(error){
  if(token!==session)return;
  if(!status.isConnected)content.prepend(status);
  status.textContent='Visualizzatore avanzato non disponibile. Apertura con il lettore del browser.';
  status.style.display='block';toolbar.remove();workspace.remove();
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
