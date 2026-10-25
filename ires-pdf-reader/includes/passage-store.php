<?php
if (!defined('ABSPATH')) exit;
/** Public, opaque, read-only share links for PDF passages. */
final class IRES_PDF_Passage_Store {
 const TABLE='ires_pdf_passages';
 static function table(){global $wpdb;return $wpdb->prefix.self::TABLE;}
 static function install(){
  global $wpdb;
  require_once ABSPATH.'wp-admin/includes/upgrade.php';
  $table=self::table();$charset=$wpdb->get_charset_collate();
  dbDelta("CREATE TABLE $table (
   id varchar(32) NOT NULL,
   pdf_url text NOT NULL,
   title varchar(255) NOT NULL DEFAULT '',
   page int unsigned NOT NULL,
   start_node int unsigned NOT NULL,
   start_offset int unsigned NOT NULL,
   end_node int unsigned NOT NULL,
   end_offset int unsigned NOT NULL,
   excerpt text NOT NULL,
   created_at datetime NOT NULL,
   PRIMARY KEY  (id),
   KEY created_at (created_at)
  ) $charset;");
  update_option('ires_pdf_passage_schema','1',false);
 }
 static function routes(){
  register_rest_route('ires-pdf-reader/v1','/passages',[
   'methods'=>'POST','callback'=>[__CLASS__,'create'],'permission_callback'=>'__return_true'
  ]);
  register_rest_route('ires-pdf-reader/v1','/passages/(?P<id>[a-f0-9]{24})',[
   'methods'=>'GET','callback'=>[__CLASS__,'get'],'permission_callback'=>'__return_true'
  ]);
 }
 static function create($request){
  global $wpdb;
  $origin=$request->get_header('origin');
  if($origin&&strtolower((string)wp_parse_url($origin,PHP_URL_HOST))!==strtolower((string)wp_parse_url(home_url(),PHP_URL_HOST)))
   return new WP_Error('ires_origin','Origine non autorizzata',['status'=>403]);
  $pdf=IRES_PDF_Reader::valid_pdf($request->get_param('pdf'));
  $title=sanitize_text_field((string)$request->get_param('title'));
  $page=filter_var($request->get_param('page'),FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>100000]]);
  $start=$request->get_param('start');$end=$request->get_param('end');
  $excerpt=sanitize_textarea_field((string)$request->get_param('text'));
  if(!$pdf||!$page||!is_array($start)||!is_array($end)||strlen($excerpt)<2||strlen($excerpt)>1200||strlen($title)>255)
   return new WP_Error('ires_invalid','Passaggio non valido',['status'=>400]);
  $values=[];
  foreach([$start[0]??null,$start[1]??null,$end[0]??null,$end[1]??null] as $value){
   if(!is_numeric($value)||filter_var($value,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>1000000]])===false)
    return new WP_Error('ires_position','Coordinate non valide',['status'=>400]);
   $values[]=(int)$value;
  }
  if($values[2]<$values[0]||($values[2]===$values[0]&&$values[3]<=$values[1]))
   return new WP_Error('ires_order','Intervallo non valido',['status'=>400]);
  // Lightweight IP rate limit; never store IP addresses in passage records.
  $ip=isset($_SERVER['REMOTE_ADDR'])?(string)$_SERVER['REMOTE_ADDR']:'';
  $key='ires_pdf_passage_rate_'.hash_hmac('sha256',$ip,wp_salt('auth'));
  $count=(int)get_transient($key);
  if($count>=30)return new WP_Error('ires_rate','Limite temporaneo raggiunto',['status'=>429]);
  set_transient($key,$count+1,HOUR_IN_SECONDS);
  $id=bin2hex(random_bytes(12));
  $ok=$wpdb->insert(self::table(),[
   'id'=>$id,'pdf_url'=>$pdf,'title'=>$title,'page'=>$page,
   'start_node'=>$values[0],'start_offset'=>$values[1],'end_node'=>$values[2],'end_offset'=>$values[3],
   'excerpt'=>$excerpt,'created_at'=>current_time('mysql',true)
  ],['%s','%s','%s','%d','%d','%d','%d','%d','%s','%s']);
  if(!$ok)return new WP_Error('ires_storage','Impossibile salvare il passaggio',['status'=>500]);
  return rest_ensure_response(['id'=>$id,'url'=>add_query_arg('ires_passage',$id,home_url('/'))]);
 }
 static function get($request){
  global $wpdb;
  $id=(string)$request['id'];
  $row=$wpdb->get_row($wpdb->prepare('SELECT * FROM '.self::table().' WHERE id=%s',$id),ARRAY_A);
  if(!$row)return new WP_Error('ires_missing','Passaggio non trovato',['status'=>404]);
  return rest_ensure_response([
   'pdf'=>$row['pdf_url'],'title'=>$row['title'],'page'=>(int)$row['page'],
   'start'=>[(int)$row['start_node'],(int)$row['start_offset']],
   'end'=>[(int)$row['end_node'],(int)$row['end_offset']],
   'text'=>$row['excerpt']
  ]);
 }
 static function redirect(){
  if(!isset($_GET['ires_passage']))return;
  $id=sanitize_text_field(wp_unslash($_GET['ires_passage']));
  if(!preg_match('/^[a-f0-9]{24}$/',$id)){status_header(404);wp_die('Passaggio non trovato');}
  $result=self::get(['id'=>$id]);
  if(is_wp_error($result)){status_header(404);wp_die('Passaggio non trovato');}
  $data=$result->get_data();
  if(!IRES_PDF_Reader::valid_pdf($data['pdf'])){status_header(404);wp_die('Documento non disponibile');}
  $url=add_query_arg(['ires_pdf_reader'=>'1','pdf'=>$data['pdf'],'title'=>$data['title'],'ires_pdf_auto'=>'1'],home_url('/'));
  $url.='#page='.$data['page'].'&start='.implode(',',$data['start']).'&end='.implode(',',$data['end']).'&text='.rawurlencode($data['text']);
  wp_safe_redirect($url,302);exit;
 }
}
