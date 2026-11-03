<?php
if(!defined('ABSPATH'))exit;
/**
 * English pretranslation: safe inventory/preflight only.
 * No API call or billable job is launched from this dashboard.
 */
final class IRES_PDF_Translation_Batch {
 static function init(){
  add_action('admin_menu',[__CLASS__,'menu'],30);
  add_action('admin_post_ires_pdf_batch_inventory',[__CLASS__,'inventory']);
 }
 static function menu(){
  add_submenu_page('edit.php?post_type=pubblicazione','Traduzioni AI','Traduzioni AI','manage_options','ires-pdf-translation-batch',[__CLASS__,'page']);
 }
 static function inventory(){
  if(!current_user_can('manage_options'))wp_die('Non autorizzato');
  check_admin_referer('ires_pdf_batch_inventory');
  $ids=get_posts(['post_type'=>'pubblicazione','post_status'=>['publish','draft','private'],'fields'=>'ids','posts_per_page'=>-1,'orderby'=>'ID','order'=>'ASC']);
  $stats=['scanned'=>count($ids),'pdf'=>0,'missing'=>0,'urls'=>[],'generated_at'=>current_time('mysql')];
  foreach($ids as $id){
   $keys=array_filter(array_unique([get_option('ires_pdf_reader_meta_key',''),'pdf_principale','pdf','file_pdf','documento_pdf','pdf_file','documento_principale','file_principale','pubblicazione_pdf']));
   $url='';
   foreach($keys as $key){$url=IRES_PDF_Reader::extract_pdf(get_post_meta($id,$key,true));if($url)break;}
   if(!$url&&function_exists('get_fields')){
    $fields=get_fields($id);
    if(is_array($fields))foreach($fields as $key=>$value){
     if(stripos((string)$key,'pdf')===false&&stripos((string)$key,'document')===false)continue;
     $url=IRES_PDF_Reader::extract_pdf($value);if($url)break;
    }
   }
   if($url){$stats['pdf']++;$stats['urls'][]=['id'=>(int)$id,'url'=>$url];}
   else $stats['missing']++;
  }
  update_option('ires_pdf_batch_inventory_v1',$stats,false);
  wp_safe_redirect(admin_url('edit.php?post_type=pubblicazione&page=ires-pdf-translation-batch&inventory=1'));exit;
 }
 static function page(){
  if(!current_user_can('manage_options'))return;
  $stats=get_option('ires_pdf_batch_inventory_v1',[]);
  global $wpdb;
  $table=IRES_PDF_Translation_Cache::table();
  $cached=$wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s",$wpdb->esc_like($table)));
  $saved=$cached===$table?(int)$wpdb->get_var("SELECT COUNT(*) FROM `".esc_sql($table)."`"):0;
  echo '<div class="wrap"><h1>Traduzioni AI — Inglese</h1>';
  echo '<p>Fase 1: inventario dei PDF e verifica della copertura. <strong>Nessuna chiamata AI o spesa viene avviata da questa pagina.</strong></p>';
  echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'"><input type="hidden" name="action" value="ires_pdf_batch_inventory">';
  wp_nonce_field('ires_pdf_batch_inventory');
  submit_button('Scansiona pubblicazioni e PDF','primary','submit',false);echo '</form>';
  if($stats){
   echo '<h2>Ultimo inventario</h2><table class="widefat striped" style="max-width:720px"><tbody>';
   foreach(['Data'=>'generated_at','Pubblicazioni'=>'scanned','PDF individuati'=>'pdf','Senza PDF riconosciuto'=>'missing'] as $label=>$key)
    echo '<tr><th>'.esc_html($label).'</th><td>'.esc_html((string)($stats[$key]??'—')).'</td></tr>';
   echo '<tr><th>Record già presenti nella tabella delle traduzioni</th><td>'.esc_html((string)$saved).'</td></tr></tbody></table>';
   echo '<p><small>Il numero di record esistenti non indica necessariamente pagine inglesi complete: la cache attuale non memorizza lingua e stato in colonne interrogabili.</small></p>';
  }
  echo '<h2>Passaggi successivi</h2><p>Estrarre il testo e le geometrie di ogni pagina, normalizzare le chiavi condivise con PDF.js, stimare i token e verificare le tabelle. Solo dopo questi controlli abilitare la coda AI con tetto di spesa e ripresa automatica.</p>';
  echo '</div>';
 }
}
