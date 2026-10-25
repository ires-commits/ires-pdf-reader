<?php
/**
 * Plugin Name: IRES PDF Reader
 * Description: Lettore PDF responsive con overlay, pagina dedicata e integrazione pubblicazioni.
 * Version: 2.4.0
 * Update URI: https://github.com/ires-commits/ires-pdf-reader
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * Text Domain: ires-pdf-reader
 */
if (!defined('ABSPATH')) exit;
require_once __DIR__.'/includes/github-updater.php';
require_once __DIR__.'/includes/passage-store.php';
require_once __DIR__.'/includes/translation.php';
register_activation_hook(__FILE__,['IRES_PDF_Passage_Store','install']);
final class IRES_PDF_Reader {
 const VERSION='2.4.0';
 static function init() {
  add_action('init',function(){if(get_option('ires_pdf_passage_schema')!=='1')IRES_PDF_Passage_Store::install();});
  add_action('rest_api_init',['IRES_PDF_Passage_Store','routes']);
  add_action('rest_api_init',['IRES_PDF_Translation','routes']);
  add_action('template_redirect',['IRES_PDF_Passage_Store','redirect'],-1);
  add_shortcode('ires_pdf_reader',[__CLASS__,'shortcode']);
  add_action('wp_enqueue_scripts',[__CLASS__,'assets']);
  add_action('template_redirect',[__CLASS__,'dedicated'],0);
  add_filter('redirect_canonical',[__CLASS__,'preserve_shared_reader'],10,2);
  add_action('admin_menu',[__CLASS__,'admin_menu']);
  add_action('admin_init',[__CLASS__,'register_settings']);
  add_filter('the_content',[__CLASS__,'integrate_publication'],30);
 }
 static function register_settings() {
  register_setting('ires_pdf_reader','ires_pdf_reader_integration',['type'=>'boolean','sanitize_callback'=>'rest_sanitize_boolean','default'=>true]);
  register_setting('ires_pdf_reader','ires_pdf_translation_endpoint',['type'=>'string','sanitize_callback'=>'esc_url_raw','default'=>'']);
  register_setting('ires_pdf_reader','ires_pdf_translation_api_key',['type'=>'string','sanitize_callback'=>'sanitize_text_field','default'=>'']);
  register_setting('ires_pdf_reader','ires_pdf_reader_meta_key',['type'=>'string','sanitize_callback'=>'sanitize_key','default'=>'']);
 }
 static function admin_menu() { add_options_page('IRES PDF Reader','IRES PDF Reader','manage_options','ires-pdf-reader',[__CLASS__,'settings_page']); }
 static function settings_page() {
  if(!current_user_can('manage_options'))return;
  echo '<div class="wrap"><h1>IRES PDF Reader</h1><p>Shortcode: <code>[ires_pdf_reader url="https://esempio.it/documento.pdf" title="Documento"]</code></p><form method="post" action="options.php">';
  settings_fields('ires_pdf_reader');
  echo '<input type="hidden" name="ires_pdf_reader_integration" value="0">';
  echo '<p><label><input type="checkbox" name="ires_pdf_reader_integration" value="1" '.checked(get_option('ires_pdf_reader_integration',true),true,false).'> Integrazione automatica nelle pubblicazioni</label></p>';
  echo '<p><label>Chiave campo PDF ACF: <input name="ires_pdf_reader_meta_key" value="'.esc_attr(get_option('ires_pdf_reader_meta_key','')).'"></label></p>';
  echo '<hr><h2>Traduzione (facoltativa)</h2><p>Per i browser senza traduzione locale, puoi configurare un servizio HTTPS compatibile con LibreTranslate. Il testo viene inviato al servizio solo quando un lettore preme Traduci. Lascia vuoto per disabilitare il servizio remoto.</p>';
  echo '<p><label>Endpoint HTTPS: <input class="regular-text" type="url" name="ires_pdf_translation_endpoint" value="'.esc_attr(get_option('ires_pdf_translation_endpoint','')).'" placeholder="https://servizio.example/translate"></label></p>';
  echo '<p><label>Chiave API (se richiesta): <input class="regular-text" type="password" autocomplete="new-password" name="ires_pdf_translation_api_key" value="'.esc_attr(get_option('ires_pdf_translation_api_key','')).'"></label></p>';
  submit_button();echo '</form>';
  $diag=IRES_PDF_GitHub_Updater::diagnostics();
  echo '<hr><h2>Diagnostica aggiornamenti GitHub</h2>';
  echo '<p>Versione installata: <strong>'.esc_html(self::VERSION).'</strong></p>';
  echo '<p>Ultima release GitHub: <strong>'.esc_html($diag['release']['version']??'Non disponibile').'</strong></p>';
  echo '<p>Aggiornamento rilevato da WordPress: <strong>'.($diag['detected']?'Si':'No').'</strong></p>';
  echo '<p>Ultimo controllo WordPress: '.($diag['checked']?esc_html(wp_date('d/m/Y H:i:s',$diag['checked'])):'Mai').'</p>';
  if(current_user_can('update_plugins'))echo '<p><a class="button button-secondary" href="'.esc_url(wp_nonce_url(admin_url('admin-post.php?action=ires_pdf_check_updates'),'ires_pdf_check_updates')).'">Controlla aggiornamenti adesso</a></p>';
  if(isset($_GET['ires_pdf_upgrade'])) {
   $state=sanitize_key(wp_unslash($_GET['ires_pdf_upgrade']));
   $messages=['success'=>'Aggiornamento completato.','failed'=>'Aggiornamento non riuscito: controlla i log del server e la pagina Plugin.','current'=>'Il plugin e gia aggiornato.','unavailable'=>'Impossibile leggere la release GitHub.','busy'=>'Un aggiornamento e gia in corso.','activation_failed'=>'File aggiornati, ma la riattivazione automatica non e riuscita: verifica la pagina Plugin.'];
   if(isset($messages[$state]))echo '<div class="notice '.($state==='success'?'notice-success':'notice-warning').'"><p>'.esc_html($messages[$state]).'</p></div>';
  }
  $remote=$diag['release']['version']??'';
  if(current_user_can('update_plugins')&&$remote&&version_compare($remote,self::VERSION,'>')) {
   echo '<h2>Aggiorna IRES PDF Reader</h2><p>Nuova versione disponibile: <strong>'.esc_html($remote).'</strong>. Sara aggiornato soltanto questo plugin.</p>';
   echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'">';
   echo '<input type="hidden" name="action" value="ires_pdf_install_update">';
   wp_nonce_field('ires_pdf_install_update');
   submit_button('Aggiorna ora alla versione '.esc_html($remote),'primary','submit',false);
   echo '</form>';
  }
  echo '</div>';
 }
 static function valid_pdf($url) {
  if(!is_string($url)||strlen($url)>4096)return '';
  $url=esc_url_raw($url,['http','https']);if(!$url)return '';
  $parts=wp_parse_url($url);$site=wp_parse_url(home_url());
  if(!is_array($parts)||!is_array($site)||empty($parts['host'])||empty($site['host'])||!in_array(strtolower($parts['scheme']??''),['http','https'],true))return '';
  if(isset($parts['user'])||isset($parts['pass']))return '';
  $site_host=strtolower($site['host']);
  $base_host=preg_replace('/^www\\./','',$site_host);
  $hosts=apply_filters('ires_pdf_reader_allowed_hosts',[$base_host,'www.'.$base_host]);
  if(!is_array($hosts)||!in_array(strtolower($parts['host']),array_map('strtolower',$hosts),true))return '';
  if(!preg_match('/\.pdf$/i',$parts['path']??'')&&!apply_filters('ires_pdf_reader_allow_non_pdf_url',false,$url))return '';
  return $url;
 }
 static function assets() {
  wp_enqueue_style('ires-pdf-reader',plugins_url('assets/reader.css',__FILE__),[],self::VERSION);
  wp_enqueue_script('ires-pdf-reader-pdfjs',plugins_url('vendor/pdfjs/pdf.min.js',__FILE__),[],self::VERSION,true);
  wp_enqueue_script('ires-pdf-reader',plugins_url('assets/reader.js',__FILE__),['ires-pdf-reader-pdfjs'],self::VERSION,true);
  wp_add_inline_script('ires-pdf-reader','window.iresPdfReader='.wp_json_encode(['pdfjsUrl'=>plugins_url('vendor/pdfjs/pdf.min.js',__FILE__),'workerUrl'=>plugins_url('vendor/pdfjs/pdf.worker.min.js',__FILE__),'dedicatedUrl'=>home_url('/'),'passageApi'=>rest_url('ires-pdf-reader/v1/passages'),'translationApi'=>rest_url('ires-pdf-reader/v1/translate'),'translationRemote'=>!!get_option('ires_pdf_translation_endpoint','')]).';','before');
 }
 static function shortcode($atts) {
  $a=shortcode_atts(['url'=>'','title'=>'Documento PDF','mode'=>'both','label'=>'Leggi il PDF'],$atts,'ires_pdf_reader');
  $url=self::valid_pdf($a['url']);
  if(!$url){
   if(current_user_can('manage_options'))return '<span class="ires-pdf-error" role="alert">IRES PDF Reader: URL PDF non valido o dominio non autorizzato. Controlla l’indirizzo del file e il dominio configurato in WordPress.</span>';
   return '';
  }
  $page=add_query_arg(['ires_pdf_reader'=>'1','pdf'=>$url,'title'=>$a['title']],home_url('/'));
  $out='<span class="ires-pdf-actions">';
  if($a['mode']!=='page')$out.='<button type="button" class="ires-pdf-open" data-pdf="'.esc_attr($url).'" data-title="'.esc_attr($a['title']).'">'.esc_html($a['label']).'</button>';
  if($a['mode']!=='overlay')$out.='<a class="ires-pdf-page-link" href="'.esc_url($page).'">Apri a pagina intera</a>';
  return $out.'</span>';
 }
 static function extract_pdf($value) {
  if(is_numeric($value))$value=wp_get_attachment_url((int)$value);
  if(is_array($value)) {
   if(isset($value['url']))$value=$value['url'];
   elseif(isset($value['ID']))$value=wp_get_attachment_url((int)$value['ID']);
   else return '';
  }
  return self::valid_pdf($value);
 }
 static function integrate_publication($content) {
  if(!is_singular('pubblicazione')||!in_the_loop()||!is_main_query()||!get_option('ires_pdf_reader_integration',true))return $content;
  $id=get_the_ID();if(!$id)return $content;
  $keys=array_filter(array_unique([get_option('ires_pdf_reader_meta_key',''),'pdf_principale','pdf','file_pdf','documento_pdf','pdf_file','documento_principale','file_principale','pubblicazione_pdf']));
  $url='';
  foreach($keys as $key){$url=self::extract_pdf(get_post_meta($id,$key,true));if($url)break;}
  if(!$url&&function_exists('get_fields')) {
   $fields=get_fields($id);
   if(is_array($fields))foreach($fields as $key=>$value) {
    if(stripos((string)$key,'pdf')===false&&stripos((string)$key,'document')===false)continue;
    $url=self::extract_pdf($value);if($url)break;
   }
  }
  if(!$url)return $content;
  return $content.'<section class="ires-pdf-integrated"><h3>Consulta la pubblicazione</h3>'.self::shortcode(['url'=>$url,'title'=>get_the_title($id)]).'</section>';
 }
 static function preserve_shared_reader($redirect,$requested) {
  return (isset($_GET['ires_pdf_reader']) && $_GET['ires_pdf_reader']==='1') || isset($_GET['ires_passage']) ? false : $redirect;
 }
 static function dedicated() {
  if(!isset($_GET['ires_pdf_reader'])||$_GET['ires_pdf_reader']!=='1')return;
  $url=self::valid_pdf(isset($_GET['pdf'])?wp_unslash($_GET['pdf']):'');
  if(!$url){status_header(400);wp_die('PDF non valido o non autorizzato.');}
  $title=isset($_GET['title'])?sanitize_text_field(wp_unslash($_GET['title'])):'Documento PDF';
  nocache_headers();
  self::assets();
  ?><!doctype html><html <?php language_attributes(); ?>><head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?php echo esc_html($title); ?></title><?php wp_head(); ?></head><body class="ires-pdf-dedicated"><header class="ires-pdf-dedicated-header"><strong><?php echo esc_html($title); ?></strong><a href="<?php echo esc_url($url); ?>" download>Scarica PDF</a></header><main class="ires-pdf-dedicated-root" data-pdf="<?php echo esc_attr($url); ?>" data-title="<?php echo esc_attr($title); ?>"></main><?php wp_footer(); ?></body></html><?php
  exit;
 }
}
IRES_PDF_Reader::init();
