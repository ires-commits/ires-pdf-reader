#!/usr/bin/env python3
"""Real Reader function test on a deterministic PDF-like canvas (NOT live WordPress).

Extracts the exact OCR API parser and showOverlays renderer from reader.js,
then exercises reviewed source-only masks at desktop/mobile sizes and 4 zooms.
"""
import argparse
import json
import shutil
from io import BytesIO
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

def source_functions(source):
    def part(start, end):
        i=source.index(start)
        return source[i:source.index(end,i)]
    return (
        part("async function scientificApprovedOcr(doc,number){",
             "async function scientificStoredPage("),
        part("function paintTranslationBlocks(","function visiblePageForTranslation(){")
    )

def record(legacy=False,reviewed=True):
    blocks=[
      {"id":"cap","original":"Tabella 1","translation":"Table 1","kind":"caption",
       "x":70,"y":100,"width":240,"height":25,"fontSize":13,
       "textColor":"#0065b6","fontWeight":700},
      {"id":"cell","original":"Totale","translation":"Total","kind":"text",
       "x":80,"y":156,"width":175,"height":20,"fontSize":10,
       "maskRect":{"x":80,"y":156,"width":32,"height":16},
       "maskReviewed":reviewed,"maskMode":"source-only","maskFill":"#ffe699"}
    ]
    if legacy:
        blocks=[{"id":"v1","original":"Italian source","translation":"English source",
                 "x":70,"y":100,"width":300,"height":25,"fontSize":12,"kind":"heading"}]
    return {
      "schemaVersion":1,"publicationId":95373,"page":22,"language":"en","pdfHash":"a"*64,
      "coordinateSystem":"pdfjs-viewport-1","pageWidth":595,"pageHeight":842,
      "overlayAvailable":True,"verifiedByAdmin":True,"blocks":blocks
    }

