<?php
/* 라우터 : Node 서버(lib/api.js)와 같은 경로 · 같은 응답 형식 */
if (!defined('WB_API')) { http_response_code(404); exit; }
$GLOBALS['WB_ROUTES'] = array();
function wb_route($method, $pattern, $fn, $opts = array()) {
  $keys = array();
  $re = '#^' . preg_replace_callback('/:([a-zA-Z_]+)/', function ($m) use (&$keys) { $keys[] = $m[1]; return preg_match('/^(id|sid|vid|pid)$/', $m[1]) ? '(\d+)' : '([^/]+)'; }, str_replace('/', '\/', $pattern)) . '$#';
  $GLOBALS['WB_ROUTES'][] = array('method' => $method, 're' => $re, 'keys' => $keys, 'fn' => $fn, 'opts' => $opts);
}
function wb_dispatch($c) {
  foreach ($GLOBALS['WB_ROUTES'] as $r) {
    if ($r['method'] !== $c['method']) { continue; }
    if (!preg_match($r['re'], $c['path'], $m)) { continue; }
    $params = array(); foreach ($r['keys'] as $i => $k) { $params[$k] = rawurldecode($m[$i + 1]); }
    if (empty($r['opts']['open'])) {
      if (!$c['user']) { throw new WbHttpError(401, '로그인이 필요합니다.'); }
      /* 첫 로그인 비밀번호 변경 요구 없음 */
    }
    return call_user_func($r['fn'], $c, $params);
  }
  throw new WbHttpError(404, '경로를 찾을 수 없습니다. (' . $c['method'] . ' ' . $c['path'] . ')');
}
/* 공통 도우미 */
function wb_site_by_id($id) { $s = wb_get("SELECT * FROM sites WHERE id = ? AND status <> 'deleted'", array((int)$id)); if (!$s) { throw new WbHttpError(404, '사이트를 찾을 수 없습니다.'); } return $s; }
function wb_site_of($c, $id, $ability = null) { $s = wb_site_by_id($id); if (!wb_site_role($c['user'], (int)$s['id'])) { throw new WbHttpError(403, '해당 사이트에 대한 권한이 없습니다.'); } if ($ability) { wb_must($c['user'], (int)$s['id'], $ability); } return $s; }
function wb_current_site($c, $ability = null) { $id = wb_int(isset($c['headers']['x-site-id']) ? $c['headers']['x-site-id'] : (isset($c['query']['site']) ? $c['query']['site'] : 0)); if ($id) { return wb_site_of($c, $id, $ability); } $list = wb_sites($c['user']); if (!count($list)) { throw new WbHttpError(403, '접근 가능한 사이트가 없습니다. 최고관리자에게 사이트 권한을 요청하세요.'); } if ($ability) { wb_must($c['user'], (int)$list[0]['id'], $ability); } return $list[0]; }
function wb_log($c, $siteId, $action, $targetType, $targetId, $summary, $before = null, $after = null) { wb_insert('activity_logs', array('site_id' => $siteId ? (int)$siteId : null, 'user_id' => $c['user'] ? (int)$c['user']['id'] : null, 'action' => $action, 'target_type' => $targetType, 'target_id' => $targetId ? (int)$targetId : null, 'summary' => wb_str($summary, 500), 'before_json' => $before === null ? null : wb_enc($before), 'after_json' => $after === null ? null : wb_enc($after), 'ip_hash' => $c['ipHash'], 'created_at' => wb_now())); }
function wb_page_of($c, $id, $ability = 'view', $allowDeleted = false) { $p = wb_get('SELECT * FROM pages WHERE id = ?', array((int)$id)); if (!$p || (!empty($p['deleted_at']) && !$allowDeleted)) { throw new WbHttpError(404, '페이지를 찾을 수 없습니다.'); } wb_site_of($c, (int)$p['site_id'], $ability ? $ability : 'view'); return $p; }
function wb_b($c, $k, $def = null) { return array_key_exists($k, $c['body']) ? $c['body'][$k] : $def; }   /* 본문(배열) */
function wb_bo($c, $k, $def = null) { return $c['bodyObj'] !== null && isset($c['bodyObj']->$k) ? $c['bodyObj']->$k : $def; }   /* 본문(객체 · JSON 그대로 저장할 때) */
function wb_q($c, $k, $def = '') { return isset($c['query'][$k]) ? (string)$c['query'][$k] : $def; }
function wb_statuses() { return array('new' => '신규', 'checking' => '확인 중', 'consulting' => '상담 중', 'contacted' => '상담 완료', 'confirmed' => '방문 확정', 'visited' => '방문 완료', 'hold' => '보류', 'cancelled' => '취소'); }
/* 업로드 파일의 공개 주소 기준 : 이 서버의 /assets (mediaUrl = base + '/uploads/' + 파일) */
function wb_media_base($c) { return $c['baseUrl'] . '/assets'; }
function wb_media_url($m, $base, $variant = null) { if (!$m) { return ''; } $v = wb_arr(isset($m['variants_json']) ? $m['variants_json'] : null); $rel = ($variant && !empty($v[$variant])) ? $v[$variant] : (!empty($v['src']) ? $v['src'] : $m['filename']); return $base . '/uploads/' . $rel; }
function wb_media_by_id($id, $base, $variant = null) { if (!$id) { return ''; } $m = wb_get('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL', array((int)$id)); return $m ? wb_media_url($m, $base, $variant) : ''; }
function wb_site_url($s) { return preg_replace('#/(index\.html)?$#', '', (string)(isset($s['public_url']) ? $s['public_url'] : '')); }
/* 이 서버가 그 사이트의 공개 홈페이지를 직접 호스팅하는지 (도메인이 같으면 게시 파일을 홈페이지 폴더에 바로 저장) */
function wb_site_hosted_here($c, $s) {
  $cfg = $c['config'];
  if (!empty($cfg['site_hosts']) && is_array($cfg['site_hosts']) && isset($cfg['site_hosts'][$s['key']])) { return (bool)$cfg['site_hosts'][$s['key']]; }   /* config.php 에서 직접 지정한 값이 우선 */
  $norm = function ($x) { return preg_replace('/^www\./', '', rtrim(strtolower(preg_replace('/:\d+$/', '', (string)$x)), '.')); };
  $h = wb_host_of(wb_site_url($s));
  if ($h !== '' && $norm($h) === $norm($c['host'])) { return true; }
  /* 이 서버에 사이트가 하나뿐이면 이 홈페이지 폴더(/www)의 주인은 그 사이트입니다.
     관리자를 다른 주소(카페24 기본 도메인 · IP)로 열었거나 공개 주소가 비어 있어도 게시 파일을 /www/index.html 에 저장합니다. */
  return wb_int(wb_val("SELECT COUNT(*) FROM sites WHERE status <> 'deleted'")) <= 1;
}
