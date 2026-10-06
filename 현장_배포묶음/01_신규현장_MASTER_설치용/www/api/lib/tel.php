<?php
/* 대표번호 일괄 변경 — 홈페이지 고객 안내용 대표번호만 한 번에 바꿉니다.
   대상 : 사이트 기본 정보(대표번호) · 푸터 대표번호 · 퀵메뉴 전화 · 페이지 안의 "전화번호 항목"(키 이름이 tel/phone/전화 이거나 tel: 링크)
   제외 : 방문예약 고객 연락처(form_submissions) · 관리자 계정 휴대폰 · 문자 발신번호(Solapi) — 절대 건드리지 않습니다.
   흐름 : [미리보기(scan)] 로 몇 곳이 바뀌는지 먼저 알려 주고, [적용] 은 초안에만 저장합니다. 공개 홈페이지는 [게시하기] 후 반영됩니다. */
if (!defined('WB_API')) { http_response_code(404); exit; }

function wb_tel_digits($v) { return preg_replace('/[^0-9]/', '', (string)$v); }
function wb_tel_is_key($k) { return (bool)preg_match('/(^|[^a-z])(tel|phone|hotline|call)([^a-z]|$)|전화|대표번호|연락처/i', (string)$k); }

/* 값 하나를 바꿔야 하는지 : 키가 전화번호 항목이거나 tel: 링크이고, 지금 번호와 같은 번호일 때만 */
function wb_tel_hit($key, $val, $oldDigits) {
  if (!is_string($val) || $val === '') { return false; }
  $isTelLink = stripos($val, 'tel:') === 0;
  if (!$isTelLink && !wb_tel_is_key($key)) { return false; }
  $d = wb_tel_digits($val);
  if ($d === '') { return false; }
  if ($oldDigits !== '' && $d !== $oldDigits) { return false; }        /* 지금 대표번호와 같은 번호만 */
  if ($oldDigits === '' && strlen($d) < 8) { return false; }
  return true;
}
function wb_tel_new_val($val, $newTel) {
  if (stripos($val, 'tel:') === 0) { return 'tel:' . wb_tel_digits($newTel); }
  return $newTel;
}
/* 배열 · 객체를 돌며 전화번호 항목을 바꿉니다 (바뀐 개수를 돌려줌) */
function wb_tel_walk(&$node, $oldDigits, $newTel, &$hits, $path = '') {
  $n = 0;
  if (is_array($node)) {
    foreach ($node as $k => $v) {
      $p = $path === '' ? (string)$k : $path . '.' . $k;
      if (is_string($v)) {
        if (wb_tel_hit((string)$k, $v, $oldDigits)) { $nv = wb_tel_new_val($v, $newTel); if ($nv !== $v) { $node[$k] = $nv; $hits[] = $p; $n++; } }
      } elseif (is_array($v) || is_object($v)) { $child = $v; $n += wb_tel_walk($child, $oldDigits, $newTel, $hits, $p); $node[$k] = $child; }
    }
    return $n;
  }
  if (is_object($node)) {
    foreach (get_object_vars($node) as $k => $v) {
      $p = $path === '' ? (string)$k : $path . '.' . $k;
      if (is_string($v)) {
        if (wb_tel_hit((string)$k, $v, $oldDigits)) { $nv = wb_tel_new_val($v, $newTel); if ($nv !== $v) { $node->$k = $nv; $hits[] = $p; $n++; } }
      } elseif (is_array($v) || is_object($v)) { $child = $v; $n += wb_tel_walk($child, $oldDigits, $newTel, $hits, $p); $node->$k = $child; }
    }
  }
  return $n;
}

function wb_tel_current($siteId) {
  $s = wb_get('SELECT tel FROM sites WHERE id = ?', array((int)$siteId));
  $cur = $s && $s['tel'] !== null ? (string)$s['tel'] : '';
  $set = wb_arr(wb_get_setting((int)$siteId, 'site'));
  if (isset($set['site']) && is_array($set['site']) && !empty($set['site']['tel'])) { $cur = (string)$set['site']['tel']; }
  return $cur;
}

