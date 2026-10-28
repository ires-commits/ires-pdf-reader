<?php
if (!defined('ABSPATH')) exit;
/**
 * Optional server-side translation proxy. Disabled unless administrator configures
 * an HTTPS LibreTranslate-compatible endpoint. No API credentials reach the browser.
 */
final class IRES_PDF_Translation {
 static function routes(){
  register_rest_route('ires-pdf-reader/v1','/translate',[
   'methods'=>'POST','callback'=>[__CLASS__,'translate'],'permission_callback'=>'__return_true'
  ]);
 }
 static function translate($request){
  $provider=(string)get_option('ires_pdf_translation_provider','libretranslate');
  $api_key=(string)get_option('ires_pdf_translation_api_key','');
  if($provider==='deepl'){
   $endpoint='https://api-free.deepl.com/v2/translate';
   if(!$api_key)return new WP_Error('ires_translation_disabled','Inserisci la chiave API DeepL nelle impostazioni del lettore',['status'=>503]);
  }else{
   $endpoint=trim((string)get_option('ires_pdf_translation_endpoint',''));
   if(!$endpoint)return new WP_Error('ires_translation_disabled','Configura un endpoint LibreTranslate HTTPS nelle impostazioni',['status'=>503]);
  }
  $parts=wp_parse_url($endpoint);
  if(!$parts||($parts['scheme']??'')!=='https'||empty($parts['host'])||!wp_http_validate_url($endpoint))
   return new WP_Error('ires_translation_endpoint','Endpoint HTTPS non valido',['status'=>503]);
  $origin=$request->get_header('origin');
  if($origin&&strtolower((string)wp_parse_url($origin,PHP_URL_HOST))!==strtolower((string)wp_parse_url(home_url(),PHP_URL_HOST)))
   return new WP_Error('ires_translation_origin','Origine non autorizzata',['status'=>403]);
  $text=(string)$request->get_param('text');
  $source=strtolower(sanitize_text_field((string)$request->get_param('source')));
  $target=strtolower(sanitize_text_field((string)$request->get_param('target')));
  if(!$text||strlen($text)>10000||!preg_match('/^(auto|[a-z]{2}(?:-[a-z]{2})?)$/',$source)||!preg_match('/^[a-z]{2}(?:-[a-z]{2})?$/',$target))
   return new WP_Error('ires_translation_invalid','Richiesta non valida (massimo 10 KB)',['status'=>400]);
  $ip=isset($_SERVER['REMOTE_ADDR'])?(string)$_SERVER['REMOTE_ADDR']:'';
  $key='ires_pdf_translate_rate_'.hash_hmac('sha256',$ip,wp_salt('auth'));
  $count=(int)get_transient($key);
  if($count>=160)return new WP_Error('ires_translation_limit','Limite orario raggiunto',['status'=>429]);
  set_transient($key,$count+1,HOUR_IN_SECONDS);
  if($provider==='deepl'){
   $payload=['text'=>[$text],'target_lang'=>strtoupper($target)];
   if($source!=='auto')$payload['source_lang']=strtoupper($source);
   $headers=['Content-Type'=>'application/json','Authorization'=>'DeepL-Auth-Key '.$api_key];
  }else{
   $payload=['q'=>$text,'source'=>$source,'target'=>$target,'format'=>'text'];
   if($api_key!=='')$payload['api_key']=$api_key;
   $headers=['Content-Type'=>'application/json'];
  }
  $response=wp_safe_remote_post($endpoint,[
   'timeout'=>35,'redirection'=>0,'headers'=>$headers,
   'body'=>wp_json_encode($payload),'limit_response_size'=>200000
  ]);
  if(is_wp_error($response))return new WP_Error('ires_translation_unavailable','Servizio non raggiungibile',['status'=>502]);
  $http=wp_remote_retrieve_response_code($response);
  if($http!==200){
   $message=$http===429?'Limite richieste del servizio raggiunto':($http===403||$http===401?'Chiave API non valida o non autorizzata':'Servizio di traduzione non disponibile (HTTP '.$http.')');
   return new WP_Error('ires_translation_failed',$message,['status'=>502]);
  }
  $data=json_decode(wp_remote_retrieve_body($response),true);
  $translated=$provider==='deepl'?($data['translations'][0]['text']??null):($data['translatedText']??null);
  if(!is_string($translated))return new WP_Error('ires_translation_response','Risposta non valida',['status'=>502]);
  return rest_ensure_response(['translatedText'=>$translated]);
 }
}
