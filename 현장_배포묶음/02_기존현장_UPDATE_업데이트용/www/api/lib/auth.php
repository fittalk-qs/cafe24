<?php
/* 통합웹빌더 운영 API — 인증 · 세션 · 권한
   · 자체 관리자 계정(공개 가입 없음 · 최고관리자가 발급) · 비밀번호는 password_hash(bcrypt) 해시로만 저장
   · 세션은 서버 DB(user_sessions)에 저장 · HttpOnly 쿠키(wb_sid) + Authorization: Bearer 둘 다 허용 · 60분 유휴 만료 · 실패 5회 → 15분 잠금
   · 쿠키 인증으로 GET 이외 요청을 하려면 X-Requested-With 헤더가 있어야 함(다른 사이트의 폼/링크로는 붙일 수 없는 헤더 → CSRF 차단) */
if (!defined('WB_API')) { http_response_code(404); exit; }
define('WB_SESSION_MINUTES', 60); define('WB_MAX_FAILED', 5); define('WB_LOCK_MINUTES', 15);
function wb_roles() { return array('super' => '최고관리자', 'admin' => '전체 관리', 'viewer' => '조회 전용'); }   /* 현장 전용 관리자 : 권한 3가지 */
function wb_site_roles() { return array('admin', 'viewer'); }
function wb_hash_password($pw) { return password_hash((string)$pw, PASSWORD_DEFAULT); }
function wb_verify_password($pw, $stored) { $stored = (string)$stored; if ($stored === '' || strpos($stored, 'scrypt$') === 0) { return false; } return password_verify((string)$pw, $stored); }   /* scrypt$… = 개발(Node) 서버 해시 → 운영에서는 비밀번호 재설정 필요 */
/* 비밀번호 규칙 : 8자 이상 (광고주 초기 비밀번호 = 실제 대표번호 뒤 8자리처럼 숫자만도 허용) · 같은 글자 반복(00000000) · 연속(12345678 · 87654321 · abcdefgh) 금지 */
function wb_valid_password($p) {
  if (!is_string($p) || wb_strlen($p) < 8) { return '비밀번호는 8자 이상이어야 합니다.'; }
  if (preg_match('/^(.)\1+$/us', $p)) { return '같은 글자만 반복한 비밀번호는 사용할 수 없습니다.'; }
  $c = array(); foreach (preg_split('//u', strtolower($p), -1, PREG_SPLIT_NO_EMPTY) as $ch) { $c[] = function_exists('mb_ord') ? mb_ord($ch, 'UTF-8') : ord($ch); }
  $step = $c[1] - $c[0]; $seq = ($step === 1 || $step === -1); for ($i = 1; $seq && $i < count($c); $i++) { if ($c[$i] - $c[$i - 1] !== $step) { $seq = false; } }
  if ($seq) { return '연속된 숫자 · 문자(12345678 등)는 사용할 수 없습니다.'; }
  return null;
}
function wb_ints($row, $keys) { if (!is_array($row)) { return $row; } foreach ($keys as $k) { if (array_key_exists($k, $row) && $row[$k] !== null && $row[$k] !== '') { $row[$k] = (int)$row[$k]; } } return $row; }
function wb_public_user($u) { if (!$u) { return null; } $o = $u; unset($o['password_hash'], $o['totp_secret'], $o['failed_logins']); $o['must_change_password'] = 0; return wb_ints($o, array('id', 'must_change_password', 'advertiser_id', 'sms_notify')); }   /* 첫 로그인 비밀번호 변경 요구 없음 (DB 칸은 호환용으로만 남김) */
function wb_is_https() { return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443); }
function wb_set_session_cookie($token) { if (headers_sent()) { return; } $v = 'wb_sid=' . ($token === '' ? '' : rawurlencode($token)) . '; Path=/; HttpOnly; SameSite=Lax' . (wb_is_https() ? '; Secure' : '') . ($token === '' ? '; Max-Age=0' : ''); header('Set-Cookie: ' . $v, false); }

