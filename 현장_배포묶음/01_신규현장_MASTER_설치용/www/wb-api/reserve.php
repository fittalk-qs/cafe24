<?php
/* 방문예약 공개 접수 (POST 전용) — 홈페이지(common.js) → 이 파일 → 데이터베이스(wb-api/data/reservations.sqlite 또는 MySQL) 저장 → 통합 관리자가 admin.php 로 가져감
   · 관리자 인증정보 없이 동작하는 "접수 전용" 주소입니다. 조회 · 이동은 admin.php(비밀키 필요)에서만 가능합니다.
   · 검증 : 요청 방식 · 본문 크기 · 출처 도메인 · 사이트 식별값 · 필수값 · 연락처 · 날짜 · 방문 시간 목록 · 동의 · 허니팟 · 작성 시간 · 요청 횟수 · 중복(토큰 · 같은 연락처)
   · 응답은 사용자에게 보여줄 안내 문구만 (서버 경로 · 상세 오류는 data/error.log 에만 기록) */
define('WB_API', 1);
require dirname(__FILE__) . '/lib.php';

$cfg = wb_config();
wb_cors($cfg);
if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: POST, OPTIONS'); wb_json(405, array('ok' => false, 'error' => 'POST 요청만 허용됩니다.')); }
if (!$cfg) { wb_log('config.php 없음 또는 불완전'); wb_json(503, array('ok' => false, 'error' => '접수 서버 설정이 아직 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.')); }
if (!wb_db()) { wb_json(503, array('ok' => false, 'error' => '접수 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')); }
$schema = wb_read_json(WB_DATA . '/form.php');
if (!$schema || empty($schema['fields'])) { wb_log('form.php 없음'); wb_json(503, array('ok' => false, 'error' => '예약 폼이 아직 게시되지 않았습니다.')); }

/* 출처 : 같은 도메인(이 홈페이지) 또는 설정에 등록된 도메인에서 온 요청만 */
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($origin !== '') {
  $oh = strtolower((string)parse_url($origin, PHP_URL_HOST));
  $allowed = array(wb_self_host());
  if (!empty($cfg['origins']) && is_array($cfg['origins'])) { foreach ($cfg['origins'] as $h) { $allowed[] = strtolower($h); } }
  if ($oh === '' || !in_array($oh, $allowed, true)) { wb_json(403, array('ok' => false, 'error' => '등록되지 않은 도메인에서의 요청입니다.')); }
}

$in = wb_body();
$siteKey = wb_str(isset($in['site_key']) ? $in['site_key'] : '', 60);
if ($siteKey !== '' && $siteKey !== $cfg['site_key']) { wb_json(403, array('ok' => false, 'error' => '사이트 정보가 일치하지 않습니다.')); }

$settings = isset($schema['settings']) && is_array($schema['settings']) ? $schema['settings'] : array();
$spam = isset($settings['spam']) && is_array($settings['spam']) ? $settings['spam'] : array();
$done = array('title' => !empty($settings['doneTitle']) ? $settings['doneTitle'] : '방문예약이 정상적으로 접수되었습니다.', 'text' => isset($settings['doneText']) && $settings['doneText'] !== '' ? $settings['doneText'] : '담당자가 확인 후 안내 연락을 드리겠습니다.', 'redirect' => isset($settings['successRedirect']) ? $settings['successRedirect'] : '');

