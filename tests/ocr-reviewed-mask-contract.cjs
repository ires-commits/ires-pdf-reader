/* Runtime contract tests for the OCR endpoint reader, without a DOM.
 * Execute the exact scientificApprovedOcr function extracted from reader.js.
 * No network, PDF download, WordPress instance, or translation provider.
 */
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const source=fs.readFileSync('ires-pdf-reader/assets/reader.js','utf8');
const from=source.indexOf(' async function scientificApprovedOcr(doc,number){');
const until=source.indexOf(' async function scientificStoredPage(',from);
assert.ok(from>0 && until>from,'Reader OCR function must be available');
const fn=source.slice(from,until);
const mockDoc={getPage:async()=>({getViewport:()=>({width:594.96,height:842.04})})};
const base=()=>{
 const first={id:'p1',x:68.5,y:36.98,width:295.98,height:7.5,fontSize:5,
   original:'Source Italian',translation:'English text',kind:'heading'};
 const next={id:'p2',x:69,y:102.94,width:457.96,height:57.47,fontSize:10,
   original:'Source next',translation:'Next English text',kind:'paragraph'};
 return {schemaVersion:1,publicationId:95373,page:11,language:'en',
   coordinateSystem:'pdfjs-viewport-1',pageWidth:594.96,pageHeight:842.04,
   overlayAvailable:true,verifiedByAdmin:true,blocks:[first,next]};
};
async function load(data){
 const sandbox={URL,config:{scientificOcrApi:'https://example.com/wp-json/ires-ps/v1/ocr-overlay'},
  scientificPublicationId:95373,language:{value:'en'},
  window:{location:{href:'https://example.com/report'}},
  fetch:async()=>({ok:true,json:async()=>data}),mockDoc};
 return await vm.runInNewContext('(async()=>{ '+fn+'; return await scientificApprovedOcr(mockDoc,11); })()',sandbox);
}
(async()=>{
 const legacy=await load(base());
 assert.ok(legacy?.verifiedOverlay,'Legacy approved v1 overlays must render');
 assert.equal(legacy.blocks[0].maskRect,null);
 const reviewed=base();
 reviewed.blocks[0].maskRect={x:68,y:36,width:297,height:9};
 reviewed.blocks[0].maskReviewed=true;
 const accepted=await load(reviewed);
 assert.ok(accepted?.ocrOverlay,'Reviewed mask should render');
 assert.equal(accepted.blocks[0].x,68.5,'English text box must not move');
 assert.equal(accepted.blocks[0].maskRect.x,68,'Mask may extend left of text');
 const unreviewed=base();
 unreviewed.blocks[0].maskRect={x:68,y:36,width:297,height:9};
 assert.equal(await load(unreviewed),null,'Unreviewed mask must fail closed');
 const oversized=base();
 oversized.blocks[0].maskRect={x:60,y:36,width:306,height:9};
 oversized.blocks[0].maskReviewed=true;
 assert.equal(await load(oversized),null,'Excessive mask expansion rejected');
 const beyond=base();
 beyond.blocks[0].maskRect={x:68,y:35,width:297,height:900};
 beyond.blocks[0].maskReviewed=true;
 assert.equal(await load(beyond),null,'Off-page masks rejected');
 const overlapping=base();
 overlapping.blocks[1].y=44.6;
 overlapping.blocks[0].maskRect={x:68,y:36,width:297,height:10};
 overlapping.blocks[0].maskReviewed=true;
 assert.equal(await load(overlapping),null,'Masks over neighbouring text rejected');
 const wrong=base();
 wrong.page=12;
 assert.equal(await load(wrong),null,'Wrong-page API data rejected');
 assert.ok(source.includes('holder.append(mask)')&&source.includes('node.remove();unfitted++'),
  'Mask must be appended only after English fit checking');
 console.log('PASS: legacy, reviewed masks, bounds, collisions, identity and fit gate');
})().catch(e=>{console.error(e);process.exit(1);});
