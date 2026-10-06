<?php
/* Google Sheets 자동 연동 — 새 방문예약을 사이트별 Google Sheet 에 한 행씩 추가 (카페24 DB = 원본 · 시트 = 외부 동기화본)
   · 인증 : Google Cloud 서비스 계정 키(JSON) → JWT(RS256 · PHP openssl) → OAuth 토큰 → Google Sheets API v4  (Composer · 외부 라이브러리 없음)
   · 키 보관 : 데이터 폴더/google/sa-{키}.php (첫 줄 exit · 주소로 열어도 내용이 나오지 않음) — 관리자 화면 · 공개 JS · API 응답에 private_key 를 내보내지 않음
   · 예약 접수 응답을 먼저 보낸 뒤 처리(wb_after_response) · 실패해도 예약은 그대로 · 기록 google_sheet_sync_logs · 예약ID(접수번호)로 중복 방지
   · 이 파일은 index.php 가 따로(try) 불러옴 — 여기에 문제가 생겨도 예약 접수 · 문자 · 관리자는 계속 동작 */
if (!defined('WB_API')) { http_response_code(404); exit; }

class WbGsError extends Exception {
  public $gcode = ''; public $transient = false;
  public function __construct($gcode, $message, $transient = false) { parent::__construct((string)$message); $this->gcode = (string)$gcode; $this->transient = (bool)$transient; }
}
function wb_gs_headers() { return array('사이트', '접수일시', '성함', '연락처', '방문일', '시간', '문자', '문의사항'); }   /* 선택 체크박스 · 상태 없음 (상태는 관리자에서만) */   /* 상태는 관리자에서만 관리 (시트에는 보내지 않음) */
function wb_gs_headers_old() { return array('접수일시', '현장명', '성함', '연락처', '방문일', '방문시간', '문의사항', '상태', '예약ID'); }
function wb_gs_cut($s, $n) { $s = trim(preg_replace('/\s+/u', ' ', (string)$s)); return function_exists('mb_substr') ? mb_substr($s, 0, $n, 'UTF-8') : substr($s, 0, $n); }
function wb_gs_dir() { return WB_DATA_DIR . '/google'; }
function wb_gs_conf($c) { return (isset($c['config']['google']) && is_array($c['config']['google'])) ? $c['config']['google'] : array(); }   /* 서버 설정(config.php)의 'google' — 보통 비워 둠 (주소 바꾸기는 점검용) */
function wb_gs_api_base($c) { $g = wb_gs_conf($c); return !empty($g['api_base']) ? rtrim((string)$g['api_base'], '/') : 'https://sheets.googleapis.com/v4'; }
function wb_gs_token_uri($c, $cred) { $g = wb_gs_conf($c); if (!empty($g['token_uri'])) { return (string)$g['token_uri']; } $u = isset($cred['token_uri']) ? (string)$cred['token_uri'] : ''; return preg_match('#^https://(oauth2\.googleapis\.com|accounts\.google\.com)/#', $u) ? $u : 'https://oauth2.googleapis.com/token'; }

/* ---------- 응답 뒤 처리 : 고객에게 접수 결과를 먼저 보내고 시트 동기화 ---------- */
function wb_after_response($fn) { if (!isset($GLOBALS['wb_after_fns']) || !is_array($GLOBALS['wb_after_fns'])) { $GLOBALS['wb_after_fns'] = array(); register_shutdown_function('wb_after_run'); } $GLOBALS['wb_after_fns'][] = $fn; }
function wb_after_pending() { return !empty($GLOBALS['wb_after_fns']); }
function wb_after_run() {
  $fns = (isset($GLOBALS['wb_after_fns']) && is_array($GLOBALS['wb_after_fns'])) ? $GLOBALS['wb_after_fns'] : array(); $GLOBALS['wb_after_fns'] = array(); if (!count($fns)) { return; }
  @ignore_user_abort(true); if (function_exists('set_time_limit')) { @set_time_limit(120); }
  if (function_exists('fastcgi_finish_request')) { @fastcgi_finish_request(); } else { while (ob_get_level() > 0) { @ob_end_flush(); } @flush(); }
  foreach ($fns as $fn) { try { call_user_func($fn); } catch (Throwable $e) { wb_log_error('after-response: ' . $e->getMessage()); } }
}

