<?php
/** Shared IRES update dashboard. Safe to load from either plugin. */
if (!defined('ABSPATH')) exit;
if (!function_exists('ires_shared_updates_panel')) {
function ires_shared_updates_state($refresh=false) {
    if ($refresh) {
        delete_transient('ires_ps_gh_latest_release');
        delete_transient('ires_pdf_reader_github_release');
        delete_site_transient('update_plugins');
    }
    if (!function_exists('get_plugins')) require_once ABSPATH.'wp-admin/includes/plugin.php';
    $plugins=get_plugins();
    $ps='ires-produzione-scientifica/ires-produzione-scientifica.php';
    $pdf='ires-pdf-reader/ires-pdf-reader.php';
    $ps_release=function_exists('ires_ps_gh_latest') ? ires_ps_gh_latest($refresh) : null;
    $pdf_release=class_exists('IRES_PDF_GitHub_Updater') ? IRES_PDF_GitHub_Updater::release() : null;
    return [
        'ps'=>['name'=>'IRES Produzione Scientifica','file'=>$ps,'installed'=>$plugins[$ps]['Version']??null,'release'=>is_array($ps_release)?$ps_release:null],
        'pdf'=>['name'=>'IRES PDF Reader','file'=>$pdf,'installed'=>$plugins[$pdf]['Version']??null,'release'=>is_array($pdf_release)?$pdf_release:null],
    ];
}
function ires_shared_updates_origin() {
    // Never accept an arbitrary redirect URL from a request.
    $page=isset($_GET['page'])?sanitize_key(wp_unslash($_GET['page'])):'';
    return $page==='ires-pdf-reader'?'pdf':'ps';
}
function ires_shared_updates_panel() {
    if (!current_user_can('update_plugins')) return;
    $state=ires_shared_updates_state();
    $origin=ires_shared_updates_origin();
    echo '<hr><h2>Aggiornamenti IRES — pannello condiviso</h2>';
    echo '<p>Le due estensioni mantengono aggiornamenti indipendenti. Le novità sono tratte dalle note della release GitHub.</p>';
    if (isset($_GET['ires_shared_status'])) {
        $status=sanitize_key(wp_unslash($_GET['ires_shared_status']));
        $messages=['checked'=>'Verifica completata.','updated'=>'Aggiornamenti completati.','partial'=>'Un aggiornamento non è riuscito. Verifica le versioni e riprova.','none'=>'Nessun aggiornamento disponibile.','busy'=>'Un aggiornamento è già in corso.'];
        if(isset($messages[$status])) echo '<div class="notice '.($status==='updated'?'notice-success':'notice-info').'"><p>'.esc_html($messages[$status]).'</p></div>';
    }
    $available=0;
    echo '<table class="widefat striped" style="max-width:1000px"><thead><tr><th>Plugin</th><th>Installata</th><th>Disponibile</th><th>Azione</th></tr></thead><tbody>';
    foreach ($state as $id=>$item) {
        $latest=$item['release']['version']??null;
        $has=$item['installed']&&$latest&&version_compare($latest,$item['installed'],'>');
        if($has) $available++;
        echo '<tr><td><strong>'.esc_html($item['name']).'</strong></td><td>'.esc_html($item['installed']??'Non installato').'</td><td>'.esc_html($latest??'Non disponibile').'</td><td>';
        if($has) {
            $action=$id==='ps'?'ires_ps_gh_install':'ires_pdf_install_update';
            echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'" style="display:inline-block;margin:0">';
            echo '<input type="hidden" name="action" value="'.esc_attr($action).'">';
            echo '<input type="hidden" name="ires_shared_origin" value="'.esc_attr($origin).'">';
            wp_nonce_field($action);
            submit_button('Aggiorna singolarmente','secondary','submit',false);
            echo '</form>';
        } else echo esc_html($item['installed']?'Nessun aggiornamento':'Plugin non installato');
        echo '</td></tr>';
        if($has) {
            $notes=trim((string)($item['release']['notes']??''));
            echo '<tr><td colspan="4"><strong>Novità '.esc_html($item['name']).' '.esc_html($latest).'</strong><div style="white-space:pre-wrap;max-height:240px;overflow:auto;margin-top:8px">'.esc_html($notes?:'Note di rilascio non disponibili: consultare il changelog del progetto.').'</div></td></tr>';
        }
    }
    echo '</tbody></table>';
    echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'" style="margin-top:14px;display:inline-block;margin-right:8px"><input type="hidden" name="action" value="ires_shared_updates_check">';
    echo '<input type="hidden" name="ires_shared_origin" value="'.esc_attr($origin).'">';
    wp_nonce_field('ires_shared_updates_check');
    submit_button('Verifica entrambi','secondary','submit',false);
    echo '</form>';
    if($available===2) {
        echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'" style="display:inline-block"><input type="hidden" name="action" value="ires_shared_updates_install">';
        echo '<input type="hidden" name="ires_shared_origin" value="'.esc_attr($origin).'">';
        wp_nonce_field('ires_shared_updates_install');
        submit_button('Aggiorna entrambi','primary','submit',false);
        echo '</form>';
    }
}
function ires_shared_updates_redirect($status) {
    $origin=isset($_POST['ires_shared_origin'])?sanitize_key(wp_unslash($_POST['ires_shared_origin'])):'';
    $url=$origin==='pdf'?admin_url('options-general.php?page=ires-pdf-reader'):admin_url('edit.php?post_type=pubblicazione&page=ires-ps-github-updates');
    wp_safe_redirect(add_query_arg('ires_shared_status',$status,$url));exit;
}
add_action('admin_post_ires_shared_updates_check',function(){
    if(!current_user_can('update_plugins'))wp_die('Non autorizzato.');
    check_admin_referer('ires_shared_updates_check');
    ires_shared_updates_state(true);
    wp_update_plugins();
    ires_shared_updates_redirect('checked');
});
add_action('admin_post_ires_shared_updates_install',function(){
    if(!current_user_can('update_plugins'))wp_die('Non autorizzato.');
    check_admin_referer('ires_shared_updates_install');
    if(get_transient('ires_shared_updates_lock'))ires_shared_updates_redirect('busy');
    set_transient('ires_shared_updates_lock',1,15*MINUTE_IN_SECONDS);
    $state=ires_shared_updates_state(true);
    $both=true;
    foreach($state as $item)if(!$item['installed']||empty($item['release']['version'])||!version_compare($item['release']['version'],$item['installed'],'>'))$both=false;
    if(!$both){delete_transient('ires_shared_updates_lock');ires_shared_updates_redirect('none');}
    require_once ABSPATH.'wp-admin/includes/file.php';
    require_once ABSPATH.'wp-admin/includes/plugin.php';
    require_once ABSPATH.'wp-admin/includes/class-wp-upgrader.php';
    $ok=true;
    // PDF Reader uses the standard WordPress update mechanism.
    wp_update_plugins();
    $pdf=$state['pdf'];$pdf_active=is_plugin_active($pdf['file']);
    $pdf_result=(new Plugin_Upgrader(new Automatic_Upgrader_Skin()))->upgrade($pdf['file']);
    wp_clean_plugins_cache(true);
    $pdf_data=is_file(WP_PLUGIN_DIR.'/'.$pdf['file'])?get_plugin_data(WP_PLUGIN_DIR.'/'.$pdf['file'],false,false):[];
    if(is_wp_error($pdf_result)||!$pdf_result||version_compare($pdf_data['Version']??'0',$pdf['release']['version'],'<'))$ok=false;
    if($pdf_active&&!is_plugin_active($pdf['file'])) {
        $activated=activate_plugin($pdf['file']);
        if(is_wp_error($activated))$ok=false;
    }
    // Scientific repository uses its existing SHA-256 verified download.
    $ps=$state['ps'];
    if(!function_exists('ires_ps_gh_download_asset'))$ok=false;
    else {
        $package=ires_ps_gh_download_asset($ps['release']);
        if(is_wp_error($package))$ok=false;
        else {
            $zip=class_exists('ZipArchive')?new ZipArchive():null;
            $valid=$zip&&true===$zip->open($package)&&false!==$zip->locateName($ps['file']);
            if($zip)$zip->close();
            if(!$valid)$ok=false;
            else {
                $ps_active=is_plugin_active($ps['file']);
                $result=(new Plugin_Upgrader(new Automatic_Upgrader_Skin()))->run(['package'=>$package,'destination'=>WP_PLUGIN_DIR,'clear_destination'=>true,'clear_working'=>true,'hook_extra'=>['plugin'=>$ps['file'],'type'=>'plugin','action'=>'update'],'is_multi'=>false]);
                wp_clean_plugins_cache(true);
                $data=is_file(WP_PLUGIN_DIR.'/'.$ps['file'])?get_plugin_data(WP_PLUGIN_DIR.'/'.$ps['file'],false,false):[];
                if(is_wp_error($result)||!$result||version_compare($data['Version']??'0',$ps['release']['version'],'<'))$ok=false;
                if($ps_active&&!is_plugin_active($ps['file'])) {
                    $activated=activate_plugin($ps['file']);
                    if(is_wp_error($activated))$ok=false;
                }
            }
            @unlink($package);
        }
    }
    delete_transient('ires_ps_gh_latest_release');
    delete_transient('ires_pdf_reader_github_release');
    delete_transient('ires_shared_updates_lock');
    ires_shared_updates_redirect($ok?'updated':'partial');
});
}
