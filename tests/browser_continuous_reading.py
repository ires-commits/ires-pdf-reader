#!/usr/bin/env python3
"""Chromium QA for the actual scientific continuous-reading functions (no paid API)."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

SOURCE = Path("ires-pdf-reader/assets/reader.js").read_text(encoding="utf-8")
start = SOURCE.index("  // Scientific English reading is one scrollable document")
end = SOURCE.index("  function renderReadingView(){", start)
production = SOURCE[start:end]
classifier_start = SOURCE.index("function scientificPagePresentation(")
classifier = SOURCE[classifier_start:SOURCE.index("async function render(",classifier_start)]
capture_start = SOURCE.index("  function capturePosition(){")
capture_end = SOURCE.index("  function selectedPassage(){",capture_start)
capture_position = SOURCE[capture_start:capture_end]
css = """
html,body{margin:0;background:#eaf0f4;font-family:Arial}
#reading{box-sizing:border-box;width:800px;max-width:100vw;height:620px;overflow-y:auto;
 background:#eaf0f4;padding:20px;border:1px solid #bbcbd4}
.ires-pdf-reading-stack{display:flex;flex-direction:column;gap:20px;max-width:720px;margin:18px auto}
.ires-pdf-reading-page{scroll-margin-top:12px}
.ires-pdf-reading-header,.ires-pdf-reading-article{background:white;padding:24px;border-radius:12px}
.ires-pdf-reading-article{min-height:280px}
.ires-pdf-reading-article p{font-size:16px;line-height:1.6;margin:0 0 20px}
.ires-pdf-reading-shared-target{background:#ffec94}
.ires-pdf-reading-page .ires-pdf-reading-article[hidden]{display:none}
.ires-pdf-reading-pdf{position:relative;margin:auto;background:#fff}
.ires-pdf-reading-pdf canvas{display:block}
.ires-pdf-reading-pdf .ires-pdf-translation-overlay{position:absolute;z-index:9}
"""
setup = r"""
const readingView=document.getElementById('reading');
const doc={numPages:13,getPage:async n=>({
 getViewport:({scale})=>({width:612*scale,height:792*scale,scale}),
 render:()=>({promise:Promise.resolve()}),
 getTextContent:async()=>({items:[]})
})};
const dpr=()=>1;
const pdfjs={renderTextLayer:()=>({promise:Promise.resolve()})};
const highlightText=()=>{};
const paintTranslationBlocks=(frame,entry,n)=>{
 for(const block of entry.blocks){const node=document.createElement('div');node.className='ires-pdf-translation-overlay ires-pdf-translation-overlay-ocr';node.textContent=block.translation;frame.append(node);}
 return {fitted:n===9?0:entry.blocks.length,unfitted:n===9?1:0};
};
const uiLang='it',readingI18n={title:'Versione inglese integrale',back:'PDF originale',wait:'Caricamento…'};
const language={value:'en'},current={value:''},bookmark={textContent:''};
let scientificPublicationId=95135,bookmarks=[],token=1,session=1;
let page=6,translationActivePage=6,readingMode=true,readingAutoOptOut=false;
let cachedSelection='',cachedPosition=null,readingLinkJumped=false;
const storageKey='ires-test-page',linkedViewReading=true,linkedText='Quote on page six';
const fromHash=6,linkedReadingPara=1,linkedReadingOffset=0;
const translationCache=new Map();
window.__requests=[];
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
};
const setReadingMode=()=>{};
const scientificStoredPage=async(_doc,n)=>{
 window.__requests.push(n);
 await new Promise(resolve=>setTimeout(resolve,35));
 const paragraphs=['Heading page '+n,'Quote on page six. Longer scholarly discussion about housing, scholarships and higher education in Piedmont.'];
 for(let j=0;j<12;j++)paragraphs.push('Paragraph '+j+' on page '+n+': Comparative regional statistics for public policy and university services with explanatory notes and methodological context.');
 return {scientific:true,readingComplete:true,scientificText:paragraphs.join('\n\n'),
  ocrOverlay:n===7||n===9,verifiedOverlay:n===7||n===9,partial:false,
  blocks:n===7||n===9?[{original:'Italiano',translation:'English approved text'}]:[]};
};
"""
suffix = """
window.__start=()=>renderScientificReadingView();
window.__jump=n=>jumpReadingPage(n);
window.__state=()=>({page,current:current.value,requested:window.__requests.slice(),
 loaded:readingPages.filter(p=>p.dataset.readingState==='ready').map(p=>Number(p.dataset.page))});
"""

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
        page=browser.new_page(viewport={"width": 960, "height": 800})
        try:
            page.set_content('<!doctype html><html><head><style>'+css+'</style></head><body><main id="reading"></main></body></html>')
            page.evaluate(setup+"\n"+classifier+"\n"+production+"\n"+capture_position+"\n"+suffix+"\nwindow.__start()")
            page.wait_for_function("document.querySelector('[data-page=\"6\"]').dataset.readingState==='ready'")
            page.wait_for_function("!!document.querySelector('.ires-pdf-reading-shared-target')")
            state=page.evaluate("window.__state()")
            assert state["page"]==6,state
            assert set(state["requested"]) <= {5,6,7},state
            mark=page.locator(".ires-pdf-reading-shared-target").inner_text()
            assert mark=="Quote on page six",mark
            selected=page.evaluate("""() => {
              const target=document.querySelector('.ires-pdf-reading-shared-target').firstChild;
              const range=document.createRange();range.setStart(target,0);range.setEnd(target,14);
              const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
              return capturePosition();
            }""")
            assert selected["reading"] is True and selected["page"]==6 and selected["rpara"]==1 and selected["roff"]==0,selected
            assert page.locator(".ires-pdf-reading-page").count()==13
            page.evaluate("window.__jump(7)")
            page.wait_for_function("document.querySelector('[data-page=\"7\"]').dataset.presentation==='overlay'")
            assert page.locator('[data-page="7"] .ires-pdf-reading-pdf canvas').count()==1
            assert page.locator('[data-page="7"] .ires-pdf-translation-overlay-ocr').count()==1
            page.evaluate("window.__jump(8)")
            page.wait_for_function("document.querySelector('[data-page=\"8\"]').dataset.readingState==='ready'")
            assert page.locator('[data-page="8"] .ires-pdf-reading-pdf').count()==0
            assert page.locator('[data-page="8"] .ires-pdf-reading-article p').count()>5
            page.evaluate("window.__jump(9)")
            page.wait_for_function("document.querySelector('[data-page=\"9\"]').dataset.readingState==='ready'")
            assert page.locator('[data-page="9"] .ires-pdf-reading-pdf').count()==0, "Overflow OCR falls back to complete English"
            assert page.locator('[data-page="9"] .ires-pdf-reading-article p').count()>5
            page.evaluate("window.__jump(7)")
            page.wait_for_function("window.__state().page===7")
            page.wait_for_function("document.querySelector('[data-page=\"7\"]').dataset.readingState==='ready'")
            frame=page.locator("#reading").bounding_box()
            page.mouse.move(frame["x"]+frame["width"]*.6,frame["y"]+frame["height"]*.7)
            page.mouse.wheel(0,1250)
            page.wait_for_function("window.__state().page>=8",timeout=6000)
            page.evaluate("window.__jump(12)")
            page.wait_for_function("window.__state().page===12")
            page.wait_for_function("document.querySelector('[data-page=\"12\"]').dataset.readingState==='ready'")
            state=page.evaluate("window.__state()")
            assert 12 in state["loaded"],state
            assert len(state["requested"])<13,"Reader fetched all pages instead of loading nearby"
            assert page.locator('[data-page="7"] .ires-pdf-reading-pdf-unloaded').count()==1
            page.evaluate("window.__jump(7)")
            page.wait_for_function("document.querySelector('[data-page=\"7\"]').dataset.readingState==='ready'")
            assert page.locator('[data-page="7"] .ires-pdf-reading-pdf canvas').count()==1, "Distant PDF reloaded"
            assert all(1<=n<=13 for n in state["requested"])
            page.screenshot(path="/tmp/ires-reader-continuous-english.png")
            print("PASS: continuous mixed OCR PDF / optimized English / overflow fallback / canvas unload and reload / citations")
            print(json.dumps(state,ensure_ascii=False))
        finally:
            browser.close()

if __name__=="__main__":
    main()