/* ---------- 서비스 계정 키 ---------- */
function wb_gs_cred_key($email) { return substr(sha1(strtolower(trim((string)$email))), 0, 12); }
function wb_gs_cred_file($key) { return wb_gs_dir() . '/sa-' . preg_replace('/[^a-f0-9]/', '', (string)$key) . '.php'; }
function wb_gs_token_file($key) { return wb_gs_dir() . '/token-' . preg_replace('/[^a-f0-9]/', '', (string)$key) . '.php'; }
function wb_gs_cred_parse($text) {
  $j = json_decode((string)$text, true);
  if (!is_array($j)) { throw new WbHttpError(422, 'JSON 파일 형식이 아닙니다. Google Cloud 에서 내려받은 서비스 계정 키(JSON) 파일을 선택해 주세요.'); }
  if (!isset($j['type']) || $j['type'] !== 'service_account') { throw new WbHttpError(422, '서비스 계정 키(JSON)가 아닙니다. ("type": "service_account" 가 들어 있는 파일을 선택해 주세요)'); }
  $email = isset($j['client_email']) ? trim((string)$j['client_email']) : ''; $pk = isset($j['private_key']) ? (string)$j['private_key'] : '';
  if (!preg_match('/^[^@\s]+@[^@\s]+\.gserviceaccount\.com$/', $email)) { throw new WbHttpError(422, '서비스 계정 이메일(client_email)이 없거나 올바르지 않습니다.'); }
  if (strpos($pk, 'PRIVATE KEY') === false) { throw new WbHttpError(422, '비공개 키(private_key)가 없습니다. 키를 새로 만들어 다시 내려받아 주세요.'); }
  if (!function_exists('openssl_pkey_get_private')) { throw new WbHttpError(500, '서버 PHP 에 openssl 확장이 없어 Google 인증을 할 수 없습니다. (카페24 고객센터에 openssl 사용 문의)'); }
  if (!@openssl_pkey_get_private($pk)) { throw new WbHttpError(422, '비공개 키를 읽을 수 없습니다. 파일이 손상되었는지 확인해 주세요.'); }
  return array('type' => 'service_account', 'project_id' => isset($j['project_id']) ? (string)$j['project_id'] : '', 'private_key_id' => isset($j['private_key_id']) ? (string)$j['private_key_id'] : '', 'private_key' => $pk, 'client_email' => $email, 'token_uri' => isset($j['token_uri']) ? (string)$j['token_uri'] : '');
}
function wb_gs_protect_dir() { $dir = wb_gs_dir(); if (!is_dir($dir) && !@mkdir($dir, 0755, true)) { return false; } if (!is_file($dir . '/index.html')) { @file_put_contents($dir . '/index.html', ''); } if (!is_file($dir . '/.htaccess')) { @file_put_contents($dir . '/.htaccess', "Options -Indexes\n<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n"); } return true; }
function wb_gs_write_protected($file, $data) {   /* <?php exit; ?> + JSON · 임시 파일 → 바꿔치기 */
  $tmp = $file . '.tmp'; if (@file_put_contents($tmp, "<?php exit; ?>\n" . json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) { return false; }
  if (!@rename($tmp, $file)) { if (!@copy($tmp, $file)) { @unlink($tmp); return false; } @unlink($tmp); }
  @chmod($file, 0640); return true;
}
function wb_gs_read_protected($file) { if (!is_file($file)) { return null; } $raw = (string)@file_get_contents($file); $p = strpos($raw, "\n"); $j = json_decode($p === false ? '' : substr($raw, $p + 1), true); return is_array($j) ? $j : null; }
function wb_gs_cred_save($text) {
  $cred = wb_gs_cred_parse($text);
  if (!wb_gs_protect_dir()) { throw new WbHttpError(500, '키 저장 폴더를 만들 수 없습니다. (데이터 폴더 쓰기 권한 확인)'); }
  $key = wb_gs_cred_key($cred['client_email']);
  if (!wb_gs_write_protected(wb_gs_cred_file($key), $cred)) { throw new WbHttpError(500, '키 파일을 저장하지 못했습니다. (데이터 폴더 쓰기 권한 확인)'); }
  @unlink(wb_gs_token_file($key));
  if (wb_gs_default_key() === '' || !wb_gs_cred_load(wb_gs_default_key())) { wb_gs_set_default_key($key); }
  return wb_gs_cred_info($key);
}
function wb_gs_cred_load($key) { $key = (string)$key; if ($key === '') { return null; } $j = wb_gs_read_protected(wb_gs_cred_file($key)); return ($j && !empty($j['private_key']) && !empty($j['client_email'])) ? $j : null; }
function wb_gs_cred_info($key) { $j = wb_gs_cred_load($key); if (!$j) { return null; } return array('key' => (string)$key, 'client_email' => (string)$j['client_email'], 'project_id' => isset($j['project_id']) ? (string)$j['project_id'] : '', 'at' => date('Y-m-d H:i:s', (int)@filemtime(wb_gs_cred_file($key)))); }   /* 화면용 : 이메일 · 프로젝트만 (비공개 키 없음) */
function wb_gs_cred_list() { $out = array(); $files = glob(wb_gs_dir() . '/sa-*.php'); if (!$files) { return $out; } foreach ($files as $f) { if (!preg_match('/^sa-([a-f0-9]+)\.php$/', basename($f), $m)) { continue; } $i = wb_gs_cred_info($m[1]); if ($i) { $out[] = $i; } } return $out; }
function wb_gs_default_key() { try { $v = wb_val("SELECT `value` FROM system_settings WHERE `key` = 'google_cred_default'"); return $v ? (string)$v : ''; } catch (Exception $e) { return ''; } }
function wb_gs_set_default_key($key) {
  if (wb_get("SELECT `key` FROM system_settings WHERE `key` = 'google_cred_default'")) { wb_run("UPDATE system_settings SET `value` = ?, updated_at = ? WHERE `key` = 'google_cred_default'", array((string)$key, wb_now())); }
  else { wb_run("INSERT INTO system_settings (`key`, `value`, updated_at) VALUES ('google_cred_default', ?, ?)", array((string)$key, wb_now())); }
}

/* ---------- 사이트별 설정 (settings 표 group 'gsheets' : 켜기 · 스프레드시트 ID · 시트 이름 · 키 참조 · 시트 자동 생성 · 상태 반영) ---------- */
/* 서버 설정(api/config.php)의 google_sheet_* 값 — 관리자 화면에서 비워 두면 이 값을 씁니다 */
/* 기본 Apps Script 웹앱 주소 : 배포본에 미리 넣어 둔 값 — 관리자 [웹앱 주소] 를 비워 두면 이 주소를 씁니다.
   이 값은 서버(PHP)에서만 쓰이며 공개 홈페이지(index.html · 브라우저 JS)에는 절대 들어가지 않습니다. */
if (!defined('WB_GS_DEFAULT_HOOK')) { define('WB_GS_DEFAULT_HOOK', 'https://script.google.com/macros/s/AKfycbzHagq7ZxHBTK2qxc-4TJRQXR0znEBZBaOVfuM9RHpGpFlxyac6xZIFxpJ0-Exa-Cpg/exec'); }
function wb_gs_conf_val($k, $def = '') { try { $cfg = wb_config(); return isset($cfg[$k]) && $cfg[$k] !== '' ? (string)$cfg[$k] : $def; } catch (Exception $e) { return $def; } }
function wb_gs_site_cfg($siteId) {
  $g = wb_arr(wb_get_setting((int)$siteId, 'gsheets'));
  $hookUrl = isset($g['webhook_url']) ? trim((string)$g['webhook_url']) : '';
  if ($hookUrl === '') { $hookUrl = wb_gs_conf_val('google_sheet_webhook_url'); }
  if ($hookUrl === '') { $hookUrl = WB_GS_DEFAULT_HOOK; }   /* 배포본 기본값 */
  $secret = isset($g['webhook_secret']) ? (string)$g['webhook_secret'] : '';
  if ($secret === '') { $secret = wb_gs_conf_val('google_sheet_secret'); }
  $mode = isset($g['mode']) ? (string)$g['mode'] : '';
  if ($mode !== 'webhook' && $mode !== 'api') { $mode = $hookUrl !== '' ? 'webhook' : 'api'; }   /* 웹앱 주소가 있으면 웹앱 방식 */
  $tab = isset($g['sheet_name']) ? trim((string)$g['sheet_name']) : '';
  if ($tab === '') { $tab = wb_gs_conf_val('google_sheet_tab_name'); }
  if ($tab === '') { $tab = '시트1'; }
  return array_merge(array('mode' => $mode, 'webhook_url' => $hookUrl, 'webhook_secret' => $secret), array('enabled' => !empty($g['enabled']) || (($mode === 'webhook') && $hookUrl !== '' && wb_gs_conf_val('google_sheet_enabled') === '1'), 'spreadsheet_id' => isset($g['spreadsheet_id']) ? (string)$g['spreadsheet_id'] : '', 'sheet_name' => $tab,
    'credentials' => isset($g['credentials']) ? (string)$g['credentials'] : '', 'auto_create' => !array_key_exists('auto_create', $g) || !empty($g['auto_create']), 'sync_status' => !array_key_exists('sync_status', $g) || !empty($g['sync_status'])));
}
/* ---------- Apps Script 웹앱(웹훅) 방식 ----------
   홈페이지 → 카페24 DB 저장 → 문자 → (응답 뒤) 이 함수 : HTTPS POST + 공유 비밀키 · 개인정보는 본문(body)에만 · 주소(query)에 넣지 않음 */
function wb_gs_hook_key($cfg) { $id = (string)$cfg['spreadsheet_id']; if ($id !== '') { return $id; } return 'webhook:' . substr(sha1((string)$cfg['webhook_url']), 0, 12); }
function wb_gs_hook_columns() { return wb_gs_headers(); }
function wb_gs_hook_site_tel($siteId) {
  $tel = (string)wb_val('SELECT tel FROM sites WHERE id = ?', array((int)$siteId));
  if (trim($tel) === '') { $st = wb_arr(wb_get_setting((int)$siteId, 'site')); if (isset($st['site']) && is_array($st['site']) && isset($st['site']['tel'])) { $tel = (string)$st['site']['tel']; } }
  return trim($tel);
}
function wb_gs_hook_payload($sub, $cfg, $attempt) {
  $data = wb_arr($sub['data_json']);
  $inquiry = function_exists('wb_sub_inquiry') ? wb_sub_inquiry($sub, $data) : '';
  $landing = (string)$sub['page_path'];
  if (trim($landing) === '') { $landing = (string)$sub['landing_path']; }
  $siteUrl = (string)wb_val('SELECT public_url FROM sites WHERE id = ?', array((int)$sub['site_id']));
  if ($landing !== '' && strpos($landing, 'http') !== 0 && $siteUrl !== '') { $landing = rtrim($siteUrl, '/') . '/' . ltrim($landing, '/'); }
  return array(
    'sheet' => (string)$cfg['sheet_name'], 'receipt' => (string)$sub['receipt_no'], 'site_key' => (string)wb_val('SELECT  FROM sites WHERE id = ?', array((int)$sub['site_id'])), 'attempt' => (int)$attempt,
    'columns' => wb_gs_hook_columns(),
    'row' => wb_gs_row($sub, (string)$sub['site_title']),
    'fields' => array_combine(wb_gs_headers(), wb_gs_row($sub, (string)$sub['site_title'])),   /* 머리글 이름 → 값 (시트 열 순서가 달라도 안전) */
    'landing' => $landing,
  );
}
function wb_gs_hook_post($cfg, $payload, $timeout = 12) {
  $url = (string)$cfg['webhook_url'];
  if ($url === '' || strpos($url, 'https://') !== 0) { throw new WbGsError('CONFIG', 'Apps Script 웹앱 주소(https://…)가 없습니다.'); }
  $payload['secret'] = (string)$cfg['webhook_secret'];
  $body = wb_enc($payload);
  $res = array('code' => 0, 'body' => '', 'error' => '');
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 5,
      CURLOPT_HTTPHEADER => array('Content-Type: application/json; charset=utf-8', 'Accept: application/json')));
    $res['body'] = (string)curl_exec($ch); $res['code'] = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $res['error'] = curl_error($ch); curl_close($ch);
  } else {
    $ctx = stream_context_create(array('http' => array('method' => 'POST', 'header' => "Content-Type: application/json; charset=utf-8\r\n", 'content' => $body, 'timeout' => $timeout, 'ignore_errors' => true, 'follow_location' => 1, 'max_redirects' => 5)));
    $res['body'] = (string)@file_get_contents($url, false, $ctx);
    $res['code'] = 0; if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) { $res['code'] = (int)$m[1]; }
  }
  if ($res['code'] === 0) { throw new WbGsError('NETWORK', 'Google 웹앱에 연결하지 못했습니다. ' . wb_gs_cut($res['error'], 80)); }
  $j = json_decode($res['body'], true);
  if (!is_array($j)) {
    /* Google 로그인 화면이 돌아오면 = 웹앱을 "모든 사용자" 로 배포하지 않은 경우 */
    if (stripos($res['body'], 'accounts.google.com') !== false || stripos($res['body'], 'ServiceLogin') !== false) {
      throw new WbGsError('NEEDLOGIN', 'Google 로그인 화면이 돌아왔습니다. Apps Script [배포 → 배포 관리 → 편집] 에서 액세스 권한을 "모든 사용자" 로 바꾼 뒤 새 버전으로 다시 배포해 주세요.');
    }
    throw new WbGsError('BADRESP', 'Google 웹앱 응답을 해석할 수 없습니다. (HTTP ' . $res['code'] . ') ' . wb_gs_cut(strip_tags((string)$res['body']), 100));
  }
  if (empty($j['ok'])) { throw new WbGsError(isset($j['code']) ? wb_gs_cut($j['code'], 30) : 'HOOK', isset($j['error']) ? wb_gs_cut($j['error'], 160) : 'Google 웹앱이 처리하지 못했습니다.'); }
  return $j;
}
function wb_gs_hook_sync($sub, $cfg, $l) {
  $j = wb_gs_hook_post($cfg, wb_gs_hook_payload($sub, $cfg, (int)$l['attempts']));
  $row = isset($j['row']) ? (int)$j['row'] : 0;
  wb_gs_log_ok((int)$l['id'], $row);
  return array('ok' => true, 'row' => $row, 'existing' => !empty($j['duplicate']));
}
function wb_gs_hook_test($cfg) {
  $steps = array(); $ok = true;
  $steps[] = array('ok' => (string)$cfg['webhook_url'] !== '', 'label' => 'Apps Script 웹앱 주소', 'detail' => (string)$cfg['webhook_url'] !== '' ? '입력됨' : '주소를 입력해 주세요');
  $steps[] = array('ok' => (string)$cfg['webhook_secret'] !== '', 'label' => '공유 비밀키', 'detail' => (string)$cfg['webhook_secret'] !== '' ? '입력됨' : '비밀키를 입력해 주세요');
  foreach ($steps as $s0) { if (empty($s0['ok'])) { $ok = false; } }
  if (!$ok) { return array('ok' => false, 'message' => '설정을 먼저 입력해 주세요.', 'steps' => $steps); }
  try {
    $j = wb_gs_hook_post($cfg, array('test' => true, 'sheet' => (string)$cfg['sheet_name'], 'columns' => wb_gs_hook_columns()), 15);
    $steps[] = array('ok' => true, 'label' => '웹앱 연결 · 비밀키 확인', 'detail' => '정상');
    $steps[] = array('ok' => true, 'label' => '시트 확인', 'detail' => (isset($j['sheet']) ? (string)$j['sheet'] : (string)$cfg['sheet_name']) . (isset($j['rows']) ? ' · 현재 ' . (int)$j['rows'] . '행' : ''));
    return array('ok' => true, 'message' => 'Google Sheets(웹앱) 연결 성공', 'steps' => $steps);
  } catch (WbGsError $e) {
    $steps[] = array('ok' => false, 'label' => '웹앱 연결', 'detail' => $e->getMessage() . ' [' . $e->gcode . ']');
    return array('ok' => false, 'message' => $e->getMessage(), 'steps' => $steps);
  }
}
function wb_gs_cfg_key($cfg) { return $cfg['credentials'] !== '' ? $cfg['credentials'] : wb_gs_default_key(); }
function wb_gs_parse_id($in) { $in = trim((string)$in); if (preg_match('#/spreadsheets/d/([a-zA-Z0-9_-]{10,})#', $in, $m)) { return $m[1]; } return preg_match('/^[a-zA-Z0-9_-]{10,}$/', $in) ? $in : ''; }   /* 전체 주소를 붙여 넣어도 ID 만 */
function wb_gs_sheet_name_ok($n) { $n = trim((string)$n); return $n !== '' && (function_exists('mb_strlen') ? mb_strlen($n, 'UTF-8') : strlen($n)) <= 80 && !preg_match('/[\[\]\*\?\/\\\\:]/', $n); }