/* 중복 전송 방지 : 같은 1회용 토큰이 다시 오면 새로 저장하지 않고 처음 접수번호로 응답 */
$token = preg_replace('/[^a-zA-Z0-9_-]/', '', wb_str(isset($in['_token']) ? $in['_token'] : '', 80));
if ($token !== '') { $ex = wb_find_token($token); if ($ex) { wb_json(200, array('ok' => true, 'id' => $ex['id'], 'receipt' => $ex['receipt'], 'duplicate' => true, 'title' => $done['title'], 'text' => $done['text'], 'redirect' => $done['redirect'])); } }
if (!wb_rate('submit:' . wb_ip_hash($cfg['secret']), 6, 60)) { wb_json(429, array('ok' => false, 'error' => '요청이 많아 접수가 지연되고 있습니다. 잠시 후 다시 신청해 주세요.')); }
if ((!isset($spam['honeypot']) || $spam['honeypot'] !== false) && wb_str(isset($in['website']) ? $in['website'] : '', 200) !== '') { wb_json(200, array('ok' => true, 'id' => 0, 'receipt' => '', 'title' => $done['title'], 'text' => $done['text'], 'redirect' => '')); }
$minSec = isset($spam['minSeconds']) ? (int)$spam['minSeconds'] : 3;
$started = isset($in['_ts']) ? (int)$in['_ts'] : 0;
if ($minSec > 0 && $started > 0 && (time() - $started) < $minSec) { wb_json(422, array('ok' => false, 'error' => '입력 시간이 너무 짧습니다. 다시 시도해 주세요.')); }

