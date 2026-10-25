<?php
if (!defined('ABSPATH')) exit;
final class IRES_PDF_GitHub_Updater {
 const REPO = 'ires-commits/ires-pdf-reader';
 const CACHE = 'ires_pdf_reader_github_release';
 static function init() {
  add_filter('pre_set_site_transient_update_plugins', [__CLASS__, 'check']);
  add_filter('plugins_api', [__CLASS__, 'info'], 10, 3);
  add_filter('update_plugins_github.com', [__CLASS__, 'update_by_uri'], 10, 4);
  add_action('upgrader_process_complete', [__CLASS__, 'clear_cache_after_upgrade'], 10, 2);
 }
 static function release() {
  $cached = get_transient(self::CACHE);
  if ($cached !== false) return $cached;
  $response = wp_remote_get('https://api.github.com/repos/'.self::REPO.'/releases/latest', ['timeout'=>8,'headers'=>['Accept'=>'application/vnd.github+json','User-Agent'=>'IRES-PDF-Reader-WordPress']]);
  $release = null;
  if (!is_wp_error($response) && wp_remote_retrieve_response_code($response)===200) {
   $data=json_decode(wp_remote_retrieve_body($response),true);
   if (is_array($data) && empty($data['draft']) && empty($data['prerelease']) && !empty($data['tag_name']) && !empty($data['assets'])) {
    $version=ltrim($data['tag_name'],'vV');
    if (preg_match('/^\d+\.\d+\.\d+$/',$version)) {
     foreach ($data['assets'] as $asset) {
      if (($asset['name']??'')==='ires-pdf-reader.zip' && !empty($asset['browser_download_url'])) {
       $url=$asset['browser_download_url'];
       if (strpos($url,'https://github.com/'.self::REPO.'/releases/download/')===0) {
        $release=['version'=>$version,'package'=>$url,'notes'=>wp_strip_all_tags($data['body']??''),'url'=>'https://github.com/'.self::REPO.'/releases'];
       }
       break;
      }
     }
    }
   }
  }
  set_transient(self::CACHE,$release, $release ? 6*HOUR_IN_SECONDS : HOUR_IN_SECONDS);
  return $release;
 }
 static function update_by_uri($update, $plugin_data, $plugin_file, $locales) {
  if ($plugin_file !== 'ires-pdf-reader/ires-pdf-reader.php') return $update;
  $release=self::release();
  if (!$release) return $update;
  return [
   'id'=>'https://github.com/'.self::REPO,
   'slug'=>'ires-pdf-reader',
   'version'=>$release['version'],
   'url'=>$release['url'],
   'package'=>$release['package'],
  ];
 }
 static function clear_cache_after_upgrade($upgrader, $options) {
  if (($options['type']??'')==='plugin') delete_transient(self::CACHE);
 }
 static function check($transient) {
  if (!is_object($transient) || empty($transient->checked)) return $transient;
  $file='ires-pdf-reader/ires-pdf-reader.php';
  if (!isset($transient->checked[$file])) return $transient;
  $release=self::release();
  if ($release && version_compare($release['version'],$transient->checked[$file],'>')) {
   $transient->response[$file]=(object)['slug'=>'ires-pdf-reader','plugin'=>$file,'new_version'=>$release['version'],'url'=>$release['url'],'package'=>$release['package']];
  }
  if ($release && version_compare($release['version'],$transient->checked[$file],'<=')) unset($transient->response[$file]);
  return $transient;
 }
 static function info($result,$action,$args) {
  if ($action!=='plugin_information' || ($args->slug??'')!=='ires-pdf-reader') return $result;
  $release=self::release();
  if (!$release) return $result;
  return (object)['name'=>'IRES PDF Reader','slug'=>'ires-pdf-reader','version'=>$release['version'],'author'=>'IRES Piemonte','homepage'=>$release['url'],'sections'=>['description'=>'Lettore PDF IRES per WordPress','changelog'=>esc_html($release['notes'])],'download_link'=>$release['package']];
 }
}
IRES_PDF_GitHub_Updater::init();
