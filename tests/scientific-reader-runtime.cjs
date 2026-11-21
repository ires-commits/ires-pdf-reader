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
 assert.equal(saved.verifiedOverlay,false);
 assert.equal(saved.layoutGenerated,false);
 assert.equal(saved.blocks.length,0,'Full-page text must not invent block associations');
 assert.equal(oldCacheReads,0,'Old retranslation cache is not reviewed OCR');
 const partialSaved=await vm.runInNewContext(stored+';scientificStoredPage({},1,"en")',{
  verifyScientificDocument:async()=>true,scientificApprovedOcr:async()=>({partial:true,blocks:[{}],scientificText:'One approved block',translation:'One approved block'}),
  scientificEnglishPage:async()=>translation.translation
 });
 assert.equal(partialSaved.scientificText,translation.translation,'Partial overlay keeps complete saved English in reading view');
 assert.equal(partialSaved.blocks.length,1);
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