/* ---------- 입력값 검증 (통합웹빌더 서버의 validateSubmission 과 같은 규칙) ---------- */
function wb_on($v) { return !($v === null || $v === '' || $v === false || $v === 0 || $v === '0' || $v === 'false' || $v === 'N'); }
$errors = array(); $data = array(); $name = ''; $phone = ''; $date = null; $time = '';
foreach ($schema['fields'] as $f) {
  if (empty($f['enabled'])) { continue; }
  $k = (string)$f['name']; $type = (string)$f['type']; $label = !empty($f['label']) ? $f['label'] : $k;
  $v = isset($f['validation']) && is_array($f['validation']) ? $f['validation'] : array();
  $req = !empty($f['required']);
  if ($type === 'phone') {
    /* 홈페이지는 phone 하나("010-1234-5678")로 보냄 · 예전 형식(phone1/phone2 · phone_p1~p3)도 허용 */
    $raw = (isset($in[$k]) && is_string($in[$k]) && $in[$k] !== '') ? $in[$k] : (isset($in[$k . '_p1']) ? wb_str($in[$k . '_p1'], 4) . '-' . wb_str(isset($in[$k . '_p2']) ? $in[$k . '_p2'] : '', 4) . '-' . wb_str(isset($in[$k . '_p3']) ? $in[$k . '_p3'] : '', 4) : (wb_str(isset($in[$k . '1']) ? $in[$k . '1'] : '', 10) . '-' . wb_str(isset($in[$k . '2']) ? $in[$k . '2'] : '', 10)));
    $digits = preg_replace('/[^0-9]/', '', $raw);
    if ($digits === '' || $raw === '-' || $raw === '--') { if ($req) { $errors[$k] = $label . ' 항목은 필수입니다.'; } continue; }
    $prefix = preg_replace('/[^0-9]/', '', isset($settings['phonePrefix']) ? (string)$settings['phonePrefix'] : '010'); if ($prefix === '') { $prefix = '010'; }
    if (strlen($digits) <= 8) { $digits = $prefix . $digits; }
    if (!preg_match('/^0\d{8,10}$/', $digits)) { $errors[$k] = $label . ' 형식이 올바르지 않습니다. (예 010-1234-5678)'; continue; }
    $val = preg_replace('/^(0\d{1,2})(\d{3,4})(\d{4})$/', '$1-$2-$3', $digits);
    if ($val === $digits) { $errors[$k] = $label . ' 형식이 올바르지 않습니다. (예 010-1234-5678)'; continue; }
    $data[$k] = $val; $phone = $val; continue;
  }
  if ($type === 'checkbox') {
    $arr = !isset($in[$k]) ? array() : (is_array($in[$k]) ? $in[$k] : array($in[$k])); $clean = array();
    foreach ($arr as $x) { $s = wb_str($x, 200); if ($s !== '') { $clean[] = $s; } }
    if ($req && !count($clean)) { $errors[$k] = $label . ' 항목을 선택해 주세요.'; continue; }
    $bad = false;
    if (!empty($f['options']) && is_array($f['options'])) { foreach ($clean as $x) { if (!in_array($x, $f['options'], true)) { $bad = true; } } }
    if ($bad) { $errors[$k] = $label . ' 값이 올바르지 않습니다.'; continue; }
    $data[$k] = $clean; continue;
  }
  if ($type === 'consent') {
    $on = isset($in[$k]) && wb_on($in[$k]);
    if ($req && !$on) { $errors[$k] = $label . ' 에 동의해 주세요.'; continue; }
    $data[$k] = $on ? 'Y' : 'N'; continue;
  }
  $s = wb_str(isset($in[$k]) ? $in[$k] : '', $type === 'textarea' ? 3000 : 300);
  if ($s === '') { if ($req && $type !== 'hidden') { $errors[$k] = $label . ' 항목은 필수입니다.'; } else { $data[$k] = ''; } continue; }
  if ($type === 'email') { if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $s)) { $errors[$k] = $label . ' 형식이 올바르지 않습니다.'; } }
  elseif ($type === 'number') {
    if (!is_numeric($s)) { $errors[$k] = $label . ' 항목은 숫자만 입력할 수 있습니다.'; }
    elseif (isset($v['min']) && $v['min'] !== '' && (float)$s < (float)$v['min']) { $errors[$k] = $label . ' 값은 ' . $v['min'] . ' 이상이어야 합니다.'; }
    elseif (isset($v['max']) && $v['max'] !== '' && (float)$s > (float)$v['max']) { $errors[$k] = $label . ' 값은 ' . $v['max'] . ' 이하여야 합니다.'; }
  }
  elseif ($type === 'date') {
    $m = array();
    $okDate = preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m) && checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
    if (!$okDate) { $errors[$k] = $label . ' 형식이 올바르지 않습니다.'; }
    elseif (!empty($v['futureOnly']) && $s < date('Y-m-d')) { $errors[$k] = $label . ' 은(는) 오늘 이후 날짜만 선택할 수 있습니다.'; }
    else { $date = $s; }
  }
  elseif ($type === 'time') {
    $times = isset($settings['visitTimes']) && is_array($settings['visitTimes']) ? $settings['visitTimes'] : array();
    if (count($times) && !in_array($s, $times, true)) { $errors[$k] = $label . ' 값이 올바르지 않습니다.'; } else { $time = $s; }
  }
  elseif ($type === 'select' || $type === 'radio') {
    if (!empty($f['options']) && is_array($f['options']) && !in_array($s, $f['options'], true)) { $errors[$k] = $label . ' 값이 올바르지 않습니다.'; }
  }
  else {
    if (!empty($v['minLength']) && wb_strlen($s) < (int)$v['minLength']) { $errors[$k] = $label . ' 항목은 ' . (int)$v['minLength'] . '자 이상 입력해 주세요.'; }
    elseif (!empty($v['maxLength']) && wb_strlen($s) > (int)$v['maxLength']) { $errors[$k] = $label . ' 항목은 ' . (int)$v['maxLength'] . '자 이하로 입력해 주세요.'; }
    elseif (($type === 'name' || $k === 'name') && (wb_strlen($s) < 2 || wb_strlen($s) > 40)) { $errors[$k] = $label . ' 은(는) 2~40자로 입력해 주세요.'; }
  }
  if (isset($errors[$k])) { continue; }
  $data[$k] = $s;
  if ($type === 'name' || ($k === 'name' && $name === '')) { $name = $s; }
}
$agreeNames = array();
if (!empty($settings['agreements']) && is_array($settings['agreements'])) {
  foreach ($settings['agreements'] as $a) {
    if ((isset($a['enabled']) && $a['enabled'] === false) || empty($a['name'])) { continue; }
    $on = isset($in[$a['name']]) && wb_on($in[$a['name']]);
    if (!empty($a['required']) && !$on) { $errors[$a['name']] = '필수 동의 항목에 체크해 주세요.'; }
    $data[$a['name']] = $on ? 'Y' : 'N'; $agreeNames[] = $a['name'];
  }
}
foreach ($schema['fields'] as $f) {
  $k = (string)$f['name'];
  if (!empty($f['enabled']) && $f['type'] === 'consent') { $agreeNames[] = $k; }
  if (isset($errors[$k]) && !empty($f['validation']['errorMessage'])) { $errors[$k] = (string)$f['validation']['errorMessage']; }
}
if (count($errors)) { $firstErr = reset($errors); wb_json(422, array('ok' => false, 'error' => $firstErr, 'errors' => $errors)); }
$consent = '';
if (count($agreeNames)) { $consent = 'N'; foreach ($agreeNames as $an) { if (isset($data[$an]) && $data[$an] === 'Y') { $consent = 'Y'; } } }

