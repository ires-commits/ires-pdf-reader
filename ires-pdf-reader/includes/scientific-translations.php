<?php
if(!defined('ABSPATH'))exit;
/** Read-only adapter to IRES Produzione Scientifica English page translations. */
final class IRES_PDF_Scientific_Translations {
 static function routes(){register_rest_route('ires-pdf-reader/v1','/scientific-translation',[
  'methods'=>'GET','callback'=>[__CLASS__,'read'],'permission_callback'=>'__return_true',
  'args'=>['publication_id'=>['required'=>true,'type'=>'integer'],'page'=>['required'=>true,'type'=>'integer'],'language'=>['default'=>'en','type'=>'string']]
 ]);}
 static function read($request){
  global $wpdb;
  $id=absint($request['publication_id']);$page=absint($request['page']);
  if(!$id||!$page||$page>100000||$request['language']!=='en'||get_post_type($id)!=='pubblicazione'||get_post_status($id)!=='publish')
   return new WP_Error('ires_pdf_scientific_invalid','Pubblicazione o pagina non valida',['status'=>404]);
  $table=$wpdb->prefix.'ires_ps_translated_pages';
  if($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like($table)))!==$table)
   return new WP_Error('ires_pdf_scientific_unavailable','Archivio traduzioni non disponibile',['status'=>404]);
  $row=$wpdb->get_row($wpdb->prepare("SELECT pdf_hash,source_hash,translated_text FROM `".esc_sql($table)."` WHERE publication_id=%d AND page_number=%d AND language='en' LIMIT 1",$id,$page));
  if(!$row||trim((string)$row->translated_text)==='')return new WP_Error('ires_pdf_scientific_missing','Traduzione non disponibile',['status'=>404]);
  $current_hash=(string)get_post_meta($id,'_ires_pdf_index_hash',true);
  if(!$current_hash||!hash_equals(strtolower($current_hash),strtolower((string)$row->pdf_hash)))
   return new WP_Error('ires_pdf_scientific_stale','Traduzione riferita a una versione precedente del PDF',['status'=>404]);
  $text=(string)$row->translated_text;
  return rest_ensure_response(['publication_id'=>$id,'page'=>$page,'language'=>'en','translation'=>$text,'source'=>'ires-produzione-scientifica']);
 }
}
