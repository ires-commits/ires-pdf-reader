<?php
if(!defined('ABSPATH'))exit;
/**
 * Shared page translation cache. Public reads; only administrators can publish.
 * Cache keys include PDF fingerprint, source-text digest, page and language.
 */
final class IRES_PDF_Translation_Cache {
 const SCHEMA='1';
 static function table(){global $wpdb;return $wpdb->prefix.'ires_pdf_translation_pages';}
 static function install(){
  global $wpdb;
  require_once ABSPATH.'wp-admin/includes/upgrade.php';
  $table=self::table();$charset=$wpdb->get_charset_collate();
  dbDelta("CREATE TABLE $table (
   cache_key char(64) NOT NULL,
   payload longtext NOT NULL,
   updated_at datetime NOT NULL,
   PRIMARY KEY  (cache_key)
  ) $charset;");
  update_option('ires_pdf_translation_cache_schema',self::SCHEMA,false);
 }
 static function routes(){
  register_rest_route('ires-pdf-reader/v1','/translation-cache',[
   ['methods'=>'GET','callback'=>[__CLASS__,'read'],'permission_callback'=>'__return_true'],
   ['methods'=>'POST','callback'=>[__CLASS__,'write'],'permission_callback'=>function(){return current_user_can('manage_options');}]
  ]);
 }
 static function key($request){
  $raw=(string)$request->get_param('key');
  return preg_match('/^v1:[a-fA-F0-9]{8,128}:[1-9][0-9]{0,5}:[a-z]{2}:[a-f0-9]{64}$/',$raw)?hash('sha256',$raw):null;
 }
 static function read($request){
  global $wpdb;
  $key=self::key($request);
  if(!$key)return new WP_Error('ires_cache_key','Invalid cache key',['status'=>400]);
  $row=$wpdb->get_var($wpdb->prepare('SELECT payload FROM '.self::table().' WHERE cache_key=%s',$key));
  if(!is_string($row))return new WP_Error('ires_cache_miss','Not cached',['status'=>404]);
  $payload=json_decode($row,true);
  return is_array($payload)?rest_ensure_response($payload):new WP_Error('ires_cache_corrupt','Invalid cached entry',['status'=>404]);
 }
 static function write($request){
  global $wpdb;
  $key=self::key($request);
  if(!$key)return new WP_Error('ires_cache_key','Invalid cache key',['status'=>400]);
  $payload=$request->get_param('entry');
  if(!is_array($payload)||!isset($payload['blocks'],$payload['original'],$payload['translation'])||!is_array($payload['blocks'])||count($payload['blocks'])>250||!is_string($payload['original'])||!is_string($payload['translation']))
   return new WP_Error('ires_cache_payload','Invalid translation entry',['status'=>400]);
  foreach($payload['blocks'] as $block){
   if(!is_array($block)||!isset($block['translation'],$block['original'],$block['x'],$block['y'],$block['width'],$block['height'],$block['fontSize'])||!is_string($block['translation'])||!is_string($block['original']))return new WP_Error('ires_cache_blocks','Invalid block',['status'=>400]);
   foreach(['x','y','width','height','fontSize'] as $n){if(!is_numeric($block[$n])||abs((float)$block[$n])>100000)return new WP_Error('ires_cache_geometry','Invalid geometry',['status'=>400]);}
  }
  $json=wp_json_encode($payload,JSON_INVALID_UTF8_SUBSTITUTE);
  if(!$json||strlen($json)>250000)return new WP_Error('ires_cache_size','Cache entry too large',['status'=>413]);
  $ok=$wpdb->replace(self::table(),['cache_key'=>$key,'payload'=>$json,'updated_at'=>current_time('mysql',true)],['%s','%s','%s']);
  if($ok===false)return new WP_Error('ires_cache_write','Cache unavailable',['status'=>500]);
  return rest_ensure_response(['saved'=>true]);
 }
}