/* 같은 연락처로 방금 접수된 예약 */
$dupMin = isset($spam['duplicateMinutes']) ? (int)$spam['duplicateMinutes'] : 10;
if ($dupMin > 0 && $phone !== '' && wb_recent_phone($phone, time() - $dupMin * 60)) {
  $tel = !empty($cfg['tel']) ? '대표번호 ' . $cfg['tel'] . ' 로' : '전화로';
  wb_json(409, array('ok' => false, 'error' => '같은 연락처로 방금 접수된 예약이 있습니다. 내용을 바꾸시려면 ' . $tel . ' 문의해 주세요.'));
}

/* ---------- 저장 (prepared statement · 트랜잭션은 lib.php) ---------- */
$utm = array();
foreach (array('utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content') as $uk) {
  $uv = (isset($in['_utm']) && is_array($in['_utm']) && isset($in['_utm'][$uk])) ? $in['_utm'][$uk] : (isset($in[$uk]) ? $in[$uk] : '');
  $uv = wb_str($uv, 100); if ($uv !== '') { $utm[$uk] = $uv; }
}
$snapshot = array();   /* 접수 당시의 필드 구성 (나중에 관리자에서 필드명을 바꿔도 이 예약에는 당시 이름이 남음) */
foreach ($schema['fields'] as $f) { if (!empty($f['enabled'])) { $snapshot[] = array('id' => isset($f['id']) ? $f['id'] : null, 'name' => $f['name'], 'label' => isset($f['label']) ? $f['label'] : $f['name'], 'type' => $f['type'], 'required' => !empty($f['required'])); } }
if (!empty($settings['agreements']) && is_array($settings['agreements'])) { foreach ($settings['agreements'] as $a) { if (!empty($a['name'])) { $snapshot[] = array('name' => $a['name'], 'label' => isset($a['label']) ? $a['label'] : '', 'type' => 'consent', 'required' => !empty($a['required'])); } } }
$ua = wb_str(isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '', 250);
$device = preg_match('/iPad|Tablet/i', $ua) ? 'tablet' : (preg_match('/Mobi|Android|iPhone/i', $ua) ? 'mobile' : 'pc');

$row = array(
  'receipt' => '', 'token' => $token !== '' ? $token : null, 'site_key' => $cfg['site_key'],
  'ts' => time(), 'created_at' => date('Y-m-d H:i:s'),
  'name' => wb_str($name, 80), 'phone' => $phone, 'visit_date' => $date, 'visit_time' => wb_str($time, 20), 'consent' => $consent,
  'data_json' => wb_encode($data), 'fields_json' => wb_encode($snapshot), 'form_version' => isset($schema['version']) ? (int)$schema['version'] : 0,
  'page' => wb_str(isset($in['_page']) ? $in['_page'] : '', 250), 'landing' => wb_str(isset($in['_landing']) ? $in['_landing'] : '', 250),
  'referrer' => wb_str(isset($in['_referrer']) ? $in['_referrer'] : '', 500), 'utm_json' => wb_encode($utm),
  'device' => $device, 'ua' => $ua, 'ip_hash' => wb_ip_hash($cfg['secret']), 'status' => 'new'
);
$saved = wb_insert($row);
if (!$saved) { wb_json(500, array('ok' => false, 'error' => '접수 내용을 저장하지 못했습니다. 입력하신 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.')); }
wb_json(200, array('ok' => true, 'id' => $saved['id'], 'receipt' => $saved['receipt'], 'duplicate' => $saved['duplicate'], 'title' => $done['title'], 'text' => $done['text'], 'redirect' => $done['redirect']));
