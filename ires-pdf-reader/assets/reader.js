(function(){
'use strict';
let active=null,lastFocus=null,session=0;
let stopSpeech=()=>{};
const config=window.iresPdfReader||{};
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function close(){stopSpeech();session++;if(!active)return;active.remove();active=null;document.body.style.overflow='';document.removeEventListener('keydown',keys);if(lastFocus&&lastFocus.focus)lastFocus.focus();}
function keys(e){if(e.key==='Escape'){close();return;}if(e.key==='Tab'&&active){const controls=[...active.querySelectorAll('a,button,input')].filter(x=>!x.disabled);if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
async function render(url,title,root,token,citation=''){
 const browserLang=(navigator.languages&&navigator.languages[0]||navigator.language||'it').toLowerCase().split('-')[0];
 const supported=['it','en','fr','de','es','pt'];
 const uiLang=supported.includes(browserLang)?browserLang:(browserLang==='it'?'it':'en');
 const labels={
  it:['Traduci','Originale','Traduzione in corso','Attiva la traduzione del documento','Attiva','Non ora','Pagina','Strumenti','Cerca','Adatta','Singola','Continuo','Traduzione','Miniature','Indice','Risultati','Segnalibri','Note','Ascolta','Pausa','Citazione','Condividi','Chiudi','Mostra sul PDF','Mostra originale','Pagina precedente','Pagina successiva','Traduzione non disponibile'],
  en:['Translate','Original','Translating','Translate this document into English?','Translate','Not now','Page','Tools','Search','Fit','Single','Continuous','Translation','Thumbnails','Contents','Results','Bookmarks','Notes','Listen','Pause','Citation','Share','Close','Show on PDF','Show original','Previous page','Next page','Translation unavailable'],
  fr:['Traduire','Original','Traduction en cours','Traduire ce document en français ?','Traduire','Plus tard','Page','Outils','Rechercher','Ajuster','Page unique','Continu','Traduction','Miniatures','Sommaire','Résultats','Favoris','Notes','Écouter','Pause','Citation','Partager','Fermer','Afficher sur le PDF','Afficher l’original','Page précédente','Page suivante','Traduction indisponible'],
  de:['Übersetzen','Original','Übersetzung läuft','Dieses Dokument ins Deutsche übersetzen?','Übersetzen','Später','Seite','Werkzeuge','Suchen','Anpassen','Einzelseite','Fortlaufend','Übersetzung','Vorschau','Inhalt','Ergebnisse','Lesezeichen','Notizen','Vorlesen','Pause','Zitat','Teilen','Schließen','Im PDF anzeigen','Original anzeigen','Vorherige Seite','Nächste Seite','Übersetzung nicht verfügbar'],
  es:['Traducir','Original','Traduciendo','¿Traducir este documento al español?','Traducir','Ahora no','Página','Herramientas','Buscar','Ajustar','Una página','Continuo','Traducción','Miniaturas','Índice','Resultados','Marcadores','Notas','Escuchar','Pausa','Cita','Compartir','Cerrar','Mostrar en PDF','Mostrar original','Página anterior','Página siguiente','Traducción no disponible'],
  pt:['Traduzir','Original','A traduzir','Traduzir este documento para português?','Traduzir','Agora não','Página','Ferramentas','Pesquisar','Ajustar','Página única','Contínuo','Tradução','Miniaturas','Índice','Resultados','Marcadores','Notas','Ouvir','Pausa','Citação','Partilhar','Fechar','Mostrar no PDF','Mostrar original','Página anterior','Página seguinte','Tradução indisponível']
 };
 const t=(index)=>labels[uiLang][index];
 const content=el('div','ires-pdf-viewer');root.append(content);
 root.setAttribute('lang',uiLang);
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
 const speech=el('button','','Ascolta');speech.type='button';speech.title='Leggi ad alta voce il testo selezionato o dalla pagina corrente';
 const speechPause=el('button','','Pausa');speechPause.type='button';speechPause.title='Metti in pausa o riprendi';
 const speechStop=el('button','','Stop voce');speechStop.type='button';
 const speechRate=el('select','ires-pdf-speech-rate');speechRate.setAttribute('aria-label','Velocità lettura');
 [['0.75','0,75×'],['1','1×'],['1.25','1,25×'],['1.5','1,5×'],['2','2×']].forEach(([value,label])=>{const option=el('option','',label);option.value=value;speechRate.append(option);});speechRate.value='1';
 const translate=el('button','ires-pdf-translate-action','Traduci');translate.type='button';translate.title='Traduci la selezione o la pagina corrente';
 const passage=el('button','','Link passaggio');passage.type='button';passage.title='Copia un link alla pagina e al testo selezionato';
 navGroup.append(previous,current,total,next);
 zoomGroup.append(minus,zoomLabel,plus,fit);
 viewGroup.append(sidebarToggle,mode,fullscreen);
 searchGroup.append(search,find,prevMatch,nextMatch,searchInfo);
 actionsGroup.append(bookmark,annotate,passage,cite,share,translate,speech,speechPause,speechStop,speechRate);
 const toolsToggle=el('button','ires-pdf-tools-toggle','Strumenti');toolsToggle.type='button';toolsToggle.setAttribute('aria-expanded','false');toolsToggle.setAttribute('aria-controls','ires-pdf-extra-tools');
 const extraTools=el('div','ires-pdf-extra-tools');extraTools.id='ires-pdf-extra-tools';extraTools.append(searchGroup,actionsGroup);
 toolsToggle.onclick=()=>{
  const expanded=toolsToggle.getAttribute('aria-expanded')!=='true';
  toolsToggle.setAttribute('aria-expanded',String(expanded));
  extraTools.classList.toggle('is-open',expanded);
 };
 toolbar.replaceChildren(viewGroup,navGroup,zoomGroup,toolsToggle);
 toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Strumenti lettore PDF');
 sidebarToggle.textContent='☰';sidebarToggle.title='Pannello pagine';sidebarToggle.setAttribute('aria-label','Apri o chiudi il pannello laterale');
 mode.textContent='Continuo';mode.title='Passa allo scorrimento continuo';
 fullscreen.textContent='⛶';fullscreen.title='Schermo intero';fullscreen.setAttribute('aria-label','Schermo intero');
 fit.textContent='Adatta';share.textContent='Condividi';share.title='Copia collegamento alla pagina';
 search.placeholder='Cerca nel PDF';find.textContent='Trova';

 // Offer document translation to non-Italian visitors, without auto-sending PDF text.
 const translationOffer=el('div','ires-pdf-translation-offer');
 const offerText=el('span','',t(3));
 const offerAccept=el('button','',t(4));offerAccept.type='button';
 const offerDismiss=el('button','',t(5));offerDismiss.type='button';
 translationOffer.append(offerText,offerAccept,offerDismiss);
 translationOffer.hidden=browserLang==='it'||!supported.includes(browserLang);
 const workspace=el('div','ires-pdf-workspace');
 const sidebarBackdrop=el('button','ires-pdf-sidebar-backdrop');sidebarBackdrop.type='button';sidebarBackdrop.setAttribute('aria-label','Chiudi pannello laterale');sidebarBackdrop.hidden=true;
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
 const translationTab=el('button','','Traduzione');translationTab.type='button';
 const translationPanel=el('div','ires-pdf-translation-panel');translationPanel.hidden=true;
 const language=el('select','ires-pdf-translation-language');language.setAttribute('aria-label','Lingua della traduzione');
 [['it','Italiano'],['en','English'],['fr','Français'],['de','Deutsch'],['es','Español'],['pt','Português']].forEach(([code,name])=>{const option=el('option','',name);option.value=code;language.append(option);});language.value='en';
 const translationStatus=el('p','ires-pdf-translation-status','Seleziona un passaggio nel PDF, oppure traduci la pagina corrente.');translationStatus.setAttribute('role','status');
 const translationSource=el('div','ires-pdf-translation-source');const translationResult=el('div','ires-pdf-translation-result');
 const translateAgain=el('button','','Traduci');translateAgain.type='button';
 const overlayToggle=el('button','','Mostra sul PDF');overlayToggle.type='button';overlayToggle.setAttribute('aria-pressed','false');
 const translationSpeak=el('button','','Ascolta traduzione');translationSpeak.type='button';
 const translationClose=el('button','','Chiudi');translationClose.type='button';
 translationPanel.append(language,translateAgain,overlayToggle,translationSpeak,translationClose,translationStatus,translationSource,translationResult);
 tabs.append(thumbsTab,outlineTab,resultsTab,bookmarksTab,notesTab,translationTab);sidebar.append(tabs,thumbList,outlineList,resultsList,bookmarksList,notesList,translationPanel);
 const viewport=el('div','ires-pdf-pages');const singlePage=el('div','ires-pdf-single-page');const canvas=el('canvas');const singleText=el('div','ires-pdf-text-layer');singlePage.append(canvas,singleText);viewport.append(singlePage);
 workspace.append(sidebarBackdrop,sidebar,viewport);
 const controlsShell=el('div','ires-pdf-controls-shell');
 controlsShell.append(toolbar,extraTools);
 content.append(translationOffer,controlsShell,workspace);
 const localizedControls=[
  [toolsToggle,7],[fit,9],[find,8],[thumbsTab,13],[outlineTab,14],
  [resultsTab,15],[bookmarksTab,16],[notesTab,17],[translationTab,12],
  [speech,18],[speechPause,19],[cite,20],[share,21],[translationClose,22],
  [prevMatch,25],[nextMatch,26]
 ];
 localizedControls.forEach(([node,index])=>{if(node===prevMatch||node===nextMatch){node.title=t(index);node.setAttribute('aria-label',t(index));}else node.textContent=t(index);});
 search.placeholder=t(8);translate.textContent=t(0);
 language.value=browserLang==='it'?'en':(supported.includes(browserLang)?browserLang:'en');
 offerAccept.onclick=()=>{translationOffer.hidden=true;setTranslationMode(true);};
 offerDismiss.onclick=()=>{translationOffer.hidden=true;};
 const isNarrow=()=>window.matchMedia('(max-width:720px)').matches;
 function setSidebar(open){
  sidebar.hidden=!open;sidebarBackdrop.hidden=!open||!isNarrow();
  workspace.classList.toggle('ires-pdf-sidebar-open',open);
  sidebarToggle.setAttribute('aria-expanded',String(open));
 }
 sidebarBackdrop.onclick=()=>setSidebar(false);
 window.addEventListener('resize',()=>{sidebarBackdrop.hidden=sidebar.hidden||!isNarrow();},{passive:true});
 sidebarToggle.onclick=()=>{setSidebar(sidebar.hidden);if(!sidebar.hidden&&typeof loadThumbnails==='function'&&thumbCount===0)loadThumbnails();};
 thumbsTab.onclick=()=>{thumbList.hidden=false;outlineList.hidden=true;resultsList.hidden=true;bookmarksList.hidden=true;notesList.hidden=true;translationPanel.hidden=true;};
 outlineTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=false;resultsList.hidden=true;bookmarksList.hidden=true;translationPanel.hidden=true;};
 resultsTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=true;resultsList.hidden=false;bookmarksList.hidden=true;translationPanel.hidden=true;};
 bookmarksTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=true;resultsList.hidden=true;bookmarksList.hidden=false;notesList.hidden=true;translationPanel.hidden=true;};
 notesTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=true;resultsList.hidden=true;bookmarksList.hidden=true;notesList.hidden=false;translationPanel.hidden=true;};
 translationTab.onclick=()=>{thumbList.hidden=true;outlineList.hidden=true;resultsList.hidden=true;bookmarksList.hidden=true;notesList.hidden=true;translationPanel.hidden=false;setSidebar(true);};
 translationClose.onclick=()=>setSidebar(false);
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
  const linkedStart=(hashParams.get('start')||'').split(',').map(Number);
  const linkedEnd=(hashParams.get('end')||'').split(',').map(Number);
  const hasLinkedPosition=linkedStart.length===2&&linkedEnd.length===2&&linkedStart.concat(linkedEnd).every(Number.isInteger);
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
   if(linkedText&&hasLinkedPosition){
    const a=nodes[linkedStart[0]],b=nodes[linkedEnd[0]];
    if(a&&b&&linkedStart[1]>=0&&linkedEnd[1]>0&&linkedStart[1]<=a.length&&linkedEnd[1]<=b.length){
     paintRange(layer,a,linkedStart[1],b,linkedEnd[1]);return;
    }
   }
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
   if(token===session&&epoch===modeEpoch){highlightText(layer);if(translationMode)showOverlays();}
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
   }finally{scrollBusy=false;if(translationMode){queueVisibleTranslation();showOverlays();}if(scrollAgain){scrollAgain=false;refreshVisible();}}
  }
  viewport.addEventListener('scroll',()=>{if(!continuous)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(refreshVisible,100);},{passive:true});
  function navigate(){if(continuous){const slot=slots[page-1];if(slot)viewport.scrollTop=slot.offsetTop-stack.offsetTop;refreshVisible();}else schedule();}
  mode.onclick=()=>{
   continuous=!continuous;modeEpoch++;
   mode.setAttribute('aria-pressed',String(continuous));
   mode.textContent=continuous?t(10):t(11);mode.title=continuous?'Passa alla pagina singola':'Passa allo scorrimento continuo';
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
  let cachedPosition=null;
  function readSelection(){
   const selection=window.getSelection();
   if(!selection||selection.isCollapsed||!selection.anchorNode||!selection.focusNode)return '';
   if(!root.contains(selection.anchorNode)||!root.contains(selection.focusNode))return '';
   const anchor=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement;
   const focus=selection.focusNode.nodeType===1?selection.focusNode:selection.focusNode.parentElement;
   if(!anchor||!focus||!anchor.closest('.ires-pdf-text-layer')||!focus.closest('.ires-pdf-text-layer'))return '';
   return selection.toString().replace(/\\s+/g,' ').trim().slice(0,200);
  }
  function capturePosition(){
   const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return null;
   const range=sel.getRangeAt(0);
   const layer=range.startContainer.parentElement&&range.startContainer.parentElement.closest('.ires-pdf-text-layer');
   if(!layer||!layer.contains(range.endContainer))return null;
   const nodes=[];layer.querySelectorAll('span').forEach(span=>{const walker=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);while(walker.nextNode())if(walker.currentNode.nodeValue)nodes.push(walker.currentNode);});
   const a=nodes.indexOf(range.startContainer),b=nodes.indexOf(range.endContainer);
   if(a<0||b<0)return null;
   const slot=layer.closest('[data-page]');
   return {page:slot?Number(slot.dataset.page):page,start:[a,range.startOffset],end:[b,range.endOffset]};
  }
  function selectedPassage(){return readSelection()||cachedSelection;}
  // Mobile browsers often collapse the native selection when the toolbar receives focus.
  document.addEventListener('selectionchange',()=>{
   if(token!==session)return;
   const selected=readSelection();
   if(selected){cachedSelection=selected;cachedPosition=capturePosition();}
  });
  [passage,cite,annotate].forEach(button=>{
   button.addEventListener('pointerdown',()=>{const selected=readSelection();if(selected){cachedSelection=selected;cachedPosition=capturePosition();}},{passive:true});
   button.addEventListener('touchstart',()=>{const selected=readSelection();if(selected){cachedSelection=selected;cachedPosition=capturePosition();}},{passive:true});
  });
  // Translation is initiated only by a reader action; no background text transmission.
  // Translation is a persistent viewing mode, not a one-page action.
  let translatedText='',translationGeneration=0,translationMode=false,translationWorker=false;
  let translationActivePage=0;
  const translationCache=new Map(),translationPending=new Set(),translationFailures=new Map();
  const translationProgress=new Map();
  let translationBusyPage=0;
  // Persistent per-device cache, keyed by PDF fingerprint + page text digest + target language.
  let translationDbPromise=null;
  function translationDb(){
   if(!window.indexedDB)return Promise.resolve(null);
   if(!translationDbPromise)translationDbPromise=new Promise(resolve=>{
    const request=indexedDB.open('ires-pdf-translations',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('pages'))request.result.createObjectStore('pages');};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>resolve(null);
    request.onblocked=()=>resolve(null);
   });
   return translationDbPromise;
  }
  async function digestTranslationText(text){
   if(!crypto.subtle)return null;
   const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(text));
   return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function translationStorageKey(number,target,text){
   const fingerprint=doc.fingerprints&&doc.fingerprints[0];
   const hash=await digestTranslationText(text);
   if(!fingerprint||!hash)return null;
   return 'v1:'+fingerprint+':'+number+':'+target+':'+hash;
  }
  async function storedTranslation(key,value){
   if(!key)return null;
   const db=await translationDb();
   if(!db)return null;
   return new Promise(resolve=>{
    try{
     const tx=db.transaction('pages',value===undefined?'readonly':'readwrite');
     const req=value===undefined?tx.objectStore('pages').get(key):tx.objectStore('pages').put(value,key);
     req.onsuccess=()=>resolve(value===undefined?(req.result||null):true);
     req.onerror=()=>resolve(null);
    }catch(_){resolve(null);}
   });
  }
  const encoder=new TextEncoder();
  async function sharedTranslation(key,entry){
   if(!key||!config.translationCacheApi)return null;
   try{
    if(entry===undefined){
     const response=await fetch(config.translationCacheApi+'?key='+encodeURIComponent(key),{credentials:'same-origin'});
     if(!response.ok)return null;
     const payload=await response.json();
     return payload&&Array.isArray(payload.blocks)?payload:null;
    }
    // Anonymous visitors can read shared translations, but cannot poison the cache.
    if(!config.translationCacheWrite)return null;
    const response=await fetch(config.translationCacheApi,{
     method:'POST',credentials:'same-origin',
     headers:{'Content-Type':'application/json','X-WP-Nonce':config.translationCacheNonce||''},
     body:JSON.stringify({key,entry})
    });
    return response.ok;
   }catch(_){return null;}
  }
  function splitTranslation(text,maxBytes=6500){
   const chunks=[];let remaining=text.trim();
   while(remaining){
    if(encoder.encode(remaining).length<=maxBytes){chunks.push(remaining);break;}
    let low=1,high=remaining.length;
    while(low<high){const mid=Math.ceil((low+high)/2);if(encoder.encode(remaining.slice(0,mid)).length<=maxBytes)low=mid;else high=mid-1;}
    let cut=low;const space=remaining.lastIndexOf(' ',cut);
    if(space>cut*.5)cut=space;
    chunks.push(remaining.slice(0,cut).trim());remaining=remaining.slice(cut).trim();
   }
   return chunks.filter(Boolean);
  }
  // Browser-local neural translation: OPUS-MT / ONNX Runtime Web.
  // The model is downloaded once per language pair and cached by the browser.
  const localModels={'it-en':true,'en-it':true};
  let localWorker=null,localRequestId=0;
  const LOCAL_TRANSLATION_TIMEOUT=25000;
  function resetLocalWorker(reason){
   if(localWorker){localWorker.terminate();localWorker=null;}
   for(const pending of localRequests.values()){clearTimeout(pending.timer);pending.reject(Error(reason));}
   localRequests.clear();
  }
  const localRequests=new Map();
  function getLocalWorker(){
   if(localWorker)return localWorker;
   if(!window.Worker||!config.translationWorkerUrl)throw Error('Web Worker non disponibile');
   localWorker=new Worker(config.translationWorkerUrl,{type:'module'});
   localWorker.onmessage=event=>{
    const {id,translation,error}=event.data||{},pending=localRequests.get(id);
    if(!pending)return;
    localRequests.delete(id);
    clearTimeout(pending.timer);
    if(error)pending.reject(Error(error));else pending.resolve(translation);
   };
   localWorker.onerror=event=>{
    resetLocalWorker('Motore locale non disponibile');
    console.warn('Errore motore traduzione Web Worker',event.message);
   };
   return localWorker;
  }
  async function localTranslate(text,target){
   if(target==='it')return text;
   if(!localModels['it-'+target])throw Error('Modello locale non disponibile');
   const worker=getLocalWorker(),id=++localRequestId;
   return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>resetLocalWorker('Tempo massimo di traduzione superato: il motore è stato riavviato'),LOCAL_TRANSLATION_TIMEOUT);
    localRequests.set(id,{resolve,reject,timer});
    worker.postMessage({id,text,target});
   });
  }
  async function translateText(text,target){
   if(target==='it')return text;
   if(localModels['it-'+target]){
    try{return await localTranslate(text,target);}
    catch(error){
     console.warn('Traduzione locale non disponibile',error);
     if(!config.translationRemote)throw Error('Traduzione locale non disponibile: '+(error.message||String(error)));
    }
   }
   if(window.Translator&&typeof window.Translator.create==='function'){
    try{
     const translator=await window.Translator.create({sourceLanguage:'it',targetLanguage:target});
     try{return await translator.translate(text);}finally{if(translator.destroy)translator.destroy();}
    }catch(error){console.info('Traduzione browser non disponibile',error);}
   }
   if(!config.translationRemote||!config.translationApi)throw Error('Modello locale non disponibile per questa lingua. Configura un provider opzionale nelle impostazioni.');
   const response=await fetch(config.translationApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,source:'auto',target})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error((data.message||'Servizio di traduzione non disponibile')+' (HTTP '+response.status+')');
   if(typeof data.translatedText!=='string')throw Error('Risposta del servizio non valida');
   return data.translatedText;
  }
  async function translateLong(text,target,generation){
   const chunks=splitTranslation(text,450),output=[];
   for(const chunk of chunks){
    if(generation!==translationGeneration||token!==session||!translationMode)throw Error('Traduzione interrotta');
    output.push(await translateText(chunk,target));
   }
   return output.join('\\n\\n');
  }
  function extractLayoutBlocks(items,viewport){
   const lines=[];
   for(const item of items){
    if(!item.str||!item.str.trim()||!Array.isArray(item.transform))continue;
    const [x,baseline]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
    const font=Math.max(6,Math.abs(item.height||item.transform[3]||10));
    const width=Math.max(3,(item.width||item.str.length*font*.45)*viewport.scale);
    const h=font*viewport.scale*1.3,y=baseline-h*.82;
    const line=lines.find(l=>Math.abs(l.y-y)<h*.55&&Math.abs(l.font-font)<font*.45);
    const segment={text:item.str,x,y,width,h,font};
    if(line)line.parts.push(segment);else lines.push({y,font,parts:[segment]});
   }
   lines.sort((a,b)=>a.y-b.y);
   const ordered=lines.map(line=>{
    line.parts.sort((a,b)=>a.x-b.x);
    const left=Math.min(...line.parts.map(p=>p.x)),right=Math.max(...line.parts.map(p=>p.x+p.width));
    return {x:left,y:Math.min(...line.parts.map(p=>p.y)),right,bottom:Math.max(...line.parts.map(p=>p.y+p.h)),font:line.font,text:line.parts.map(p=>p.text).join(' ').trim()};
   }).filter(l=>l.text);
   const blocks=[];
   for(const line of ordered){
    const last=blocks[blocks.length-1];
    if(last&&Math.abs(line.x-last.x)<Math.max(24,last.font*3)&&line.y-last.bottom<Math.max(12,last.font*1.7)&&last.text.length+line.text.length<1000){
     last.text+=' '+line.text;last.right=Math.max(last.right,line.right);last.bottom=Math.max(last.bottom,line.bottom);
    }else blocks.push({...line});
   }
   return blocks.map(b=>({x:b.x,y:b.y,width:b.right-b.x,height:b.bottom-b.y,fontSize:b.font,original:b.text}));
  }
  function clearOverlays(){root.querySelectorAll('.ires-pdf-translation-overlay').forEach(node=>node.remove());}
  function clearTranslationLoading(){root.querySelectorAll('.ires-pdf-translation-loading').forEach(node=>node.remove());}
  function showTranslationLoading(){
   clearTranslationLoading();
   if(!translationMode)return;
   const number=visiblePageForTranslation(),holder=continuous?slots[number-1]:singlePage;
   if(!holder)return;
   const key=language.value+':'+number;
   if(translationCache.has(key))return;
   const failure=translationFailures.get(key);
   // Do not show a spinner on a page that is not actually being translated.
   if(!failure&&translationBusyPage!==number)return;
   const progress=Math.max(0,Math.min(99,translationProgress.get(key)||0));
   const loading=el('div','ires-pdf-translation-loading',failure&&Date.now()<failure.until?labels[language.value][27]:labels[language.value][2]+'… '+progress+'%');
   loading.setAttribute('role','status');
   if(failure){
    loading.classList.add('ires-pdf-translation-error');
    const detail=el('span','ires-pdf-translation-error-detail',failure.message||labels[language.value][27]);
    const retry=el('button','ires-pdf-translation-retry',uiLang==='it'?'Riprova':uiLang==='fr'?'Réessayer':uiLang==='de'?'Erneut versuchen':uiLang==='es'?'Reintentar':uiLang==='pt'?'Tentar novamente':'Retry');
    retry.type='button';
    retry.onclick=()=>{translationFailures.delete(key);queueVisibleTranslation();};
    loading.append(detail,retry);
   }
   holder.append(loading);
  }
  function showOverlays(){
   clearOverlays();clearTranslationLoading();if(!translationMode)return;
   const targetPages=continuous?slots.map((slot,i)=>({slot,n:i+1})).filter(({slot})=>{
    const rect=slot.getBoundingClientRect(),v=viewport.getBoundingClientRect();
    return rect.bottom>v.top&&rect.top<v.bottom;
   }).map(({n})=>n):[page];
   for(const number of targetPages){
    const entry=translationCache.get(language.value+':'+number);
    if(!entry)continue;
    const holder=continuous?slots[number-1]:singlePage;
    if(!holder||!holder.querySelector('canvas'))continue;
    for(const block of entry.blocks){
     const node=el('div','ires-pdf-translation-overlay',block.translation);
     node.style.left=block.x*scale+'px';node.style.top=block.y*scale+'px';
     node.style.width=block.width*scale+'px';node.style.height=block.height*scale+'px';
     node.style.fontSize=Math.max(7,Math.min(12,block.fontSize*scale))+'px';
     node.title=block.original;holder.append(node);
    }
   }
   showTranslationLoading();
  }
  function visiblePageForTranslation(){
   if(!continuous)return page;
   const rect=viewport.getBoundingClientRect(),center=(rect.top+rect.bottom)/2;
   let nearest=page,distance=Infinity;
   slots.forEach((slot,i)=>{
    const box=slot.getBoundingClientRect();
    if(box.bottom<=rect.top||box.top>=rect.bottom)return;
    const delta=Math.abs((box.top+box.bottom)/2-center);
    if(delta<distance){distance=delta;nearest=i+1;}
   });
   return nearest;
  }
  function queueVisibleTranslation(){
   if(!translationMode||token!==session)return;
   const number=visiblePageForTranslation();
   translationActivePage=number;
   if(translationCache.has(language.value+':'+number)){showOverlays();translationStatus.textContent=t(6)+' '+number;}
   // Strictly one active page: never queue adjacent or previously visible pages.
   translationPending.clear();
   const key=language.value+':'+number,failed=translationFailures.get(key);
   if(!translationCache.has(key)&&(!failed||Date.now()>=failed.until))translationPending.add(number);
   showTranslationLoading();
   if(!translationWorker)processTranslationQueue();
  }
  async function processTranslationQueue(){
   if(translationWorker)return;
   translationWorker=true;
   const generation=translationGeneration,target=language.value;
   try{
    while(translationMode&&generation===translationGeneration&&token===session&&translationPending.size){
     const visible=visiblePageForTranslation();
     let number=translationPending.has(visible)?visible:null;
     if(number===null){translationPending.clear();break;}
     translationPending.delete(number);
     const key=target+':'+number;
     if(translationCache.has(key)){showOverlays();continue;}
     try{
      translationBusyPage=number;
      translationProgress.set(key,0);
      showTranslationLoading();
      translationStatus.textContent='Traduzione pagina '+number+'…';
      const pdfPage=await doc.getPage(number);
      const content=await pdfPage.getTextContent();
      const items=content.items.filter(item=>item.str&&item.str.trim());
      const layout=extractLayoutBlocks(items,pdfPage.getViewport({scale:1}));
      const original=items.map(item=>item.str).join(' ');
      const storageKey=await translationStorageKey(number,target,original);
      const previous=await storedTranslation(storageKey);
      if(previous&&Array.isArray(previous.blocks)&&previous.blocks.length===layout.length){
       translationCache.set(key,previous);
       translationProgress.set(key,100);
       translationBusyPage=0;
       if(number===visiblePageForTranslation()){
        translatedText=previous.translation;
        translationSource.textContent=previous.original;
        translationResult.textContent=previous.translation;
        translationStatus.textContent='Pagina '+number+' caricata dalla cache';
       }
       showOverlays();
       continue;
      }
      const translated=[];
      for(let i=0;i<layout.length;i++){
       if(!translationMode||generation!==translationGeneration||token!==session||number!==visiblePageForTranslation())break;
       translationStatus.textContent='Pagina '+number+': '+(i+1)+' / '+layout.length+' blocchi';
       const translation=await translateLong(layout[i].original,target,generation);
       translated.push({...layout[i],translation});
       translationProgress.set(key,Math.round((i+1)/Math.max(1,layout.length)*100));
       if(number===visiblePageForTranslation())showTranslationLoading();
      }
      if(!translationMode||generation!==translationGeneration||token!==session)break;
      if(number!==visiblePageForTranslation()||translated.length!==layout.length)continue;
      translationCache.set(key,{blocks:translated,original,translation:translated.map(block=>block.translation).join('\\n\\n')});
      await storedTranslation(storageKey,translationCache.get(key));
      if(number===visiblePageForTranslation()){
       translatedText=translationCache.get(key).translation;
       translationSource.textContent=translationCache.get(key).original;
       translationResult.textContent=translatedText;
       translationStatus.textContent='Pagina '+number+' tradotta';
      }
      translationBusyPage=0;
      showOverlays();
     }catch(error){
      translationBusyPage=0;
      if(generation===translationGeneration)translationStatus.textContent='Pagina '+number+': '+(error.message||'traduzione non disponibile');
      const previous=translationFailures.get(key);
      const attempts=(previous?previous.attempts:0)+1;
      const message=String(error.message||'');
      const permanent=/configura|chiave API|autorizzata|non valido|invalid|403|401/i.test(message);
      const delay=permanent?300000:Math.min(120000,Math.pow(2,Math.min(attempts,5))*2500);
      translationFailures.set(key,{attempts,until:Date.now()+delay,message});
      showTranslationLoading();
      setTimeout(()=>{if(translationMode&&generation===translationGeneration&&token===session)queueVisibleTranslation();},delay+100);
      // Temporary errors are eligible for retry on the next viewport update.
     }
    }
   }finally{
    translationBusyPage=0;
    translationWorker=false;
    if(translationMode&&translationPending.size&&token===session)processTranslationQueue();
   }
  }
  function setTranslationMode(enabled){
   translationMode=enabled;translationGeneration++;
   translationPending.clear();
   translationBusyPage=0;
   translate.textContent=enabled?t(1):t(0);
   translate.setAttribute('aria-pressed',String(enabled));
   overlayToggle.textContent=enabled?t(24):t(23);
   overlayToggle.setAttribute('aria-pressed',String(enabled));
   if(!enabled){clearOverlays();clearTranslationLoading();translationStatus.textContent=t(1);}
   else {queueVisibleTranslation();}
  }
  translate.onclick=()=>setTranslationMode(!translationMode);
  translateAgain.onclick=()=>{translationCache.delete(language.value+':'+visiblePageForTranslation());translationFailures.delete(language.value+':'+visiblePageForTranslation());if(!translationMode)setTranslationMode(true);else queueVisibleTranslation();};
  overlayToggle.onclick=()=>setTranslationMode(!translationMode);
  language.onchange=()=>{translationGeneration++;translationPending.clear();clearOverlays();if(translationMode)queueVisibleTranslation();};
  translationSpeak.onclick=()=>{
   if(!translatedText||!window.speechSynthesis||!window.SpeechSynthesisUtterance){translationStatus.textContent='Nessuna traduzione da leggere o voce non disponibile';return;}
   stopReading();const utterance=new SpeechSynthesisUtterance(translatedText);utterance.lang=language.value;window.speechSynthesis.speak(utterance);
  };
  viewport.addEventListener('scroll',()=>{
   if(!translationMode)return;
   showTranslationLoading();
   clearTimeout(translationScrollTimer);
   translationScrollTimer=setTimeout(queueVisibleTranslation,220);
  },{passive:true});
  let translationScrollTimer=null;
  // SpeechSynthesis uses the device's installed voices; no document text is sent by this plugin.
  const synthesis=window.speechSynthesis;
  let speechGeneration=0,speechActive=false,speechPaused=false;
  let speechPage=1,speechChunks=[],speechIndex=0,speechAcrossPages=false;
  const speechSupported=!!(synthesis&&window.SpeechSynthesisUtterance);
  [speech,speechPause,speechStop,speechRate].forEach(control=>{control.disabled=!speechSupported;});
  if(!speechSupported)speech.title='Sintesi vocale non disponibile in questo browser';
  function updateSpeechUI(){
   speech.textContent=speechActive?'Ricomincia lettura':'Ascolta';
   speechPause.textContent=speechPaused?'Riprendi':'Pausa';
   speechPause.disabled=!speechSupported||!speechActive;
   speechStop.disabled=!speechSupported||!speechActive;
  }
  function stopReading(){
   speechGeneration++;speechActive=false;speechPaused=false;speechChunks=[];speechIndex=0;
   if(synthesis)try{synthesis.cancel();}catch(_error){}
   updateSpeechUI();
  }
  stopSpeech=stopReading;
  function chunksForSpeech(text){
   const cleaned=text.replace(/\\s+/g,' ').trim();
   const parts=cleaned.match(/[^.!?;:]+[.!?;:]?\\s*/g)||[cleaned];
   const chunks=[];let buffer='';
   for(const part of parts){
    if((buffer+part).length>180&&buffer){chunks.push(buffer.trim());buffer='';}
    if(part.length>180){for(let i=0;i<part.length;i+=180)chunks.push(part.slice(i,i+180).trim());}
    else buffer+=part;
   }
   if(buffer.trim())chunks.push(buffer.trim());
   return chunks.filter(Boolean);
  }
  async function loadSpeechPage(number,generation){
   const pdfPage=await doc.getPage(number);
   if(generation!==speechGeneration||token!==session)return;
   const content=await pdfPage.getTextContent();
   if(generation!==speechGeneration||token!==session)return;
   speechChunks=chunksForSpeech(content.items.map(item=>item.str||'').join(' '));
   speechIndex=0;
  }
  async function speakNext(generation){
   if(generation!==speechGeneration||!speechActive||token!==session)return;
   if(speechIndex>=speechChunks.length){
    if(!speechAcrossPages||speechPage>=doc.numPages){stopReading();return;}
    speechPage++;
    try{await loadSpeechPage(speechPage,generation);}catch(error){console.warn('IRES PDF speech',error);stopReading();return;}
    if(generation!==speechGeneration)return;
    page=speechPage;navigate();
    if(!speechChunks.length){speakNext(generation);return;}
   }
   const utterance=new SpeechSynthesisUtterance(speechChunks[speechIndex++]);
   utterance.rate=Number(speechRate.value)||1;
   utterance.lang=document.documentElement.lang||navigator.language||'it-IT';
   utterance.onend=()=>{if(generation===speechGeneration)speakNext(generation);};
   utterance.onerror=event=>{if(generation!==speechGeneration)return;if(event.error==='canceled'||event.error==='interrupted')return;console.warn('IRES PDF speech',event.error);stopReading();};
   if(generation===speechGeneration&&speechActive)synthesis.speak(utterance);
  }
  speech.onclick=async()=>{
   if(!speechSupported)return;
   const selected=readSelection()||cachedSelection;
   stopReading();
   const generation=speechGeneration;
   speechActive=true;speechAcrossPages=!selected;speechPage=page;updateSpeechUI();
   try{
    if(selected)speechChunks=chunksForSpeech(selected);
    else await loadSpeechPage(speechPage,generation);
    if(generation!==speechGeneration)return;
    if(!speechChunks.length){window.alert('Questa pagina non contiene testo leggibile.');stopReading();return;}
    speakNext(generation);
   }catch(error){console.warn('IRES PDF speech',error);stopReading();window.alert('Impossibile avviare la lettura vocale.');}
  };
  speechPause.onclick=()=>{
   if(!speechActive||!speechSupported)return;
   if(speechPaused){synthesis.resume();speechPaused=false;}
   else{synthesis.pause();speechPaused=true;}
   updateSpeechUI();
  };
  speechStop.onclick=stopReading;
  updateSpeechUI();
  function pageUrl(text){
   const link=new URL(config.dedicatedUrl||location.origin+'/');
   link.searchParams.set('ires_pdf_reader','1');
   link.searchParams.set('pdf',url);
   link.searchParams.set('title',title);
   link.searchParams.set('ires_pdf_auto','1');
   const position=text?cachedPosition:null;
   const targetPage=position?position.page:page;
   link.hash='page='+encodeURIComponent(targetPage)+(text?'&text='+encodeURIComponent(text):'');
   if(position)link.hash+='&start='+position.start.join(',')+'&end='+position.end.join(',');
   return link.href;
  }
  passage.onclick=async()=>{
   const text=selectedPassage();
   if(!text){window.alert('Seleziona prima un passaggio nel documento.');return;}
   const position=cachedPosition||capturePosition();
   if(!position){window.alert('Non riesco a individuare la posizione della selezione. Riprova selezionando il testo nel PDF.');return;}
   passage.disabled=true;
   const originalLabel=passage.textContent;passage.textContent='Salvataggio…';
   try{
    if(!config.passageApi)throw Error('Servizio non disponibile');
    const response=await fetch(config.passageApi,{
     method:'POST',credentials:'same-origin',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({pdf:url,title,page:position.page,start:position.start,end:position.end,text})
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();
    if(!data.url||!/^https?:\/\//.test(data.url))throw Error('Risposta non valida');
    await copyValue(data.url,passage);
   }catch(error){
    console.warn('IRES PDF Reader: salvataggio passaggio non riuscito',error);
    window.alert('Il link breve non è disponibile. Verrà copiato un collegamento diretto come alternativa.');
    await copyValue(pageUrl(text),passage);
   }finally{
    passage.disabled=false;
    if(passage.textContent==='Salvataggio…')passage.textContent=originalLabel;
   }
  };
  cite.onclick=()=>{
   const selected=selectedPassage();
   const quotation=selected?'“'+selected+'” ':'';
   const citationText=quotation+(citation||title+' (s.d.).')+' p. '+page+'. '+pageUrl(selected);
   copyValue(citationText,cite);
  };
  if(linkedText){search.value='';searchInfo.textContent='Passaggio condiviso';}
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
  // Start in continuous-scroll mode; the toolbar still allows switching to single page.
  mode.click();
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
 render(url,title,overlay,token,button&&button.dataset.citation||'');
}
// IRES Produzione Scientifica 1.43.51 renders its Preview link in a PHP template,
// outside the_content. Reuse that exact link and preserve its original href as fallback.
document.addEventListener('click',e=>{
 const link=e.target.closest&&e.target.closest('.ires-ps-single a.ires-ps-pdf-preview');
 if(!link||!config.scientificIntegration||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const url=link.href;
 if(!url||!/^https?:\/\//i.test(url))return;
 const section=link.closest('.ires-ps-single');
 const title=section&&section.querySelector('.ires-ps-hero h1');
 const authors=section&&section.querySelector('.ires-ps-authors');
 const date=section&&section.querySelector('.ires-ps-hero-meta');
 const heading=title?title.textContent.trim():'Documento PDF';
 const authorText=authors?authors.textContent.replace(/\\s+/g,' ').trim():'';
 const yearMatch=date&&date.textContent.match(/\\b(?:19|20)\\d{2}\\b/);
 link.dataset.citation=(authorText?authorText+' ':'')+(yearMatch?'('+yearMatch[0]+'). ':'')+heading+'.';
 e.preventDefault();
 e.stopPropagation();
 open(url,heading,link);
},true);
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
 if(root){const token=++session;render(root.dataset.pdf,root.dataset.title||'Documento PDF',root,token,root.dataset.citation||'');}
}
})();