function wb_login($loginId, $password, $c) {
  $id = wb_lower(trim((string)$loginId));
  $u = wb_get('SELECT * FROM users WHERE LOWER(login_id) = ? OR LOWER(email) = ?', array($id, $id));
  $log = function ($ok, $reason, $uid) use ($id, $c) { wb_insert('login_logs', array('user_id' => $uid, 'email' => wb_str($id, 190), 'success' => $ok ? 1 : 0, 'reason' => $reason, 'ip_hash' => $c['ipHash'], 'ua' => wb_str($c['ua'], 190), 'created_at' => wb_now())); };
  if (!$u) { $log(false, 'no_user', null); throw new WbHttpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.'); }
  if ($u['status'] !== 'active') { $log(false, 'inactive', (int)$u['id']); throw new WbHttpError(403, '사용 중지된 계정입니다. 최고관리자에게 문의하세요.'); }
  if (!empty($u['locked_until']) && $u['locked_until'] > wb_now()) { $log(false, 'locked', (int)$u['id']); throw new WbHttpError(423, '로그인 실패가 반복되어 잠시 잠긴 계정입니다. ' . substr($u['locked_until'], 11, 5) . ' 이후 다시 시도해 주세요.'); }
  if (!wb_verify_password($password, $u['password_hash'])) {
    $failed = (int)$u['failed_logins'] + 1; $d = array('failed_logins' => $failed); $locked = false;
    if ($failed >= WB_MAX_FAILED) { $d['locked_until'] = wb_now(time() + WB_LOCK_MINUTES * 60); $d['failed_logins'] = 0; $locked = true; }
    wb_update('users', $d, 'id = ?', array((int)$u['id'])); $log(false, 'bad_password', (int)$u['id']);
    throw new WbHttpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.' . ($locked ? ' 계정이 ' . WB_LOCK_MINUTES . '분 동안 잠겼습니다.' : ' (' . (WB_MAX_FAILED - $failed) . '회 남음)'));
  }
  wb_update('users', array('failed_logins' => 0, 'locked_until' => null, 'last_login_at' => wb_now()), 'id = ?', array((int)$u['id']));
  $token = wb_create_session((int)$u['id'], $c); $log(true, 'ok', (int)$u['id']);
  return array('token' => $token, 'user' => wb_public_user($u));
}
function wb_create_session($userId, $c) {
  $token = wb_token(32);
  wb_insert('user_sessions', array('user_id' => (int)$userId, 'token_hash' => wb_sha256($token), 'ip_hash' => $c['ipHash'], 'ua' => wb_str($c['ua'], 190), 'last_seen_at' => wb_now(), 'expires_at' => wb_now(time() + WB_SESSION_MINUTES * 60), 'created_at' => wb_now()));
  wb_del('user_sessions', 'expires_at < ?', array(wb_now()));
  wb_set_session_cookie($token);
  return $token;
}
function wb_user_from_token($token) {
  if (!$token || strlen($token) < 20) { return null; }
  $s = wb_get('SELECT * FROM user_sessions WHERE token_hash = ?', array(wb_sha256($token))); if (!$s) { return null; }
  if ($s['expires_at'] < wb_now()) { wb_del('user_sessions', 'id = ?', array((int)$s['id'])); return null; }
  $u = wb_get('SELECT * FROM users WHERE id = ? AND status = ?', array((int)$s['user_id'], 'active')); if (!$u) { return null; }
  if (strtotime($s['last_seen_at']) < time() - 300) { wb_update('user_sessions', array('last_seen_at' => wb_now(), 'expires_at' => wb_now(time() + WB_SESSION_MINUTES * 60)), 'id = ?', array((int)$s['id'])); }
  $pu = wb_public_user($u); $pu['session_id'] = (int)$s['id']; return $pu;
}
function wb_logout($token) { if ($token) { wb_del('user_sessions', 'token_hash = ?', array(wb_sha256($token))); } wb_set_session_cookie(''); }
function wb_logout_all($userId) { return wb_del('user_sessions', 'user_id = ?', array((int)$userId)); }

/* ---- 권한 : 사이트 권한 = 사이트별 배정(site_users) 또는 광고주 단위 배정(user_advertisers) 중 높은 쪽 · 계정 기본 역할이 상한 ---- */
function wb_rank($r) { $m = array('admin' => 4, 'editor' => 3, 'staff' => 2, 'viewer' => 1); return isset($m[$r]) ? $m[$r] : 0; }
function wb_site_role($user, $siteId) {
  if (!$user) { return null; } if ($user['role'] === 'super') { return 'admin'; }
  /* 현장 전용 관리자 : 이 관리자의 현장에 계정 권한 그대로 (전체 관리 = admin · 그 밖 = 조회 전용) */
  $st = wb_val('SELECT status FROM sites WHERE id = ?', array((int)$siteId)); if (!$st || $st === 'deleted') { return null; }
  return $user['role'] === 'admin' ? 'admin' : 'viewer';
  $r = wb_get('SELECT role FROM site_users WHERE site_id = ? AND user_id = ?', array((int)$siteId, (int)$user['id']));
  $a = wb_get('SELECT ua.role FROM user_advertisers ua JOIN sites s ON s.advertiser_id = ua.advertiser_id WHERE s.id = ? AND ua.user_id = ?', array((int)$siteId, (int)$user['id']));
  $role = null; foreach (array($r, $a) as $x) { if ($x && !empty($x['role']) && (!$role || wb_rank($x['role']) > wb_rank($role))) { $role = $x['role']; } }
  if (!$role) { return null; }
  $cap = $user['role'] === 'admin' ? 'admin' : $user['role']; if (wb_rank($role) > wb_rank($cap)) { $role = $cap; }
  return $role;
}
function wb_can($user, $siteId, $ability) {
  if (!$user) { return false; } if ($user['role'] === 'super') { return true; }
  $role = wb_site_role($user, $siteId); if (!$role) { return false; }
  $table = array(
    'admin' => array('view', 'edit', 'media', 'publish', 'submissions', 'submissions.view', 'submissions.export', 'manage', 'delete', 'logs', 'stats', 'forms', 'seo', 'popups', 'settings'),
    'editor' => array('view', 'edit', 'media', 'publish', 'stats'),
    'staff' => array('view', 'submissions', 'submissions.view', 'stats'),
    'viewer' => array('view', 'submissions.view', 'stats', 'logs'),
  );
  return isset($table[$role]) && in_array($ability, $table[$role], true);
}
function wb_is_super($user) { return $user && $user['role'] === 'super'; }
function wb_sites($user) {
  if (!$user) { return array(); }
  return wb_all("SELECT * FROM sites WHERE status <> 'deleted' ORDER BY id");   /* 현장 전용 : 모든 계정이 이 관리자의 현장만 */
  return wb_all("SELECT DISTINCT s.* FROM sites s LEFT JOIN site_users su ON su.site_id = s.id AND su.user_id = ? LEFT JOIN user_advertisers ua ON ua.advertiser_id = s.advertiser_id AND ua.user_id = ? WHERE (su.id IS NOT NULL OR ua.id IS NOT NULL) AND s.status <> 'deleted' ORDER BY s.id", array((int)$user['id'], (int)$user['id']));
}
function wb_advertisers($user) { if (!$user) { return array(); } if ($user['role'] === 'super') { return wb_all("SELECT * FROM advertisers WHERE status <> 'deleted' ORDER BY name"); } return wb_all("SELECT DISTINCT a.* FROM advertisers a LEFT JOIN user_advertisers ua ON ua.advertiser_id = a.id AND ua.user_id = ? LEFT JOIN sites s ON s.advertiser_id = a.id LEFT JOIN site_users su ON su.site_id = s.id AND su.user_id = ? WHERE (ua.id IS NOT NULL OR su.id IS NOT NULL) AND a.status <> 'deleted' ORDER BY a.name", array((int)$user['id'], (int)$user['id'])); }
function wb_must($user, $siteId, $ability) { if (!wb_can($user, $siteId, $ability)) { throw new WbHttpError(403, '이 작업을 수행할 권한이 없습니다.'); } }
function wb_must_super($user) { if (!wb_is_super($user)) { throw new WbHttpError(403, '최고관리자만 사용할 수 있는 기능입니다.'); } }
function wb_menu_for($user, $siteId) {
  return array('dashboard' => true, 'sites' => false, 'editor' => wb_can($user, $siteId, 'edit'), 'reservations' => wb_can($user, $siteId, 'submissions') || wb_can($user, $siteId, 'submissions.view'), 'media' => wb_can($user, $siteId, 'media') || wb_can($user, $siteId, 'manage'), 'popups' => wb_can($user, $siteId, 'manage'), 'seo' => wb_can($user, $siteId, 'manage'), 'stats' => wb_can($user, $siteId, 'stats'), 'siteinfo' => wb_can($user, $siteId, 'manage'), 'forms' => wb_can($user, $siteId, 'manage'), 'menus' => wb_can($user, $siteId, 'manage'), 'publish' => wb_can($user, $siteId, 'publish') || wb_can($user, $siteId, 'view'), 'logs' => wb_can($user, $siteId, 'logs'), 'users' => wb_is_super($user), 'system' => wb_is_super($user));
}
