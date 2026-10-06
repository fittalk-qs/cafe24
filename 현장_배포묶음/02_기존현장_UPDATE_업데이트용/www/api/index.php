<?php
/* 통합웹빌더 운영 API — 진입점 (카페24 등 PHP + MySQL 호스팅 · 관리자 화면 /admin/ 과 공개 홈페이지가 같은 서버에서 동작)
   주소 형식 : /api/index.php?r=/sites/1/pages&per=20  (또는 rewrite 가 되는 서버에서는 /api/sites/1/pages)
   · 관리자 · 공개 홈페이지 모두 이 파일 하나를 통해 DB 를 사용합니다 · DB 접속정보는 config.php 에만 · 오류 상세는 data/logs 에만 기록 */
define('WB_API', 1);
define('WB_API_DIR', __DIR__);
require WB_API_DIR . '/lib/paths.php';   /* WB_WEB_ROOT · WB_CONFIG_FILE · WB_DATA_DIR (새 구조 config/ · storage/ 우선, 예전 api/config.php · api/data 도 동작) */
/* 관리자 프로그램 버전 : /www/admin/version.json 한 곳에서 관리 (배포할 때만 바뀜 · 광고주의 글/이미지 수정으로는 바뀌지 않음) */
$wbVerFile = dirname(__DIR__) . '/admin/version.json'; $wbVer = '30.0'; $wbBuild = ''; $wbDeployed = '';
if (is_file($wbVerFile)) { $wbJ = json_decode((string)@file_get_contents($wbVerFile), true); if (is_array($wbJ)) { if (!empty($wbJ['version'])) { $wbVer = (string)$wbJ['version']; } if (!empty($wbJ['build'])) { $wbBuild = (string)$wbJ['build']; } if (!empty($wbJ['deployed'])) { $wbDeployed = (string)$wbJ['deployed']; } } }
define('WB_VERSION', $wbVer); define('WB_BUILD', $wbBuild); define('WB_DEPLOYED', $wbDeployed);
error_reporting(E_ALL); @ini_set('display_errors', '0'); @date_default_timezone_set('Asia/Seoul'); @ini_set('default_charset', 'UTF-8');
require WB_API_DIR . '/lib/util.php';
require WB_API_DIR . '/lib/db.php';
require WB_API_DIR . '/lib/auth.php';
require WB_API_DIR . '/lib/router.php';
require WB_API_DIR . '/lib/media.php';
require WB_API_DIR . '/lib/publish.php';
require WB_API_DIR . '/lib/sms.php';
require WB_API_DIR . '/lib/intake.php';
require WB_API_DIR . '/lib/stats.php';
require WB_API_DIR . '/lib/routes-core.php';
require WB_API_DIR . '/lib/routes-ops.php';
/* Google Sheets 연동 : 따로 불러옴 — 이 파일에 문제가 있어도 예약 접수 · 문자 · 관리자는 그대로 동작 */
/* 공개 홈페이지 → 관리자 DB 페이지 가져오기 : 따로 불러옴 (문제가 있어도 나머지 기능 유지) */
try { require_once WB_API_DIR . '/lib/site-import.php'; } catch (Throwable $e) { if (function_exists('wb_log_error')) { wb_log_error('site-import load: ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine()); } }
try { require_once WB_API_DIR . '/lib/gsheets.php'; } catch (Throwable $e) { if (function_exists('wb_log_error')) { wb_log_error('gsheets load: ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine()); } }
/* 대표번호 일괄 변경 : 따로 불러옴 (문제가 있어도 나머지 기능 유지) */
/* 동시 접속 알림 : 따로 불러옴 (문제가 있어도 나머지 기능 유지) */
try { require_once WB_API_DIR . '/lib/presence.php'; } catch (Throwable $e) { if (function_exists('wb_log_error')) { wb_log_error('presence load: ' . $e->getMessage()); } }
try { require_once WB_API_DIR . '/lib/tel.php'; } catch (Throwable $e) { if (function_exists('wb_log_error')) { wb_log_error('tel load: ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine()); } }

set_error_handler(function ($no, $str, $file, $line) { if (!(error_reporting() & $no)) { return false; } if ($no === E_DEPRECATED || $no === E_USER_DEPRECATED) { static $seen = array(); $k = basename($file) . ':' . $line; if (!isset($seen[$k])) { $seen[$k] = 1; wb_log_error('deprecated: ' . $str . ' @' . $k); } return true; } throw new ErrorException($str, 0, $no, $file, $line); });   /* PHP 버전이 올라가며 생기는 사용 중단 안내(deprecated)는 기록만 하고 요청은 계속 처리 */
register_shutdown_function(function () { $e = error_get_last(); if ($e && in_array($e['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR), true)) { wb_log_error('fatal: ' . $e['message'] . ' @' . basename($e['file']) . ':' . $e['line']); if (!headers_sent()) { http_response_code(500); header('Content-Type: application/json; charset=utf-8'); echo '{"ok":false,"error":"서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."}'; } } });

header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: SAMEORIGIN'); header('Referrer-Policy: strict-origin-when-cross-origin'); header('X-Robots-Tag: noindex, nofollow');
$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper($_SERVER['REQUEST_METHOD']) : 'GET';
if ($method === 'OPTIONS') { http_response_code(204); exit; }   /* 다른 출처에는 CORS 를 열지 않음(같은 도메인의 관리자 · 홈페이지만) */

/* ---------- 경로 ---------- */
$r = '';
if (defined('WB_ENTRY_PATH')) { $r = WB_ENTRY_PATH; }
elseif (isset($_GET['r'])) { $r = (string)$_GET['r']; }
elseif (!empty($_SERVER['PATH_INFO'])) { $r = (string)$_SERVER['PATH_INFO']; }
elseif (isset($_SERVER['REQUEST_URI'])) { $u = (string)parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); if (preg_match('#/api/(?!index\.php)([^?]*)$#', $u, $m)) { $r = '/' . $m[1]; } }
$path = '/' . trim(preg_replace('#/+#', '/', (string)$r), '/'); if ($path !== '/' && substr($path, -1) === '/') { $path = rtrim($path, '/'); }
$query = $_GET; unset($query['r']);
$headers = array(); foreach ($_SERVER as $k => $v) { if (strpos($k, 'HTTP_') === 0) { $headers[strtolower(str_replace('_', '-', substr($k, 5)))] = (string)$v; } } if (isset($_SERVER['CONTENT_TYPE'])) { $headers['content-type'] = (string)$_SERVER['CONTENT_TYPE']; }

/* ---------- 요청 본문 (JSON · multipart · 폼) ---------- */
$body = array(); $bodyObj = null; $files = array(); $ctype = isset($headers['content-type']) ? strtolower($headers['content-type']) : '';
if ($method !== 'GET' && $method !== 'HEAD') {
  $isUpload = preg_match('#^/(sites/\d+/)?media(/|$)|^/system/restore$#', $path) === 1;
  $limit = ($isUpload ? 220 : 12) * 1048576; $clen = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
  if ($clen > $limit) { wb_send_json(413, array('ok' => false, 'error' => '요청 내용이 너무 큽니다.')); }
  if (strpos($ctype, 'multipart/form-data') !== false) {
    $body = is_array($_POST) ? $_POST : array();
    /* 큰 요청(게시 파일 등)은 JSON 을 파일로 받습니다 — 일부 호스팅이 큰 JSON 본문을 막기 때문 */
    if (isset($_FILES['__json']) && !is_array($_FILES['__json']['name']) && (int)$_FILES['__json']['error'] === UPLOAD_ERR_OK) {
      $rawJson = (string)@file_get_contents($_FILES['__json']['tmp_name']);
      $decoded = json_decode($rawJson, true);
      if (!is_array($decoded)) { wb_send_json(400, array('ok' => false, 'error' => 'JSON 형식이 올바르지 않습니다.')); }
      $body = $decoded; $bodyObj = json_decode($rawJson);
      if (isset($_POST['_method'])) { $m2 = strtoupper(preg_replace('/[^A-Za-z]/', '', (string)$_POST['_method'])); if (in_array($m2, array('POST', 'PUT', 'PATCH', 'DELETE'), true)) { $method = $m2; } }
      unset($_FILES['__json']);
    }
    if (is_array($_FILES)) { foreach ($_FILES as $field => $f) { if (is_array($f['name'])) { foreach ($f['name'] as $i => $n) { if ($n === '' || (int)$f['error'][$i] !== UPLOAD_ERR_OK) { continue; } $files[] = array('field' => $field, 'name' => basename(str_replace('\\', '/', $n)), 'tmp' => $f['tmp_name'][$i], 'size' => (int)$f['size'][$i], 'type' => (string)$f['type'][$i]); } } elseif ($f['name'] !== '' && (int)$f['error'] === UPLOAD_ERR_OK) { $files[] = array('field' => $field, 'name' => basename(str_replace('\\', '/', $f['name'])), 'tmp' => $f['tmp_name'], 'size' => (int)$f['size'], 'type' => (string)$f['type']); } } }
  } else {
    $raw = (string)file_get_contents('php://input'); $t = trim($raw);
    if ($t !== '' && ($t[0] === '{' || $t[0] === '[')) { $body = json_decode($t, true); $bodyObj = json_decode($t); if ($body === null) { wb_send_json(400, array('ok' => false, 'error' => 'JSON 형식이 올바르지 않습니다.')); } if (!is_array($body)) { $body = array(); } if (isset($body[0]) && array_keys($body) === range(0, count($body) - 1)) { $body = array('events' => $body); } }
    elseif (strpos($ctype, 'application/x-www-form-urlencoded') !== false) { $body = is_array($_POST) ? $_POST : array(); }
  }
}

/* ---------- 문맥 ---------- */
$cfg = wb_config(); $secret = isset($cfg['secret']) ? (string)$cfg['secret'] : 'wb-default-secret';
$ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
if (!empty($cfg['trust_proxy']) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) { $parts = explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR']); $ip = trim($parts[0]); }
$scheme = wb_is_https() ? 'https' : 'http'; $host = isset($_SERVER['HTTP_HOST']) ? (string)$_SERVER['HTTP_HOST'] : 'localhost';
$baseUrl = !empty($cfg['base_url']) ? rtrim((string)$cfg['base_url'], '/') : $scheme . '://' . $host;
$c = array('method' => $method, 'path' => $path, 'query' => $query, 'headers' => $headers, 'body' => $body, 'bodyObj' => $bodyObj, 'files' => $files, 'user' => null, 'token' => '', 'authVia' => '', 'ipHash' => substr(wb_sha256($ip . '|' . $secret), 0, 32), 'ua' => isset($headers['user-agent']) ? $headers['user-agent'] : '', 'baseUrl' => $baseUrl, 'selfUrl' => $scheme . '://' . $host, 'config' => $cfg, 'host' => $host);

try {
  /* 인증 : Authorization: Bearer 우선, 없으면 HttpOnly 쿠키 (쿠키 인증은 GET 이외에 X-Requested-With 필요) */
  $authz = isset($headers['authorization']) ? $headers['authorization'] : '';
  if (stripos($authz, 'Bearer ') === 0) { $c['token'] = trim(substr($authz, 7)); $c['authVia'] = 'bearer'; }
  elseif (!empty($_COOKIE['wb_sid'])) { $c['token'] = (string)$_COOKIE['wb_sid']; $c['authVia'] = 'cookie'; }
  if ($c['token'] !== '') { $c['user'] = wb_user_from_token($c['token']); if (!$c['user']) { $c['token'] = ''; } }
  if ($c['user'] && $c['authVia'] === 'cookie' && $method !== 'GET' && $method !== 'HEAD' && (!isset($headers['x-requested-with']) || $headers['x-requested-with'] !== 'XMLHttpRequest')) { throw new WbHttpError(403, '요청 형식이 올바르지 않습니다. (관리자 화면에서 다시 시도해 주세요)'); }
  $out = wb_dispatch($c);
  if ($out === null) { exit; }
  if (is_array($out) && array_key_exists('__raw', $out)) { wb_send_json(200, $out['__raw'], array('Access-Control-Allow-Origin' => '*')); }
  if (is_array($out) && !isset($out['ok'])) { $out = array_merge(array('ok' => true), $out); }
  wb_send_json(200, $out);
} catch (WbHttpError $e) {
  $o = array('ok' => false, 'error' => $e->getMessage()); if (is_array($e->extra)) { $o = array_merge($e->extra, $o); }
  wb_send_json($e->status, $o);
} catch (Exception $e) {
  $eid = 'E' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)); wb_log_error('[' . $eid . '] ' . get_class($e) . ': ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine() . ' ' . $method . ' ' . $path);
  wb_send_json(500, array('ok' => false, 'error' => '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'code' => $eid, 'at' => date('Y-m-d H:i:s'), 'feature' => $method . ' ' . preg_replace('/[^a-z0-9\/:_\-]/i', '', (string)$path)));
} catch (Error $e) {
  $eid = 'E' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)); wb_log_error('[' . $eid . '] ' . get_class($e) . ': ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine() . ' ' . $method . ' ' . $path);
  wb_send_json(500, array('ok' => false, 'error' => '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'code' => $eid, 'at' => date('Y-m-d H:i:s'), 'feature' => $method . ' ' . preg_replace('/[^a-z0-9\/:_\-]/i', '', (string)$path)));
}
