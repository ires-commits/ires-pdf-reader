<?php
/**
 * Plugin Name: IRES PDF Reader
 * Description: Lettore PDF responsive con overlay, pagina dedicata e integrazione pubblicazioni.
 * Version: 2.13.6
 * Update URI: https://github.com/ires-commits/ires-pdf-reader
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * Text Domain: ires-pdf-reader
 */
if (!defined('ABSPATH')) exit;
require_once __DIR__.'/includes/github-updater.php';
// One canonical updater dashboard when both plugins are installed, regardless of load order.
$ires_shared_canonical = WP_PLUGIN_DIR . '/ires-produzione-scientifica/includes/shared-updates.php';
if (is_readable($ires_shared_canonical)) require_once $ires_shared_canonical;
else require_once __DIR__.'/includes/shared-updates.php';
require_once __DIR__.'/includes/passage-store.php';
require_once __DIR__.'/includes/translation.php';
require_once __DIR__.'/includes/translation-cache.php';
register_activation_hook(__FILE__,['IRES_PDF_Passage_Store','install']);
register_activation_hook(__FILE__,['IRES_PDF_Translation_Cache','install']);
final class IRES_PDF_Reader {
 const VERSION='2.13.6';
 static function init() {
  add_action('init',function(){if(get_option('ires_pdf_passage_schema')!=='1')IRES_PDF_Passage_Store::install();});
  add_action('rest_api_init',['IRES_PDF_Passage_Store','routes']);
  add_action('rest_api_init',['IRES_PDF_Translation','routes']);
  add_action('rest_api_init',['IRES_PDF_Translation_Cache','routes']);
  add_action('init',function(){if(get_option('ires_pdf_translation_cache_schema')!==IRES_PDF_Translation_Cache::SCHEMA)IRES_PDF_Translation_Cache::install();});
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
  register_setting('ires_pdf_reader','ires_pdf_translation_provider',['type'=>'string','sanitize_callback'=>[__CLASS__,'sanitize_translation_provider'],'default'=>'libretranslate']);
  register_setting('ires_pdf_reader','ires_pdf_translation_endpoint',['type'=>'string','sanitize_callback'=>'esc_url_raw','default'=>'']);
  register_setting('ires_pdf_reader','ires_pdf_translation_api_key',['type'=>'string','sanitize_callback'=>'sanitize_text_field','default'=>'']);
  register_setting('ires_pdf_reader','ires_pdf_reader_meta_key',['type'=>'string','sanitize_callback'=>'sanitize_key','default'=>'']);
 }
 static function sanitize_translation_provider($value){return in_array($value,['deepl','libretranslate'],true)?$value:'libretranslate';}
 static function admin_menu() { add_options_page('IRES PDF Reader','IRES PDF Reader','manage_options','ires-pdf-reader',[__CLASS__,'settings_page']); }
 static function settings_page() {
  if(!current_user_can('manage_options'))return;
  echo '<div class="wrap"><h1>IRES PDF Reader</h1><p>Shortcode: <code>[ires_pdf_reader url="https://esempio.it/documento.pdf" title="Documento"]</code></p><form method="post" action="options.php">';
  settings_fields('ires_pdf_reader');
  echo '<input type="hidden" name="ires_pdf_reader_integration" value="0">';
  echo '<p><label><input type="checkbox" name="ires_pdf_reader_integration" value="1" '.checked(get_option('ires_pdf_reader_integration',true),true,false).'> Integrazione automatica nelle pubblicazioni</label></p>';
  echo '<p><label>Chiave campo PDF ACF: <input name="ires_pdf_reader_meta_key" value="'.esc_attr(get_option('ires_pdf_reader_meta_key','')).'"></label></p>';
  echo '<hr><h2>Traduzione lato server</h2><p>Il testo viene inviato al fornitore selezionato soltanto quando il lettore preme Traduci. Le chiavi API rimangono sul server WordPress. Verifica le condizioni di trattamento dei dati del fornitore.</p>';
  $provider=get_option('ires_pdf_translation_provider','libretranslate');
  echo '<p><label>Motore: <select name="ires_pdf_translation_provider"><option value="libretranslate" '.selected($provider,'libretranslate',false).'>LibreTranslate (endpoint personalizzato)</option><option value="deepl" '.selected($provider,'deepl',false).'>DeepL API Free</option></select></label></p>';
  echo '<p><small>Con DeepL API Free non serve compilare l’endpoint. Inserisci soltanto la chiave API.</small></p>';
  echo '<p><label>Endpoint HTTPS: <input class="regular-text" type="url" name="ires_pdf_translation_endpoint" value="'.esc_attr(get_option('ires_pdf_translation_endpoint','')).'" placeholder="https://servizio.example/translate"></label></p>';
  echo '<p><label>Chiave API (se richiesta): <input class="regular-text" type="password" autocomplete="new-password" name="ires_pdf_translation_api_key" value="'.esc_attr(get_option('ires_pdf_translation_api_key','')).'"></label></p>';
  submit_button();echo '</form>';
  echo '<hr><h2>Aggiornamenti GitHub</h2>';
  ires_shared_updates_panel();
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
  wp_add_inline_script('ires-pdf-reader','window.iresPdfReader='.wp_json_encode(['pdfjsUrl'=>plugins_url('vendor/pdfjs/pdf.min.js',__FILE__),'workerUrl'=>plugins_url('vendor/pdfjs/pdf.worker.min.js',__FILE__),'dedicatedUrl'=>home_url('/'),'passageApi'=>rest_url('ires-pdf-reader/v1/passages'),'translationApi'=>rest_url('ires-pdf-reader/v1/translate'),'translationCacheApi'=>rest_url('ires-pdf-reader/v1/translation-cache'),'translationCacheWrite'=>current_user_can('manage_options'),'translationCacheNonce'=>wp_create_nonce('wp_rest'),'translationWorkerUrl'=>plugins_url('assets/translation-worker.js',__FILE__),'translationRemote'=>(get_option('ires_pdf_translation_provider','libretranslate')==='deepl'?!!get_option('ires_pdf_translation_api_key',''):!!get_option('ires_pdf_translation_endpoint','')),'scientificIntegration'=>(bool)get_option('ires_pdf_reader_integration',true)]).';','before');
 }
 static function shortcode($atts) {
  $a=shortcode_atts(['url'=>'','title'=>'Documento PDF','mode'=>'both','label'=>'Leggi il PDF','citation'=>''],$atts,'ires_pdf_reader');
  $url=self::valid_pdf($a['url']);
  if(!$url){
   if(current_user_can('manage_options'))return '<span class="ires-pdf-error" role="alert">IRES PDF Reader: URL PDF non valido o dominio non autorizzato. Controlla l’indirizzo del file e il dominio configurato in WordPress.</span>';
   return '';
  }
  $page=add_query_arg(['ires_pdf_reader'=>'1','pdf'=>$url,'title'=>$a['title']],home_url('/'));
  $out='<span class="ires-pdf-actions">';
  if($a['mode']!=='page')$out.='<button type="button" class="ires-pdf-open" data-pdf="'.esc_attr($url).'" data-title="'.esc_attr($a['title']).'" data-citation="'.esc_attr($a['citation']).'">'.esc_html($a['label']).'</button>';
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
  // The scientific repository may already provide its own Preview button.
  // Never add duplicate reader controls in that case.
  if(strpos($content,'ires-pdf-open')!==false||strpos($content,'ires-pdf-integrated')!==false)return $content;
  $authors=[];
  $terms=wp_get_post_terms($id,'autore',['fields'=>'names']);
  if(!is_wp_error($terms)&&is_array($terms))$authors=$terms;
  if(!$authors){
   foreach(['autori','autore','authors'] as $key){
    $value=get_post_meta($id,$key,true);
    if(is_string($value)&&trim($value)!==''){$authors=[trim($value)];break;}
   }
  }
  $year=get_the_date('Y',$id);
  $citation=trim(implode(', ',$authors).($authors?' ':'').($year?'('.$year.'). ':'').get_the_title($id).'.');
  $args=['url'=>$url,'title'=>get_the_title($id),'citation'=>$citation];
  $args=apply_filters('ires_pdf_reader_publication_args',$args,$id);
  if(!is_array($args))return $content;
  return $content.'<section class="ires-pdf-integrated"><h3>Consulta la pubblicazione</h3>'.self::shortcode($args).'</section>';
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
