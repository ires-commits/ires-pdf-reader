<?php
/**
 * Plugin Name: IRES PDF Reader
 * Description: Lettore PDF responsive con overlay, pagina dedicata e integrazione pubblicazioni.
 * Version: 1.3.0
 * Update URI: https://github.com/ires-commits/ires-pdf-reader
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * Text Domain: ires-pdf-reader
 */
if (!defined('ABSPATH')) exit;
require_once __DIR__.'/includes/github-updater.php';
final class IRES_PDF_Reader {
 const VERSION='1.3.0';
 static function init() {
  add_shortcode('ires_pdf_reader',[__CLASS__,'shortcode']);
  add_action('wp_enqueue_scripts',[__CLASS__,'assets']);
  add_action('template_redirect',[__CLASS__,'dedicated']);
  add_action('admin_menu',[__CLASS__,'admin_menu']);
  add_action('admin_init',[__CLASS__,'register_settings']);
  add_filter('the_content',[__CLASS__,'integrate_publication'],30);
 }
 static function register_settings() {
  register_setting('ires_pdf_reader','ires_pdf_reader_integration',['type'=>'boolean','sanitize_callback'=>'rest_sanitize_boolean','default'=>true]);
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
  submit_button();echo '</form></div>';
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
  wp_enqueue_script('ires-pdf-reader',plugins_url('assets/reader.js',__FILE__),[],self::VERSION,true);
  wp_add_inline_script('ires-pdf-reader','window.iresPdfReader='.wp_json_encode(['pdfjsUrl'=>plugins_url('vendor/pdfjs/pdf.mjs',__FILE__),'workerUrl'=>plugins_url('vendor/pdfjs/pdf.worker.mjs',__FILE__)]).';','before');
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
