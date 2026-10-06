<?php
/* 통합웹빌더 운영 API — 공개 접수(방문예약) : 홈페이지 폼 → 이 API → 공용 DB(form_submissions) → 관리자 방문예약 관리에 즉시 표시
   검증 규칙은 lib/wb-core.js validateSubmission 과 동일 · 허니팟 · 최소 작성 시간 · IP 제한 · 같은 연락처 재접수 차단 · 1회용 토큰(연타 · 재시도 중복 저장 없음) */
if (!defined('WB_API')) { http_response_code(404); exit; }
function wb_on($v) { return !($v === null || $v === '' || $v === false || $v === 0 || $v === '0' || $v === 'false' || $v === 'N'); }
function wb_validate_submission($schema, $in) {
  $errors = array(); $data = array(); $name = ''; $phone = ''; $date = null; $time = ''; $settings = wb_arr($schema['settings']);
  foreach ($schema['fields'] as $f) {
    $f = wb_arr($f); if (empty($f['enabled'])) { continue; } $k = (string)$f['name']; $type = (string)$f['type']; $label = !empty($f['label']) ? $f['label'] : $k; $v = isset($f['validation']) ? wb_arr($f['validation']) : array(); $req = !empty($f['required']);
    if ($type === 'phone') {
      $raw = (isset($in[$k]) && is_string($in[$k]) && $in[$k] !== '') ? $in[$k] : (isset($in[$k . '_p1']) ? wb_str($in[$k . '_p1'], 4) . '-' . wb_str(isset($in[$k . '_p2']) ? $in[$k . '_p2'] : '', 4) . '-' . wb_str(isset($in[$k . '_p3']) ? $in[$k . '_p3'] : '', 4) : (wb_str(isset($in[$k . '1']) ? $in[$k . '1'] : '', 10) . '-' . wb_str(isset($in[$k . '2']) ? $in[$k . '2'] : '', 10)));
      $digits = preg_replace('/[^0-9]/', '', $raw);
      if ($digits === '' || $raw === '-' || $raw === '--') { if ($req) { $errors[$k] = $label . ' 항목은 필수입니다.'; } continue; }
      $prefix = preg_replace('/[^0-9]/', '', isset($settings['phonePrefix']) ? (string)$settings['phonePrefix'] : '010'); if ($prefix === '') { $prefix = '010'; }
      if (strpos($raw, '-') !== false && substr($digits, 0, 3) !== $prefix && strlen($digits) <= 8) { $digits = $prefix . $digits; }
      if (!preg_match('/^0\d{8,10}$/', $digits)) { $errors[$k] = $label . ' 형식이 올바르지 않습니다.'; continue; }
      $val = preg_replace('/^(\d{2,3})(\d{3,4})(\d{4})$/', '$1-$2-$3', $digits); $data[$k] = $val; $phone = $val; continue;
    }
    if ($type === 'checkbox') { $arr = !isset($in[$k]) ? array() : (is_array($in[$k]) ? $in[$k] : array($in[$k])); $clean = array(); foreach ($arr as $x) { $s = trim(wb_str($x, 200)); if ($s !== '') { $clean[] = $s; } } if ($req && !count($clean)) { $errors[$k] = $label . ' 항목을 선택해 주세요.'; continue; } if (!empty($f['options']) && is_array($f['options'])) { foreach ($clean as $x) { if (!in_array($x, $f['options'], true)) { $errors[$k] = $label . ' 값이 올바르지 않습니다.'; continue 2; } } } $data[$k] = $clean; continue; }
    if ($type === 'consent') { $on = isset($in[$k]) && wb_on($in[$k]); if ($req && !$on) { $errors[$k] = $label . ' 에 동의해 주세요.'; continue; } $data[$k] = $on ? 'Y' : 'N'; continue; }
    $s = isset($in[$k]) && !is_array($in[$k]) ? trim(wb_str($in[$k])) : ''; $s = wb_substr($s, $type === 'textarea' ? 3000 : 300);
    if ($s === '') { if ($req && $type !== 'hidden') { $errors[$k] = $label . ' 항목은 필수입니다.'; } else { $data[$k] = ''; } continue; }
    if ($type === 'email') { if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $s)) { $errors[$k] = $label . ' 형식이 올바르지 않습니다.'; } }
    elseif ($type === 'number') { if (!is_numeric($s)) { $errors[$k] = $label . ' 항목은 숫자만 입력할 수 있습니다.'; } elseif (isset($v['min']) && $v['min'] !== '' && (float)$s < (float)$v['min']) { $errors[$k] = $label . ' 값은 ' . $v['min'] . ' 이상이어야 합니다.'; } elseif (isset($v['max']) && $v['max'] !== '' && (float)$s > (float)$v['max']) { $errors[$k] = $label . ' 값은 ' . $v['max'] . ' 이하여야 합니다.'; } }
    elseif ($type === 'date') { $m = array(); if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) { $errors[$k] = $label . ' 형식이 올바르지 않습니다.'; } elseif (!empty($v['futureOnly']) && $s < wb_today()) { $errors[$k] = $label . ' 은(는) 오늘 이후 날짜만 선택할 수 있습니다.'; } else { $date = $s; } }
    elseif ($type === 'time') { $times = isset($settings['visitTimes']) && is_array($settings['visitTimes']) ? $settings['visitTimes'] : array(); if (count($times) && !in_array($s, $times, true)) { $errors[$k] = $label . ' 값이 올바르지 않습니다.'; } else { $time = $s; } }
    elseif ($type === 'select' || $type === 'radio') { if (!empty($f['options']) && is_array($f['options']) && !in_array($s, $f['options'], true)) { $errors[$k] = $label . ' 값이 올바르지 않습니다.'; } }
    else { if (!empty($v['minLength']) && wb_strlen($s) < (int)$v['minLength']) { $errors[$k] = $label . ' 항목은 ' . (int)$v['minLength'] . '자 이상 입력해 주세요.'; } elseif (!empty($v['maxLength']) && wb_strlen($s) > (int)$v['maxLength']) { $errors[$k] = $label . ' 항목은 ' . (int)$v['maxLength'] . '자 이하로 입력해 주세요.'; } elseif (!empty($v['pattern'])) { $ok = @preg_match('/' . str_replace('/', '\/', $v['pattern']) . '/u', $s); if ($ok === 0) { $errors[$k] = $label . ' 형식이 올바르지 않습니다.'; } } }
    if (isset($errors[$k])) { continue; } $data[$k] = $s; if ($type === 'name' || ($k === 'name' && $name === '')) { $name = $s; }
  }
  foreach ((array)(isset($settings['agreements']) ? $settings['agreements'] : array()) as $a) { $a = wb_arr($a); if ((isset($a['enabled']) && $a['enabled'] === false) || empty($a['name'])) { continue; } $on = isset($in[$a['name']]) && wb_on($in[$a['name']]); if (!empty($a['required']) && !$on) { $errors[$a['name']] = '필수 동의 항목에 체크해 주세요.'; } $data[$a['name']] = $on ? 'Y' : 'N'; }
  foreach ($schema['fields'] as $f) { $f = wb_arr($f); if (isset($errors[$f['name']]) && !empty($f['validation']['errorMessage'])) { $errors[$f['name']] = (string)$f['validation']['errorMessage']; } }
  return array('ok' => !count($errors), 'errors' => $errors, 'data' => $data, 'name' => $name, 'phone' => $phone, 'date' => $date, 'time' => $time);
}
function wb_public_site($c, $key) {
  $key = (string)$key;
  $s = wb_get("SELECT * FROM sites WHERE `key` = ? AND status = 'active'", array($key));
  /* 설치가 끝나기 전에 예약부터 들어온 경우 : 요청 도메인으로 기본 현장을 하나 만들어 예약을 잃지 않게 합니다. (현장 이름은 관리자에서 바꾸면 됩니다) */
  if (!$s) {
    $uid = wb_int(wb_val("SELECT id FROM users WHERE role = 'super' AND status = 'active' ORDER BY id LIMIT 1"));
    $now = wb_now(); $public = rtrim((string)$c['baseUrl'], '/');
    $host = wb_host_of($public); $autoKey = wb_keyify($key !== '' ? $key : preg_replace('/[^a-z0-9]/', '', wb_lower((string)$host)));
    if ($autoKey === '' || strlen($autoKey) < 2) { $autoKey = 'site'; }
    if (!wb_get('SELECT id FROM sites WHERE `key` = ?', array($autoKey))) {
      $autoName = $host !== '' ? (string)$host : '기본 현장';
      $id = wb_insert('sites', array('key' => $autoKey, 'name' => $autoName, 'field_name' => $autoName, 'domain' => $host, 'public_url' => $public, 'preview_url' => '', 'export_path' => '', 'status' => 'active', 'tel' => '', 'contact_name' => '', 'created_by' => $uid ? $uid : null, 'created_at' => $now, 'updated_at' => $now));
      try { wb_seed($id, wb_load_template('template'), $uid ? $uid : null, array('site' => array('name' => $autoName, 'url' => $public))); } catch (Exception $e) {}
      $s = wb_get('SELECT * FROM sites WHERE id = ?', array($id));
    }
  }
  if (!$s) { throw new WbHttpError(404, '사이트를 찾을 수 없습니다.'); }
  if (!wb_rate('pub:' . $c['ipHash'], 120, 60)) { throw new WbHttpError(429, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'); }
  return $s;
}
function wb_submit_handler($c, $s, $formKey) {
  $in = $c['body']; $origin = isset($c['headers']['origin']) ? $c['headers']['origin'] : (isset($c['headers']['referer']) ? $c['headers']['referer'] : '');
  if (!empty($in['site_key']) && $in['site_key'] !== $s['key']) { throw new WbHttpError(403, '사이트 정보가 일치하지 않습니다.'); } if (!empty($in['site_id']) && wb_int($in['site_id']) !== (int)$s['id']) { throw new WbHttpError(403, '사이트 정보가 일치하지 않습니다.'); }
  $host = wb_host_of($origin);
  if ($host !== '') { $ok = false; foreach (array($s['public_url'], $s['preview_url']) as $u) { if ($u && wb_host_of($u) === $host) { $ok = true; } } if (strtolower($host) === strtolower($c['host']) || preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $host) || !empty($c['config']['allow_any_origin'])) { $ok = true; } if (!$ok) { throw new WbHttpError(403, '등록되지 않은 도메인에서의 요청입니다. (' . $host . ')'); } }
  $form = wb_get("SELECT * FROM forms WHERE site_id = ? AND `key` = ? AND status = 'published'", array((int)$s['id'], $formKey));
  /* 운영 중 홈페이지 파일을 교체하거나 예전 DB를 이어 쓰는 과정에서 방문예약 폼 행이 빠진 경우가 있을 수 있습니다.
     공개 방문예약(reserve)에 한해서만 사이트 템플릿의 예약 스키마로 안전하게 복구합니다.
     사이트/관리자/기존 접수 데이터는 건드리지 않고 forms + form_fields 만 만듭니다. */
  if (!$form && $formKey === 'reserve') {
    try {
      $d = wb_load_template(!empty($s['template']) ? $s['template'] : 'template');
      $r = isset($d->reserve) && is_object($d->reserve) ? $d->reserve : new stdClass();
      $vt = wb_prop($r, 'visitTimes');
      $vt = is_array($vt) && count($vt) ? $vt : wb_visit_times();
      $now = wb_now();
      $formId = wb_insert('forms', array(
        'site_id' => (int)$s['id'], 'key' => 'reserve', 'name' => '방문예약',
        'settings_json' => wb_enc(array(
          'submitLabel' => wb_prop($r, 'submitLabel', '방문예약 신청'),
          'doneTitle' => wb_prop($r, 'doneTitle', '방문예약이 정상적으로 접수되었습니다.'),
          'doneText' => wb_prop($r, 'doneText', '담당자가 확인 후 안내 연락을 드리겠습니다.'),
          'successRedirect' => '', 'phonePrefix' => wb_prop($r, 'phonePrefix', '010'),
          'visitTimes' => $vt, 'agreements' => wb_prop($r, 'agreements', array()),
          'button' => array('color'=>'','background'=>'','radius'=>0,'width'=>'full'),
          'spam' => array('honeypot'=>true,'minSeconds'=>3,'duplicateMinutes'=>10),
          'notifyEmail' => '', 'retentionDays' => 365
        )),
        'status' => 'published', 'version' => 1, 'updated_by' => null,
        'created_at' => $now, 'updated_at' => $now
      ));
      $sort = 0;
      foreach ((array)wb_prop($r, 'fields', array()) as $f) {
        $type = wb_str(wb_prop($f, 'type', 'text'));
        $name = wb_str(wb_prop($f, 'name'));
        if ($name === '') { continue; }
        wb_insert('form_fields', array(
          'form_id' => $formId, 'key' => $name,
          'type' => ($type === 'text' && $name === 'name') ? 'name' : $type,
          'label' => wb_str(wb_prop($f, 'label'), 120), 'description' => '',
          'placeholder' => wb_str(wb_prop($f, 'placeholder'), 160),
          'required' => wb_prop($f, 'required') ? 1 : 0,
          'width' => (wb_prop($f, 'full') || $type === 'textarea') ? 'full' : 'half',
          'options_json' => wb_enc(wb_prop($f, 'options', array())),
          'validation_json' => '{}', 'default_value' => '', 'sort' => $sort++,
          'enabled' => wb_prop($f, 'enabled') === false ? 0 : 1
        ));
      }
      $form = wb_get("SELECT * FROM forms WHERE id = ?", array((int)$formId));
    } catch (Exception $e) {
      wb_log_error('reserve form auto-repair: ' . $e->getMessage());
    }
  }
  if (!$form) { throw new WbHttpError(404, '폼을 찾을 수 없습니다.'); }
  $schema = wb_form_schema((int)$form['id']); $settings = wb_arr($schema['settings']); $spam = isset($settings['spam']) ? wb_arr($settings['spam']) : array();
  $doneMsg = array('title' => !empty($settings['doneTitle']) ? $settings['doneTitle'] : '접수되었습니다', 'text' => isset($settings['doneText']) ? $settings['doneText'] : '', 'redirect' => isset($settings['successRedirect']) ? $settings['successRedirect'] : '');
  $token = preg_replace('/[^a-zA-Z0-9_-]/', '', wb_str(isset($in['_token']) ? $in['_token'] : '', 80));
  $sameToken = function () use ($token, $s) { return $token !== '' ? wb_get('SELECT id, receipt_no FROM form_submissions WHERE site_id = ? AND client_token = ?', array((int)$s['id'], $token)) : null; };
  $first = $sameToken(); if ($first) { return array_merge(array('id' => (int)$first['id'], 'receipt' => (string)$first['receipt_no'], 'duplicate' => true), $doneMsg); }
  if (!wb_rate('submit:' . $c['ipHash'], 6, 60)) { throw new WbHttpError(429, '요청이 많아 접수가 지연되고 있습니다. 잠시 후 다시 신청해 주세요.'); }
  if ((!isset($spam['honeypot']) || $spam['honeypot'] !== false) && trim(wb_str(isset($in['website']) ? $in['website'] : (isset($in['_hp']) ? $in['_hp'] : ''))) !== '') { return array_merge(array('id' => 0, 'receipt' => ''), $doneMsg); }
  $started = wb_int(isset($in['_ts']) ? $in['_ts'] : 0); if (!empty($spam['minSeconds']) && $started > 0 && (time() - $started) < (int)$spam['minSeconds']) { throw new WbHttpError(422, '입력 시간이 너무 짧습니다. 다시 시도해 주세요.'); }
  $v = wb_validate_submission($schema, $in); if (!$v['ok']) { $first = reset($v['errors']); throw new WbHttpError(422, $first ? $first : '입력값을 확인해 주세요.', array('errors' => $v['errors'])); }
  $dupMin = isset($spam['duplicateMinutes']) ? (int)$spam['duplicateMinutes'] : 10;
  if ($dupMin > 0 && $v['phone'] !== '' && wb_get('SELECT id FROM form_submissions WHERE form_id = ? AND phone = ? AND created_at > ?', array((int)$form['id'], $v['phone'], wb_now(time() - $dupMin * 60)))) { throw new WbHttpError(409, '같은 연락처로 방금 접수된 예약이 있습니다. 내용을 바꾸시려면 ' . (!empty($s['tel']) ? '대표번호 ' . $s['tel'] . ' 로' : '전화로') . ' 문의해 주세요.'); }
  $utm = array(); foreach (array('utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content') as $k) { $val = (isset($in['_utm']) && is_array($in['_utm']) && !empty($in['_utm'][$k])) ? $in['_utm'][$k] : (isset($in[$k]) ? $in[$k] : ''); $val = wb_str($val, 100); if ($val !== '') { $utm[$k] = $val; } }
  $retention = isset($settings['retentionDays']) ? (int)$settings['retentionDays'] : 365; $ua = $c['ua']; $device = preg_match('/iPad|Tablet/i', $ua) ? 'tablet' : (preg_match('/Mobi|Android|iPhone/i', $ua) ? 'mobile' : 'pc');
  $snapshot = array(); foreach ($schema['fields'] as $f) { $f = wb_arr($f); if (!empty($f['enabled'])) { $snapshot[] = array('name' => $f['name'], 'label' => $f['label'], 'type' => $f['type']); } } foreach ((array)(isset($settings['agreements']) ? $settings['agreements'] : array()) as $a) { $a = wb_arr($a); if (!empty($a['name'])) { $snapshot[] = array('name' => $a['name'], 'label' => isset($a['label']) ? $a['label'] : '', 'type' => 'consent'); } }
  $agreeNames = array(); foreach ((array)(isset($settings['agreements']) ? $settings['agreements'] : array()) as $a) { $a = wb_arr($a); if (!(isset($a['enabled']) && $a['enabled'] === false) && !empty($a['name'])) { $agreeNames[] = $a['name']; } } foreach ($schema['fields'] as $f) { $f = wb_arr($f); if (!empty($f['enabled']) && $f['type'] === 'consent') { $agreeNames[] = $f['name']; } }
  $consent = ''; if (count($agreeNames)) { $consent = 'N'; foreach ($agreeNames as $an) { if (isset($v['data'][$an]) && $v['data'][$an] === 'Y') { $consent = 'Y'; } } }
  try {
    $id = wb_insert('form_submissions', array('site_id' => (int)$s['id'], 'advertiser_id' => !empty($s['advertiser_id']) ? (int)$s['advertiser_id'] : null, 'site_key' => $s['key'], 'site_name' => $s['name'], 'client_token' => $token !== '' ? $token : null, 'consent' => $consent, 'landing_path' => wb_str(isset($in['_landing']) ? $in['_landing'] : '', 190), 'form_id' => (int)$form['id'], 'data_json' => wb_enc(count($v['data']) ? $v['data'] : new stdClass()), 'name' => wb_str($v['name'], 80), 'phone' => $v['phone'], 'visit_date' => $v['date'], 'visit_time' => wb_str($v['time'], 20), 'status' => 'new', 'memo' => null, 'device' => $device, 'form_version' => (int)$form['version'], 'fields_json' => wb_enc($snapshot), 'ip_hash' => $c['ipHash'], 'ua' => wb_str($ua, 190), 'referrer' => wb_str(isset($in['_referrer']) ? $in['_referrer'] : (isset($c['headers']['referer']) ? $c['headers']['referer'] : ''), 500), 'utm_json' => count($utm) ? wb_enc($utm) : null, 'page_path' => wb_str(isset($in['_page']) ? $in['_page'] : '', 190), 'retention_until' => null,   /* 자동 파기 없음 : 예약은 계속 보관 (관리자가 직접 삭제할 때만 지워집니다) */ 'channel' => 'direct', 'created_at' => wb_now(), 'updated_at' => wb_now()));
  } catch (Exception $e) { $again = $sameToken(); if ($again) { return array_merge(array('id' => (int)$again['id'], 'receipt' => (string)$again['receipt_no'], 'duplicate' => true), $doneMsg); } wb_log_error('submit insert: ' . $e->getMessage()); throw new WbHttpError(500, '접수 내용을 저장하지 못했습니다. 입력하신 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.'); }
  $receipt = 'R' . substr(str_replace('-', '', wb_today()), 2) . '-' . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
  wb_update('form_submissions', array('receipt_no' => $receipt), 'id = ?', array($id));
  /* 저장이 끝난 새 예약에만 문자 알림 (같은 예약 재전송 · 중복 제출은 위에서 이미 반환) — 발송 실패는 예약 접수에 영향 없음 */
  if (function_exists('wb_sms_notify_reservation')) { try { wb_sms_notify_reservation($c, (int)$s['id'], $id); } catch (Throwable $e) { wb_log_error('sms: ' . $e->getMessage()); } }
  /* Google Sheets : 문자와 따로 · 고객 응답을 보낸 뒤 동기화 (실패해도 예약 · 문자에 영향 없음 · 기록만 실패) */
  if (function_exists('wb_gs_queue_reservation')) { try { wb_gs_queue_reservation($c, (int)$s['id'], $id); } catch (Throwable $e) { wb_log_error('gsheets queue: ' . $e->getMessage()); } }
  return array_merge(array('id' => $id, 'receipt' => $receipt), $doneMsg);
}
