<?php
/** Behavioral tests against production PHP; no WordPress DB or paid APIs. */
define('ABSPATH',__DIR__);
class WP_Error {public $code;public $data;function __construct($code,$message,$data=[]){$this->code=$code;$this->data=$data;}}
function check($condition,$message){if(!$condition)throw new RuntimeException($message);}
function absint($value){return abs((int)$value);}
function home_url($path=''){return 'https://example.com'.$path;}
function wp_parse_url($url,$component=-1){return parse_url($url,$component);}
function esc_url_raw($url,$protocols=[]){return filter_var($url,FILTER_VALIDATE_URL)?$url:'';}
function apply_filters($name,$value){return $value;}
function get_post_type($id){return in_array($id,[95415,95135,94443],true)?'pubblicazione':'attachment';}
function get_post_status($id){return $id===94443?'draft':'publish';}
function get_queried_object_id(){return 95415;}
function current_user_can($capability){return true;}
function shortcode_atts($defaults,$atts,$name){return array_merge($defaults,$atts);}
function esc_attr($text){return htmlspecialchars((string)$text,ENT_QUOTES);}
function esc_html($text){return esc_attr($text);}
function esc_url($text){return esc_attr($text);}
function add_query_arg($args,$url){return $url.'?'.http_build_query($args);}
function rest_ensure_response($response){return $response;}
function attachment_url_to_postid($url){return $url==='https://example.com/marriages.pdf'?10:0;}
function esc_sql($text){return $text;}
function get_option($key,$default=false){global $read_only;return $key==='ires_pdf_translation_read_only'?$read_only:$default;}
function ires_ps_ft_pdf_data($id){global $pdf_hash;return ['id'=>10,'url'=>$id===95415?'https://example.com/marriages.pdf':'https://example.com/other.pdf','hash'=>$pdf_hash];}
class FakeWpdb {
 public $prefix='wp_';public $posts='wp_posts';public $postmeta='wp_postmeta';public $ids=[95415];public $row;
 function prepare($query,...$args){return $query;}
 function get_col($query){check(strpos($query,"m.meta_key='pdf_principale'")!==false,'Exact canonical meta lookup required');check(strpos($query,'LIMIT 2')!==false,'Bound ambiguity lookup');return $this->ids;}
 function esc_like($text){return $text;}
 function get_var($query){return 'wp_ires_ps_translated_pages';}
 function get_row($query){return $this->row;}
}
$source=file_get_contents(__DIR__.'/../ires-pdf-reader/ires-pdf-reader.php');
$start=strpos($source,'final class IRES_PDF_Reader {');
$end=strpos($source,'IRES_PDF_Reader::init();',$start);
eval(substr($source,$start,$end-$start));
require __DIR__.'/../ires-pdf-reader/includes/scientific-translations.php';
require __DIR__.'/../ires-pdf-reader/includes/translation.php';
$pdf_hash=hash('sha256','current PDF');$read_only=false;$wpdb=new FakeWpdb();
$request=['publication_id'=>95415,'pdf_url'=>'https://example.com/marriages.pdf'];
$result=IRES_PDF_Scientific_Translations::resolve($request);
check($result['publication_id']===95415&&$result['pdf_hash']===$pdf_hash,'Canonical PDF identity resolves');
check(IRES_PDF_Scientific_Translations::matches_pdf(95415,$request['pdf_url'].'#page=1'),'Page fragment keeps PDF identity');
check(!IRES_PDF_Scientific_Translations::matches_pdf(95415,$request['pdf_url'].'?other=1'),'Different query rejected');
$wrong=IRES_PDF_Scientific_Translations::resolve(array_merge($request,['publication_id'=>95135]));
check($wrong instanceof WP_Error&&$wrong->code==='ires_pdf_scientific_mismatch','Wrong ID rejected');
$old=IRES_PDF_Scientific_Translations::resolve(array_merge($request,['publication_id'=>0]));
check($old['publication_id']===95415,'Old dedicated URL recovers exact attachment binding');
$wpdb->ids=[95415,95135];
check(IRES_PDF_Scientific_Translations::resolve(array_merge($request,['publication_id'=>0])) instanceof WP_Error,'Ambiguous attachment rejected');
$wpdb->ids=[95415];
$wpdb->row=(object)['pdf_hash'=>$pdf_hash,'source_hash'=>hash('sha256','source'),'translated_text'=>'Marital Instability in Piedmont'];
$read=array_merge($request,['page'=>1,'language'=>'en']);
check(IRES_PDF_Scientific_Translations::read($read)['translation']==='Marital Instability in Piedmont','Saved English reused');
$wpdb->row->pdf_hash=hash('sha256','old PDF');
check(IRES_PDF_Scientific_Translations::read($read)->code==='ires_pdf_scientific_stale','Actual changed PDF rejects stale English');
check(IRES_PDF_Scientific_Translations::read(array_merge($read,['pdf_url'=>'https://example.com/coronavirus.pdf']))->code==='ires_pdf_scientific_mismatch','Wrong opened PDF rejected');
check(IRES_PDF_Scientific_Translations::read(array_merge($read,['publication_id'=>94443])) instanceof WP_Error,'Draft publication excluded');
$html=IRES_PDF_Reader::shortcode(['url'=>$request['pdf_url'],'publication_id'=>95415]);
check(strpos($html,'data-publication-id="95415"')!==false,'Modal receives verified ID');
check(strpos($html,'publication_id=95415')!==false,'Full-page URL preserves verified ID');
$html=IRES_PDF_Reader::shortcode(['url'=>'https://example.com/coronavirus.pdf','publication_id'=>95415]);
check(strpos($html,'data-publication-id="0"')!==false&&strpos($html,'publication_id=95415')===false,'Unrelated PDF never inherits page ID');
$read_only=true;
check(IRES_PDF_Translation::translate([])->code==='ires_translation_read_only','Server read-only blocks before keys/network/provider');
echo "PASS: canonical binding, exact legacy lookup, ambiguity, stale hashes, routing, read-only server gate\n";
