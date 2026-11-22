'use strict';
/* Execute production functions with deterministic network/provider stubs. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto,createHash}=require('node:crypto');
const js=fs.readFileSync('ires-pdf-reader/assets/reader.js','utf8');
const part=(start,end)=>{const i=js.indexOf(start),j=js.indexOf(end,i);assert.ok(i>=0&&j>i);return js.slice(i,j);};
const resolver=part('async function resolveScientificPublication(', 'async function render(');
const verifier=part(' async function verifyScientificDocument(', ' async function scientificGeometryPage(');
const reader=part(' async function scientificEnglishPage(', ' // IRES Produzione Scientifica stores');
const stored=part(' async function scientificStoredPage(', ' const browserLang=');
const readingPolicy=part('function scientificReadingAction(', 'async function render(');
const pageNavigation=part('  function navigate(){', '  fullscreen.onclick=');
const shareLink=part('  function pageUrl(text){', '  passage.onclick=');
const selectedText=part('  function readSelection(){', '  function capturePosition(){');
const selectionPosition=part('  function capturePosition(){', '  function selectedPassage(){');
const readingMark=part('  function markReadingPassage(', '  function paintReadingPage(');
const originalPassageJump=part('  function scrollToPdfLinkedPassage(', '  async function addTextLayer(');
const readingSync=part('  function syncScientificReading(', '  function queueVisibleTranslation(');
const translator=part('  async function translateText(', '  async function translateLong(');
const panel=part('  function pageTranslationPanel(', '  function showOverlays(');
const sourceUrl='https://example.com/uploads/marriages.pdf';
const pdfBytes=Buffer.from('%PDF-1.7 deterministic scientific document');
const pdfHash=createHash('sha256').update(pdfBytes).digest('hex');
const config={scientificPublicationApi:'https://example.com/binding',scientificTranslationApi:'https://example.com/stored',scientificIntegration:true};
const base={URL,window:{location:{href:'https://example.com/report'}},config};
async function resolve(data,candidate=95415,status=200){
 let request;
 const result=await vm.runInNewContext(resolver+';resolveScientificPublication(sourceUrl,candidate)',{...base,sourceUrl,candidate,fetch:async(url,options)=>{request={url:new URL(url),options};return {ok:status===200,status,json:async()=>data};}});
 return {result,request};
}
async function verify(bytes,expected=pdfHash){
 let reads=0;
 const sandbox={crypto:webcrypto,Uint8Array,scientificPublicationId:95415,scientificPdfHash:expected,scientificDocumentCheck:null,scientificBinding:Promise.resolve(),scientificBindingError:false,doc:{getData:async()=>{reads++;return bytes;}}};
 const result=await vm.runInNewContext(verifier+';(async()=>[await verifyScientificDocument(doc),await verifyScientificDocument(doc)])()',sandbox);
 return {result,reads,error:sandbox.scientificBindingError};
}
async function read(data){
 return vm.runInNewContext(reader+';scientificEnglishPage(1)',{...base,url:sourceUrl,scientificPublicationId:95415,scientificPdfHash:pdfHash,language:{value:'en'},fetch:async()=>({ok:true,json:async()=>data})});
}
function node(tag,cls,text){return {tag,cls,text,children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},append(...children){this.children.push(...children);}};}
(async()=>{
 const binding={publication_id:95415,pdf_url:sourceUrl,pdf_hash:pdfHash};
 const correct=await resolve(binding);
 assert.equal(correct.result.id,95415);
 assert.equal(correct.request.url.searchParams.get('pdf_url'),sourceUrl);
 assert.equal(correct.request.options.credentials,'same-origin');
 assert.equal((await resolve(binding,0)).result.id,95415,'Legacy link uses exact attachment lookup');
 for(const wrong of [{publication_id:95135},{pdf_url:'https://example.com/uploads/coronavirus.pdf'},{pdf_url:sourceUrl+'?different=1'},{pdf_hash:'untrusted'}])
  assert.equal((await resolve({...binding,...wrong})).result.error,true,'Wrong document binding rejected');
 assert.equal((await resolve({},0,404)).result,null,'Unrelated PDF stays unrelated');
 assert.equal((await resolve({},0,503)).result.error,true,'Unavailable verification fails closed');
 const verified=await verify(pdfBytes);
 assert.deepEqual(Array.from(verified.result),[true,true]);
 assert.equal(verified.reads,1,'Hash actual PDF once per open document');
 const mismatched=await verify(Buffer.from('different PDF bytes'));
 assert.equal(mismatched.result[0],false,'Cached/redirected PDF rejects another version overlay');
 assert.equal(mismatched.error,true);
 const translation={publication_id:95415,page:1,language:'en',pdf_hash:pdfHash,translation:'Marital Instability in Piedmont'};
 assert.equal(await read(translation),translation.translation);
 for(const wrong of [{page:2},{publication_id:95135},{pdf_hash:'0'.repeat(64)},{language:'fr'}])
  assert.equal(await read({...translation,...wrong}),null,'Wrong translation identity rejected');
 let providerCalls=0,oldCacheReads=0;
 const saved=await vm.runInNewContext(stored+';scientificStoredPage({},1,"en")',{
  verifyScientificDocument:async()=>true,scientificApprovedOcr:async()=>null,
  scientificGeometryPage:async()=>null,scientificEnglishPage:async()=>translation.translation,
  storedTranslation:async()=>{oldCacheReads++;return {blocks:[{translation:'Old layout'}]};},
  translateLong:async()=>{providerCalls++;throw Error('Unexpected provider call');}
 });
 assert.equal(saved.scientificText,translation.translation);
 assert.equal(saved.readingComplete,true,'Unaligned page has the entire saved English version');
 assert.equal(saved.verifiedOverlay,false);
 assert.equal(saved.layoutGenerated,false);
 assert.equal(saved.blocks.length,0,'Full-page text must not invent block associations');
 assert.equal(oldCacheReads,0,'Old retranslation cache is not reviewed OCR');
 const partialSaved=await vm.runInNewContext(stored+';scientificStoredPage({},1,"en")',{
  verifyScientificDocument:async()=>true,scientificApprovedOcr:async()=>({partial:true,blocks:[{}],scientificText:'One approved block',translation:'One approved block'}),
  scientificEnglishPage:async()=>translation.translation
 });
 assert.equal(partialSaved.scientificText,translation.translation,'Partial overlay keeps complete saved English in reading view');
 assert.equal(partialSaved.readingComplete,true,'Partial overlay is paired with a full English reading fallback');
 assert.equal(partialSaved.blocks.length,1);
 const completeOcr=await vm.runInNewContext(stored+';scientificStoredPage({},1,"en")',{
  verifyScientificDocument:async()=>true,scientificApprovedOcr:async()=>({partial:false,blocks:[{}],scientificText:'Just block'}),
  scientificEnglishPage:async()=>translation.translation
 });
 assert.equal(completeOcr.readingComplete,true,'Full OCR overlay also exposes the complete saved text for manual reading');
 const decision=(entry,automatic=false,optOut=false)=>vm.runInNewContext(readingPolicy+';scientificReadingAction(entry,automatic,optOut)',{entry,automatic,optOut});
 const unapproved={scientific:true,verifiedOverlay:false,readingComplete:true,scientificText:translation.translation};
 assert.equal(decision(unapproved),'reading','Unapproved pages automatically show full English text');
 assert.equal(decision({...unapproved,verifiedOverlay:true,partial:true}),'reading','Partial overlays never mix Italian and English in automatic reading');
 assert.equal(decision({...unapproved,verifiedOverlay:true,partial:false}),'keep','Complete approved overlay stays inside PDF');
 assert.equal(decision({...unapproved,verifiedOverlay:true,partial:false},true),'pdf','Auto reading returns to PDF when a fully approved page is reached');
 assert.equal(decision(unapproved,false,true),'keep','A user can opt out of automatic reading on the current page');
 assert.equal(decision({...unapproved,readingComplete:false}),'keep','Truncated English is never presented as a full translation');
 assert.equal(decision(null,true),'pdf','Missing source returns to original PDF');
 let navigationCalls=[];
 const navigationState={translationMode:true,page:8,translationActivePage:7,readingMode:true,
  readingAutoOptOut:true,scientificReadingEnabled:()=>true,
  renderScientificReadingView:()=>navigationCalls.push('render'),
  jumpReadingPage:(n)=>navigationCalls.push('scroll:'+n)};
 vm.runInNewContext(pageNavigation+';navigate()',navigationState);
 assert.equal(navigationState.translationActivePage,8,'Next page updates current English reading page');
 assert.equal(navigationState.readingAutoOptOut,false,'Next page restores automatic English handling');
 assert.deepEqual(navigationCalls,['render','scroll:8'],'Navigation scrolls to English page 8 without switching to a hidden PDF');
 let modeCalls=[],status={textContent:''};
 const syncEnvironment={entry:unapproved,translationMode:true,language:{value:'en'},
  visiblePageForTranslation:()=>8,readingAutomatic:false,readingAutoOptOut:false,
  readingMode:false,readingStack:null,readingRenderedPage:0,readingRenderedEntry:null,translationStatus:status,
  setReadingMode:(enabled,auto)=>modeCalls.push([enabled,auto]),renderReadingView:()=>modeCalls.push('render')};
 vm.runInNewContext(readingPolicy+readingSync+';syncScientificReading(8,entry)',syncEnvironment);
 assert.deepEqual(modeCalls,[[true,true]],'Full saved English automatically opens in optimized reading view');
 modeCalls=[];
 Object.assign(syncEnvironment,{readingMode:true,readingAutomatic:true,readingStack:{isConnected:true},
  entry:{...unapproved,verifiedOverlay:true,partial:false}});
 vm.runInNewContext(readingPolicy+readingSync+';syncScientificReading(8,entry)',syncEnvironment);
 assert.deepEqual(modeCalls,[],'Scrolling onto an approved page does not interrupt continuous English reading');
 assert.equal(js.includes("viewGroup.append(sidebarToggle,fullscreen)"),true,'Only continuous PDF display is exposed');
 assert.equal(js.includes('let continuous=true'),true,'Continuous PDF is the default');
 assert.equal(/\bmode\./.test(js),false,'Removed single-page mode does not leave orphaned control references');
 const highlight={isConnected:true,getBoundingClientRect:()=>({top:400})};
 const layer={closest:()=>({dataset:{page:'8'}}),querySelector:()=>highlight};
 const pdfViewport={scrollTop:0,getBoundingClientRect:()=>({top:100,height:800})};
 const jumpEnv={layer,linkedText:'Quoted original source',linkedViewReading:false,pdfLinkJumped:false,
   fromHash:8,page:8,token:1,session:1,viewport:pdfViewport,
   window:{requestAnimationFrame:callback=>callback()}};
 vm.runInNewContext(originalPassageJump+';scrollToPdfLinkedPassage(layer)',jumpEnv);
 assert.equal(jumpEnv.pdfLinkJumped,true,'Legacy exact PDF passage is handled');
 assert.equal(pdfViewport.scrollTop,130,'Legacy PDF text highlight scrolls near viewport center');
 assert.equal(providerCalls,0,'Navigation and fallback do not call the translation provider');

 // Legacy links retain page/text/source coordinates; new English excerpts carry
 // view=reading while remaining bound to the same verified document.
 const makeUrl=(position,reading,text)=>vm.runInNewContext(shareLink+';pageUrl(text)',{
  URL,config:{dedicatedUrl:'https://example.com/reader/'},location:{origin:'https://example.com'},
  url:sourceUrl,title:'Scientific publication',scientificPublicationId:95415,
  cachedPosition:position,page:8,readingMode:reading,scientificReadingEnabled:()=>reading,text
 });
 const oldLink=new URL(makeUrl({page:4,start:[3,7],end:[3,22]},false,'Italian source excerpt'));
 assert.equal(new URLSearchParams(oldLink.hash.slice(1)).get('page'),'4');
 assert.equal(new URLSearchParams(oldLink.hash.slice(1)).get('start'),'3,7');
 assert.equal(new URLSearchParams(oldLink.hash.slice(1)).get('end'),'3,22');
 assert.equal(new URLSearchParams(oldLink.hash.slice(1)).get('view'),null,'Legacy PDF links do not change');
 const englishLink=new URL(makeUrl({page:6,reading:true,rpara:1,roff:18},true,'English scholarship excerpt'));
 const englishHash=new URLSearchParams(englishLink.hash.slice(1));
 assert.equal(englishHash.get('page'),'6');
 assert.equal(englishHash.get('text'),'English scholarship excerpt');
 assert.equal(englishHash.get('view'),'reading');
 assert.equal(englishHash.get('lang'),'en');
 assert.equal(englishHash.has('start'),false,'English excerpt does not forge original PDF text coordinates');
 assert.equal(englishHash.get('rpara'),'1','English link identifies selected paragraph');
 assert.equal(englishHash.get('roff'),'18','English link identifies selected character offset');
 assert.equal(englishLink.searchParams.get('publication_id'),'95415');
 const overlayLink=new URL(makeUrl({page:7,reading:true,rpara:0,roff:8},false,'English scholarship'));
 const overlayHash=new URLSearchParams(overlayLink.hash.slice(1));
 assert.equal(overlayHash.get('view'),'reading','Selected English overlay opens a verified English reading deep link');
 assert.equal(overlayHash.get('page'),'7');
 assert.equal(overlayHash.get('rpara'),'0');
 assert.equal(overlayHash.get('roff'),'8');

 // The optimized reading selection remains selectable for links and citations.
 const readingSection={dataset:{page:'6'}},readingElement={closest:selector=>selector==='.ires-pdf-reading-page'?readingSection:null};
 const textSelection=vm.runInNewContext(selectedText+';readSelection()',{
  window:{getSelection:()=>({isCollapsed:false,anchorNode:{nodeType:3,parentElement:readingElement},
   focusNode:{nodeType:3,parentElement:readingElement},toString:()=> 'English scholarship excerpt'})},
  root:{contains:()=>true},readingMode:true
 });
 assert.equal(textSelection,'English scholarship excerpt','Text selection inside reading page is recognized');
 const overlay={contains:()=>true,closest:selector=>selector==='[data-page]'?{dataset:{page:'7'}}:null};
 const overlayElement={nodeType:1,closest:selector=>selector==='.ires-pdf-translation-overlay-ocr'?overlay:null};
 const excerptRange={startContainer:overlayElement,endContainer:overlayElement,
  toString:()=> 'English scholarship'};
 const overlaySelection=await vm.runInNewContext(selectionPosition+';capturePosition()',{
  window:{getSelection:()=>({isCollapsed:false,rangeCount:1,getRangeAt:()=>excerptRange})},
  readingMode:false,translationMode:true,scientificPublicationId:95415,
  translationCache:new Map([['en:7',{scientificText:'This is English scholarship for international students.'}]]),
  page:7
 });
 assert.equal(overlaySelection.page,7);
 assert.equal(overlaySelection.reading,true);
 assert.equal(overlaySelection.rpara,0);
 assert.equal(overlaySelection.roff,8,'Selected OCR overlay excerpt is mapped into saved English page');
 const overlayTextSelected=vm.runInNewContext(selectedText+';readSelection()',{
  window:{getSelection:()=>({isCollapsed:false,anchorNode:overlayElement,focusNode:overlayElement,toString:()=> 'English scholarship'})},
  root:{contains:()=>true},readingMode:false,translationMode:true,scientificPublicationId:95415
 });
 assert.equal(overlayTextSelected,'English scholarship','Approved English PDF overlay is selectable for citations');
 let marked=null;
 const fakeArticle={querySelectorAll:()=>[{textContent:'A passage about English scholarship opportunities.',
  replaceChildren(...nodes){this.changed=nodes;marked=nodes[1];}}]};
 const mark=vm.runInNewContext(readingMark+';markReadingPassage(article,6)',{
  linkedViewReading:true,linkedText:'English scholarship',fromHash:6,linkedReadingPara:-1,linkedReadingOffset:-1,article:fakeArticle,
  el:(tag,cls,txt)=>({tag,cls,textContent:txt})
 });
 assert.equal(mark.textContent,'English scholarship','English shared phrase is marked without HTML injection');
 assert.equal(mark.cls,'ires-pdf-reading-shared-target');
 let firstMarked=0,secondMarked=0;
 const repeatingArticle={querySelectorAll:()=>[
  {textContent:'Repeated English scholarship for students.',replaceChildren(){firstMarked++;}},
  {textContent:'Repeated English scholarship for students.',replaceChildren(){secondMarked++;}}
 ]};
 const target2=vm.runInNewContext(readingMark+';markReadingPassage(article,6)',{
  linkedViewReading:true,linkedText:'English scholarship',fromHash:6,
  linkedReadingPara:1,linkedReadingOffset:9,article:repeatingArticle,
  el:(tag,cls,txt)=>({tag,cls,textContent:txt})
 });
 assert.equal(target2.textContent,'English scholarship');
 assert.equal(firstMarked,0,'First repeated occurrence not mistaken for the citation target');
 assert.equal(secondMarked,1,'Saved paragraph offset targets the second repeated occurrence');
 for(const settings of [{translationReadOnly:true},{scientificPublicationId:95415},{scientificCandidateId:95415},{scientificBindingError:true}]){
  const env={...base,config:{...config,translationAiPilot:true,translationReadOnly:false},scientificPublicationId:0,scientificCandidateId:0,scientificBindingError:false,scientificBinding:Promise.resolve(),translateAiPilot:async()=>{providerCalls++;return 'Unexpected';}};
  for(const [key,value] of Object.entries(settings))if(key==='translationReadOnly')env.config[key]=value;else env[key]=value;
  await assert.rejects(vm.runInNewContext(translator+';translateText("testo","en")',env));
 }
 assert.equal(providerCalls,0,'Read-only and scientific pages never invoke provider');
 const holder=node('div'),env={...base,config:{...config,scientificOcrAdminUrl:'https://example.com/wp-admin/edit.php?post_type=pubblicazione&page=ires-ps-ocr-overlay'},scientificPublicationId:95415,el:node,t:()=> 'Pagina',holder,entry:{scientific:true,verifiedOverlay:false,layoutGenerated:false},setReadingMode:()=>{},translationActivePage:0};
 vm.runInNewContext(panel+';pageTranslationPanel(holder,1,entry)',env);
 const link=holder.children[0].children.find(n=>n.tag==='a');
 assert.equal(link.text,'Prepara layout OCR');
 assert.equal(new URL(link.href).searchParams.get('publication_id'),'95415');
 assert.equal(new URL(link.href).searchParams.get('page_number'),'1');
 assert.ok(!holder.children[0].children.some(n=>(n.text||'').includes('Mostra inglese nel testo')));
 const publicHolder=node('div');
 vm.runInNewContext(panel+';pageTranslationPanel(holder,1,entry)',{...env,config,holder:publicHolder});
 assert.ok(!publicHolder.children[0].children.some(n=>n.tag==='a'),'Public readers receive no admin controls');
 console.log('PASS: publication/PDF binding, actual byte hash, stale rejection, reuse, no retranslation, read-only and OCR handoff');
})().catch(error=>{console.error(error);process.exit(1);});
