<?php
if (!defined('ABSPATH')) exit;
final class IRES_PDF_GitHub_Updater {
 const REPO = 'ires-commits/ires-pdf-reader';
 const CACHE = 'ires_pdf_reader_github_release';
 static function init() {
  add_filter('site_transient_update_plugins', [__CLASS__, 'check']);
  add_filter('pre_set_site_transient_update_plugins', [__CLASS__, 'check']);
  add_filter('plugins_api', [__CLASS__, 'info'], 10, 3);
  add_filter('update_plugins_github.com', [__CLASS__, 'update_by_uri'], 10, 4);
  add_action('admin_post_ires_pdf_check_updates', [__CLASS__, 'force_check']);
  add_action('admin_post_ires_pdf_install_update', [__CLASS__, 'install_update']);
  add_action('upgrader_process_complete', [__CLASS__, 'clear_cache_after_upgrade'], 10, 2);
 }
 static function force_check() {
  if (!current_user_can('update_plugins')) wp_die('Accesso negato.');
  check_admin_referer('ires_pdf_check_updates');
  delete_transient(self::CACHE);
  delete_site_transient('update_plugins');
  wp_update_plugins();
  wp_safe_redirect(add_query_arg('ires_pdf_checked','1',admin_url('options-general.php?page=ires-pdf-reader')));
  exit;
 }
 static function install_update() {
  if (!current_user_can('update_plugins')) wp_die('Permessi insufficienti.');
  check_admin_referer('ires_pdf_install_update');
  $origin=isset($_POST['ires_shared_origin'])?sanitize_key(wp_unslash($_POST['ires_shared_origin'])):'';
  $return=$origin==='ps'?admin_url('edit.php?post_type=pubblicazione&page=ires-ps-github-updates'):admin_url('options-general.php?page=ires-pdf-reader');
  if (get_transient('ires_pdf_reader_upgrade_lock')) {
   wp_safe_redirect(add_query_arg('ires_pdf_upgrade','busy',$return));exit;
  }
  set_transient('ires_pdf_reader_upgrade_lock',1,10*MINUTE_IN_SECONDS);
  delete_transient(self::CACHE);
  delete_site_transient('update_plugins');
  wp_update_plugins();
  $plugin='ires-pdf-reader/ires-pdf-reader.php';
  $release=self::release();
  if (!$release || !isset($release['version']) || !preg_match('/^\\d+\\.\\d+\\.\\d+$/',$release['version'])) {
   delete_transient('ires_pdf_reader_upgrade_lock');
   wp_safe_redirect(add_query_arg('ires_pdf_upgrade','unavailable',$return));exit;
  }
  $installed=get_plugin_data(WP_PLUGIN_DIR.'/'.$plugin,false,false);
  $old=$installed['Version']??'0';
  if (!version_compare($release['version'],$old,'>')) {
   delete_transient('ires_pdf_reader_upgrade_lock');
   wp_safe_redirect(add_query_arg('ires_pdf_upgrade','current',$return));exit;
  }
  require_once ABSPATH.'wp-admin/includes/class-wp-upgrader.php';
  require_once ABSPATH.'wp-admin/includes/plugin.php';
  $was_active=is_plugin_active($plugin);
  $was_network_active=is_multisite() && is_plugin_active_for_network($plugin);
  $skin=new Automatic_Upgrader_Skin();
  $upgrader=new Plugin_Upgrader($skin);
  $result=$upgrader->upgrade($plugin);
  wp_clean_plugins_cache(true);
  $new=is_file(WP_PLUGIN_DIR.'/'.$plugin)?get_plugin_data(WP_PLUGIN_DIR.'/'.$plugin,false,false):[];
  $ok=!is_wp_error($result) && $result!==false && !empty($new['Version']) && version_compare($new['Version'],$old,'>') && version_compare($new['Version'],$release['version'],'>=');
  $activation_ok=true;
  if ($ok && ($was_active || $was_network_active)) {
   $still_active=$was_network_active ? is_plugin_active_for_network($plugin) : is_plugin_active($plugin);
   if (!$still_active) {
    $activation=activate_plugin($plugin,'',$was_network_active,false);
    $activation_ok=!is_wp_error($activation) && ($was_network_active ? is_plugin_active_for_network($plugin) : is_plugin_active($plugin));
   }
  }
  delete_transient('ires_pdf_reader_upgrade_lock');
  $state=!$ok?'failed':(!$activation_ok?'activation_failed':'success');
  wp_safe_redirect(add_query_arg('ires_pdf_upgrade',$state,$return));exit;
 }
 static function diagnostics() {
  $release=self::release();
  $updates=get_site_transient('update_plugins');
  $file='ires-pdf-reader/ires-pdf-reader.php';
  return ['release'=>$release,'detected'=>is_object($updates)&&isset($updates->response[$file]),'checked'=>is_object($updates)?($updates->last_checked??0):0];
 }
 static function release() {
  $cached = get_transient(self::CACHE);
  if ($cached !== false) return $cached;
  $token=defined('IRES_GITHUB_UPDATES_TOKEN') ? trim((string)IRES_GITHUB_UPDATES_TOKEN) : trim((string)get_option('ires_github_updates_token',''));
  $headers=['Accept'=>'application/vnd.github+json','User-Agent'=>'IRES-PDF-Reader-WordPress','X-GitHub-Api-Version'=>'2022-11-28'];
  if($token!=='') $headers['Authorization']='Bearer '.$token;
  $response = wp_remote_get('https://api.github.com/repos/'.self::REPO.'/releases/latest', ['timeout'=>20,'headers'=>$headers]);
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
   $transient->response[$file]=(object)['id'=>'https://github.com/'.self::REPO,'slug'=>'ires-pdf-reader','plugin'=>$file,'new_version'=>$release['version'],'version'=>$release['version'],'url'=>$release['url'],'package'=>$release['package']];
   unset($transient->no_update[$file]);
  }
  if ($release && version_compare($release['version'],$transient->checked[$file],'<=')) {
   unset($transient->response[$file]);
   $transient->no_update[$file]=(object)['id'=>'https://github.com/'.self::REPO,'slug'=>'ires-pdf-reader','plugin'=>$file,'new_version'=>$release['version'],'version'=>$release['version'],'url'=>$release['url'],'package'=>$release['package']];
  }
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