/* $apply = false → 미리보기(어디가 바뀌는지) · true → 초안에 저장 */
function wb_tel_bulk($c, $siteId, $newTel, $areas, $apply, $fromTel = null) {   /* $fromTel : 지금 번호 대신 바꿀 기준 번호 (빈 문자열이면 전화번호 항목 전부) */
  $siteId = (int)$siteId; $newTel = trim((string)$newTel);
  if ($newTel === '' || strlen(wb_tel_digits($newTel)) < 8) { throw new WbHttpError(422, '새 대표번호를 8자리 이상 입력해 주세요. (예 1666-1234)'); }
  $cur = $fromTel === null ? wb_tel_current($siteId) : (string)$fromTel; $oldDigits = wb_tel_digits($cur);
  $want = function ($k) use ($areas) { return !is_array($areas) || !count($areas) || in_array($k, $areas, true); };
  $out = array('ok' => true, 'from' => $cur, 'to' => $newTel, 'apply' => (bool)$apply, 'areas' => array(), 'total' => 0, 'pages' => array());
  $userId = isset($c['user']['id']) ? (int)$c['user']['id'] : null;

  /* 1) 사이트 기본 정보 (헤더 · 모바일 헤더 · 소메뉴 전화가 함께 씁니다) */
  if ($want('site')) {
    $set = wb_arr(wb_get_setting($siteId, 'site'));
    $siteBag = isset($set['site']) && is_array($set['site']) ? $set['site'] : array();
    $before = isset($siteBag['tel']) ? (string)$siteBag['tel'] : '';
    if ($before !== $newTel) {
      $out['areas'][] = array('key' => 'site', 'label' => '사이트 기본 정보 · 헤더 대표번호', 'count' => 1, 'from' => $before !== '' ? $before : $cur);
      $out['total']++;
      if ($apply) {
        $siteBag['tel'] = $newTel; $set['site'] = $siteBag;
        wb_put_setting($siteId, 'site', $set, $userId);
        wb_update('sites', array('tel' => $newTel), 'id = ?', array($siteId));
      }
    }
  }
  /* 2) 푸터 · 3) 퀵메뉴 · 4) 그 밖의 공통 설정 */
  $groups = array('footer' => array('key' => 'footer', 'label' => '푸터'), 'quick' => array('key' => 'quick', 'label' => '퀵메뉴'), 'misc' => array('key' => 'misc', 'label' => '공통 안내 · 버튼'), 'popupOptions' => array('key' => 'popup', 'label' => '공통 팝업'));
  foreach ($groups as $group => $meta) {
    if (!$want($meta['key'])) { continue; }
    $data = wb_arr(wb_get_setting($siteId, $group));
    if (!count($data)) { continue; }
    $hits = array(); $copy = $data;
    $n = wb_tel_walk($copy, $oldDigits, $newTel, $hits);
    if ($n > 0) {
      $out['areas'][] = array('key' => $meta['key'], 'label' => $meta['label'], 'count' => $n, 'where' => $hits);
      $out['total'] += $n;
      if ($apply) { wb_put_setting($siteId, $group, $copy, $userId); }
    }
  }
  /* 5) 페이지 안의 전화번호 항목 (초안에만 저장 · 게시 전까지 공개 홈페이지는 그대로) */
  if ($want('pages')) {
    foreach (wb_all('SELECT * FROM pages WHERE site_id = ? AND deleted_at IS NULL ORDER BY sort, id', array($siteId)) as $p) {
      $v = wb_draft_version($p, $apply ? true : false);
      if (!$v) { continue; }
      $content = wb_json_safe($v['content_json'], null);
      if (!is_object($content) && !is_array($content)) { continue; }
      /* 이 페이지만 다른 번호를 쓰도록 켜 두었으면 건너뜁니다 (페이지 설정 → 공통 대표번호 사용 끄기) */
      $common = is_object($content) && isset($content->common) ? $content->common : null;
      if (is_object($common) && !empty($common->telOverride)) { continue; }
      $hits = array(); $copy = $content;
      $n = wb_tel_walk($copy, $oldDigits, $newTel, $hits);
      if ($n > 0) {
        $out['pages'][] = array('id' => (int)$p['id'], 'title' => (string)$p['title'], 'count' => $n, 'where' => $hits);
        $out['total'] += $n;
        if ($apply) { wb_update('page_versions', array('content_json' => wb_enc($copy)), 'id = ?', array((int)$v['id'])); }
      }
    }
    if (count($out['pages'])) {
      $cnt = 0; foreach ($out['pages'] as $pg) { $cnt += (int)$pg['count']; }
      $out['areas'][] = array('key' => 'pages', 'label' => '페이지 안 전화번호 항목', 'count' => $cnt);
    }
  }
  if ($apply) {
    wb_log($c, $siteId, 'site.tel', 'site', $siteId, '대표번호 일괄 변경 ' . ($cur !== '' ? $cur : '(없음)') . ' → ' . $newTel . ' · ' . $out['total'] . '곳');
  }
  return $out;
}

wb_route('POST', '/sites/:id/tel/scan', function ($c, $p) {
  $s = wb_site_of($c, $p['id'], 'manage');
  return wb_tel_bulk($c, (int)$s['id'], wb_b($c, 'tel'), wb_b($c, 'areas'), false);
});
wb_route('POST', '/sites/:id/tel/apply', function ($c, $p) {
  $s = wb_site_of($c, $p['id'], 'manage');
  return wb_tel_bulk($c, (int)$s['id'], wb_b($c, 'tel'), wb_b($c, 'areas'), true);
});