def html(parser,renderer,scale,d):
    data=json.dumps(d,ensure_ascii=False)
    css="""
    body{margin:0;background:#e9eef4;font-family:Arial}
    #slot{position:relative;margin:0 auto;background:#fff}
    #slot canvas{display:block}
    .ires-pdf-translation-overlay{position:absolute;z-index:9;display:block;
      box-sizing:border-box;overflow:hidden!important;overflow-wrap:break-word!important;
      white-space:normal!important;line-height:1.11!important;background:#fff!important;
      font-family:Arial!important;padding:0!important;margin:0!important}
    .ires-pdf-translation-overlay[data-mask-mode="source-only"]{background:transparent!important}
    .ires-pdf-translation-mask{position:absolute!important;z-index:8!important;
      box-sizing:border-box!important;background:#fff!important;pointer-events:none!important}
    """
    script="""
    const data=__DATA__;
    const scientificPdfHash='a'.repeat(64),url='https://example.com/report.pdf';
    const scientificPublicationId=95373,config={scientificOcrApi:'https://example.com/ocr'};
    const language={value:'en'},page=22,scale=__SCALE__;
    const doc={getPage:async()=>({getViewport:()=>({width:595,height:842})})};
    const fetch=async()=>({ok:true,json:async()=>data});
    const singlePage=document.querySelector('#slot'),viewport=singlePage;
    const translationStatus=document.querySelector('#status'),translationCache=new Map();
    const translationMode=true,continuous=false,slots=[],readingMode=false;
    const el=(tag,cls,txt)=>{const n=document.createElement(tag);n.className=cls;
      if(txt!==undefined)n.textContent=txt;return n};
    const cleanTranslatedText=t=>t;
    const clearOverlays=()=>singlePage.querySelectorAll(
      '.ires-pdf-translation-overlay,.ires-pdf-translation-mask').forEach(n=>n.remove());
    const clearTranslationLoading=()=>{},showTableProtection=()=>{},
      pageTranslationPanel=()=>{},showTranslationLoading=()=>{};
    const visiblePageForTranslation=()=>22,renderReadingView=()=>{};
    __PARSER__
    __RENDERER__
    const cv=document.querySelector('canvas'),ctx=cv.getContext('2d');
    ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,595,842);
    ctx.fillStyle='#ffe699';ctx.fillRect(70,150,150,42);
    ctx.strokeStyle='#333';ctx.lineWidth=.4;
    [150,192].forEach(y=>{ctx.beginPath();ctx.moveTo(70,y);ctx.lineTo(520,y);ctx.stroke()});
    ctx.fillStyle='#111';ctx.font='11px Arial';
    ctx.fillText('Totale',80,168);ctx.fillText('2025',264,168);
    ctx.beginPath();ctx.moveTo(220,150);ctx.lineTo(220,192);ctx.stroke();
    (async()=>{
      const parsed=await scientificApprovedOcr(doc,22);
      if(parsed){translationCache.set('en:22',parsed);showOverlays()}
      const texts=Array.from(singlePage.querySelectorAll('.ires-pdf-translation-overlay'));
      const mask=singlePage.querySelector('.ires-pdf-translation-mask');
      window.__qa={
        accepted:!!parsed,expected:data.blocks.length,shown:texts.length,
        masks:singlePage.querySelectorAll('.ires-pdf-translation-mask').length,
        unfit:texts.filter(n=>n.scrollHeight>n.clientHeight+2).length,
        mode:texts.find(n=>n.dataset.maskMode)?.dataset.maskMode,
        transparent:getComputedStyle(texts.find(n=>n.dataset.maskMode)||cv).backgroundColor,
        sampledBackground:mask?getComputedStyle(mask).backgroundColor:null
      };
    })();
    """
    script=(script.replace("__DATA__",data).replace("__SCALE__",str(scale))
      .replace("__PARSER__",parser).replace("__RENDERER__",renderer))
    return ('<!doctype html><html><head><meta charset="utf-8"><style>'+css+
      '</style></head><body><div id="slot" style="width:'+str(595*scale)+
      'px;height:'+str(842*scale)+'px"><canvas width="'+str(round(595*scale))+
      '" height="'+str(round(842*scale))+'"></canvas></div><div id="status"></div><script>'+
      script+'</script></body></html>')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--source',default='ires-pdf-reader/assets/reader.js')
    p.add_argument('--output',default='ocr-browser-qa')
    args=p.parse_args()
    src=Path(args.source).read_text(encoding='utf-8')
    parser,renderer=source_functions(src)
    output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
    executable=shutil.which('google-chrome') or shutil.which('chromium')
    checks=[]
    with sync_playwright() as browser:
        kwargs={"headless":True,"args":["--no-sandbox","--disable-dev-shm-usage"]}
        if executable:kwargs["executable_path"]=executable
        chrome=browser.chromium.launch(**kwargs)
        for scale in (.75,1,1.5,2):
            for width in (390,1366):
                tab=chrome.new_page(viewport={"width":width,"height":900})
                tab.set_content(html(parser,renderer,scale,record()))
                tab.wait_for_function('window.__qa !== undefined')
                qa=tab.evaluate('window.__qa')
                assert qa["accepted"] and qa["shown"]==2 and qa["masks"]==1 and qa["unfit"]==0,qa
                assert qa["mode"]=="source-only" and qa["transparent"]=="rgba(0, 0, 0, 0)",qa
                assert qa["sampledBackground"]=="rgb(255, 230, 153)",qa
                checks.append({"zoom":scale,"viewport":width,**qa})
                if width==1366 and scale in (1,2):
                    # The composite screenshot (not just canvas) must retain
                    # the native vertical gridline, numeric value and cell ink.
                    image=Image.open(BytesIO(tab.locator('#slot').screenshot())).convert('RGB')
                    original=Image.open(BytesIO(tab.locator('canvas').screenshot())).convert('RGB')
                    protected=[(219,178,222,190), (260,155,295,176), (140,180,175,189)]
                    for roi in protected:
                        scaled=tuple(round(z*scale) for z in roi)
                        assert image.crop(scaled).tobytes()==original.crop(scaled).tobytes(), (
                            'Protected grid, number or colour changed',scale,scaled)
                    tab.locator('#slot').screenshot(path=str(output/f'ocr-{round(scale*100)}.png'))
                tab.close()
        for label,d,expect in [
          ("unreviewed",record(reviewed=False),False),
          ("legacy-v1",record(legacy=True),True),
        ]:
            tab=chrome.new_page()
            tab.set_content(html(parser,renderer,1,d))
            tab.wait_for_function('window.__qa !== undefined')
            got=tab.evaluate('window.__qa')
            assert got['accepted'] is expect,(label,got)
            checks.append({"case":label,**got})
            tab.close()
        chrome.close()
    (output/'result.json').write_text(json.dumps({
      "passed":True,"checks":checks,"count":len(checks),
      "liveWordPressSiteVerified":False,
      "note":"Deterministic canvas, exact reader.js parser+renderer. Human PDF visual QA remains necessary."
    },indent=2))
    print("PASS: "+str(len(checks))+" actual Reader parser/renderer checks (browser smoke)")

if __name__=='__main__':
    main()

