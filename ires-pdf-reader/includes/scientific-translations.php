<?php
if(!defined('ABSPATH'))exit;
/** Read-only adapter to IRES Produzione Scientifica English page translations. */
final class IRES_PDF_Scientific_Translations {
 static function routes(){
  register_rest_route('ires-pdf-reader/v1','/scientific-publication',[
   'methods'=>'GET','callback'=>[__CLASS__,'resolve'],'permission_callback'=>'__return_true',
   'args'=>['publication_id'=>['default'=>0,'type'=>'integer'],'pdf_url'=>['required'=>true,'type'=>'string']]
  ]);
  register_rest_route('ires-pdf-reader/v1','/scientific-translation',[
   'methods'=>'GET','callback'=>[__CLASS__,'read'],'permission_callback'=>'__return_true',
   'args'=>['publication_id'=>['required'=>true,'type'=>'integer'],'page'=>['required'=>true,'type'=>'integer'],'language'=>['default'=>'en','type'=>'string'],'pdf_url'=>['type'=>'string']]
  ]);
 }
 /** URL fragments identify a page, never a different PDF; queries remain significant. */
 static function pdf_identity($url){
  $url=IRES_PDF_Reader::valid_pdf($url);
  if(!$url)return '';
  $parts=wp_parse_url($url);
  return strtolower($parts['scheme']).'://'.strtolower($parts['host']).
   (isset($parts['port'])?':'.$parts['port']:'').($parts['path']??'/').
   (isset($parts['query'])?'?'.$parts['query']:'');
 }
 static function publication_pdf($id){
  if(!$id||get_post_type($id)!=='pubblicazione'||get_post_status($id)!=='publish')return [];
  if(function_exists('ires_ps_ft_pdf_data'))return (array)ires_ps_ft_pdf_data($id);
  // The saved scientific pages always refer to pdf_principale, even when the
  // Reader can also open other attachments belonging to the same publication.
  $value=get_post_meta($id,'pdf_principale',true);
  $attachment=is_numeric($value)?absint($value):(is_array($value)?absint($value['ID']??($value['id']??0)):0);
  $url=IRES_PDF_Reader::extract_pdf($value);
  if(!$attachment&&$url)$attachment=attachment_url_to_postid($url);
  $path=$attachment?get_attached_file($attachment):'';
  if(!$url||!$path||!is_readable($path))return [];
  return ['id'=>$attachment,'url'=>$url,'hash'=>hash_file('sha256',$path)];
 }
 static function matches_pdf($id,$url){
  $requested=self::pdf_identity($url);
  $pdf=self::publication_pdf($id);
  return $requested&&isset($pdf['url'])&&hash_equals(self::pdf_identity($pdf['url']),$requested)?$pdf:[];
 }
 static function resolve($request){
  global $wpdb;
  $url=self::pdf_identity((string)$request['pdf_url']);
  if(!$url)return new WP_Error('ires_pdf_scientific_url','PDF non valido',['status'=>400]);
  $id=absint($request['publication_id']);
  if(!$id){
   // Recover old dedicated links through an exact attachment/meta lookup, never
   // by title or a scan/hash of every PDF in the catalogue. Ambiguity fails closed.
   $attachment=attachment_url_to_postid($url);
   $values=[$url];if($attachment)$values[]=(string)$attachment;
   $placeholders=implode(',',array_fill(0,count($values),'%s'));
   $ids=(array)$wpdb->get_col($wpdb->prepare("SELECT DISTINCT p.ID FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON p.ID=m.post_id WHERE p.post_type='pubblicazione' AND p.post_status='publish' AND m.meta_key='pdf_principale' AND m.meta_value IN ($placeholders) LIMIT 2",$values));
   if(count($ids)!==1)return new WP_Error('ires_pdf_scientific_unbound','Nessuna pubblicazione univoca per questo PDF',['status'=>404]);
   $id=absint($ids[0]);
  }
  $pdf=self::matches_pdf($id,$url);
  if(!$pdf||empty($pdf['hash'])||!preg_match('/^[a-f0-9]{64}$/i',(string)$pdf['hash']))
   return new WP_Error('ires_pdf_scientific_mismatch','Il PDF non corrisponde alla pubblicazione',['status'=>409]);
  return rest_ensure_response(['publication_id'=>$id,'pdf_url'=>$pdf['url'],'pdf_hash'=>strtolower($pdf['hash'])]);
 }
 static function read($request){
  global $wpdb;
  $id=absint($request['publication_id']);$page=absint($request['page']);
  if(!$id||!$page||$page>100000||$request['language']!=='en'||get_post_type($id)!=='pubblicazione'||get_post_status($id)!=='publish')
   return new WP_Error('ires_pdf_scientific_invalid','Pubblicazione o pagina non valida',['status'=>404]);
  $pdf=self::publication_pdf($id);
  if(!empty($request['pdf_url'])&&!self::matches_pdf($id,(string)$request['pdf_url']))
   return new WP_Error('ires_pdf_scientific_mismatch','Il PDF non corrisponde alla pubblicazione',['status'=>409]);
  $table=$wpdb->prefix.'ires_ps_translated_pages';
  if($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like($table)))!==$table)
   return new WP_Error('ires_pdf_scientific_unavailable','Archivio traduzioni non disponibile',['status'=>404]);
  $row=$wpdb->get_row($wpdb->prepare("SELECT pdf_hash,source_hash,translated_text FROM `".esc_sql($table)."` WHERE publication_id=%d AND page_number=%d AND language='en' LIMIT 1",$id,$page));
  if(!$row||trim((string)$row->translated_text)==='')return new WP_Error('ires_pdf_scientific_missing','Traduzione non disponibile',['status'=>404]);
  $current_hash=(string)($pdf['hash']??'');
  if(!$current_hash||!hash_equals(strtolower($current_hash),strtolower((string)$row->pdf_hash)))
   return new WP_Error('ires_pdf_scientific_stale','Traduzione riferita a una versione precedente del PDF',['status'=>404]);
  $text=(string)$row->translated_text;
  return rest_ensure_response(['publication_id'=>$id,'page'=>$page,'language'=>'en','pdf_hash'=>strtolower($current_hash),'translation'=>$text,'source'=>'ires-produzione-scientifica']);
 }
}

