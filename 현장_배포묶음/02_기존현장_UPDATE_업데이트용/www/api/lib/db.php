<?php
/* 통합웹빌더 운영 API — 데이터베이스 (PDO · MySQL/MariaDB 운영 · SQLite 는 개발/검증용)
   · 접속정보는 api/config.php 에만 (공개 HTML · JS · 관리자 화면에는 들어가지 않음)
   · 모든 질의는 prepared statement · 표는 처음 요청 때 자동 생성(CREATE TABLE IF NOT EXISTS) · 새 컬럼은 자동 추가 */
if (!defined('WB_API')) { http_response_code(404); exit; }
define('WB_SCHEMA_VERSION', 'wb29.4');

/* 설정 : api/config.php (현장별 · 설치 때 만들어짐) + private-config.php (여러 현장이 함께 쓰는 개인 비밀설정 · 선택)
   private-config.php 는 배포본에 들어가지 않습니다. 있으면 자동으로 합쳐서 씁니다. (같은 값은 config.php 가 우선) */
function wb_private_config() {
  foreach (array(WB_API_DIR . '/private-config.php', dirname(WB_API_DIR) . '/private-config.php') as $p) {
    if (is_file($p)) { $v = include $p; if (is_array($v)) { return $v; } }
  }
  return array();
}
function wb_config() {
  static $cfg = null; if ($cfg !== null) { return $cfg; }
  $f = WB_CONFIG_FILE; $own = is_file($f) ? include $f : array(); if (!is_array($own)) { $own = array(); }
  $cfg = array_merge(wb_private_config(), $own);   /* 현장별 config.php 값이 우선 */
  return $cfg;
}
function wb_db_driver() { $cfg = wb_config(); $db = isset($cfg['db']) && is_array($cfg['db']) ? $cfg['db'] : array(); return ((isset($db['driver']) && $db['driver'] === 'sqlite') || empty($db['host'])) ? 'sqlite' : 'mysql'; }   /* driver => sqlite 이거나 host 가 비어 있으면 SQLite (api/data/webbuilder.sqlite · 기존 운영 방식 그대로) */
function wb_db() {
  static $pdo = null; if ($pdo) { return $pdo; }
  if (!class_exists('PDO')) { throw new WbHttpError(503, '서버에 PDO 확장이 없습니다.'); }
  if (!is_file(WB_CONFIG_FILE)) { throw new WbHttpError(503, '아직 설치되지 않았습니다. 브라우저에서 /install/ 을 열어 DB 정보를 입력해 주세요.', array('install' => true)); }
  $cfg = wb_config(); $db = isset($cfg['db']) && is_array($cfg['db']) ? $cfg['db'] : array(); if (empty($db['host'])) { $db['host'] = 'localhost'; }
  try {
    if (wb_db_driver() === 'mysql') {
      $dsn = 'mysql:host=' . $db['host'] . ';dbname=' . $db['name'] . ';charset=utf8mb4' . (!empty($db['port']) ? ';port=' . (int)$db['port'] : '');
      $pdo = new PDO($dsn, isset($db['user']) ? $db['user'] : '', isset($db['pass']) ? $db['pass'] : '', array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC));
      $pdo->exec("SET NAMES utf8mb4"); $pdo->exec("SET time_zone = '+09:00'");
    } else {
      $file = WB_DATA_DIR . '/' . (!empty($db['file']) ? basename($db['file']) : 'webbuilder.sqlite');
      if (!is_dir(WB_DATA_DIR)) { @mkdir(WB_DATA_DIR, 0755, true); }
      $pdo = new PDO('sqlite:' . $file, null, null, array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC));
      $pdo->exec('PRAGMA journal_mode=WAL'); $pdo->exec('PRAGMA busy_timeout=5000'); $pdo->exec('PRAGMA foreign_keys=ON');
    }
  } catch (Exception $e) { wb_log_error('db connect: ' . get_class($e) . ' ' . $e->getMessage()); $pdo = null; throw new WbHttpError(503, '데이터베이스에 연결할 수 없습니다. ' . (strpos(WB_CONFIG_FILE, '/config/') !== false ? 'config/config.php' : 'api/config.php') . ' 의 DB 접속정보를 확인해 주세요.'); }
  wb_migrate($pdo);
  return $pdo;
}
/* ---------- 스키마 (PK · S=짧은 문자열 · T=긴 문자열 · L=매우 긴 문자열 · I=정수 · R=실수 · D=일시) ---------- */
function wb_schema() {
  return array(
    'schema_migrations' => array(array('version', 'S NOT NULL PRIMARY KEY'), array('applied_at', 'D NOT NULL')),
    'sites' => array(array('id', 'PK'), array('key', 'S NOT NULL'), array('name', 'S NOT NULL'), array('public_url', 'S'), array('preview_url', 'S'), array('export_path', 'S'), array('status', "S NOT NULL DEFAULT 'active'"), array('published_snapshot_id', 'I'), array('created_by', 'I'), array('created_at', 'D NOT NULL'), array('updated_at', 'D'), array('field_name', 'S'), array('domain', 'S'), array('contact_name', 'S'), array('tel', 'S'), array('deploy_json', 'T'), array('last_published_at', 'D'), array('notes', 'T'), array('template', 'S'), array('advertiser_id', 'I'), array('__unique', 'key')),
    'users' => array(array('id', 'PK'), array('email', 'S NOT NULL'), array('password_hash', 'S NOT NULL'), array('name', 'S NOT NULL'), array('role', "S NOT NULL DEFAULT 'editor'"), array('status', "S NOT NULL DEFAULT 'active'"), array('failed_logins', 'I NOT NULL DEFAULT 0'), array('locked_until', 'D'), array('totp_secret', 'S'), array('notif_seen_at', 'D'), array('last_login_at', 'D'), array('created_at', 'D NOT NULL'), array('updated_at', 'D'), array('login_id', 'S'), array('phone', 'S'), array('company', 'S'), array('tel', 'S'), array('must_change_password', 'I NOT NULL DEFAULT 0'), array('advertiser_id', 'I'), array('sms_notify', 'I NOT NULL DEFAULT 0'), array('__unique', 'email'), array('__unique', 'login_id')),
    'site_users' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('user_id', 'I NOT NULL'), array('role', "S NOT NULL DEFAULT 'editor'"), array('can_publish', 'I NOT NULL DEFAULT 0'), array('created_at', 'D NOT NULL'), array('__unique', 'site_id,user_id')),
    'user_sessions' => array(array('id', 'PK'), array('user_id', 'I NOT NULL'), array('token_hash', 'S NOT NULL'), array('ip_hash', 'S'), array('ua', 'S'), array('last_seen_at', 'D NOT NULL'), array('expires_at', 'D NOT NULL'), array('created_at', 'D NOT NULL'), array('__unique', 'token_hash'), array('__index', 'expires_at')),
    'login_logs' => array(array('id', 'PK'), array('user_id', 'I'), array('email', 'S'), array('success', 'I NOT NULL DEFAULT 0'), array('reason', 'S'), array('ip_hash', 'S'), array('ua', 'S'), array('created_at', 'D NOT NULL'), array('__index', 'email,created_at')),
    'activity_logs' => array(array('id', 'PK'), array('site_id', 'I'), array('user_id', 'I'), array('action', 'S NOT NULL'), array('target_type', 'S'), array('target_id', 'I'), array('summary', 'T'), array('before_json', 'L'), array('after_json', 'L'), array('ip_hash', 'S'), array('created_at', 'D NOT NULL'), array('__index', 'site_id,created_at')),
    'settings' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('group_key', 'S NOT NULL'), array('data_json', 'L NOT NULL'), array('updated_by', 'I'), array('updated_at', 'D NOT NULL'), array('__unique', 'site_id,group_key')),
    'menus' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('key', 'S NOT NULL'), array('name', 'S'), array('updated_at', 'D'), array('__unique', 'site_id,key')),
    'menu_items' => array(array('id', 'PK'), array('menu_id', 'I NOT NULL'), array('parent_id', 'I'), array('label', 'S NOT NULL'), array('latin', 'S'), array('link_type', "S NOT NULL DEFAULT 'page'"), array('page_key', 'S'), array('url', 'T'), array('target', "S DEFAULT '_self'"), array('icon', 'S'), array('sort', 'I NOT NULL DEFAULT 0'), array('enabled', 'I NOT NULL DEFAULT 1'), array('__index', 'menu_id,parent_id,sort')),
    'section_types' => array(array('id', 'PK'), array('site_id', 'I'), array('key', 'S NOT NULL'), array('name', 'S NOT NULL'), array('scope', "S NOT NULL DEFAULT 'main'"), array('fields_json', 'L NOT NULL'), array('sort', 'I NOT NULL DEFAULT 0'), array('__index', 'site_id,scope')),
    'pages' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('key', 'S NOT NULL'), array('title', 'S NOT NULL'), array('type', "S NOT NULL DEFAULT 'sub'"), array('layout_type', 'S'), array('category', 'S'), array('status', "S NOT NULL DEFAULT 'draft'"), array('sort', 'I NOT NULL DEFAULT 0'), array('draft_version_id', 'I'), array('published_version_id', 'I'), array('publish_at', 'D'), array('created_by', 'I'), array('created_at', 'D NOT NULL'), array('updated_at', 'D'), array('deleted_at', 'D'), array('__unique', 'site_id,key')),
    'page_versions' => array(array('id', 'PK'), array('page_id', 'I NOT NULL'), array('version_no', 'I NOT NULL'), array('status', "S NOT NULL DEFAULT 'draft'"), array('content_json', 'L NOT NULL'), array('note', 'S'), array('created_by', 'I'), array('created_at', 'D NOT NULL'), array('published_at', 'D'), array('__index', 'page_id,version_no')),
    'forms' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('key', 'S NOT NULL'), array('name', 'S NOT NULL'), array('settings_json', 'L NOT NULL'), array('status', "S NOT NULL DEFAULT 'published'"), array('version', 'I NOT NULL DEFAULT 1'), array('updated_by', 'I'), array('created_at', 'D NOT NULL'), array('updated_at', 'D'), array('draft_json', 'L'), array('__unique', 'site_id,key')),
    'form_fields' => array(array('id', 'PK'), array('form_id', 'I NOT NULL'), array('key', 'S NOT NULL'), array('type', 'S NOT NULL'), array('label', 'S NOT NULL'), array('description', 'T'), array('placeholder', 'S'), array('required', 'I NOT NULL DEFAULT 0'), array('width', "S NOT NULL DEFAULT 'full'"), array('options_json', 'T'), array('validation_json', 'T'), array('default_value', 'S'), array('sort', 'I NOT NULL DEFAULT 0'), array('enabled', 'I NOT NULL DEFAULT 1'), array('fid', 'S'), array('__index', 'form_id,sort')),
    'form_submissions' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('form_id', 'I NOT NULL'), array('data_json', 'L NOT NULL'), array('name', 'S'), array('phone', 'S'), array('visit_date', 'S'), array('visit_time', 'S'), array('status', "S NOT NULL DEFAULT 'new'"), array('assignee_id', 'I'), array('device', 'S'), array('form_version', 'I'), array('fields_json', 'L'), array('memo', 'T'), array('ip_hash', 'S'), array('ua', 'S'), array('referrer', 'T'), array('utm_json', 'T'), array('page_path', 'S'), array('retention_until', 'S'), array('anonymized_at', 'D'), array('deleted_at', 'D'), array('created_at', 'D NOT NULL'), array('updated_at', 'D'), array('site_name', 'S'), array('remote_id', 'S'), array('channel', 'S'), array('receipt_no', 'S'), array('client_token', 'S'), array('site_key', 'S'), array('consent', 'S'), array('landing_path', 'S'), array('advertiser_id', 'I'), array('updated_by', 'I'), array('__index', 'site_id,created_at'), array('__index', 'phone'), array('__index', 'status'), array('__unique', 'site_id,client_token')),
    'sms_logs' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('reservation_id', 'I NOT NULL'), array('recipient_user_id', 'I NOT NULL'), array('recipient_name', 'S'), array('recipient_phone', 'S'), array('message_type', 'S'), array('message_body', 'T'), array('provider', 'S'), array('status', "S NOT NULL DEFAULT 'pending'"), array('provider_message_id', 'S'), array('error_code', 'S'), array('error_message', 'T'), array('attempts', 'I NOT NULL DEFAULT 0'), array('sent_at', 'D'), array('created_at', 'D NOT NULL'), array('updated_at', 'D'), array('__unique', 'reservation_id,recipient_user_id'), array('__index', 'site_id,created_at')),
    'submission_histories' => array(array('id', 'PK'), array('submission_id', 'I NOT NULL'), array('user_id', 'I'), array('field', 'S NOT NULL'), array('before_value', 'T'), array('after_value', 'T'), array('created_at', 'D NOT NULL'), array('__index', 'submission_id,created_at')),
    'submission_access_logs' => array(array('id', 'PK'), array('site_id', 'I'), array('user_id', 'I'), array('submission_id', 'I'), array('action', 'S NOT NULL'), array('detail', 'S'), array('ip_hash', 'S'), array('created_at', 'D NOT NULL'), array('__index', 'site_id,created_at')),
    'media_folders' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('parent_id', 'I'), array('name', 'S NOT NULL'), array('sort', 'I NOT NULL DEFAULT 0')),
    'media' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('folder_id', 'I'), array('filename', 'S NOT NULL'), array('original_name', 'S'), array('mime', 'S NOT NULL'), array('size', 'I NOT NULL DEFAULT 0'), array('width', 'I'), array('height', 'I'), array('alt', 'S'), array('hash', 'S'), array('variants_json', 'T'), array('keep_original', 'I NOT NULL DEFAULT 1'), array('uploaded_by', 'I'), array('created_at', 'D NOT NULL'), array('deleted_at', 'D'), array('kind', 'S'), array('duration', 'R'), array('__index', 'site_id,hash')),
    'popups' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('name', 'S NOT NULL'), array('type', "S NOT NULL DEFAULT 'image'"), array('pc_media_id', 'I'), array('mobile_media_id', 'I'), array('pc_src', 'T'), array('mobile_src', 'T'), array('alt', 'S'), array('link', 'T'), array('target', "S DEFAULT '_self'"), array('pages_json', 'T'), array('position_json', 'T'), array('size_json', 'T'), array('sort', 'I NOT NULL DEFAULT 0'), array('start_at', 'D'), array('end_at', 'D'), array('status', "S NOT NULL DEFAULT 'draft'"), array('hide_rule', "S NOT NULL DEFAULT 'today'"), array('reshow_hours', 'I NOT NULL DEFAULT 24'), array('impressions', 'I NOT NULL DEFAULT 0'), array('clicks', 'I NOT NULL DEFAULT 0'), array('created_by', 'I'), array('created_at', 'D NOT NULL'), array('updated_at', 'D'), array('video_url', 'T'), array('video_media_id', 'I'), array('poster_media_id', 'I'), array('options_json', 'T'), array('priority', 'I NOT NULL DEFAULT 0'), array('devices', "S NOT NULL DEFAULT 'all'"), array('overlay', 'R'), array('__index', 'site_id,status')),
    'seo' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('scope', "S NOT NULL DEFAULT 'site'"), array('page_id', 'I'), array('title', 'S'), array('description', 'T'), array('keywords', 'T'), array('canonical', 'S'), array('robots', "S DEFAULT 'index,follow'"), array('og_json', 'T'), array('structured_json', 'T'), array('verification_json', 'T'), array('favicon_media_id', 'I'), array('share_image_media_id', 'I'), array('updated_at', 'D'), array('mode', 'S'), array('title_rule', 'S'), array('noindex', 'I NOT NULL DEFAULT 0'), array('__index', 'site_id,scope,page_id')),
    'analytics_events' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('session_hash', 'S NOT NULL'), array('event', 'S NOT NULL'), array('path', 'S'), array('title', 'S'), array('label', 'S'), array('referrer_host', 'S'), array('device', 'S'), array('screen_w', 'I'), array('screen_h', 'I'), array('utm_json', 'T'), array('created_at', 'D NOT NULL'), array('__index', 'site_id,created_at'), array('__index', 'site_id,event,created_at')),
    'analytics_daily' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('date', 'S NOT NULL'), array('pageviews', 'I NOT NULL DEFAULT 0'), array('uniques', 'I NOT NULL DEFAULT 0'), array('submissions', 'I NOT NULL DEFAULT 0'), array('clicks', 'I NOT NULL DEFAULT 0'), array('devices_json', 'T'), array('pages_json', 'L'), array('referrers_json', 'L'), array('screens_json', 'L'), array('updated_at', 'D'), array('__unique', 'site_id,date')),
    'publish_snapshots' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('version_no', 'I NOT NULL'), array('content_json', 'L NOT NULL'), array('note', 'S'), array('created_by', 'I'), array('created_at', 'D NOT NULL'), array('summary_json', 'T'), array('deployed', 'S'), array('status', 'S'), array('result_json', 'T'), array('__index', 'site_id,version_no')),
    'preview_tokens' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('user_id', 'I'), array('token_hash', 'S NOT NULL'), array('expires_at', 'D NOT NULL'), array('created_at', 'D NOT NULL'), array('data_json', 'L'), array('__unique', 'token_hash')),
    'rate_limits' => array(array('id', 'PK'), array('bucket', 'S NOT NULL'), array('window_start', 'S NOT NULL'), array('count', 'I NOT NULL DEFAULT 0'), array('__unique', 'bucket,window_start')),
    'advertisers' => array(array('id', 'PK'), array('name', 'S NOT NULL'), array('contact_name', 'S'), array('contact_tel', 'S'), array('contact_email', 'S'), array('memo', 'T'), array('status', "S NOT NULL DEFAULT 'active'"), array('created_at', 'D NOT NULL'), array('updated_at', 'D')),
    'user_advertisers' => array(array('id', 'PK'), array('advertiser_id', 'I NOT NULL'), array('user_id', 'I NOT NULL'), array('role', "S NOT NULL DEFAULT 'staff'"), array('created_at', 'D NOT NULL'), array('__unique', 'advertiser_id,user_id')),
    'system_settings' => array(array('key', 'S NOT NULL PRIMARY KEY'), array('value', 'T'), array('updated_at', 'D')),
    /* Google Sheets 동기화 기록 : (예약, 스프레드시트, 시트) 하나에 한 줄 — 같은 예약을 같은 시트에 두 번 넣지 않음 */
    'google_sheet_sync_logs' => array(array('id', 'PK'), array('site_id', 'I NOT NULL'), array('reservation_id', 'I NOT NULL'), array('spreadsheet_id', 'S NOT NULL'), array('sheet_name', 'S NOT NULL'), array('status', "S NOT NULL DEFAULT 'pending'"), array('row_number', 'I'), array('attempts', 'I NOT NULL DEFAULT 0'), array('next_try_at', 'D'), array('error_code', 'S'), array('error_message', 'T'), array('synced_at', 'D'), array('created_at', 'D NOT NULL'), array('updated_at', 'D'), array('__unique', 'reservation_id,spreadsheet_id,sheet_name'), array('__index', 'site_id,status'), array('__index', 'status,next_try_at')),
  );
}
function wb_col_sql($type, $driver) {
  $t = preg_replace('/^(PK|S|T|L|I|R|D)\b/', '', $type); $code = substr($type, 0, strcspn($type, ' '));
  if ($code === 'PK') { return $driver === 'mysql' ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'; }
  $map = $driver === 'mysql' ? array('S' => 'VARCHAR(190)', 'T' => 'TEXT', 'L' => 'MEDIUMTEXT', 'I' => 'INT', 'R' => 'DOUBLE', 'D' => 'DATETIME') : array('S' => 'TEXT', 'T' => 'TEXT', 'L' => 'TEXT', 'I' => 'INTEGER', 'R' => 'REAL', 'D' => 'DATETIME');
  return $map[$code] . $t;
}
function wb_migrate($pdo) {
  $driver = wb_db_driver();
  try { $st = $pdo->query("SELECT version FROM schema_migrations WHERE version = '" . WB_SCHEMA_VERSION . "'"); if ($st && $st->fetch()) { return; } } catch (Exception $e) { /* 표가 아직 없음 */ }
  foreach (wb_schema() as $table => $cols) {
    $defs = array(); $uniques = array(); $indexes = array();
    foreach ($cols as $c) { if ($c[0] === '__unique') { $uniques[] = $c[1]; continue; } if ($c[0] === '__index') { $indexes[] = $c[1]; continue; } $defs[] = '`' . $c[0] . '` ' . wb_col_sql($c[1], $driver); }
    $sql = 'CREATE TABLE IF NOT EXISTS `' . $table . '` (' . implode(', ', $defs) . ')' . ($driver === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '');
    $pdo->exec($sql);
    /* 예전 버전에서 만든 표에 새 컬럼 추가 */
    $have = array();
    if ($driver === 'mysql') { $st = $pdo->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'); $st->execute(array($table)); while ($r = $st->fetch()) { $have[strtolower($r['COLUMN_NAME'])] = true; } }
    else { foreach ($pdo->query('PRAGMA table_info(`' . $table . '`)')->fetchAll() as $r) { $have[strtolower($r['name'])] = true; } }
    foreach ($cols as $c) { if ($c[0][0] === '_' || isset($have[strtolower($c[0])]) || $c[1] === 'PK') { continue; } try { $pdo->exec('ALTER TABLE `' . $table . '` ADD COLUMN `' . $c[0] . '` ' . wb_col_sql(preg_replace('/\s+PRIMARY KEY/', '', $c[1]), $driver)); } catch (Exception $e) { wb_log_error('migrate add column ' . $table . '.' . $c[0] . ': ' . $e->getMessage()); } }
    foreach ($uniques as $i => $u) { try { $pdo->exec('CREATE UNIQUE INDEX ' . ($driver === 'mysql' ? '' : 'IF NOT EXISTS ') . '`ux_' . $table . '_' . $i . '` ON `' . $table . '` (' . implode(', ', array_map(function ($x) { return '`' . trim($x) . '`'; }, explode(',', $u))) . ')'); } catch (Exception $e) {} }
    foreach ($indexes as $i => $u) { try { $pdo->exec('CREATE INDEX ' . ($driver === 'mysql' ? '' : 'IF NOT EXISTS ') . '`ix_' . $table . '_' . $i . '` ON `' . $table . '` (' . implode(', ', array_map(function ($x) { return '`' . trim($x) . '`'; }, explode(',', $u))) . ')'); } catch (Exception $e) {} }
  }
  try { wb_migrate_reserve_text($pdo); } catch (Exception $e) { wb_log_error('migrate reserve text: ' . $e->getMessage()); }
  try { $st = $pdo->prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'); $st->execute(array(WB_SCHEMA_VERSION, wb_now())); } catch (Exception $e) {}
}
/* 방문예약 접수 완료 안내 : 예전 기본 문구 그대로인 경우만 새 문구로 (관리자가 직접 바꾼 문구는 유지) — 게시본 · 임시저장본 모두 */
function wb_migrate_reserve_text($pdo) {
  $new = "고객님의 방문예약이 정상적으로 접수되었습니다.\n본 모델하우스 담당직원이 예약안내차 곧 전화를 드리겠습니다. 감사합니다.";
  $old = array('담당자가 확인 후 안내 연락을 드리겠습니다.', '담당자가 확인 후 순차적으로 연락드리겠습니다.', '담당자가 확인 후 연락드리겠습니다.');
  $fix = function (&$o) use ($new, $old) { if (is_array($o) && isset($o['doneText']) && is_string($o['doneText']) && in_array(trim($o['doneText']), $old, true)) { $o['doneText'] = $new; return true; } return false; };
  foreach ($pdo->query("SELECT id, settings_json, draft_json FROM forms WHERE `key` = 'reserve'")->fetchAll() as $r) {
    $set = array();
    $s = json_decode((string)$r['settings_json'], true); if ($fix($s)) { $set['settings_json'] = json_encode($s, JSON_UNESCAPED_UNICODE); }
    if (!empty($r['draft_json'])) { $d = json_decode((string)$r['draft_json'], true); $ch = false; if (is_array($d) && isset($d['settings']) && is_array($d['settings'])) { $ch = $fix($d['settings']); } else { $ch = $fix($d); } if ($ch) { $set['draft_json'] = json_encode($d, JSON_UNESCAPED_UNICODE); } }
    foreach ($set as $col => $val) { $st = $pdo->prepare('UPDATE forms SET ' . $col . ' = ? WHERE id = ?'); $st->execute(array($val, (int)$r['id'])); }
  }
}
/* ---------- 질의 도우미 ---------- */
function wb_bind($v) { if ($v === null) { return null; } if (is_bool($v)) { return $v ? 1 : 0; } if (is_array($v) || is_object($v)) { return wb_enc($v); } return $v; }
function wb_stmt($sql, $params = array()) { $st = wb_db()->prepare($sql); $i = 1; foreach ($params as $p) { $v = wb_bind($p); if ($v === null) { $st->bindValue($i, null, PDO::PARAM_NULL); } elseif (is_int($v)) { $st->bindValue($i, $v, PDO::PARAM_INT); } else { $st->bindValue($i, (string)$v, PDO::PARAM_STR); } $i++; } $st->execute(); return $st; }
function wb_get($sql, $params = array()) { $r = wb_stmt($sql, $params)->fetch(); return $r === false ? null : $r; }
function wb_all($sql, $params = array()) { return wb_stmt($sql, $params)->fetchAll(); }
function wb_val($sql, $params = array()) { $r = wb_get($sql, $params); if (!$r) { return null; } $k = array_keys($r); return $r[$k[0]]; }
function wb_run($sql, $params = array()) { return wb_stmt($sql, $params)->rowCount(); }
function wb_insert($table, $obj) { $keys = array_keys($obj); $vals = array(); foreach ($keys as $k) { $vals[] = $obj[$k]; } wb_stmt('INSERT INTO `' . $table . '` (' . implode(', ', array_map(function ($k) { return '`' . $k . '`'; }, $keys)) . ') VALUES (' . implode(', ', array_fill(0, count($keys), '?')) . ')', $vals); return (int)wb_db()->lastInsertId(); }
function wb_update($table, $obj, $where, $params = array()) { $keys = array_keys($obj); if (!count($keys)) { return 0; } $vals = array(); foreach ($keys as $k) { $vals[] = $obj[$k]; } return wb_run('UPDATE `' . $table . '` SET ' . implode(', ', array_map(function ($k) { return '`' . $k . '` = ?'; }, $keys)) . ' WHERE ' . $where, array_merge($vals, $params)); }
function wb_del($table, $where, $params = array()) { return wb_run('DELETE FROM `' . $table . '` WHERE ' . $where, $params); }
function wb_tx($fn) { $pdo = wb_db(); $pdo->beginTransaction(); try { $r = $fn(); $pdo->commit(); return $r; } catch (Exception $e) { try { $pdo->rollBack(); } catch (Exception $x) {} throw $e; } }
function wb_in($list) { return implode(',', array_fill(0, max(1, count($list)), '?')); }
/* 요청 횟수 제한 (DB 기준 · 프로세스가 여러 개여도 정확) */
function wb_rate($bucket, $limit, $windowSec = 60) {
  try {
    $win = (string)(floor(time() / $windowSec) * $windowSec); $key = substr(wb_sha256($bucket), 0, 48);
    if (mt_rand(1, 30) === 1) { wb_del('rate_limits', 'window_start < ?', array((string)(time() - 3600))); }
    $row = wb_get('SELECT id, count FROM rate_limits WHERE bucket = ? AND window_start = ?', array($key, $win));
    if (!$row) { try { wb_insert('rate_limits', array('bucket' => $key, 'window_start' => $win, 'count' => 1)); } catch (Exception $e) { wb_run('UPDATE rate_limits SET count = count + 1 WHERE bucket = ? AND window_start = ?', array($key, $win)); } return true; }
    wb_run('UPDATE rate_limits SET count = count + 1 WHERE id = ?', array((int)$row['id']));
    return ((int)$row['count'] + 1) <= $limit;
  } catch (Exception $e) { wb_log_error('rate: ' . $e->getMessage()); return true; }
}
