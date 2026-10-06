<?php
/* 통합웹빌더 운영 API — 방문 통계 집계 (analytics_events → analytics_daily) : Node lib/api.js aggregate/report 와 같은 결과 */
if (!defined('WB_API')) { http_response_code(404); exit; }
function wb_aggregate($siteId, $date) {
  $siteId = (int)$siteId; $from = $date . ' 00:00:00'; $to = $date . ' 23:59:59'; $p = array($siteId, $from, $to);
  $pv = wb_int(wb_val("SELECT COUNT(*) FROM analytics_events WHERE site_id = ? AND event = 'pageview' AND created_at BETWEEN ? AND ?", $p));
  $uv = wb_int(wb_val('SELECT COUNT(DISTINCT session_hash) FROM analytics_events WHERE site_id = ? AND created_at BETWEEN ? AND ?', $p));
  $sub = wb_int(wb_val('SELECT COUNT(*) FROM form_submissions WHERE site_id = ? AND created_at BETWEEN ? AND ?', $p));
  $clicks = wb_int(wb_val("SELECT COUNT(*) FROM analytics_events WHERE site_id = ? AND event = 'click' AND created_at BETWEEN ? AND ?", $p));
  $devices = new stdClass(); foreach (wb_all('SELECT device, COUNT(DISTINCT session_hash) c FROM analytics_events WHERE site_id = ? AND created_at BETWEEN ? AND ? GROUP BY device', $p) as $r) { $k = $r['device'] ? $r['device'] : 'pc'; $devices->$k = (int)$r['c']; }
  $pages = array(); foreach (wb_all("SELECT path, title, COUNT(*) c FROM analytics_events WHERE site_id = ? AND event = 'pageview' AND created_at BETWEEN ? AND ? GROUP BY path, title ORDER BY c DESC LIMIT 30", $p) as $r) { $pages[] = array('path' => $r['path'], 'title' => $r['title'], 'pv' => (int)$r['c']); }
  $refs = array(); foreach (wb_all("SELECT referrer_host, COUNT(DISTINCT session_hash) c FROM analytics_events WHERE site_id = ? AND event = 'pageview' AND created_at BETWEEN ? AND ? GROUP BY referrer_host ORDER BY c DESC LIMIT 30", $p) as $r) { $refs[] = array('host' => $r['referrer_host'] ? $r['referrer_host'] : '(직접 방문)', 'uv' => (int)$r['c']); }
  $utm = new stdClass(); foreach (wb_all("SELECT utm_json FROM analytics_events WHERE site_id = ? AND event = 'pageview' AND utm_json IS NOT NULL AND created_at BETWEEN ? AND ?", $p) as $r) { $u = wb_arr($r['utm_json']); $parts = array(); foreach (array('utm_source', 'utm_medium', 'utm_campaign') as $k) { if (!empty($u[$k])) { $parts[] = $u[$k]; } } $k = implode(' / ', $parts); if ($k !== '') { $utm->$k = (isset($utm->$k) ? $utm->$k : 0) + 1; } }
  $clickLabels = array(); foreach (wb_all("SELECT label, COUNT(*) c FROM analytics_events WHERE site_id = ? AND event = 'click' AND created_at BETWEEN ? AND ? GROUP BY label ORDER BY c DESC LIMIT 20", $p) as $r) { $clickLabels[] = array('label' => $r['label'], 'c' => (int)$r['c']); }
  $row = array('pageviews' => $pv, 'uniques' => $uv, 'submissions' => $sub, 'clicks' => $clicks, 'devices_json' => wb_enc($devices), 'pages_json' => wb_enc($pages), 'referrers_json' => wb_enc($refs), 'screens_json' => wb_enc(array('utm' => $utm, 'clicks' => $clickLabels)), 'updated_at' => wb_now());
  $ex = wb_get('SELECT id FROM analytics_daily WHERE site_id = ? AND date = ?', array($siteId, $date));
  if ($ex) { wb_update('analytics_daily', $row, 'id = ?', array((int)$ex['id'])); } else { wb_insert('analytics_daily', array_merge($row, array('site_id' => $siteId, 'date' => $date))); }
  return $row;
}
function wb_report($siteId, $from, $to) {
  $siteId = (int)$siteId; wb_aggregate($siteId, wb_today()); $y = wb_today(wb_days(-1));
  if ($from <= $y && $to >= $y && !wb_get('SELECT id FROM analytics_daily WHERE site_id = ? AND date = ?', array($siteId, $y))) { wb_aggregate($siteId, $y); }
  $byDate = array(); foreach (wb_all('SELECT * FROM analytics_daily WHERE site_id = ? AND date BETWEEN ? AND ?', array($siteId, $from, $to)) as $r) { $byDate[$r['date']] = $r; }
  $days = array(); $sum = array('pageviews' => 0, 'uniques' => 0, 'submissions' => 0, 'clicks' => 0); $devices = array(); $pages = array(); $refs = array(); $utm = array(); $clicks = array();
  $t = strtotime($from . ' 00:00:00'); $end = strtotime($to . ' 00:00:00'); $guard = 0;
  while ($t !== false && $t <= $end && $guard++ < 800) {
    $k = date('Y-m-d', $t); $r = isset($byDate[$k]) ? $byDate[$k] : null;
    $days[] = array('date' => $k, 'pageviews' => $r ? (int)$r['pageviews'] : 0, 'uniques' => $r ? (int)$r['uniques'] : 0, 'submissions' => $r ? (int)$r['submissions'] : 0, 'clicks' => $r ? (int)$r['clicks'] : 0);
    if ($r) {
      foreach (array_keys($sum) as $kk) { $sum[$kk] += (int)$r[$kk]; }
      foreach (wb_arr($r['devices_json']) as $dv => $cnt) { $devices[$dv] = (isset($devices[$dv]) ? $devices[$dv] : 0) + (int)$cnt; }
      foreach (wb_arr($r['pages_json']) as $pg) { $path = isset($pg['path']) ? $pg['path'] : ''; $pages[$path] = array('path' => $path, 'title' => isset($pg['title']) ? $pg['title'] : '', 'pv' => (isset($pages[$path]) ? $pages[$path]['pv'] : 0) + (int)(isset($pg['pv']) ? $pg['pv'] : 0)); }
      foreach (wb_arr($r['referrers_json']) as $rf) { $h = isset($rf['host']) ? $rf['host'] : ''; $refs[$h] = (isset($refs[$h]) ? $refs[$h] : 0) + (int)(isset($rf['uv']) ? $rf['uv'] : 0); }
      $sc = wb_arr($r['screens_json']); foreach ((array)(isset($sc['utm']) ? $sc['utm'] : array()) as $k2 => $v) { $utm[$k2] = (isset($utm[$k2]) ? $utm[$k2] : 0) + (int)$v; } foreach ((array)(isset($sc['clicks']) ? $sc['clicks'] : array()) as $cl) { $lb = isset($cl['label']) ? (string)$cl['label'] : ''; $clicks[$lb] = (isset($clicks[$lb]) ? $clicks[$lb] : 0) + (int)(isset($cl['c']) ? $cl['c'] : 0); }
    }
    $t = strtotime('+1 day', $t);
  }
  $sortObj = function ($o) { arsort($o); $out = array(); foreach (array_slice($o, 0, 20, true) as $k => $v) { $out[] = array('key' => (string)$k, 'count' => (int)$v); } return $out; };
  usort($pages, function ($a, $b) { return $b['pv'] - $a['pv']; });
  $mobile = (isset($devices['mobile']) ? $devices['mobile'] : 0) + (isset($devices['tablet']) ? $devices['tablet'] : 0); $pc = isset($devices['pc']) ? $devices['pc'] : 0;
  return array('days' => $days, 'sum' => $sum, 'devices' => count($devices) ? $devices : new stdClass(), 'pc_ratio' => ($pc + $mobile) ? (int)round($pc / ($pc + $mobile) * 100) : 0, 'pages' => array_slice(array_values($pages), 0, 20), 'referrers' => $sortObj($refs), 'utm' => $sortObj($utm), 'clicks' => $sortObj($clicks), 'conversion' => $sum['uniques'] ? round($sum['submissions'] / $sum['uniques'] * 10000) / 100 : 0);
}