/* ---------- Google API 호출 ---------- */
function wb_gs_http($method, $url, $token, $body, $timeout, $form = false) {
  $h = array('Accept: application/json'); if ($token !== '') { $h[] = 'Authorization: Bearer ' . $token; }
  $payload = ''; if ($body !== null) { if ($form) { $h[] = 'Content-Type: application/x-www-form-urlencoded'; $payload = (string)$body; } else { $h[] = 'Content-Type: application/json; charset=utf-8'; $payload = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); } }
  $r = wb_sms_http($method, $url, $h, $payload, $timeout);
  $j = json_decode((string)$r['body'], true);
  return array('code' => (int)$r['code'], 'json' => is_array($j) ? $j : array(), 'error' => (string)$r['error']);
}
/* 오류 해석 : 원래 코드 · 문구는 기록에 남기고 화면에는 원인을 한국어로 */
function wb_gs_fail($r, $what) {
  $code = (int)$r['code']; $e = isset($r['json']['error']) ? $r['json']['error'] : array();
  $msg = is_array($e) ? (isset($e['message']) ? (string)$e['message'] : '') : (string)$e; $st = (is_array($e) && isset($e['status'])) ? (string)$e['status'] : '';
  if (!is_array($e) && isset($r['json']['error_description'])) { $msg .= ' ' . (string)$r['json']['error_description']; }
  $raw = trim($st . ' ' . $msg);
  if ($code === 0) { return new WbGsError('NETWORK', 'Google 서버에 연결하지 못했습니다 (시간 초과 또는 네트워크 오류)' . ($r['error'] !== '' ? ' · ' . wb_gs_cut($r['error'], 80) : '') . '. 잠시 후 자동으로 다시 시도합니다.', true); }
  if ($code === 429 || $st === 'RESOURCE_EXHAUSTED') { return new WbGsError('QUOTA', 'Google API 사용 한도를 잠시 넘었습니다 (429). 잠시 후 자동으로 다시 시도합니다.', true); }
  if ($code >= 500) { return new WbGsError('SERVER', 'Google 서버 일시 오류(HTTP ' . $code . ')입니다. 잠시 후 자동으로 다시 시도합니다.', true); }
  if (preg_match('/has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i', $raw)) { return new WbGsError('API_DISABLED', 'Google Cloud 프로젝트에서 "Google Sheets API" 가 사용 설정되어 있지 않습니다. Google Cloud 콘솔 › API 및 서비스 › 라이브러리에서 Google Sheets API 를 [사용]으로 바꿔 주세요.'); }
  if ($code === 401 || $st === 'UNAUTHENTICATED') { return new WbGsError('AUTH', '서비스 계정 인증에 실패했습니다. 서비스 계정 키(JSON)를 다시 등록해 주세요.'); }
  if ($code === 403 || $st === 'PERMISSION_DENIED') { return new WbGsError('PERMISSION', '서비스 계정에 편집 권한이 없습니다. Google Sheet › 공유 › 서비스 계정 이메일을 "편집자"로 추가해 주세요.'); }
  if ($code === 404 || $st === 'NOT_FOUND') { return new WbGsError('NOT_FOUND', 'Google Sheet를 찾을 수 없습니다. 스프레드시트 주소(ID)가 맞는지, 서비스 계정 이메일에 공유되었는지 확인해 주세요.'); }
  if ($code === 400 && preg_match('/Unable to parse range/i', $msg)) { return new WbGsError('SHEET_MISSING', '시트(탭)를 찾을 수 없습니다. 시트 이름을 확인해 주세요.'); }
  return new WbGsError('HTTP_' . $code, 'Google Sheets 요청이 실패했습니다 (' . $what . ' · HTTP ' . $code . ($raw !== '' ? ' · ' . wb_gs_cut($raw, 120) : '') . ').');
}
function wb_gs_b64url($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function wb_gs_token($c, $key, $cred) {
  $tf = wb_gs_token_file($key); $t = wb_gs_read_protected($tf);
  if ($t && !empty($t['access_token']) && (int)$t['exp'] > time() + 120) { return (string)$t['access_token']; }
  if (!function_exists('openssl_sign')) { throw new WbGsError('NO_OPENSSL', '서버 PHP 에 openssl 확장이 없어 Google 인증을 할 수 없습니다.'); }
  $now = time(); $aud = wb_gs_token_uri($c, $cred);
  $head = array('alg' => 'RS256', 'typ' => 'JWT'); if (!empty($cred['private_key_id'])) { $head['kid'] = (string)$cred['private_key_id']; }
  $claim = array('iss' => (string)$cred['client_email'], 'scope' => 'https://www.googleapis.com/auth/spreadsheets', 'aud' => $aud, 'iat' => $now - 30, 'exp' => $now + 3000);
  $input = wb_gs_b64url(json_encode($head, JSON_UNESCAPED_SLASHES)) . '.' . wb_gs_b64url(json_encode($claim, JSON_UNESCAPED_SLASHES));
  $sig = ''; $pk = @openssl_pkey_get_private((string)$cred['private_key']);
  if (!$pk || !@openssl_sign($input, $sig, $pk, OPENSSL_ALGO_SHA256)) { throw new WbGsError('AUTH', '서비스 계정 비공개 키로 서명하지 못했습니다. 키(JSON)를 다시 등록해 주세요.'); }
  $r = wb_gs_http('POST', $aud, '', 'grant_type=' . rawurlencode('urn:ietf:params:oauth:grant-type:jwt-bearer') . '&assertion=' . rawurlencode($input . '.' . wb_gs_b64url($sig)), 12, true);
  if ($r['code'] !== 200 || empty($r['json']['access_token'])) {
    if ($r['code'] === 0 || $r['code'] >= 500 || $r['code'] === 429) { throw wb_gs_fail($r, 'Google 인증'); }
    $err = (isset($r['json']['error']) && is_string($r['json']['error'])) ? $r['json']['error'] : ''; $desc = isset($r['json']['error_description']) ? (string)$r['json']['error_description'] : '';
    if ($err === 'invalid_grant' && preg_match('/time|exp|iat/i', $desc)) { throw new WbGsError('AUTH_CLOCK', 'Google 인증 실패 : 서버 시각이 맞지 않습니다 (' . wb_gs_cut($desc, 80) . ').'); }
    throw new WbGsError('AUTH', '서비스 계정 인증에 실패했습니다' . (trim($err . ' ' . $desc) !== '' ? ' (' . wb_gs_cut(trim($err . ' ' . $desc), 100) . ')' : '') . '. 키가 삭제 · 비활성화되지 않았는지 확인하고 서비스 계정 키(JSON)를 다시 등록해 주세요.');
  }
  $tok = (string)$r['json']['access_token']; $exp = $now + max(120, (int)(isset($r['json']['expires_in']) ? $r['json']['expires_in'] : 3600));
  if (wb_gs_protect_dir()) { wb_gs_write_protected($tf, array('access_token' => $tok, 'exp' => $exp)); }
  return $tok;
}
function wb_gs_ctx($c, $cfg) {
  if ($cfg['spreadsheet_id'] === '') { throw new WbGsError('NO_SHEET_ID', '스프레드시트 주소(ID)가 입력되지 않았습니다.'); }
  $key = wb_gs_cfg_key($cfg); $cred = wb_gs_cred_load($key);
  if (!$cred) { throw new WbGsError('NO_CREDENTIALS', '서비스 계정 키(JSON)가 등록되지 않았습니다. 사이트 설정 › 외부 연동에서 키 파일을 올려 주세요.'); }
  return array('key' => $key, 'cred' => $cred, 'token' => wb_gs_token($c, $key, $cred), 'id' => $cfg['spreadsheet_id'], 'sheet' => $cfg['sheet_name'], 'base' => wb_gs_api_base($c) . '/spreadsheets/' . rawurlencode($cfg['spreadsheet_id']));
}
function wb_gs_a1($sheet, $cells) { return "'" . str_replace("'", "''", (string)$sheet) . "'!" . $cells; }
function wb_gs_values_path($ctx, $cells) { return '/values/' . rawurlencode(wb_gs_a1($ctx['sheet'], $cells)); }
function wb_gs_call($ctx, $method, $suffix, $body, $what) { $r = wb_gs_http($method, $ctx['base'] . $suffix, $ctx['token'], $body, 15); if ($r['code'] < 200 || $r['code'] >= 300) { throw wb_gs_fail($r, $what); } return $r['json']; }
function wb_gs_meta($ctx) {
  $j = wb_gs_call($ctx, 'GET', '?fields=' . rawurlencode('properties.title,sheets.properties.title'), null, '스프레드시트 확인');
  $titles = array(); $sheets = (isset($j['sheets']) && is_array($j['sheets'])) ? $j['sheets'] : array();
  foreach ($sheets as $sh) { if (isset($sh['properties']['title'])) { $titles[] = (string)$sh['properties']['title']; } }
  return array('title' => isset($j['properties']['title']) ? (string)$j['properties']['title'] : '', 'sheets' => $titles);
}
function wb_gs_add_sheet($ctx) { wb_gs_call($ctx, 'POST', ':batchUpdate', array('requests' => array(array('addSheet' => array('properties' => array('title' => $ctx['sheet']))))), '시트 만들기'); }
/* 1행 헤더 : 비어 있으면 만들고, 같으면 그대로, 다른 내용이면 건드리지 않음 */
function wb_gs_header($ctx) {
  $j = wb_gs_call($ctx, 'GET', wb_gs_values_path($ctx, 'A1:I1'), null, '헤더 확인');
  $row = (isset($j['values'][0]) && is_array($j['values'][0])) ? $j['values'][0] : array();
  $has = array(); foreach ($row as $v) { $has[] = trim((string)$v); } while (count($has) && $has[count($has) - 1] === '') { array_pop($has); }
  $want = wb_gs_headers();
  if (!count($has)) { wb_gs_call($ctx, 'PUT', wb_gs_values_path($ctx, 'A1:I1') . '?valueInputOption=RAW', array('values' => array($want)), '헤더 만들기'); return '1행에 헤더를 만들었습니다.'; }
  if ($has === $want) { return ''; }
  return '1행에 다른 제목이 있어 헤더를 새로 만들지 않았습니다 (기존 내용 아래에 이어서 추가).';
}
function wb_gs_prepare($ctx, $autoCreate) {
  $meta = wb_gs_meta($ctx); $notes = array();
  if (!in_array($ctx['sheet'], $meta['sheets'], true)) {
    if (!$autoCreate) { throw new WbGsError('SHEET_MISSING', '스프레드시트에 "' . $ctx['sheet'] . '" 시트(탭)가 없습니다. 시트 이름을 확인하거나 [시트가 없으면 새로 만들기]를 켜 주세요.'); }
    wb_gs_add_sheet($ctx); $notes[] = '"' . $ctx['sheet'] . '" 시트를 새로 만들었습니다.';
  }
  $h = wb_gs_header($ctx); if ($h !== '') { $notes[] = $h; }
  return array('title' => $meta['title'], 'notes' => $notes);
}
/* 예약ID(I열) → 행 번호 */
function wb_gs_receipt_rows($ctx) {
  return array();   /* 시트에 접수ID 열을 두지 않음 → 중복 방지는 서버 기록(google_sheet_sync_logs) 으로만 */
  $j = wb_gs_call($ctx, 'GET', wb_gs_values_path($ctx, 'I:I'), null, '예약ID 확인'); $map = array();
  $vals = (isset($j['values']) && is_array($j['values'])) ? $j['values'] : array();
  foreach ($vals as $i => $r) { $v = (is_array($r) && isset($r[0])) ? trim((string)$r[0]) : ''; if ($v !== '' && !isset($map[$v])) { $map[$v] = $i + 1; } }
  return $map;
}
function wb_gs_updated_row($j) { $u = (isset($j['updates']['updatedRange'])) ? (string)$j['updates']['updatedRange'] : ''; return preg_match('/![A-Z]+(\d+)/', $u, $m) ? (int)$m[1] : 0; }
/* 한 행 : 접수일시 · 현장명 · 성함 · 연락처 · 방문일 · 방문시간 · 문의사항(원문 전체) · 상태 · 예약ID */
/* 문자 결과 : 성공 1건 이상 → ✓ · 그 밖(실패 · 미발송 · 대상 없음) → - */
function wb_gs_sms_mark($subId) {
  try {
    $okCount = wb_int(wb_val("SELECT COUNT(*) FROM sms_logs WHERE reservation_id = ? AND status = 'sent'", array((int)$subId)));
    if ($okCount > 0) { return $okCount . '명 발송 완료'; }
    $failCount = wb_int(wb_val("SELECT COUNT(*) FROM sms_logs WHERE reservation_id = ?", array((int)$subId)));
    return $failCount > 0 ? '발송 실패' : '미발송';
  } catch (Exception $e) { return '미발송'; }
}
function wb_gs_row($sub, $siteName) {
  $st = wb_statuses(); $data = wb_arr($sub['data_json']);
  $phone = (string)$sub['phone'] !== '' ? wb_sms_pretty((string)$sub['phone']) : '';
  $inq = function_exists('wb_sub_inquiry') ? wb_sub_inquiry($sub, $data) : '';
  return array((string)$siteName, substr((string)$sub['created_at'], 0, 16), (string)$sub['name'], $phone, (string)$sub['visit_date'], (string)$sub['visit_time'],
    wb_gs_sms_mark((int)$sub['id']), $inq);
}
function wb_gs_row_old($sub, $siteName) {
  $st = wb_statuses(); $data = wb_arr($sub['data_json']);
  return array(substr((string)$sub['created_at'], 0, 16), (string)$siteName, (string)$sub['name'], (string)$sub['phone'] !== '' ? wb_sms_pretty((string)$sub['phone']) : '', (string)$sub['visit_date'], (string)$sub['visit_time'],
    function_exists('wb_sub_inquiry') ? wb_sub_inquiry($sub, $data) : '', isset($st[$sub['status']]) ? $st[$sub['status']] : (string)$sub['status'], (string)$sub['receipt_no']);
}

/* ---------- 동기화 기록 (google_sheet_sync_logs) ---------- */
function wb_gs_log_get($subId, $sid, $sheet) { return wb_get('SELECT * FROM google_sheet_sync_logs WHERE reservation_id = ? AND spreadsheet_id = ? AND sheet_name = ?', array((int)$subId, (string)$sid, (string)$sheet)); }
function wb_gs_log_ensure($siteId, $subId, $sid, $sheet) {
  $l = wb_gs_log_get($subId, $sid, $sheet); if ($l) { return $l; }
  try { wb_insert('google_sheet_sync_logs', array('site_id' => (int)$siteId, 'reservation_id' => (int)$subId, 'spreadsheet_id' => (string)$sid, 'sheet_name' => (string)$sheet, 'status' => 'pending', 'attempts' => 0, 'created_at' => wb_now(), 'updated_at' => wb_now())); } catch (Exception $e) { /* 동시에 만든 줄 (UNIQUE) */ }
  return wb_gs_log_get($subId, $sid, $sheet);
}
/* 이 줄을 이번 요청이 맡음 (시도 횟수 비교 교체 — 동시에 두 요청이 같은 예약을 보내지 않게) */
function wb_gs_claim($l) { return wb_run("UPDATE google_sheet_sync_logs SET attempts = attempts + 1, updated_at = ? WHERE id = ? AND attempts = ? AND status <> 'success'", array(wb_now(), (int)$l['id'], (int)$l['attempts'])) === 1; }
function wb_gs_log_ok($id, $row) { wb_update('google_sheet_sync_logs', array('status' => 'success', 'row_number' => (int)$row, 'error_code' => null, 'error_message' => null, 'next_try_at' => null, 'synced_at' => wb_now(), 'updated_at' => wb_now()), 'id = ?', array((int)$id)); }
function wb_gs_log_fail($l, $e) {
  $att = (int)$l['attempts'] + 1; $retry = $e->transient && $att < 3;
  wb_update('google_sheet_sync_logs', array('status' => $retry ? 'pending' : 'failed', 'error_code' => $e->gcode, 'error_message' => wb_gs_cut($e->getMessage(), 250), 'next_try_at' => $retry ? wb_now(time() + 20 * $att) : null, 'updated_at' => wb_now()), 'id = ?', array((int)$l['id']));
  if (!$retry) { wb_log_error('gsheets failed log#' . (int)$l['id'] . ' ' . $e->gcode . ' ' . wb_gs_cut($e->getMessage(), 160)); }
  return $retry;
}
function wb_gs_sub($subId) { return wb_get('SELECT s.*, st.name AS site_title FROM form_submissions s JOIN sites st ON st.id = s.site_id WHERE s.id = ?', array((int)$subId)); }

/* ---------- 예약 한 건 동기화 : 기록 확인 → (시트 · 헤더 준비) → I열에 같은 예약ID 가 있으면 추가하지 않음 → 한 행 추가 ---------- */
function wb_gs_sync($c, $subId, $opts = array()) {
  $tries = isset($opts['tries']) ? max(1, min(3, (int)$opts['tries'])) : 1; $force = !empty($opts['force']);
  $sub = wb_gs_sub($subId);
  if (!$sub || !empty($sub['deleted_at'])) { return array('ok' => false, 'skipped' => 'gone', 'error' => '삭제된 예약입니다.'); }
  if (!empty($sub['anonymized_at'])) { return array('ok' => false, 'skipped' => 'purged', 'error' => '개인정보가 파기된 예약은 보내지 않습니다.'); }
  $cfg = wb_gs_site_cfg((int)$sub['site_id']);
  $hook = $cfg['mode'] === 'webhook';
  if (!$cfg['enabled'] || ($hook && $cfg['webhook_url'] === '') || (!$hook && $cfg['spreadsheet_id'] === '')) { return array('ok' => false, 'skipped' => 'off', 'error' => '이 사이트의 Google Sheets 연동이 꺼져 있습니다.'); }
  $logKey = $hook ? wb_gs_hook_key($cfg) : $cfg['spreadsheet_id'];
  $l = wb_gs_log_ensure((int)$sub['site_id'], (int)$sub['id'], $logKey, $cfg['sheet_name']);
  if (!$l) { return array('ok' => false, 'error' => '동기화 기록을 만들지 못했습니다.'); }
  if ($l['status'] === 'success') { return array('ok' => true, 'already' => true, 'row' => (int)$l['row_number']); }
  if ($force && (int)$l['attempts'] > 0) { wb_run("UPDATE google_sheet_sync_logs SET attempts = 0, status = 'pending', next_try_at = NULL, updated_at = ? WHERE id = ? AND status <> 'success'", array(wb_now(), (int)$l['id'])); $l = wb_gs_log_get((int)$sub['id'], $logKey, $cfg['sheet_name']); if (!$l || $l['status'] === 'success') { return array('ok' => true, 'already' => true); } }
  $last = array('ok' => false, 'error' => '');
  for ($i = 0; $i < $tries; $i++) {
    if ($i > 0) { sleep(2 * $i + 1); $l = wb_gs_log_get((int)$sub['id'], $logKey, $cfg['sheet_name']); if (!$l || $l['status'] === 'success') { return array('ok' => true, 'already' => true); } if ($l['status'] === 'failed') { break; } }
    if (!wb_gs_claim($l)) { return array('ok' => false, 'busy' => true, 'error' => '다른 요청이 이 예약을 보내는 중입니다.'); }
    try {
      if ($hook) { $l2 = wb_gs_log_get((int)$sub['id'], $logKey, $cfg['sheet_name']); return wb_gs_hook_sync($sub, $cfg, $l2 ? $l2 : $l); }
      $ctx = wb_gs_ctx($c, $cfg); wb_gs_prepare($ctx, $cfg['auto_create']);
      $rid = (string)$sub['receipt_no']; $map = wb_gs_receipt_rows($ctx);
      if ($rid !== '' && isset($map[$rid])) { wb_gs_log_ok((int)$l['id'], $map[$rid]); return array('ok' => true, 'row' => $map[$rid], 'existing' => true); }   /* 시트에 이미 있음 → 다시 추가하지 않음 */
      $j = wb_gs_call($ctx, 'POST', wb_gs_values_path($ctx, 'A:H') . ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS', array('values' => array(wb_gs_row($sub, $sub['site_title']))), '행 추가');
      $row = wb_gs_updated_row($j); wb_gs_log_ok((int)$l['id'], $row);
      return array('ok' => true, 'row' => $row);
    } catch (WbGsError $e) {
      $retry = wb_gs_log_fail($l, $e); $last = array('ok' => false, 'code' => $e->gcode, 'error' => $e->getMessage(), 'retry' => $retry);
      if (!$retry) { return $last; }
      $l = wb_gs_log_get((int)$sub['id'], $logKey, $cfg['sheet_name']); if (!$l) { return $last; }
    } catch (Throwable $e) {
      wb_gs_log_fail($l, new WbGsError('INTERNAL', '동기화 중 서버 오류 : ' . wb_gs_cut($e->getMessage(), 120))); wb_log_error('gsheets: ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine());
      return array('ok' => false, 'code' => 'INTERNAL', 'error' => '동기화 중 서버 오류가 발생했습니다.');
    }
  }
  return $last;
}
/* 상태 변경 → 시트의 같은 예약ID 행 H열(상태)만 바꿈 (아직 시트에 없으면 한 행 추가) */
function wb_gs_sync_status($c, $subId) {
  $sub = wb_gs_sub($subId); if (!$sub || !empty($sub['deleted_at']) || !empty($sub['anonymized_at'])) { return array('ok' => false, 'skipped' => 'gone'); }
  $cfg = wb_gs_site_cfg((int)$sub['site_id']); if ($cfg['mode'] === 'webhook') { return array('ok' => false, 'skipped' => 'webhook'); }
  if (!$cfg['enabled'] || $cfg['spreadsheet_id'] === '' || !$cfg['sync_status']) { return array('ok' => false, 'skipped' => 'off'); }
  $l = wb_gs_log_get((int)$sub['id'], $cfg['spreadsheet_id'], $cfg['sheet_name']);
  if (!$l || $l['status'] !== 'success') { return wb_gs_sync($c, $subId, array('tries' => 1)); }
  try {
    $ctx = wb_gs_ctx($c, $cfg); $row = (int)$l['row_number']; $rid = (string)$sub['receipt_no']; $cur = '';
    if ($row > 0) { $j = wb_gs_call($ctx, 'GET', wb_gs_values_path($ctx, 'I' . $row), null, '행 확인'); $cur = isset($j['values'][0][0]) ? trim((string)$j['values'][0][0]) : ''; }
    if ($rid === '' || $cur !== $rid) { $map = wb_gs_receipt_rows($ctx); $row = ($rid !== '' && isset($map[$rid])) ? $map[$rid] : 0; }   /* 누가 시트를 정렬 · 삭제했으면 예약ID 로 다시 찾음 */
    if ($row < 1) { throw new WbGsError('ROW_MISSING', 'Google Sheet 에서 이 예약(' . $rid . ') 행을 찾지 못해 상태를 바꾸지 못했습니다. 시트에서 행이 지워졌는지 확인해 주세요.'); }
    $st = wb_statuses(); $label = isset($st[$sub['status']]) ? $st[$sub['status']] : (string)$sub['status'];
    wb_gs_call($ctx, 'PUT', wb_gs_values_path($ctx, 'H' . $row) . '?valueInputOption=RAW', array('values' => array(array($label))), '상태 바꾸기');
    wb_update('google_sheet_sync_logs', array('row_number' => $row, 'error_code' => null, 'error_message' => null, 'synced_at' => wb_now(), 'updated_at' => wb_now()), 'id = ?', array((int)$l['id']));
    return array('ok' => true, 'row' => $row, 'status' => $label);
  } catch (WbGsError $e) {
    wb_update('google_sheet_sync_logs', array('error_code' => 'STATUS_' . $e->gcode, 'error_message' => wb_gs_cut('상태 반영 실패 : ' . $e->getMessage(), 250), 'updated_at' => wb_now()), 'id = ?', array((int)$l['id']));
    return array('ok' => false, 'code' => $e->gcode, 'error' => $e->getMessage());
  } catch (Throwable $e) { wb_log_error('gsheets status: ' . $e->getMessage()); return array('ok' => false, 'error' => '상태 반영 중 서버 오류'); }
}
/* 새 예약 : 기록(대기)만 먼저 만들고, 고객 응답을 보낸 뒤 동기화 (PHP-FPM 이면 3번까지 · 아니면 1번 + 나머지는 자동 재시도) */
function wb_gs_queue_reservation($c, $siteId, $subId) {
  $cfg = wb_gs_site_cfg($siteId);
  $hook = $cfg['mode'] === 'webhook';
  if (!$cfg['enabled'] || ($hook && $cfg['webhook_url'] === '') || (!$hook && $cfg['spreadsheet_id'] === '')) { return false; }
  wb_gs_log_ensure($siteId, $subId, $hook ? wb_gs_hook_key($cfg) : $cfg['spreadsheet_id'], $cfg['sheet_name']);
  $fpm = function_exists('fastcgi_finish_request');
  wb_after_response(function () use ($c, $subId, $fpm) { wb_gs_sync($c, $subId, array('tries' => $fpm ? 3 : 1)); wb_gs_retry_due($c, 3, 20); });
  return true;
}
function wb_gs_queue_status($c, $subId) { $sub = wb_get('SELECT site_id FROM form_submissions WHERE id = ?', array((int)$subId)); if (!$sub) { return false; } $cfg = wb_gs_site_cfg((int)$sub['site_id']); if (!$cfg['enabled'] || !$cfg['sync_status'] || $cfg['spreadsheet_id'] === '') { return false; } wb_after_response(function () use ($c, $subId) { wb_gs_sync_status($c, $subId); }); return true; }
/* 자동 재시도 : 일시 오류로 대기 중인 줄 (3번까지 · 20초/40초 간격) — 새 예약 · 관리자 알림 확인(10초마다) 때 응답 뒤에 조금씩 */
function wb_gs_has_due() { try { return (bool)wb_val("SELECT id FROM google_sheet_sync_logs WHERE status = 'pending' AND attempts < 3 AND (next_try_at IS NULL OR next_try_at <= ?) AND created_at <= ? LIMIT 1", array(wb_now(), wb_now(time() - 15))); } catch (Exception $e) { return false; } }
function wb_gs_retry_due($c, $max, $budget) {
  $t0 = time(); $n = 0;
  foreach (wb_all("SELECT * FROM google_sheet_sync_logs WHERE status = 'pending' AND attempts < 3 AND (next_try_at IS NULL OR next_try_at <= ?) ORDER BY id LIMIT " . (int)$max, array(wb_now())) as $l) {
    if (time() - $t0 > $budget) { break; }
    $cfg = wb_gs_site_cfg((int)$l['site_id']);
    if (!$cfg['enabled'] || $cfg['spreadsheet_id'] !== (string)$l['spreadsheet_id'] || $cfg['sheet_name'] !== (string)$l['sheet_name']) { wb_update('google_sheet_sync_logs', array('status' => 'failed', 'error_code' => 'CONFIG_CHANGED', 'error_message' => '연동이 꺼졌거나 연결한 시트가 바뀌어 보내지 않았습니다. 필요하면 [구글시트 다시 보내기]를 눌러 주세요.', 'updated_at' => wb_now()), 'id = ?', array((int)$l['id'])); continue; }
    wb_gs_sync($c, (int)$l['reservation_id'], array('tries' => 1)); $n++;
  }
  return $n;
}
/* 기존 예약 한꺼번에 : 아직 이 시트에 보내지 않은 예약만 · 시트 I열에 같은 예약ID 가 있으면 추가하지 않음 · 한 번에 최대 $limit 건 */
function wb_gs_sync_all($c, $siteId, $limit) {
  $cfg = wb_gs_site_cfg($siteId);
  if ($cfg['mode'] === 'webhook') { return wb_gs_hook_sync_all($c, $siteId, $cfg, $limit); }
  if (!$cfg['enabled'] || $cfg['spreadsheet_id'] === '') { throw new WbHttpError(422, '먼저 Google Sheets 연동을 켜고 설정을 저장해 주세요.'); }
  try { $ctx = wb_gs_ctx($c, $cfg); wb_gs_prepare($ctx, $cfg['auto_create']); $map = wb_gs_receipt_rows($ctx); } catch (WbGsError $e) { throw new WbHttpError(422, $e->getMessage(), array('code' => $e->gcode)); }
  $base = " FROM form_submissions s LEFT JOIN google_sheet_sync_logs g ON g.reservation_id = s.id AND g.spreadsheet_id = ? AND g.sheet_name = ? AND g.status = 'success' WHERE s.site_id = ? AND s.deleted_at IS NULL AND s.anonymized_at IS NULL AND g.id IS NULL";
  $p = array($cfg['spreadsheet_id'], $cfg['sheet_name'], (int)$siteId); $total = wb_int(wb_val('SELECT COUNT(*)' . $base, $p));
  $rows = wb_all('SELECT s.*' . $base . ' ORDER BY s.id LIMIT ' . max(1, min(200, (int)$limit)), $p);
  $site = wb_get('SELECT name FROM sites WHERE id = ?', array((int)$siteId)); $siteName = $site ? (string)$site['name'] : '';
  $append = array(); $claimed = array(); $existing = 0; $skipped = 0;
  foreach ($rows as $s) {
    $l = wb_gs_log_ensure((int)$siteId, (int)$s['id'], $cfg['spreadsheet_id'], $cfg['sheet_name']); if (!$l || $l['status'] === 'success') { $skipped++; continue; }
    if (!wb_gs_claim($l)) { $skipped++; continue; }
    $rid = (string)$s['receipt_no'];
    if ($rid !== '' && isset($map[$rid])) { wb_gs_log_ok((int)$l['id'], $map[$rid]); $existing++; continue; }
    $append[] = wb_gs_row($s, $siteName); $claimed[] = $l;
  }
  $added = 0;
  if (count($append)) {
    try { $j = wb_gs_call($ctx, 'POST', wb_gs_values_path($ctx, 'A:H') . ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS', array('values' => $append), '기존 예약 추가'); $start = wb_gs_updated_row($j); foreach ($claimed as $i => $l) { wb_gs_log_ok((int)$l['id'], $start > 0 ? $start + $i : 0); } $added = count($claimed); }
    catch (WbGsError $e) { foreach ($claimed as $l) { wb_gs_log_fail($l, $e); } throw new WbHttpError(422, $e->getMessage(), array('code' => $e->gcode, 'added' => 0)); }
  }
  return array('added' => $added, 'existing' => $existing, 'skipped' => $skipped, 'processed' => count($rows), 'remaining' => max(0, $total - count($rows)), 'total' => $total);
}
/* 연결 테스트 : 1 인증 · 2 스프레드시트 접근 · 3 시트 확인 · 4 쓰기 권한 (+ 헤더) */
function wb_gs_test($c, $cfg) {
  if ($cfg['mode'] === 'webhook') { return wb_gs_hook_test($cfg); }
  $steps = array(); $add = function ($key, $label, $ok, $detail) use (&$steps) { $steps[] = array('key' => $key, 'label' => $label, 'ok' => (bool)$ok, 'detail' => (string)$detail); };
  $done = function ($ok, $msg) use (&$steps) { return array('ok' => (bool)$ok, 'steps' => $steps, 'message' => $msg); };
  if ($cfg['spreadsheet_id'] === '') { $add('sheet', '스프레드시트 접근', false, '스프레드시트 주소(ID)를 입력해 주세요.'); return $done(false, '스프레드시트 주소(ID)를 입력해 주세요.'); }
  if (!wb_gs_sheet_name_ok($cfg['sheet_name'])) { $add('tab', '시트 확인', false, '시트 이름에 [ ] * ? / \\ : 는 쓸 수 없습니다.'); return $done(false, '시트 이름을 확인해 주세요.'); }
  $key = wb_gs_cfg_key($cfg); $cred = wb_gs_cred_load($key);
  if (!$cred) { $add('auth', 'Google 인증', false, '서비스 계정 키(JSON)가 등록되지 않았습니다.'); return $done(false, '서비스 계정 키(JSON)를 먼저 올려 주세요.'); }
  try { @unlink(wb_gs_token_file($key)); $tok = wb_gs_token($c, $key, $cred); $add('auth', 'Google 인증', true, '서비스 계정 ' . $cred['client_email']); }
  catch (WbGsError $e) { $add('auth', 'Google 인증', false, $e->getMessage()); return $done(false, $e->getMessage()); }
  $ctx = array('key' => $key, 'cred' => $cred, 'token' => $tok, 'id' => $cfg['spreadsheet_id'], 'sheet' => $cfg['sheet_name'], 'base' => wb_gs_api_base($c) . '/spreadsheets/' . rawurlencode($cfg['spreadsheet_id']));
  try { $meta = wb_gs_meta($ctx); $add('sheet', '스프레드시트 접근', true, '"' . $meta['title'] . '"'); }
  catch (WbGsError $e) { $add('sheet', '스프레드시트 접근', false, $e->getMessage()); return $done(false, $e->getMessage()); }
  $exists = in_array($cfg['sheet_name'], $meta['sheets'], true);
  $add('tab', '시트 확인', $exists || $cfg['auto_create'], $exists ? '"' . $cfg['sheet_name'] . '" 시트가 있습니다.' : ($cfg['auto_create'] ? '"' . $cfg['sheet_name'] . '" 시트가 없어 새로 만듭니다.' : '"' . $cfg['sheet_name'] . '" 시트(탭)가 없습니다. 시트 이름을 확인하거나 [시트가 없으면 새로 만들기]를 켜 주세요. (지금 있는 시트 : ' . implode(', ', $meta['sheets']) . ')'));
  if (!$exists && !$cfg['auto_create']) { return $done(false, '"' . $cfg['sheet_name'] . '" 시트(탭)가 없습니다.'); }
  try { wb_gs_call($ctx, 'POST', ':batchUpdate', array('requests' => array(array('updateSpreadsheetProperties' => array('properties' => array('title' => $meta['title']), 'fields' => 'title')))), '쓰기 권한 확인'); $add('write', '쓰기 권한', true, '편집 권한이 있습니다.'); }   /* 제목을 같은 값으로 저장 → 내용 변화 없이 편집 권한만 확인 */
  catch (WbGsError $e) { $add('write', '쓰기 권한', false, $e->gcode === 'PERMISSION' ? '서비스 계정에 편집 권한이 없습니다. Google Sheet › 공유에서 서비스 계정 이메일을 "편집자"로 추가해 주세요.' : $e->getMessage()); return $done(false, $e->gcode === 'PERMISSION' ? '서비스 계정에 편집 권한이 없습니다.' : $e->getMessage()); }
  try { if (!$exists) { wb_gs_add_sheet($ctx); } $h = wb_gs_header($ctx); if ($h !== '' || !$exists) { $add('header', '헤더', true, trim((!$exists ? '"' . $cfg['sheet_name'] . '" 시트를 만들었습니다. ' : '') . $h)); } }
  catch (WbGsError $e) { $add('header', '헤더', false, $e->getMessage()); return $done(false, $e->getMessage()); }
  return $done(true, '✓ Google Sheets 연결 성공');
}

/* ---------- 관리자 표시용 ---------- */
function wb_gs_status_map($ids) {
  $ids = array_values(array_filter(array_map('intval', (array)$ids))); if (!count($ids)) { return array(); }
  $m = array(); foreach (wb_all('SELECT reservation_id, status FROM google_sheet_sync_logs WHERE reservation_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') ORDER BY id', $ids) as $r) { $m[(int)$r['reservation_id']] = (string)$r['status']; }
  return $m;
}
function wb_gs_detail($sub) {
  $cfg = wb_gs_site_cfg((int)$sub['site_id']); $key0 = $cfg['mode'] === 'webhook' ? wb_gs_hook_key($cfg) : $cfg['spreadsheet_id']; $out = array('enabled' => $cfg['enabled'] && $key0 !== '', 'status' => '', 'row' => 0, 'code' => '', 'error' => '', 'synced_at' => null, 'attempts' => 0, 'sheet' => $cfg['sheet_name'], 'url' => $cfg['spreadsheet_id'] !== '' ? 'https://docs.google.com/spreadsheets/d/' . $cfg['spreadsheet_id'] . '/edit' : '');
  $l = $key0 !== '' ? wb_gs_log_get((int)$sub['id'], $key0, $cfg['sheet_name']) : null;
  if (!$l) { $l = wb_get('SELECT * FROM google_sheet_sync_logs WHERE reservation_id = ? ORDER BY id DESC LIMIT 1', array((int)$sub['id'])); if ($l) { $out['other'] = true; } }
  if ($l) { $out['status'] = (string)$l['status']; $out['row'] = (int)$l['row_number']; $out['code'] = (string)$l['error_code']; $out['error'] = (string)$l['error_message']; $out['synced_at'] = $l['synced_at']; $out['attempts'] = (int)$l['attempts']; }
  return $out;
}
function wb_gs_failed_count($siteIds) { $siteIds = array_values(array_filter(array_map('intval', (array)$siteIds))); if (!count($siteIds)) { return 0; } try { return wb_int(wb_val("SELECT COUNT(*) FROM google_sheet_sync_logs WHERE status = 'failed' AND site_id IN (" . implode(',', array_fill(0, count($siteIds), '?')) . ')', $siteIds)); } catch (Exception $e) { return 0; } }
/* 웹앱 방식 : 아직 보내지 않은 예약을 하나씩 (한 번에 $limit 건) */
function wb_gs_hook_sync_all($c, $siteId, $cfg, $limit) {
  if (!$cfg['enabled'] || $cfg['webhook_url'] === '') { throw new WbHttpError(422, '먼저 Google Sheets 연동(웹앱 주소 · 비밀키)을 저장해 주세요.'); }
  $key = wb_gs_hook_key($cfg); $limit = max(1, min(30, (int)$limit));
  $base = " FROM form_submissions s LEFT JOIN google_sheet_sync_logs g ON g.reservation_id = s.id AND g.spreadsheet_id = ? AND g.sheet_name = ? AND g.status = 'success' WHERE s.site_id = ? AND s.deleted_at IS NULL AND s.anonymized_at IS NULL AND g.id IS NULL";
  $args = array($key, $cfg['sheet_name'], (int)$siteId);
  $rows = wb_all('SELECT s.id' . $base . ' ORDER BY s.id ASC LIMIT ' . $limit, $args);
  $added = 0; $existing = 0; $failed = 0; $err = '';
  foreach ($rows as $r) {
    $res = wb_gs_sync($c, (int)$r['id'], array('tries' => 1, 'force' => true));
    if (!empty($res['ok']) && !empty($res['existing'])) { $existing++; } elseif (!empty($res['ok'])) { $added++; } else { $failed++; if ($err === '') { $err = isset($res['error']) ? (string)$res['error'] : ''; } }
  }
  $remaining = wb_int(wb_val('SELECT COUNT(*)' . $base, $args));
  return array('ok' => true, 'added' => $added, 'existing' => $existing, 'failed' => $failed, 'error' => $err, 'remaining' => $remaining);
}
function wb_gs_site_out($siteId) {
  $cfg = wb_gs_site_cfg($siteId); $key = wb_gs_cfg_key($cfg);
  $logKey = $cfg['mode'] === 'webhook' ? wb_gs_hook_key($cfg) : $cfg['spreadsheet_id'];
  $stat = array('success' => 0, 'failed' => 0, 'pending' => 0);
  foreach (wb_all('SELECT status, COUNT(*) AS n FROM google_sheet_sync_logs WHERE site_id = ? AND spreadsheet_id = ? AND sheet_name = ? GROUP BY status', array((int)$siteId, $logKey, $cfg['sheet_name'])) as $r) { $stat[(string)$r['status']] = (int)$r['n']; }
  $last = wb_get('SELECT synced_at FROM google_sheet_sync_logs WHERE site_id = ? AND status = ? ORDER BY synced_at DESC LIMIT 1', array((int)$siteId, 'success'));
  $lastErr = wb_get("SELECT error_code, error_message, updated_at FROM google_sheet_sync_logs WHERE site_id = ? AND status = 'failed' ORDER BY updated_at DESC LIMIT 1", array((int)$siteId));
  $unsynced = wb_int(wb_val("SELECT COUNT(*) FROM form_submissions s LEFT JOIN google_sheet_sync_logs g ON g.reservation_id = s.id AND g.spreadsheet_id = ? AND g.sheet_name = ? AND g.status = 'success' WHERE s.site_id = ? AND s.deleted_at IS NULL AND s.anonymized_at IS NULL AND g.id IS NULL", array($logKey, $cfg['sheet_name'], (int)$siteId)));
  return array('settings' => array('enabled' => $cfg['enabled'], 'spreadsheet_id' => $cfg['spreadsheet_id'], 'sheet_name' => $cfg['sheet_name'], 'credentials' => $cfg['credentials'], 'auto_create' => $cfg['auto_create'], 'sync_status' => $cfg['sync_status'],
      'mode' => $cfg['mode'], 'webhook_url' => $cfg['webhook_url'], 'webhook_secret_set' => $cfg['webhook_secret'] !== '', 'hook_columns' => wb_gs_hook_columns()),
    'credential' => wb_gs_cred_info($key), 'default_key' => wb_gs_default_key(), 'stats' => $stat, 'last_synced' => $last ? $last['synced_at'] : null, 'last_error' => $lastErr, 'unsynced' => $unsynced,
    'url' => $cfg['spreadsheet_id'] !== '' ? 'https://docs.google.com/spreadsheets/d/' . $cfg['spreadsheet_id'] . '/edit' : '', 'headers' => wb_gs_headers(), 'openssl' => function_exists('openssl_sign'));
}
function wb_gs_cfg_from_body($siteId, $b) {   /* 저장 전 [연결 테스트] 도 화면 값으로 */
  $cfg = wb_gs_site_cfg($siteId);
  if (isset($b['spreadsheet'])) { $id = wb_gs_parse_id($b['spreadsheet']); if (trim((string)$b['spreadsheet']) !== '' && $id === '') { throw new WbHttpError(422, 'Google Sheet 주소 또는 ID 형식이 아닙니다. (예 : https://docs.google.com/spreadsheets/d/…/edit)'); } $cfg['spreadsheet_id'] = $id; }
  if (isset($b['sheet_name'])) { $n = trim((string)$b['sheet_name']); $cfg['sheet_name'] = $n !== '' ? $n : '시트1'; }
  if (isset($b['credentials'])) { $k = preg_replace('/[^a-f0-9]/', '', (string)$b['credentials']); $cfg['credentials'] = $k; }
  if (array_key_exists('auto_create', $b)) { $cfg['auto_create'] = wb_bool($b['auto_create']) || $b['auto_create'] === 1 || $b['auto_create'] === '1'; }
  if (array_key_exists('sync_status', $b)) { $cfg['sync_status'] = wb_bool($b['sync_status']) || $b['sync_status'] === 1 || $b['sync_status'] === '1'; }
  if (array_key_exists('enabled', $b)) { $cfg['enabled'] = wb_bool($b['enabled']) || $b['enabled'] === 1 || $b['enabled'] === '1'; }
  if (isset($b['mode'])) { $cfg['mode'] = (string)$b['mode'] === 'webhook' ? 'webhook' : 'api'; }
  if (isset($b['webhook_url'])) { $u = trim((string)$b['webhook_url']); if ($u !== '' && !preg_match('#^https://script\.google(usercontent)?\.com/#i', $u) && !preg_match('#^https://[^\s]+$#', $u)) { throw new WbHttpError(422, 'Apps Script 웹앱 주소는 https:// 로 시작해야 합니다.'); } $cfg['webhook_url'] = $u; }
  if (isset($b['webhook_secret'])) { $sc = trim((string)$b['webhook_secret']); if ($sc !== '') { $cfg['webhook_secret'] = $sc; } }
  if (!empty($b['webhook_secret_clear'])) { $cfg['webhook_secret'] = ''; }
  return $cfg;
}

/* ---------- 경로 (설정 · 키 · 테스트 · 기존 예약 동기화 = 최고관리자 / 예약 한 건 다시 보내기 = 예약 처리 권한) ---------- */
wb_route('GET', '/sites/:id/gsheets', function ($c, $p) { $s = wb_site_of($c, $p['id'], 'manage'); $o = wb_gs_site_out((int)$s['id']); if (wb_is_super($c['user'])) { $o['accounts'] = wb_gs_cred_list(); } $o['canEdit'] = wb_is_super($c['user']); return $o; });
wb_route('PUT', '/sites/:id/gsheets', function ($c, $p) {
  wb_must_super($c['user']); $s = wb_site_of($c, $p['id'], 'manage'); $cfg = wb_gs_cfg_from_body((int)$s['id'], $c['body']);
  if ($cfg['enabled'] && $cfg['mode'] === 'webhook') {
    if ($cfg['webhook_url'] === '') { throw new WbHttpError(422, 'Apps Script 웹앱 주소(https://script.google.com/…/exec)를 입력해 주세요.'); }
    if ($cfg['webhook_secret'] === '') { throw new WbHttpError(422, '공유 비밀키를 입력해 주세요. (Apps Script 에 넣은 값과 같아야 합니다)'); }
  }
  if ($cfg['enabled'] && $cfg['mode'] !== 'webhook' && $cfg['spreadsheet_id'] === '') { throw new WbHttpError(422, 'Google Sheet 주소(또는 ID)를 입력해 주세요.'); }
  if (!wb_gs_sheet_name_ok($cfg['sheet_name'])) { throw new WbHttpError(422, '시트 이름을 확인해 주세요. ([ ] * ? / \\ : 는 쓸 수 없고 80자 이내)'); }
  if ($cfg['mode'] !== 'webhook' && $cfg['credentials'] !== '' && !wb_gs_cred_load($cfg['credentials'])) { throw new WbHttpError(422, '선택한 서비스 계정 키가 없습니다. 키 파일을 다시 올려 주세요.'); }
  if ($cfg['enabled'] && $cfg['mode'] !== 'webhook' && $cfg['credentials'] === '') { $cfg['credentials'] = wb_gs_default_key(); }   /* 사이트마다 키 참조를 고정 (다른 사이트 키가 바뀌어도 영향 없음) */
  $before = wb_gs_site_cfg((int)$s['id']);
  wb_put_setting((int)$s['id'], 'gsheets', array('enabled' => $cfg['enabled'], 'spreadsheet_id' => $cfg['spreadsheet_id'], 'sheet_name' => $cfg['sheet_name'], 'credentials' => $cfg['credentials'], 'auto_create' => $cfg['auto_create'], 'sync_status' => $cfg['sync_status'],
    'mode' => $cfg['mode'], 'webhook_url' => $cfg['webhook_url'], 'webhook_secret' => $cfg['webhook_secret']), (int)$c['user']['id']);
  wb_log($c, (int)$s['id'], 'site.gsheets', 'site', (int)$s['id'], 'Google Sheets 연동 ' . ($cfg['enabled'] ? '사용' : '사용 안 함') . ($cfg['spreadsheet_id'] !== '' ? ' · 시트 ' . substr($cfg['spreadsheet_id'], 0, 6) . '… / ' . $cfg['sheet_name'] : ''), $before, $cfg);
  return wb_gs_site_out((int)$s['id']);
});
wb_route('POST', '/sites/:id/gsheets/test', function ($c, $p) { wb_must_super($c['user']); $s = wb_site_of($c, $p['id'], 'manage'); if (!wb_rate('gstest:' . (int)$c['user']['id'], 10, 60)) { throw new WbHttpError(429, '잠시 후 다시 시도해 주세요.'); } $r = wb_gs_test($c, wb_gs_cfg_from_body((int)$s['id'], $c['body'])); wb_log($c, (int)$s['id'], 'site.gsheets_test', 'site', (int)$s['id'], 'Google Sheets 연결 테스트 · ' . ($r['ok'] ? '성공' : '실패 ' . wb_gs_cut($r['message'], 80))); return $r; });
wb_route('POST', '/sites/:id/gsheets/sync-all', function ($c, $p) { wb_must_super($c['user']); $s = wb_site_of($c, $p['id'], 'manage'); $r = wb_gs_sync_all($c, (int)$s['id'], 100); if ($r['added'] || $r['existing']) { wb_log($c, (int)$s['id'], 'site.gsheets_sync_all', 'site', (int)$s['id'], '기존 방문예약 Google Sheets 동기화 · 추가 ' . $r['added'] . ' · 이미 있음 ' . $r['existing']); } return $r; });
wb_route('POST', '/system/google/credentials', function ($c) {
  wb_must_super($c['user']); $b = $c['body']; $text = isset($b['json']) ? (string)$b['json'] : ''; if (strlen($text) > 20000) { throw new WbHttpError(422, '파일이 너무 큽니다. 서비스 계정 키(JSON) 파일을 선택해 주세요.'); }
  $info = wb_gs_cred_save($text);
  wb_log($c, null, 'system.google_key', 'system', null, 'Google 서비스 계정 키 등록 · ' . $info['client_email']);
  return array('credential' => $info, 'accounts' => wb_gs_cred_list(), 'default_key' => wb_gs_default_key());
});
wb_route('POST', '/submissions/:id/gsheets/sync', function ($c, $p) {
  $s = wb_sub_of($c, $p['id'], 'submissions'); if (!wb_rate('gsresend:' . (int)$s['id'], 6, 60)) { throw new WbHttpError(429, '잠시 후 다시 시도해 주세요.'); }
  $r = wb_gs_sync($c, (int)$s['id'], array('tries' => 1, 'force' => true));
  if (!empty($r['already'])) { $st = wb_gs_sync_status($c, (int)$s['id']); $r['statusSynced'] = !empty($st['ok']); if (empty($st['ok']) && !empty($st['error'])) { $r['statusError'] = $st['error']; } }
  wb_log($c, (int)$s['site_id'], 'submission.gsheets_resend', 'submission', (int)$s['id'], '예약 #' . $s['id'] . ' 구글시트 다시 보내기 · ' . (!empty($r['already']) ? '이미 시트에 있음(중복 추가 안 함)' : (!empty($r['ok']) ? '성공' : '실패 ' . (isset($r['code']) ? $r['code'] : ''))));
  $r['gsheets'] = wb_gs_detail(wb_gs_sub((int)$s['id']));
  return $r;
});
