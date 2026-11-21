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
 return {schemaVersion:1,publicationId:95373,page:11,language:'en',pdfHash:'a'.repeat(64),
   coordinateSystem:'pdfjs-viewport-1',pageWidth:594.96,pageHeight:842.04,
   overlayAvailable:true,verifiedByAdmin:true,blocks:[first,next]};
};
async function load(data){
 const sandbox={URL,config:{scientificOcrApi:'https://example.com/wp-json/ires-ps/v1/ocr-overlay'},
  scientificPublicationId:95373,scientificPdfHash:'a'.repeat(64),url:'https://example.com/report.pdf',language:{value:'en'},
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
 const styled=base();
 styled.blocks[0].textColor='#0065b6';
 styled.blocks[0].fontWeight=700;
 const withStyles=await load(styled);
 assert.equal(withStyles.blocks[0].textColor,'#0065b6','Trusted ink must be preserved');
 assert.equal(withStyles.blocks[0].fontWeight,700,'Trusted weight must be preserved');
 assert.equal((await load(base())).blocks[0].textColor,null,'Legacy style stays default');
 const invalidColor=base();invalidColor.blocks[0].textColor='red; background:url(https://example.com)';
 assert.equal(await load(invalidColor),null,'Unsafe CSS color must be rejected');
 const invalidWeight=base();invalidWeight.blocks[0].fontWeight=999;
 assert.equal(await load(invalidWeight),null,'Unsupported weight must be rejected');
 assert.ok(source.includes('Math.min(72,block.fontSize*scale)'),
  'OCR font ceiling must scale with source PDF at high zoom');
 assert.ok(source.includes("node.style.setProperty('color',block.textColor,'important')"),
  'Per-block approved colors must override legacy OCR defaults');
 const sourceOnly=base();
 sourceOnly.blocks[0].maskMode='source-only';
 sourceOnly.blocks[0].maskRect={x:69,y:37.1,width:290,height:6.8};
 sourceOnly.blocks[0].maskReviewed=true;
 sourceOnly.blocks[0].maskFill='#ffe699';
 const sourceParsed=await load(sourceOnly);
 assert.ok(sourceParsed?.ocrOverlay,'Source-only mode may have smaller white mask');
 assert.equal(sourceParsed.blocks[0].maskMode,'source-only');
 assert.equal(sourceParsed.blocks[0].maskFill,'#ffe699');
 const badSource=base();
 badSource.blocks[0].maskMode='source-only';
 badSource.blocks[0].maskRect={x:65,y:30,width:302,height:12};
 badSource.blocks[0].maskReviewed=true;
 assert.equal(await load(badSource),null,'Source mask outside translated box must fail');
 const badBackground=base();
 badBackground.blocks[0].maskMode='source-only';
 badBackground.blocks[0].maskRect={x:69,y:37.1,width:290,height:6.8};
 badBackground.blocks[0].maskReviewed=true;
 badBackground.blocks[0].maskFill='red;filter:url(https://evil.example/)';
 assert.equal(await load(badBackground),null,'Arbitrary CSS background rejected');
 const noRect=base();
 noRect.blocks[0].maskMode='source-only';
 assert.equal(await load(noRect),null,'Source-only requires explicit reviewed rectangle');
 assert.ok(source.includes("node.dataset.maskMode='source-only'"),
   'Transparent source-only text behavior is applied when rendering');
 assert.ok(source.includes("mask.style.setProperty('background',block.maskFill,'important')"),
   'Validated sampled mask fill must be used at render time');
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
 const partial=base();partial.sourceBlocks=5;partial.partial=true;
 const partialParsed=await load(partial);
 assert.equal(partialParsed.partial,true,'Partial approval cannot be reported as complete page');
 assert.equal(partialParsed.sourceBlocks,5);
 const legacyCount=base();legacyCount.sourceBlocks=0;
 assert.ok(await load(legacyCount),'Legacy rows with no stored source count stay valid');
 const wrongHash=base();wrongHash.pdfHash='b'.repeat(64);
 assert.equal(await load(wrongHash),null,'Wrong PDF hash rejected');
 const wrong=base();
 wrong.page=12;
 assert.equal(await load(wrong),null,'Wrong-page API data rejected');
 assert.ok(source.includes('holder.append(mask)')&&source.includes('node.remove();unfitted++'),
  'Mask must be appended only after English fit checking');
 console.log('PASS: legacy, masks, color/weight whitelist, zoom and fit gate');
})().catch(e=>{console.error(e);process.exit(1);});

