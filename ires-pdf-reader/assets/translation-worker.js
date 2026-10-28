/* IRES PDF Reader: isolated browser translation worker.
 * Heavy ONNX inference must never execute on the UI thread. */
'use strict';
let factory=null;
const pipelines=new Map();
const models={'it-en':'Xenova/opus-mt-it-en','en-it':'Xenova/opus-mt-en-it'};
self.onmessage=async(event)=>{
 const {id,text,target}=event.data||{};
 try{
  const pair='it-'+target;
  if(!models[pair])throw Error('Modello locale non disponibile: '+pair);
  if(!factory){
   const lib=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
   lib.env.allowLocalModels=false;
   lib.env.useBrowserCache=true;
   factory=lib.pipeline;
  }
  if(!pipelines.has(pair))pipelines.set(pair,factory('translation',models[pair]));
  let translator;
  try{translator=await pipelines.get(pair);}catch(error){pipelines.delete(pair);throw error;}
  const result=await translator(text,{max_new_tokens:512});
  if(!result||!result[0]||typeof result[0].translation_text!=='string')throw Error('Risposta locale non valida');
  self.postMessage({id,translation:result[0].translation_text});
 }catch(error){self.postMessage({id,error:String(error&&error.message||error)});}
};
