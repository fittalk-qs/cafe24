<?php
/* 통합웹빌더 운영 API — 공통 도우미 (PHP 7.0 이상 · 외부 라이브러리 없음) */
if (!defined('WB_API')) { http_response_code(404); exit; }

class WbHttpError extends Exception {
  public $status = 500; public $extra = null;
  public function __construct($status, $message, $extra = null) { parent::__construct($message); $this->status = (int)$status; $this->extra = $extra; }
}
function wb_now($ts = null) { return date('Y-m-d H:i:s', $ts === null ? time() : (int)$ts); }
function wb_today($ts = null) { return date('Y-m-d', $ts === null ? time() : (int)$ts); }
function wb_days($n, $from = null) { return ($from === null ? time() : (int)$from) + (int)$n * 86400; }
/* JSON : 객체는 stdClass 로 유지(빈 객체 {} 가 [] 로 바뀌지 않게) — 검증 로직에서 배열이 편하면 wb_arr() 로 변환 */
function wb_json_safe($s, $def = null) { if ($s === null || $s === '') { return $def; } if (is_array($s) || is_object($s)) { return $s; } $j = json_decode((string)$s); return $j === null ? $def : $j; }
function wb_arr($v) { if ($v === null) { return array(); } if (is_string($v)) { $v = json_decode($v, true); } if (is_object($v)) { $v = json_decode(json_encode($v), true); } return is_array($v) ? $v : array(); }
function wb_enc($v) { $s = json_encode($v === null ? null : $v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); return $s === false ? 'null' : $s; }
function wb_is_obj($v) { return is_object($v) || (is_array($v) && (count($v) === 0 || array_keys($v) !== range(0, count($v) - 1))); }
function wb_prop($o, $k, $def = null) { if (is_object($o)) { return isset($o->$k) ? $o->$k : $def; } if (is_array($o)) { return isset($o[$k]) ? $o[$k] : $def; } return $def; }
function wb_has($o, $k) { if (is_object($o)) { return property_exists($o, $k); } if (is_array($o)) { return array_key_exists($k, $o); } return false; }
function wb_path($o, $path, $def = null) { $cur = $o; foreach (explode('.', (string)$path) as $k) { if ($k === '') { continue; } if (is_object($cur) && isset($cur->$k)) { $cur = $cur->$k; } elseif (is_array($cur) && isset($cur[$k])) { $cur = $cur[$k]; } else { return $def; } } return $cur; }
function wb_str($v, $max = 0) { if ($v === null) { return ''; } if (is_array($v) || is_object($v)) { $s = wb_enc($v); } elseif (is_bool($v)) { $s = $v ? 'true' : 'false'; } else { $s = (string)$v; } $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $s); return $max > 0 ? wb_substr($s, $max) : $s; }
function wb_int($v, $def = 0) { if (is_int($v)) { return $v; } if (is_float($v)) { return (int)$v; } if (is_string($v) && preg_match('/^\s*-?\d+/', $v, $m)) { return (int)$m[0]; } if (is_bool($v)) { return $v ? 1 : 0; } return (int)$def; }
function wb_bool($v) { return $v === true || $v === 1 || $v === '1' || $v === 'true' || $v === 'on'; }
function wb_strlen($s) { return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s); }
function wb_substr($s, $n) { return function_exists('mb_substr') ? mb_substr($s, 0, $n, 'UTF-8') : substr($s, 0, $n); }
function wb_lower($s) { return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s); }
function wb_esc($s) { return htmlspecialchars((string)($s === null ? '' : $s), ENT_QUOTES, 'UTF-8'); }
function wb_sha256($s) { return hash('sha256', (string)$s); }
function wb_token($bytes = 32) { $raw = function_exists('random_bytes') ? random_bytes($bytes) : openssl_random_pseudo_bytes($bytes); return rtrim(strtr(base64_encode($raw), '+/', '-_'), '='); }
function wb_hex($bytes = 24) { return bin2hex(function_exists('random_bytes') ? random_bytes($bytes) : openssl_random_pseudo_bytes($bytes)); }
function wb_slugify($s) { $s = wb_lower(trim((string)$s)); $s = preg_replace('/[^a-z0-9\x{AC00}-\x{D7A3}\-_ ]/u', '', $s); $s = preg_replace('/\s+/', '-', trim($s)); $s = preg_replace('/-+/', '-', $s); $s = wb_substr($s, 40); return $s === '' ? ('s' . base_convert((string)time(), 10, 36)) : $s; }
function wb_keyify($s) { return substr(preg_replace('/[^a-z0-9_\-]/', '', strtolower((string)$s)), 0, 40); }
function wb_host_of($url) { $h = parse_url((string)$url, PHP_URL_HOST); if (!$h) { return ''; } $p = parse_url((string)$url, PHP_URL_PORT); return strtolower($h) . ($p ? ':' . $p : ''); }
function wb_equals($a, $b) { if (function_exists('hash_equals')) { return hash_equals((string)$a, (string)$b); } $a = (string)$a; $b = (string)$b; if (strlen($a) !== strlen($b)) { return false; } $r = 0; for ($i = 0; $i < strlen($a); $i++) { $r |= ord($a[$i]) ^ ord($b[$i]); } return $r === 0; }
function wb_mask_phone($phone, $can) { $phone = (string)$phone; if ($phone === '' || $can) { return $phone; } return preg_replace('/(\d{2,3})-?(\d{3,4})-?(\d{4})/', '$1-****-$3', $phone); }
function wb_csv_line($cols) { $out = array(); foreach ($cols as $c) { $c = (string)($c === null ? '' : (is_array($c) ? implode(', ', $c) : $c)); if (preg_match('/^[=+\-@]/', $c)) { $c = "'" . $c; } $out[] = '"' . str_replace('"', '""', $c) . '"'; } return implode(',', $out) . "\r\n"; }
function wb_fmt_bytes($b) { $b = (int)$b; return $b > 1048576 ? round($b / 1048576, 1) . 'MB' : ($b > 1024 ? round($b / 1024) . 'KB' : $b . 'B'); }
/* 오류 기록 : 개인정보 없이 시각 · 종류만 (data/error-YYYY-MM-DD.log) */
function wb_log_error($msg) { $dir = WB_DATA_DIR . '/logs'; if (!is_dir($dir)) { @mkdir($dir, 0755, true); } $f = $dir . '/error-' . date('Y-m-d') . '.log.php'; if (!is_file($f)) { @file_put_contents($f, "<?php exit; ?>\n", LOCK_EX); } @file_put_contents($f, '[' . date('Y-m-d H:i:s') . '] ' . preg_replace('/\s+/', ' ', (string)$msg) . "\n", FILE_APPEND | LOCK_EX); }
/* 응답 */
function wb_send_json($status, $arr, $extraHeaders = array()) {
  if (headers_sent()) { return; }
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
  foreach ($extraHeaders as $k => $v) { header($k . ': ' . $v); }
  $out = wb_enc($arr);
  if (function_exists('wb_after_pending') && wb_after_pending() && !function_exists('fastcgi_finish_request') && !ini_get('zlib.output_compression')) { header('Content-Length: ' . strlen($out)); header('Connection: close'); }
  echo $out; exit;
}
function wb_send_file($status, $contentType, $body, $filename = '', $extra = array()) {
  http_response_code($status); header('Content-Type: ' . $contentType); header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
  if ($filename !== '') { header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($filename)); }
  header('Content-Length: ' . strlen($body)); foreach ($extra as $k => $v) { header($k . ': ' . $v); } echo $body; exit;
}
/* 파일 형식 판별(내용 기준 · 확장자 위조 방지) */
function wb_sniff($buf) {
  if (strlen($buf) < 12) { return null; }
  if (ord($buf[0]) === 0xff && ord($buf[1]) === 0xd8 && ord($buf[2]) === 0xff) { return array('ext' => 'jpg', 'mime' => 'image/jpeg'); }
  if (substr($buf, 0, 4) === "\x89PNG") { return array('ext' => 'png', 'mime' => 'image/png'); }
  if (substr($buf, 0, 6) === 'GIF87a' || substr($buf, 0, 6) === 'GIF89a') { return array('ext' => 'gif', 'mime' => 'image/gif'); }
  if (substr($buf, 0, 4) === 'RIFF' && substr($buf, 8, 4) === 'WEBP') { return array('ext' => 'webp', 'mime' => 'image/webp'); }
  if (substr($buf, 4, 4) === 'ftyp') { return array('ext' => 'mp4', 'mime' => 'video/mp4'); }
  if (substr($buf, 0, 4) === "\x1a\x45\xdf\xa3") { return array('ext' => 'webm', 'mime' => 'video/webm'); }
  $head = strtolower(trim(substr($buf, 0, 512)));
  if (strpos($head, '<svg') === 0 || (strpos($head, '<?xml') === 0 && strpos($head, '<svg') !== false)) { return array('ext' => 'svg', 'mime' => 'image/svg+xml'); }
  return null;
}
function wb_image_size($file, $ext) { if ($ext === 'svg' || !function_exists('getimagesize')) { return array(null, null); } $s = @getimagesize($file); return $s ? array((int)$s[0], (int)$s[1]) : array(null, null); }
function wb_safe_join($root, $rel) { $rel = str_replace('\\', '/', (string)$rel); if ($rel === '' || strpos($rel, "\0") !== false || preg_match('#(^|/)\.\.(/|$)#', $rel)) { return null; } return rtrim($root, '/') . '/' . ltrim($rel, '/'); }
function wb_rmtree($dir) { if (!is_dir($dir)) { return; } foreach (scandir($dir) as $f) { if ($f === '.' || $f === '..') { continue; } $p = $dir . '/' . $f; if (is_dir($p)) { wb_rmtree($p); } else { @unlink($p); } } @rmdir($dir); }
function wb_walk_files($dir, $base = null) { $out = array(); if (!is_dir($dir)) { return $out; } $base = $base === null ? $dir : $base; foreach (scandir($dir) as $f) { if ($f === '.' || $f === '..') { continue; } $p = $dir . '/' . $f; if (is_dir($p)) { $out = array_merge($out, wb_walk_files($p, $base)); } else { $out[] = array('abs' => $p, 'rel' => ltrim(substr($p, strlen($base)), '/'), 'size' => filesize($p), 'mtime' => filemtime($p)); } } return $out; }
function wb_write_atomic($file, $text) { $dir = dirname($file); if (!is_dir($dir)) { @mkdir($dir, 0755, true); } $tmp = $file . '.tmp' . mt_rand(1000, 9999); if (@file_put_contents($tmp, $text, LOCK_EX) === false) { return false; } if (!@rename($tmp, $file)) { @unlink($tmp); return false; } return true; }
