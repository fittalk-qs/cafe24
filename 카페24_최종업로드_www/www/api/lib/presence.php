<?php
/* 동시 접속 알림 — 같은 현장 관리자에 다른 브라우저 · PC · 탭에서 접속 중인지 알려 줍니다.
   · 15~20초마다 관리자 화면이 상태를 보내고(heartbeat), 60초 넘게 소식이 없으면 접속 종료로 봅니다.
   · 저장하는 값 : 세션키(브라우저/탭마다 다름) · 계정 · 보고 있는 메뉴 · 편집 중인 페이지 · 마지막 시각
     (IP · 개인정보는 저장하지 않습니다. 활동 로그와는 별개이며 기록을 쌓아 두지 않습니다 — 오래된 줄은 지웁니다.)
   · 게시 잠금 : 한 번에 한 사람만 게시하도록 짧은 잠금을 겁니다. */
if (!defined('WB_API')) { http_response_code(404); exit; }

define('WB_PRESENCE_TTL', 60);        /* 이 시간(초) 넘게 소식 없으면 접속 종료 */
define('WB_PUBLISH_LOCK_TTL', 180);   /* 게시 잠금 최대 유지 시간(초) — 끝나면 자동 해제 */

function wb_presence_table() {
  static $done = false;
  if ($done) { return true; }
  try {
    wb_run('CREATE TABLE IF NOT EXISTS presence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      session_key TEXT NOT NULL,
      user_id INTEGER,
      user_name TEXT,
      device TEXT,
      browser TEXT,
      route TEXT,
      page_id INTEGER,
      page_title TEXT,
      publishing_at TEXT,
      last_seen TEXT NOT NULL
    )');
    wb_run('CREATE UNIQUE INDEX IF NOT EXISTS presence_key ON presence (session_key)');
  } catch (Exception $e) { return false; }
  $done = true; return true;
}
function wb_presence_clean() { try { wb_run('DELETE FROM presence WHERE last_seen < ?', array(date('Y-m-d H:i:s', time() - (WB_PRESENCE_TTL * 6)))); } catch (Exception $e) {} }
function wb_presence_alive($row) { return $row && strtotime((string)$row['last_seen']) >= (time() - WB_PRESENCE_TTL); }
function wb_presence_ago($t) { $s = max(0, time() - strtotime((string)$t)); if ($s < 10) { return '방금 활동'; } if ($s < 60) { return $s . '초 전'; } return floor($s / 60) . '분 전'; }

function wb_presence_out($siteId, $selfKey) {
  $rows = wb_all('SELECT * FROM presence WHERE site_id = ? ORDER BY last_seen DESC', array((int)$siteId));
  $others = array(); $samePage = array(); $sameRoute = array(); $publishing = null; $mine = null;
  foreach ($rows as $r) {
    if (!wb_presence_alive($r)) { continue; }
    if ((string)$r['session_key'] === (string)$selfKey) { $mine = $r; continue; }
    $others[] = array(
      'name' => (string)$r['user_name'], 'device' => (string)$r['device'], 'browser' => (string)$r['browser'],
      'route' => (string)$r['route'], 'page_id' => $r['page_id'] ? (int)$r['page_id'] : null, 'page_title' => (string)$r['page_title'],
      'ago' => wb_presence_ago($r['last_seen']),
      'publishing' => !empty($r['publishing_at']) && strtotime((string)$r['publishing_at']) >= (time() - WB_PUBLISH_LOCK_TTL),
    );
  }
  foreach ($others as $o) {
    if ($mine && (string)$o['route'] !== '' && (string)$o['route'] === (string)$mine['route']) { $sameRoute[] = $o['name']; }
    if ($mine && $mine['page_id'] && $o['page_id'] && (int)$o['page_id'] === (int)$mine['page_id']) { $samePage[] = $o['name']; }
    if (!empty($o['publishing'])) { $publishing = $o['name']; }
  }
  return array('ok' => true, 'others' => $others, 'count' => count($others), 'samePage' => $samePage, 'sameRoute' => $sameRoute, 'publishing' => $publishing, 'ttl' => WB_PRESENCE_TTL);
}

/* 지금 다른 사람이 게시 중이면 그 사람 이름, 아니면 '' */
function wb_publish_locked_by($siteId, $selfKey) {
  if (!wb_presence_table()) { return ''; }
  $rows = wb_all('SELECT user_name, session_key, publishing_at FROM presence WHERE site_id = ? AND publishing_at IS NOT NULL', array((int)$siteId));
  foreach ($rows as $r) {
    if ((string)$r['session_key'] === (string)$selfKey) { continue; }
    if (strtotime((string)$r['publishing_at']) >= (time() - WB_PUBLISH_LOCK_TTL)) { return (string)$r['user_name'] !== '' ? (string)$r['user_name'] : '다른 사용자'; }
  }
  return '';
}
function wb_publish_lock_set($siteId, $selfKey, $on) {
  if (!wb_presence_table() || (string)$selfKey === '') { return; }
  try { wb_run('UPDATE presence SET publishing_at = ?, last_seen = ? WHERE site_id = ? AND session_key = ?', array($on ? wb_now() : null, wb_now(), (int)$siteId, (string)$selfKey)); } catch (Exception $e) {}
}

wb_route('POST', '/presence/beat', function ($c) {
  if (!wb_presence_table()) { return array('ok' => true, 'others' => array(), 'count' => 0, 'samePage' => array(), 'sameRoute' => array(), 'publishing' => null, 'off' => true); }
  $key = wb_str(wb_b($c, 'session'), 64);
  if ($key === '') { throw new WbHttpError(422, '세션 값이 없습니다.'); }
  $sites = wb_sites($c['user']); $siteId = count($sites) ? (int)$sites[0]['id'] : 0;
  if (wb_b($c, 'site_id')) { $siteId = wb_int(wb_b($c, 'site_id')); }
  $now = wb_now();
  $d = array(
    'site_id' => $siteId, 'session_key' => $key,
    'user_id' => (int)$c['user']['id'], 'user_name' => wb_str($c['user']['name'], 60),
    'device' => wb_str(wb_b($c, 'device'), 20), 'browser' => wb_str(wb_b($c, 'browser'), 30),
    'route' => wb_str(wb_b($c, 'route'), 60), 'page_id' => wb_b($c, 'page_id') ? wb_int(wb_b($c, 'page_id')) : null,
    'page_title' => wb_str(wb_b($c, 'page_title'), 80), 'last_seen' => $now,
  );
  $old = wb_get('SELECT id, publishing_at FROM presence WHERE session_key = ?', array($key));
  if ($old) { wb_update('presence', $d, 'id = ?', array((int)$old['id'])); }
  else { $d['publishing_at'] = null; wb_insert('presence', $d); }
  wb_presence_clean();
  return wb_presence_out($siteId, $key);
});
wb_route('POST', '/presence/bye', function ($c) {
  if (!wb_presence_table()) { return array('ok' => true); }
  $key = wb_str(wb_b($c, 'session'), 64);
  if ($key !== '') { try { wb_run('DELETE FROM presence WHERE session_key = ?', array($key)); } catch (Exception $e) {} }
  return array('ok' => true);
});
