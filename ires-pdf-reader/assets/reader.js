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
 const prevMatch=el('button','','↑');prevMatch.type='button';prevMatch.title='Risultato precedente';prevMatch.setAttribute('aria-label','Risultato precedente');
 const nextMatch=el('button','','↓');nextMatch.type='button';nextMatch.title='Risultato successivo';nextMatch.setAttribute('aria-label','Risultato successivo');
 const searchInfo=el('span','ires-pdf-search-info');searchInfo.setAttribute('role','status');
 const share=el('button','','Condividi pagina');share.type='button';share.setAttribute('aria-label','Copia collegamento alla pagina corrente');
 toolbar.append(previous,current,total,next,minus,zoomLabel,plus,fit,share,search,find,prevMatch,nextMatch,searchInfo);
 const mode=el('button','','Scorrimento continuo');mode.type='button';mode.setAttribute('aria-pressed','false');
 const fullscreen=el('button','','Schermo intero');fullscreen.type='button';
 toolbar.prepend(mode,fullscreen);
 const sidebarToggle=el('button','','☰ Pagine');sidebarToggle.type='button';sidebarToggle.setAttribute('aria-expanded','false');sidebarToggle.setAttribute('aria-label','Mostra miniature e indice');
 toolbar.prepend(sidebarToggle);
 const navGroup=el('div','ires-pdf-tool-group ires-pdf-nav-group');
 const zoomGroup=el('div','ires-pdf-tool-group ires-pdf-zoom-group');
 const viewGroup=el('div','ires-pdf-tool-group ires-pdf-view-group');
 const searchGroup=el('div','ires-pdf-tool-group ires-pdf-search-group');
 const actionsGroup=el('div','ires-pdf-tool-group ires-pdf-actions-group');
 const bookmark=el('button','','☆ Segnalibro');bookmark.type='button';bookmark.title='Salva un segnalibro personale';
 const cite=el('button','','Citazione');cite.type='button';cite.title='Copia una citazione del documento';
 const annotate=el('button','','Evidenzia / Nota');annotate.type='button';annotate.title='Annota il testo selezionato';
 const passage=el('button','','Link passaggio');passage.type='button';passage.title='Copia un link alla pagina e al testo selezionato';
 navGroup.append(previous,current,total,next);
 zoomGroup.append(minus,zoomLabel,plus,fit);
 viewGroup.append(sidebarToggle,mode,fullscreen);
 searchGroup.append(search,find,prevMatch,nextMatch,searchInfo);
 actionsGroup.append(bookmark,annotate,passage,cite,share);
 toolbar.replaceChildren(viewGroup,navGroup,zoomGroup,searchGroup,actionsGroup);
 toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Strumenti lettore PDF');
 sidebarToggle.textContent='☰';sidebarToggle.title='Pannello pagine';sidebarToggle.setAttribute('aria-label','Apri o chiudi il pannello laterale');
 mode.textContent='Continuo';mode.title='Passa allo scorrimento continuo';
 fullscreen.textContent='⛶';fullscreen.title='Schermo intero';fullscreen.setAttribute('aria-label','Schermo intero');
 fit.textContent='Adatta';share.textContent='Condividi';share.title='Copia collegamento alla pagina';
 search.placeholder='Cerca nel PDF';find.textContent='Trova';

 const workspace=el('div','ires-pdf-workspace');
 const sidebar=el('aside','ires-pdf-sidebar');sidebar.setAttribute('aria-label','Navigazione documento');sidebar.hidden=true;
 const tabs=el('div','ires-pdf-side-tabs');
 const thumbsTab=el('button','','Miniature');thumbsTab.type='button';
 const outlineTab=el('button','','Indice');outlineTab.type='button';
 const thumbList=el('div','ires-pdf-thumb-list');const outlineList=el('div','ires-pdf-outline-list');outlineList.hidden=true;
 const resultsTab=el('button','','Risultati');resultsTab.type='button';
 const resultsList=el('div','ires-pdf-results-list');resultsList.hidden=true;
 const bookmarksTab=el('button','','Segnalibri');bookmarksTab.type='button';
 const bookmarksList=el('div','ires-pdf-bookmarks-list');bookmarksList.hidden=true;
 const notesTab=el('button','','Note');notesTab.type='button';
 const notesList=el('div','ires-pdf-notes-list');notesList.hidden=true;
 tabs.append(thumbsTab,outlineTab,resultsTab,bookmarksTab,notesTab);sidebar.append(tabs,thumbList,outlineList,resultsList,bookmarksList,notesList);
 const viewport=el('div','ires-pdf-pages');const singlePage=el('div','ires-pdf-single-page');const canvas=el('canvas');const singleText=el('div','ires-pdf-text-layer');singlePage.append(canvas,singleText);viewport.append(singlePage);
 workspace.append(sidebar,viewport);content.append(toolbar,workspace);
 sidebarToggle.onclick=()=>{sidebar.hidden=!sidebar.hidden;sidebarToggle.setAttribute('aria-expanded',String(!sidebar.hidden));if(!sidebar.hidden&&typeof loadThumbnails==='function'&&thumbCount===0)loadThumbnails();};
 thumbsTab.onclick=()=>{thumbList.hidden=false;outlineList.hidden=true;resultsList.hidden=true;bookmarksList.hidden=true;notesList.hidden=true;};
 outlineTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=false;resultsList.hidden=true;bookmarksList.hidden=true;};
 resultsTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=true;resultsList.hidden=false;bookmarksList.hidden=true;};
 bookmarksTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=true;resultsList.hidden=true;bookmarksList.hidden=false;notesList.hidden=true;};
 notesTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=true;resultsList.hidden=true;bookmarksList.hidden=true;notesList.hidden=false;};
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
  const hashParams=new URLSearchParams(location.hash.slice(1));
  const fromHash=Number(hashParams.get('page'));
  const linkedText=(hashParams.get('text')||'').slice(0,200);
  let page=fromHash>0?fromHash:remembered,scale=1.2,renderId=0,renderTask=null;
  let queue=Promise.resolve();
  let continuous=false, slots=[],scrollTimer=null,scrollBusy=false,scrollAgain=false,modeEpoch=0;
  const stack=el('div','ires-pdf-continuous');stack.hidden=true;viewport.append(stack);
  const dpr=()=>Math.min(window.devicePixelRatio||1,2);
  let searchTerm=linkedText;
  // A shared passage is one phrase, not a bag of words.
  function paintRange(layer,startNode,startOffset,endNode,endOffset){
   const range=document.createRange();
   range.setStart(startNode,startOffset);range.setEnd(endNode,endOffset);
   const bounds=layer.getBoundingClientRect();
   for(const rect of range.getClientRects()){
    if(!rect.width||!rect.height)continue;
    const mark=el('div','ires-pdf-match-overlay');
    mark.style.left=(rect.left-bounds.left)+'px';mark.style.top=(rect.top-bounds.top)+'px';
    mark.style.width=rect.width+'px';mark.style.height=rect.height+'px';
    layer.append(mark);
   }
  }
  function highlightText(layer){
   layer.querySelectorAll('.ires-pdf-match-overlay').forEach(node=>node.remove());
   if(!searchTerm&&!annotations.length)return;
   const holder=layer.closest('[data-page]');
   if(linkedText&&holder&&Number(holder.dataset.page)!==fromHash&&searchTerm)return;
   if(linkedText&&!holder&&page!==fromHash&&searchTerm)return;
   const nodes=[];
   layer.querySelectorAll('span').forEach(span=>{
    const walker=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())if(walker.currentNode.nodeValue)nodes.push(walker.currentNode);
   });
   if(!nodes.length)return;
   // Build a searchable text stream with a position map to the original PDF.js nodes.
   let combined='',positions=[];
   nodes.forEach((node,i)=>{
    if(i){combined+=' ';positions.push(null);}
    for(let j=0;j<node.nodeValue.length;j++){combined+=node.nodeValue[j];positions.push({node,offset:j});}
   });
   const normalized=combined.toLocaleLowerCase();
   const visiblePage=holder?Number(holder.dataset.page):page;
   for(const note of annotations.filter(x=>x.page===visiblePage)){
    const phrase=note.text.toLocaleLowerCase();const index=normalized.indexOf(phrase);
    if(index<0)continue;
    let start=index,end=index+phrase.length-1;
    while(start<end&&!positions[start])start++;
    while(end>start&&!positions[end])end--;
    if(positions[start]&&positions[end]){
     const before=layer.querySelectorAll('.ires-pdf-match-overlay').length;
     paintRange(layer,positions[start].node,positions[start].offset,positions[end].node,positions[end].offset+1);
     [...layer.querySelectorAll('.ires-pdf-match-overlay')].slice(before).forEach(mark=>{mark.classList.add('ires-pdf-note-highlight');mark.dataset.color=note.color;mark.title=note.note||note.text;});
    }
   }
   if(!searchTerm)return;
   if(linkedText){
    const words=linkedText.trim().split(/\\s+/).filter(Boolean);
    if(!words.length)return;
    const pattern=words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');
    let match;
    try{match=new RegExp(pattern,'iu').exec(normalized);}catch(_error){return;}
    if(!match)return;
    let start=match.index,end=start+match[0].length-1;
    while(start<end&&!positions[start])start++;
    while(end>start&&!positions[end])end--;
    if(positions[start]&&positions[end])paintRange(layer,positions[start].node,positions[start].offset,positions[end].node,positions[end].offset+1);
    return;
   }
   const term=searchTerm.toLocaleLowerCase();
   let index=0;
   while((index=normalized.indexOf(term,index))!==-1){
    let start=index,end=index+term.length-1;
    while(start<end&&!positions[start])start++;
    while(end>start&&!positions[end])end--;
    if(positions[start]&&positions[end])paintRange(layer,positions[start].node,positions[start].offset,positions[end].node,positions[end].offset+1);
    index+=Math.max(1,term.length);
   }
  }
  async function addTextLayer(pdfPage,holder,view,epoch){
   const layer=holder.querySelector('.ires-pdf-text-layer');
   if(!layer)return;
   layer.replaceChildren();layer.style.width=view.width+'px';layer.style.height=view.height+'px';
   const text=await pdfPage.getTextContent();
   if(token!==session||epoch!==modeEpoch||!layer.isConnected)return;
   layer.style.setProperty('--scale-factor',String(view.scale));
   const task=pdfjs.renderTextLayer({textContentSource:text,container:layer,viewport:view,textDivs:[]});
   await task.promise;
   if(token===session&&epoch===modeEpoch)highlightText(layer);
  }
  async function setupContinuous(){
   const epoch=++modeEpoch;
   const first=await doc.getPage(1);if(token!==session||epoch!==modeEpoch)return;
   const natural=first.getViewport({scale:1});
   // On narrow touch screens start with the entire page fitting horizontally.
   if(window.matchMedia('(max-width: 720px) and (pointer: coarse)').matches){
    const fitScale=Math.max(.35,(viewport.clientWidth-24)/natural.width);
    if(scale>fitScale)scale=fitScale;
   }
   zoomLabel.textContent=Math.round(scale/1.2*100)+'%';
   stack.replaceChildren();slots=[];
   const width=natural.width*scale,height=natural.height*scale;
   for(let n=1;n<=doc.numPages;n++){
    const slot=el('section','ires-pdf-page-slot');slot.dataset.page=String(n);
    slot.style.width=width+'px';slot.style.height=height+'px';
    slot.setAttribute('aria-label','Pagina '+n);
    const label=el('span','ires-pdf-page-number','Pagina '+n);
    slot.append(label);stack.append(slot);slots.push(slot);
   }
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
     else if(slot.querySelector('canvas')){slot.querySelector('canvas').remove();const text=slot.querySelector('.ires-pdf-text-layer');if(text)text.remove();}
    }
    page=nearest;current.value=String(page);bookmark.textContent=bookmarks.some(x=>x.page===page)?'★ Segnalibro':'☆ Segnalibro';
    try{localStorage.setItem(storageKey,String(page));}catch(_error){}
    for(const i of wanted){
     if(token!==session||epoch!==modeEpoch||!continuous)break;
     const slot=slots[i];if(slot.querySelector('canvas'))continue;
     const p=await doc.getPage(i+1);if(token!==session||epoch!==modeEpoch||!continuous)break;
     const vp=p.getViewport({scale:scale*dpr()});
     const c=el('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);
     c.style.width=(vp.width/dpr())+'px';c.style.height=(vp.height/dpr())+'px';
     slot.prepend(c);
     const layer=el('div','ires-pdf-text-layer');slot.append(layer);
     try{await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;}
     catch(error){c.remove();console.warn('IRES PDF Reader page render',error);}
     addTextLayer(p,slot,p.getViewport({scale}),epoch).catch(error=>console.warn('IRES PDF Reader text layer',error));
    }
   }finally{scrollBusy=false;if(scrollAgain){scrollAgain=false;refreshVisible();}}
  }
  viewport.addEventListener('scroll',()=>{if(!continuous)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(refreshVisible,100);},{passive:true});
  function navigate(){if(continuous){const slot=slots[page-1];if(slot)viewport.scrollTop=slot.offsetTop-stack.offsetTop;refreshVisible();}else schedule();}
  mode.onclick=()=>{
   continuous=!continuous;modeEpoch++;
   mode.setAttribute('aria-pressed',String(continuous));
   mode.textContent=continuous?'Singola':'Continuo';mode.title=continuous?'Passa alla pagina singola':'Passa allo scorrimento continuo';
   singlePage.hidden=continuous;stack.hidden=!continuous;
   viewport.classList.toggle('ires-pdf-touch-continuous',continuous);
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
  // Render thumbnails only when the user opens the sidebar.
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
   if(id===renderId&&token===session){singlePage.style.width=canvas.style.width;singlePage.style.height=canvas.style.height;addTextLayer(p,singlePage,p.getViewport({scale}),modeEpoch).catch(error=>console.warn('IRES PDF Reader text layer',error));}
   if(id===renderId){bookmark.textContent=bookmarks.some(x=>x.page===number)?'★ Segnalibro':'☆ Segnalibro';try{localStorage.setItem(storageKey,String(number));}catch(_error){} thumbList.querySelectorAll('.ires-pdf-thumb').forEach((b,i)=>{b.classList.toggle('is-current',i+1===number);});}
   renderTask=null;
  }
  function schedule(){queue=queue.catch(()=>{}).then(()=>{if(token===session)return paint();}).catch(fail);}
  previous.onclick=()=>{page=Math.max(1,page-1);navigate();};
  next.onclick=()=>{page=Math.min(doc.numPages,page+1);navigate();};
  current.onchange=()=>{page=Math.min(doc.numPages,Math.max(1,Number(current.value)||1));navigate();};
  minus.onclick=()=>{scale=Math.max(.6,scale-.2);zoomChanged();};
  plus.onclick=()=>{scale=Math.min(3,scale+.2);zoomChanged();};
  fit.onclick=()=>{const available=Math.max(240,viewport.clientWidth-32);doc.getPage(page).then(p=>{scale=Math.min(3,Math.max(.4,available/p.getViewport({scale:1}).width));zoomChanged();}).catch(fail);};
  const bookmarkKey='ires-pdf-bookmarks:v1:'+url;
  let bookmarks=[];
  try{const saved=JSON.parse(localStorage.getItem(bookmarkKey)||'[]');if(Array.isArray(saved))bookmarks=saved.filter(x=>Number.isInteger(x.page)&&x.page>=1&&x.page<=doc.numPages&&typeof x.label==='string').slice(0,100);}catch(_error){}
  function persistBookmarks(){try{localStorage.setItem(bookmarkKey,JSON.stringify(bookmarks));}catch(_error){window.alert('Non è possibile salvare i segnalibri in questo browser.');}}
  function showBookmarks(){
   bookmarksList.replaceChildren();
   if(!bookmarks.length)bookmarksList.append(el('p','ires-pdf-empty','Nessun segnalibro salvato in questo browser.'));
   bookmarks.slice().sort((a,b)=>a.page-b.page).forEach(item=>{
    const row=el('div','ires-pdf-bookmark-row');
    const jump=el('button','ires-pdf-bookmark-jump',item.label+' · p. '+item.page);
    jump.type='button';jump.onclick=()=>{page=item.page;navigate();};
    const remove=el('button','ires-pdf-bookmark-remove','×');remove.type='button';remove.setAttribute('aria-label','Elimina segnalibro '+item.label);
    remove.onclick=()=>{bookmarks=bookmarks.filter(x=>x!==item);persistBookmarks();showBookmarks();};
    row.append(jump,remove);bookmarksList.append(row);
   });
   bookmark.textContent=bookmarks.some(x=>x.page===page)?'★ Segnalibro':'☆ Segnalibro';
  }
  bookmark.onclick=()=>{
   const existing=bookmarks.find(x=>x.page===page);
   if(existing){bookmarks=bookmarks.filter(x=>x!==existing);}
   else{
    const label=window.prompt('Nome del segnalibro:', 'Pagina '+page);
    if(label===null)return;
    if(!label.trim())return;
    bookmarks.push({page,label:label.trim().slice(0,100)});
   }
   persistBookmarks();showBookmarks();
   sidebar.hidden=false;sidebarToggle.setAttribute('aria-expanded','true');bookmarksTab.click();
  };
  showBookmarks();
  async function copyValue(value,button){
   try{await navigator.clipboard.writeText(value);const label=button.textContent;button.textContent='Copiato ✓';setTimeout(()=>{if(button.isConnected)button.textContent=label;},1600);}
   catch(_error){window.prompt('Copia:',value);}
  }
  let cachedSelection='';
  function readSelection(){
   const selection=window.getSelection();
   if(!selection||selection.isCollapsed||!selection.anchorNode||!selection.focusNode)return '';
   if(!root.contains(selection.anchorNode)||!root.contains(selection.focusNode))return '';
   const anchor=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement;
   const focus=selection.focusNode.nodeType===1?selection.focusNode:selection.focusNode.parentElement;
   if(!anchor||!focus||!anchor.closest('.ires-pdf-text-layer')||!focus.closest('.ires-pdf-text-layer'))return '';
   return selection.toString().replace(/\\s+/g,' ').trim().slice(0,200);
  }
  function selectedPassage(){return readSelection()||cachedSelection;}
  // Mobile browsers often collapse the native selection when the toolbar receives focus.
  document.addEventListener('selectionchange',()=>{
   if(token!==session)return;
   const selected=readSelection();
   if(selected)cachedSelection=selected;
  });
  [passage,cite,annotate].forEach(button=>{
   button.addEventListener('pointerdown',()=>{const selected=readSelection();if(selected)cachedSelection=selected;},{passive:true});
   button.addEventListener('touchstart',()=>{const selected=readSelection();if(selected)cachedSelection=selected;},{passive:true});
  });
  function pageUrl(text){
   const link=new URL(config.dedicatedUrl||location.origin+'/');
   link.searchParams.set('ires_pdf_reader','1');
   link.searchParams.set('pdf',url);
   link.searchParams.set('title',title);
   link.searchParams.set('ires_pdf_auto','1');
   link.hash='page='+encodeURIComponent(page)+(text?'&text='+encodeURIComponent(text):'');
   return link.href;
  }
  passage.onclick=()=>{const text=selectedPassage();if(!text){window.alert('Seleziona prima un passaggio nel documento.');return;}copyValue(pageUrl(text),passage);};
  cite.onclick=()=>{
   const selected=selectedPassage();
   const quotation=selected?'“'+selected+'” ':'';
   const citation=quotation+title+' (s.d.), p. '+page+'. '+pageUrl(selected);
   copyValue(citation,cite);
  };
  if(linkedText){search.value=linkedText;searchInfo.textContent='Passaggio condiviso';}
  const annotationKey='ires-pdf-annotations:v1:'+url;
  let annotations=[];
  try{const stored=JSON.parse(localStorage.getItem(annotationKey)||'[]');if(Array.isArray(stored))annotations=stored.filter(x=>Number.isInteger(x.page)&&typeof x.text==='string'&&x.text.length<=200&&typeof x.note==='string'&&x.note.length<=2000&&['yellow','green','blue','pink'].includes(x.color)).slice(0,500);}catch(_error){}
  function saveAnnotations(){
   try{localStorage.setItem(annotationKey,JSON.stringify(annotations));}
   catch(_error){window.alert('Impossibile salvare le annotazioni. Esportale per non perderle.');}
  }
  function refreshAnnotations(){
   root.querySelectorAll('.ires-pdf-text-layer').forEach(highlightText);
   notesList.replaceChildren();
   const controls=el('div','ires-pdf-note-controls');
   const exportButton=el('button','','Esporta JSON');exportButton.type='button';
   exportButton.onclick=()=>{
    const blob=new Blob([JSON.stringify({format:'ires-pdf-notes-v1',url,annotations},null,2)],{type:'application/json'});
    const objectUrl=URL.createObjectURL(blob);const a=el('a');a.href=objectUrl;a.download='ires-pdf-annotazioni.json';a.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
   };
   const importButton=el('button','','Importa JSON');importButton.type='button';
   const fileInput=el('input');fileInput.type='file';fileInput.accept='.json,application/json';fileInput.hidden=true;
   importButton.onclick=()=>fileInput.click();
   fileInput.onchange=async()=>{
    const file=fileInput.files&&fileInput.files[0];if(!file)return;
    try{
     if(file.size>1024*1024)throw Error('File troppo grande');
     const data=JSON.parse(await file.text());
     if(data.format!=='ires-pdf-notes-v1'||data.url!==url||!Array.isArray(data.annotations))throw Error('File non compatibile con questo PDF');
     const valid=data.annotations.filter(x=>Number.isInteger(x.page)&&x.page>=1&&x.page<=doc.numPages&&typeof x.text==='string'&&x.text.length>0&&x.text.length<=200&&typeof x.note==='string'&&x.note.length<=2000&&['yellow','green','blue','pink'].includes(x.color)).slice(0,500);
     annotations=valid;saveAnnotations();refreshAnnotations();
    }catch(error){window.alert('Importazione non riuscita: '+error.message);}
   };
   controls.append(exportButton,importButton,fileInput);notesList.append(controls);
   if(!annotations.length)notesList.append(el('p','ires-pdf-empty','Nessuna annotazione.'));
   annotations.forEach((item,index)=>{
    const row=el('div','ires-pdf-note-row');
    const jump=el('button','ires-pdf-note-jump','Pagina '+item.page+' · '+item.text);jump.type='button';
    jump.onclick=()=>{page=item.page;navigate();};
    const body=el('p','',item.note||'Solo evidenziazione');
    const edit=el('button','','Modifica');edit.type='button';
    edit.onclick=()=>{const value=window.prompt('Nota personale:',item.note);if(value===null)return;item.note=value.slice(0,2000);saveAnnotations();refreshAnnotations();};
    const remove=el('button','','Elimina');remove.type='button';
    remove.onclick=()=>{if(!window.confirm('Eliminare questa annotazione?'))return;annotations.splice(index,1);saveAnnotations();refreshAnnotations();};
    row.dataset.color=item.color;row.append(jump,body,edit,remove);notesList.append(row);
   });
  }
  annotate.onclick=()=>{
   const selected=selectedPassage();
   if(!selected){window.alert('Seleziona un passaggio del PDF prima di annotarlo.');return;}
   const color=window.prompt('Colore: yellow, green, blue o pink','yellow');
   if(color===null)return;
   if(!['yellow','green','blue','pink'].includes(color.toLowerCase())){window.alert('Colore non valido.');return;}
   const note=window.prompt('Nota (facoltativa):','');if(note===null)return;
   if(annotations.length>=500){window.alert('Limite di 500 annotazioni raggiunto.');return;}
   annotations.push({page,text:selected,color:color.toLowerCase(),note:note.slice(0,2000)});
   saveAnnotations();refreshAnnotations();sidebar.hidden=false;sidebarToggle.setAttribute('aria-expanded','true');notesTab.click();
   cachedSelection='';
  };
  refreshAnnotations();
  let matches=[],matchIndex=-1,searchRun=0;
  function updateMatchUI(){
   const count=matches.length;
   searchInfo.textContent=count?(matchIndex+1)+' / '+count+' risultati':'Nessun risultato';
   prevMatch.disabled=nextMatch.disabled=!count;
   resultsList.querySelectorAll('.ires-pdf-result').forEach((node,i)=>node.classList.toggle('is-current',i===matchIndex));
  }
  function showMatch(index){
   if(!matches.length)return;
   matchIndex=(index+matches.length)%matches.length;
   page=matches[matchIndex].page;
   navigate();updateMatchUI();
   const selected=resultsList.querySelectorAll('.ires-pdf-result')[matchIndex];
   if(selected)selected.scrollIntoView({block:'nearest'});
  }
  async function searchDocument(){
   const query=search.value.trim();
   const run=++searchRun;
   matches=[];matchIndex=-1;resultsList.replaceChildren();
   searchTerm='';root.querySelectorAll('.ires-pdf-text-layer').forEach(highlightText);
   if(!query){searchInfo.textContent='';return;}
   find.disabled=true;prevMatch.disabled=true;nextMatch.disabled=true;
   searchInfo.textContent='Ricerca in corso…';
   const needle=query.toLocaleLowerCase();
   try{
    for(let n=1;n<=doc.numPages;n++){
     if(token!==session||run!==searchRun)return;
     const p=await doc.getPage(n),data=await p.getTextContent();
     if(token!==session||run!==searchRun)return;
     const full=data.items.map(item=>item.str||'').join(' ');
     const normalized=full.toLocaleLowerCase();
     let pos=0,index;
     while((index=normalized.indexOf(needle,pos))!==-1){
      const before=full.slice(Math.max(0,index-45),index).replace(/\\s+/g,' ');
      const hit=full.slice(index,index+query.length);
      const after=full.slice(index+query.length,index+query.length+55).replace(/\\s+/g,' ');
      matches.push({page:n,snippet:(before+hit+after).trim()});
      pos=index+Math.max(needle.length,1);
     }
    }
    if(token!==session||run!==searchRun)return;
    searchTerm=query;
    root.querySelectorAll('.ires-pdf-text-layer').forEach(highlightText);
    const fragment=document.createDocumentFragment();
    matches.forEach((match,i)=>{
     const item=el('button','ires-pdf-result');
     item.type='button';item.append(el('strong','','Pagina '+match.page),el('span','',match.snippet));
     item.onclick=()=>showMatch(i);fragment.append(item);
    });
    resultsList.append(fragment);
    if(matches.length){
     sidebar.hidden=false;sidebarToggle.setAttribute('aria-expanded','true');
     resultsTab.click();
     const initial=matches.findIndex(item=>item.page>=page);
     showMatch(initial>=0?initial:0);
    }else updateMatchUI();
   }catch(error){
    if(run===searchRun){searchInfo.textContent='Ricerca non disponibile';console.warn('IRES PDF Reader search',error);}
   }finally{if(run===searchRun)find.disabled=false;}
  }
  find.onclick=searchDocument;
  prevMatch.onclick=()=>showMatch(matchIndex-1);
  nextMatch.onclick=()=>showMatch(matchIndex+1);
  search.addEventListener('input',()=>{searchRun++;matches=[];matchIndex=-1;searchTerm='';root.querySelectorAll('.ires-pdf-text-layer').forEach(highlightText);resultsList.replaceChildren();searchInfo.textContent='';prevMatch.disabled=true;nextMatch.disabled=true;find.disabled=false;});
  search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(matches.length&&searchTerm===search.value.trim())showMatch(matchIndex+(e.shiftKey?-1:1));else searchDocument();}});
  share.onclick=()=>copyValue(pageUrl(''),share);
  viewport.setAttribute('tabindex','0');viewport.setAttribute('aria-label','Documento PDF: usa le frecce per cambiare pagina');
  viewport.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();next.click();}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();previous.click();}});
  await paint();
  if(linkedText){searchInfo.textContent='Passaggio evidenziato · pagina '+page;}
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
// Open links from older versions as well as explicit auto-open links.
function autoOpenSharedDocument(){
 if(document.body.classList.contains('ires-pdf-dedicated'))return;
 const hash=new URLSearchParams(location.hash.slice(1));
 const query=new URLSearchParams(location.search);
 const requested=query.get('ires_pdf_auto')==='1'||/^\d+$/.test(hash.get('page')||'');
 if(!requested)return;
 const buttons=[...document.querySelectorAll('.ires-pdf-open[data-pdf]')];
 const requestedPdf=query.get('pdf');
 const matching=requestedPdf?buttons.filter(b=>b.getAttribute('data-pdf')===requestedPdf):buttons;
 if(matching.length===1){
  const button=matching[0];
  open(button.getAttribute('data-pdf'),button.getAttribute('data-title')||'Documento PDF',button);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoOpenSharedDocument,{once:true});
else autoOpenSharedDocument();
if(document.body.classList.contains('ires-pdf-dedicated')){
 const root=document.querySelector('.ires-pdf-dedicated-root');
 if(root){const token=++session;render(root.dataset.pdf,root.dataset.title||'Documento PDF',root,token);}
}
})();
