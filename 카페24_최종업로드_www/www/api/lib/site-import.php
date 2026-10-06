<?php
/* 공개 홈페이지 → 관리자 DB 가져오기 (페이지가 비어 있는 사이트를 에디터에서 바로 편집할 수 있게)
   · 출처 1 : 이 서버에서 공개 중인 index.html 안의 window.CMS_PUBLISHED (지금 실제 홈페이지 내용 그대로)
   · 출처 2 : 공개 파일이 없거나 다른 사이트 파일이면 사이트 템플릿(api/seeds/{template}.json)
   · 원칙 : 공개 index.html 은 읽기만 함(다시 만들거나 덮어쓰지 않음) · 이미 있는 페이지 · 팝업 · SEO · 폼 · 메뉴는 그대로 두고 없는 것만 추가
            사이트 설정은 "페이지가 하나도 없던 첫 가져오기"에서만 공개 홈페이지 값으로 맞춤(이전 값은 data/backups 에 보관)
   · index.php 가 따로(try) 불러옴 — 이 파일에 문제가 있어도 예약 접수 · 문자 · 관리자는 그대로 동작 */
if (!defined('WB_API')) { http_response_code(404); exit; }

/* index.html 에서 window.CMS_PUBLISHED = {...} JSON 만 꺼냄 (문자열 안의 괄호는 무시) */
function wb_import_read_published_html($html) {
  $html = (string)$html; $p = strpos($html, 'window.CMS_PUBLISHED'); if ($p === false) { return null; }
  $i = strpos($html, '{', $p); if ($i === false) { return null; }
  $len = strlen($html); $depth = 0; $inStr = false; $end = -1;
  for ($k = $i; $k < $len; $k++) {
    $ch = $html[$k];
    if ($inStr) { if ($ch === '\\') { $k++; continue; } if ($ch === '"') { $inStr = false; } continue; }
    if ($ch === '"') { $inStr = true; continue; }
    if ($ch === '{') { $depth++; } elseif ($ch === '}') { $depth--; if ($depth === 0) { $end = $k; break; } }
  }
  if ($end < 0) { return null; }
  $j = json_decode(substr($html, $i, $end - $i + 1));
  return is_object($j) ? $j : null;
}
/* 홈페이지 디자인과 한 벌로 올라오는 화면 데이터 파일 */
function wb_import_source_name($src, $file) { if ($src === 'published') { return '공개 홈페이지 ' . $file; } if ($src === 'design') { return '홈페이지 디자인 묶음'; } return '사이트 템플릿'; }
function wb_prop2($a, $k) { return is_array($a) && isset($a[$k]) ? $a[$k] : 0; }
function wb_import_design_file() { $f = WB_WEB_ROOT . '/admin/tpl/design-data.json'; return is_file($f) ? $f : ''; }
/* 이 사이트의 공개 게시 데이터 (사이트 식별값이 다르면 쓰지 않음 — 다른 사이트 데이터가 섞이지 않게) */
function wb_import_source($c, $s) {
  $f = function_exists('wb_published_html_path') ? wb_published_html_path($c, $s) : ''; $why = '';
  if ($f !== '' && is_file($f)) {
    $pub = wb_import_read_published_html((string)@file_get_contents($f));
    if ($pub && isset($pub->pages) && (is_object($pub->pages) || is_array($pub->pages))) {
      $sk = isset($pub->cms->siteKey) ? (string)$pub->cms->siteKey : '';
      if ($sk === '' || $sk === (string)$s['key']) { return array('data' => $pub, 'source' => 'published', 'file' => basename($f)); }
      $why = '공개 index.html 이 다른 사이트(' . $sk . ')의 파일이라 사용하지 않았습니다.';
    } else { $why = '공개 index.html 에서 게시 데이터를 찾지 못했습니다.'; }
  }
  /* 홈페이지 디자인 묶음이 같이 들고 온 화면 데이터 (admin/tpl/design-data.json) — 새 현장에서 디자인 www 만 올려도 화면 구성을 가져올 수 있게 */
  $dd = wb_import_design_file();
  if ($dd !== '') {
    $j = json_decode((string)@file_get_contents($dd));
    if (is_object($j) && isset($j->pages) && (is_object($j->pages) || is_array($j->pages))) { return array('data' => $j, 'source' => 'design', 'file' => 'design-data.json', 'note' => $why); }
  }
  $tpl = wb_load_template(!empty($s['template']) ? $s['template'] : 'template');
  return array('data' => $tpl, 'source' => 'template', 'file' => '', 'note' => $why);
}
function wb_import_obj($v) { return json_decode(json_encode($v)); }

/* 가져오기 본체 */
/* 내용이 비어 있는 페이지인가 (메인 : 섹션 없음 · 서브 : page 내용 없음) */
function wb_import_page_empty($row) {
  if (!$row) { return false; }
  $v = wb_get('SELECT content_json FROM page_versions WHERE id = ?', array((int)($row['draft_version_id'] ? $row['draft_version_id'] : $row['published_version_id'])));
  if (!$v) { return true; }
  $j = wb_json_safe($v['content_json'], null); if (!is_object($j)) { return true; }
  $secs = isset($j->sections) && is_array($j->sections) ? $j->sections : array();
  if ((string)$row['type'] === 'main') { return count($secs) === 0; }
  $page = isset($j->page) ? $j->page : null;
  $pageEmpty = !is_object($page) || count(get_object_vars($page)) === 0;
  return $pageEmpty && count($secs) === 0;
}
/* 이미 있는 페이지의 내용을 공개 홈페이지 내용으로 채움 (초안 · 게시본 모두 새 내용으로) */
function wb_import_page_fill($row, $content, $title, $userId) {
  if (!$row || empty($row['id'])) { return 0; }   /* 행이 없으면 아무것도 하지 않음 (예전에 여기서 오류가 났습니다) */
  $n = wb_now(); $pageId = (int)$row['id'];
  $no = wb_int(wb_val('SELECT COALESCE(MAX(version_no), 0) + 1 FROM page_versions WHERE page_id = ?', array($pageId)), 1);
  $vid = wb_insert('page_versions', array('page_id' => $pageId, 'version_no' => $no, 'status' => 'published', 'content_json' => wb_enc($content), 'note' => '공개 홈페이지에서 가져오기', 'created_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'published_at' => $n));
  $d = array('draft_version_id' => $vid, 'published_version_id' => $vid, 'updated_at' => $n);
  if ($title !== '' && (string)$row['title'] === '') { $d['title'] = $title; }
  wb_update('pages', $d, 'id = ?', array($pageId));
  return $vid;
}
/* 공개 홈페이지에 이미 들어 있는 페이지인데 게시 기록만 없는 경우 : 지금 내용을 게시본으로 기록 (내용은 그대로 · 배지만 바로잡음) */
function wb_import_mark_published($row) {
  if (!$row) { return false; }
  $dv = (int)(isset($row['draft_version_id']) ? $row['draft_version_id'] : 0);
  $pv = (int)(isset($row['published_version_id']) ? $row['published_version_id'] : 0);
  if (!$dv || $pv === $dv) { return false; }
  if ($pv) { return false; }   /* 예전 게시본이 따로 있으면 그대로 둠 (사용자가 고친 내용일 수 있음) */
  $n = wb_now();
  wb_update('page_versions', array('status' => 'published', 'published_at' => $n), 'id = ? AND status <> ?', array($dv, 'published'));
  wb_update('pages', array('published_version_id' => $dv, 'updated_at' => $n), 'id = ?', array((int)$row['id']));   /* pages 표에는 published_at 컬럼이 없습니다 */
  return true;
}
function wb_import_site($c, $s, $userId, $force = false) {
  $siteId = (int)$s['id']; $src = wb_import_source($c, $s); $d = $src['data']; $n = wb_now();
  $report = array('filled' => array(), 'marked' => array(), 'source' => $src['source'], 'file' => $src['file'], 'note' => isset($src['note']) ? $src['note'] : '', 'pages' => 0, 'settings' => 0, 'menus' => 0, 'popups' => 0, 'seo' => 0, 'forms' => 0, 'skipped' => array());
  $had = wb_int(wb_val('SELECT COUNT(*) FROM pages WHERE site_id = ? AND deleted_at IS NULL', array($siteId)));
  $rows = array(); $mainRow = null; foreach (wb_all('SELECT * FROM pages WHERE site_id = ? AND deleted_at IS NULL', array($siteId)) as $r0) { $rows[(string)$r0['key']] = $r0; if ((string)$r0['type'] === 'main') { $mainRow = $r0; } }
  /* 메인 페이지 행을 못 찾는 경우 대비 : key 가 main 이거나, 지운 표시가 된 메인도 찾아 되살립니다 (이 행을 놓치면 메인이 계속 비어 있게 됩니다) */
  if (!$mainRow) {
    $mainRow = wb_get("SELECT * FROM pages WHERE site_id = ? AND (type = 'main' OR `key` = 'main') ORDER BY (deleted_at IS NULL) DESC, id ASC LIMIT 1", array($siteId));
    if ($mainRow) {
      $fix = array('type' => 'main', 'deleted_at' => null);
      if ((string)$mainRow['key'] === '') { $fix['key'] = 'main'; }
      wb_update('pages', $fix, 'id = ?', array((int)$mainRow['id']));
      $mainRow = wb_get('SELECT * FROM pages WHERE id = ?', array((int)$mainRow['id']));
      $rows[(string)$mainRow['key']] = $mainRow;
    }
  }
  $exists = array(); foreach (wb_all('SELECT `key`, type FROM pages WHERE site_id = ?', array($siteId)) as $r) { $exists[(string)$r['key']] = true; if ($r['type'] === 'main') { $exists['__main'] = true; } }
  $fromPub = $src['source'] === 'published';
  /* 1) 사이트 설정 : 첫 가져오기 + 공개 데이터일 때만 공개 값으로 (이전 값 보관) */
  if ($had === 0 && $fromPub) {
    $old = wb_all('SELECT group_key, data_json, updated_at FROM settings WHERE site_id = ?', array($siteId));
    if (count($old)) { $dir = WB_DATA_DIR . '/backups'; if (!is_dir($dir)) { @mkdir($dir, 0755, true); } @file_put_contents($dir . '/import-' . preg_replace('/[^a-z0-9_\-]/', '', $s['key']) . '-' . date('Ymd-His') . '-settings.php', "<?php exit; ?>\n" . json_encode($old, JSON_UNESCAPED_UNICODE), LOCK_EX); }
    foreach (wb_setting_groups() as $group => $keys) { $bag = new stdClass(); $any = false; foreach ($keys as $k) { if (isset($d->$k)) { $bag->$k = wb_import_obj($d->$k); $any = true; } } if ($any) { wb_put_setting($siteId, $group, $bag, $userId); $report['settings']++; } }
    if (isset($d->analytics) && is_object($d->analytics)) { wb_put_setting($siteId, 'analytics', wb_import_obj($d->analytics), $userId); }
    if (isset($d->headerSettings) && is_object($d->headerSettings)) { wb_put_setting($siteId, 'header', wb_import_obj($d->headerSettings), $userId); }
    if (isset($d->privacySettings->retentionDays) && $d->privacySettings->retentionDays) { wb_put_setting($siteId, 'privacy', array('submissionRetentionDays' => (int)$d->privacySettings->retentionDays), $userId); }
  }
  /* 2) 메뉴 : 없을 때만 */
  if (!wb_get("SELECT id FROM menus WHERE site_id = ? AND `key` = 'main'", array($siteId)) && isset($d->menu)) {
    $menuId = wb_insert('menus', array('site_id' => $siteId, 'key' => 'main', 'name' => '메인 메뉴', 'updated_at' => $n)); $sort = 0;
    foreach ((array)$d->menu as $g) { $pid = wb_insert('menu_items', array('menu_id' => $menuId, 'parent_id' => null, 'label' => wb_str(wb_prop($g, 'label'), 190), 'latin' => wb_str(wb_prop($g, 'latin'), 190), 'link_type' => 'group', 'page_key' => wb_str(wb_prop($g, 'id'), 190), 'url' => '', 'target' => '_self', 'sort' => $sort++, 'enabled' => wb_prop($g, 'enabled') === false ? 0 : 1)); $cs = 0; foreach ((array)wb_prop($g, 'items', array()) as $it) { wb_insert('menu_items', array('menu_id' => $menuId, 'parent_id' => $pid, 'label' => wb_str(wb_prop($it, 'label'), 190), 'latin' => '', 'link_type' => wb_prop($it, 'url') ? 'url' : 'page', 'page_key' => wb_str(wb_prop($it, 'page'), 190), 'url' => wb_str(wb_prop($it, 'url'), 500), 'target' => wb_str(wb_prop($it, 'target', '_self'), 20), 'sort' => $cs++, 'enabled' => wb_prop($it, 'enabled') === false ? 0 : 1)); } $report['menus']++; }
  }
  /* 3) 메인 페이지 : 섹션 목록 + 섹션별 데이터(wb_section_keys) + 블록 · 속성 */
  $blocks = isset($d->blocks) && is_object($d->blocks) ? $d->blocks : new stdClass(); $attrs = isset($d->attrs) && is_object($d->attrs) ? $d->attrs : new stdClass(); $common = isset($d->pageCommon) && is_object($d->pageCommon) ? $d->pageCommon : new stdClass();
  $blockSecs = function ($key) use ($blocks) { $out = array(); foreach ((array)(isset($blocks->$key) ? $blocks->$key : array()) as $b) { $out[] = array('uid' => wb_str(wb_prop($b, 'uid'), 40) !== '' ? wb_str(wb_prop($b, 'uid'), 40) : 'b' . substr(md5(json_encode($b)), 0, 8), 'type' => 'block:' . wb_str(wb_prop($b, 'type'), 60), 'enabled' => wb_prop($b, 'enabled') !== false, 'data' => wb_import_obj(wb_prop($b, 'data', new stdClass())), 'style' => wb_import_obj(wb_prop($b, 'style', new stdClass())), 'after' => wb_str(wb_prop($b, 'after'), 60), 'name' => wb_str(wb_prop($b, 'name'), 120), 'anchor' => wb_str(wb_prop($b, 'anchor'), 60), 'locked' => (bool)wb_prop($b, 'locked')); } return $out; };
  if (empty($exists['__main']) && empty($exists['main'])) {
    $sections = array(); $i = 0; $sk = wb_section_keys();
    foreach ((array)(isset($d->sections) ? $d->sections : array()) as $sec) { $type = wb_str(wb_prop($sec, 'id')); $bag = new stdClass(); foreach ((isset($sk[$type]) ? $sk[$type] : array()) as $k) { $v = wb_path($d, $k); if ($v !== null) { $short = strpos($k, 'content.') === 0 ? substr($k, 8) : $k; $bag->$short = wb_import_obj($v); } } $sections[] = array('uid' => 's' . (++$i), 'type' => $type, 'enabled' => wb_prop($sec, 'enabled') !== false, 'data' => $bag); }
    foreach ($blockSecs('main') as $b) { $sections[] = $b; }
    $content = array('sections' => $sections, 'styles' => new stdClass(), 'hidden' => new stdClass(), 'attrs' => isset($attrs->main) ? wb_import_obj($attrs->main) : new stdClass(), 'trash' => array()); if (isset($common->main)) { $content['common'] = wb_import_obj($common->main); }
    wb_create_page($siteId, 'main', '메인', 'main', $content, $userId, 0, true); $report['pages']++;
  } elseif ($force || wb_import_page_empty($mainRow)) {   /* 빈 메인 페이지(또는 [다시 가져오기]) : 공개 홈페이지 내용으로 채움 */
    $sections = array(); $i = 0; $sk = wb_section_keys();
    foreach ((array)(isset($d->sections) ? $d->sections : array()) as $sec) { $type = wb_str(wb_prop($sec, 'id')); $bag = new stdClass(); foreach ((isset($sk[$type]) ? $sk[$type] : array()) as $k) { $v = wb_path($d, $k); if ($v !== null) { $short = strpos($k, 'content.') === 0 ? substr($k, 8) : $k; $bag->$short = wb_import_obj($v); } } $sections[] = array('uid' => 's' . (++$i), 'type' => $type, 'enabled' => wb_prop($sec, 'enabled') !== false, 'data' => $bag); }
    foreach ($blockSecs('main') as $b) { $sections[] = $b; }
    $content = array('sections' => $sections, 'styles' => new stdClass(), 'hidden' => new stdClass(), 'attrs' => isset($attrs->main) ? wb_import_obj($attrs->main) : new stdClass(), 'trash' => array()); if (isset($common->main)) { $content['common'] = wb_import_obj($common->main); }
    wb_import_page_fill($mainRow, $content, '메인', $userId); $report['pages']++; $report['filled'][] = 'main';
  } else { $report['skipped'][] = 'main'; if ($fromPub && wb_import_mark_published($mainRow)) { $report['marked'][] = 'main'; } }
  /* 4) 서브 페이지 : 게시 데이터의 pages 순서 그대로 · 이미 있는 키는 건너뜀 */
  $order = wb_int(wb_val('SELECT COALESCE(MAX(sort), 0) + 1 FROM pages WHERE site_id = ?', array($siteId)), 1);
  foreach ((array)(isset($d->pages) ? $d->pages : array()) as $key => $p) {
    $key = wb_keyify((string)$key); if ($key === '' || $key === 'main') { continue; }
    $content = array('page' => wb_import_obj($p), 'sections' => $blockSecs($key), 'styles' => new stdClass(), 'hidden' => new stdClass()); if (isset($attrs->$key)) { $content['attrs'] = wb_import_obj($attrs->$key); } if (isset($common->$key)) { $content['common'] = wb_import_obj($common->$key); }
    if (!empty($exists[$key])) {
      $row = isset($rows[$key]) ? $rows[$key] : null;
      if ($force || wb_import_page_empty($row)) { wb_import_page_fill($row, $content, wb_str(wb_prop($p, 'title', $key), 150), $userId); $report['pages']++; $report['filled'][] = $key; }
      else { $report['skipped'][] = $key; if ($fromPub && wb_import_mark_published($row)) { $report['marked'][] = $key; } }
      continue;
    }
    wb_create_page($siteId, $key, wb_str(wb_prop($p, 'title', $key), 150), 'sub', $content, $userId, $order++, wb_prop($p, 'enabled') !== false, wb_str(wb_prop($p, 'layoutType'), 40), wb_str(wb_prop($p, 'category'), 60)); $report['pages']++;
  }
  /* 5) 팝업 : 사이트에 팝업이 하나도 없을 때만 (게시 데이터의 이미지 · 영상 팝업) */
  if (!wb_int(wb_val('SELECT COUNT(*) FROM popups WHERE site_id = ?', array($siteId)))) {
    $ps = 0;
    foreach ((array)(isset($d->popupBanners) ? $d->popupBanners : array()) as $p) {
      if ($fromPub) { wb_insert('popups', array('site_id' => $siteId, 'name' => wb_str(wb_prop($p, 'name', '팝업 배너 ' . ($ps + 1)), 190), 'type' => 'image', 'pc_src' => wb_str(wb_prop($p, 'src'), 500), 'mobile_src' => wb_str(wb_prop($p, 'mobileSrc'), 500), 'alt' => wb_str(wb_prop($p, 'alt'), 190), 'link' => wb_str(wb_prop($p, 'href'), 500), 'target' => wb_str(wb_prop($p, 'target', '_self'), 20), 'pages_json' => wb_enc(wb_prop($p, 'pages', array('main'))), 'position_json' => wb_enc(wb_prop($p, 'position', new stdClass())), 'size_json' => wb_enc(wb_prop($p, 'size', new stdClass())), 'sort' => $ps++, 'start_at' => wb_prop($p, 'start') ? wb_str(wb_prop($p, 'start'), 20) : null, 'end_at' => wb_prop($p, 'end') ? wb_str(wb_prop($p, 'end'), 20) : null, 'status' => wb_prop($p, 'enabled') === false ? 'draft' : 'published', 'hide_rule' => wb_str(wb_prop($p, 'hideRule', wb_prop($p, 'rule', 'today')), 20), 'reshow_hours' => wb_int(wb_prop($p, 'reshowHours', 24), 24), 'devices' => wb_str(wb_prop($p, 'devices', 'all'), 20), 'priority' => wb_int(wb_prop($p, 'priority', 0)), 'overlay' => wb_prop($p, 'overlay') === null ? null : (float)wb_prop($p, 'overlay'), 'options_json' => wb_enc(array('closeBtn' => wb_prop($p, 'closeBtn') !== false)), 'created_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'updated_at' => $n)); }
      else { wb_insert('popups', array('site_id' => $siteId, 'name' => '팝업 배너 ' . ($ps + 1), 'type' => 'image', 'pc_src' => wb_str(wb_prop($p, 'src'), 500), 'mobile_src' => wb_str(wb_prop($p, 'mobileSrc'), 500), 'alt' => wb_str(wb_prop($p, 'alt'), 190), 'link' => wb_str(wb_prop($p, 'href'), 500), 'target' => wb_str(wb_prop($p, 'target', '_self'), 20), 'pages_json' => '["main"]', 'position_json' => '{}', 'size_json' => '{}', 'sort' => $ps++, 'status' => wb_prop($p, 'enabled') === false ? 'draft' : 'published', 'hide_rule' => 'today', 'reshow_hours' => 24, 'devices' => 'all', 'priority' => 0, 'options_json' => '{}', 'created_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'updated_at' => $n)); }
      $report['popups']++;
    }
    foreach ((array)(isset($d->videoPopups) ? $d->videoPopups : array()) as $p) {
      wb_insert('popups', array('site_id' => $siteId, 'name' => wb_str(wb_prop($p, 'name', '영상 팝업'), 190), 'type' => 'video', 'video_url' => wb_str(wb_prop($p, 'src'), 500), 'pc_src' => wb_str(wb_prop($p, 'poster'), 500), 'alt' => wb_str(wb_prop($p, 'title'), 190), 'link' => wb_str(wb_prop($p, 'href'), 500), 'target' => wb_str(wb_prop($p, 'target', '_self'), 20), 'pages_json' => wb_enc(wb_prop($p, 'pages', array('main'))), 'position_json' => wb_enc(wb_prop($p, 'position', new stdClass())), 'size_json' => wb_enc(wb_prop($p, 'size', new stdClass())), 'sort' => $ps++, 'status' => wb_prop($p, 'enabled') === false ? 'draft' : 'published', 'hide_rule' => wb_str(wb_prop($p, 'rule', 'today'), 20), 'reshow_hours' => wb_int(wb_prop($p, 'reshowHours', 24), 24), 'devices' => wb_str(wb_prop($p, 'devices', 'all'), 20), 'priority' => wb_int(wb_prop($p, 'priority', 0)), 'options_json' => wb_enc(array('autoplay' => wb_prop($p, 'autoplay') !== false, 'muted' => wb_prop($p, 'muted') !== false, 'loop' => (bool)wb_prop($p, 'loop'), 'controls' => wb_prop($p, 'controls') !== false, 'ratioPc' => wb_str(wb_prop($p, 'ratioPc', '16 / 9'), 20), 'ratioMobile' => wb_str(wb_prop($p, 'ratioMobile', '16 / 9'), 20), 'firstVisitOnly' => (bool)wb_prop($p, 'firstVisitOnly'), 'closeBtn' => wb_prop($p, 'closeBtn') !== false)), 'created_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'updated_at' => $n));
      $report['popups']++;
    }
  }
  /* 6) SEO : 사이트 기본값 · 페이지별 (없을 때만) */
  $seoSite = $fromPub ? wb_path($d, 'seo.site') : null;
  if (!wb_get("SELECT id FROM seo WHERE site_id = ? AND scope = 'site'", array($siteId))) {
    $site = isset($d->site) && is_object($d->site) ? $d->site : new stdClass(); $name = wb_str(wb_prop($site, 'name', $s['name']), 120);
    if (is_object($seoSite)) { wb_insert('seo', array('site_id' => $siteId, 'scope' => 'site', 'page_id' => null, 'title' => wb_str(wb_prop($seoSite, 'title'), 190), 'description' => wb_str(wb_prop($seoSite, 'description'), 1000), 'keywords' => wb_str(wb_prop($seoSite, 'keywords'), 500), 'canonical' => wb_str(wb_prop($seoSite, 'canonical'), 500), 'robots' => wb_str(wb_prop($seoSite, 'robots', 'index,follow'), 60), 'og_json' => wb_enc(wb_prop($seoSite, 'og', new stdClass())), 'structured_json' => wb_enc(wb_prop($seoSite, 'structured', null)), 'verification_json' => wb_enc(wb_prop($seoSite, 'verification', new stdClass())), 'updated_at' => $n)); }
    else { wb_insert('seo', array('site_id' => $siteId, 'scope' => 'site', 'page_id' => null, 'title' => $name . ' | 분양 홈페이지', 'description' => '', 'keywords' => '', 'canonical' => '', 'robots' => 'index,follow', 'og_json' => wb_enc(array('title' => '', 'description' => '', 'image' => '')), 'structured_json' => wb_enc(array('@context' => 'https://schema.org', '@type' => 'Organization', 'name' => $name, 'telephone' => (string)$s['tel'])), 'verification_json' => wb_enc(array('google' => '', 'naver' => '')), 'updated_at' => $n)); }
    $report['seo']++;
  }
  if ($fromPub) {
    foreach ((array)wb_path($d, 'seo.pages', array()) as $key => $ps) {
      $pg = wb_get('SELECT id FROM pages WHERE site_id = ? AND `key` = ? AND deleted_at IS NULL', array($siteId, (string)$key)); if (!$pg || !is_object($ps)) { continue; }
      if (wb_get("SELECT id FROM seo WHERE site_id = ? AND scope = 'page' AND page_id = ?", array($siteId, (int)$pg['id']))) { continue; }
      wb_insert('seo', array('site_id' => $siteId, 'scope' => 'page', 'page_id' => (int)$pg['id'], 'title' => wb_str(wb_prop($ps, 'title'), 190), 'description' => wb_str(wb_prop($ps, 'description'), 1000), 'keywords' => wb_str(wb_prop($ps, 'keywords'), 500), 'canonical' => wb_str(wb_prop($ps, 'canonical'), 500), 'robots' => wb_str(wb_prop($ps, 'robots', 'index,follow'), 60), 'og_json' => wb_enc(wb_prop($ps, 'og', new stdClass())), 'structured_json' => wb_enc(wb_prop($ps, 'structured', null)), 'verification_json' => wb_enc(new stdClass()), 'updated_at' => $n)); $report['seo']++;
    }
  }
  /* 7) 방문예약 폼 : 없을 때만 (있으면 지금 접수에 쓰는 폼을 그대로 둠) */
  if (!wb_get("SELECT id FROM forms WHERE site_id = ? AND `key` = 'reserve'", array($siteId))) {
    $fr = $fromPub ? wb_path($d, 'forms.reserve') : null; $r = isset($d->reserve) && is_object($d->reserve) ? $d->reserve : new stdClass();
    $set = is_object($fr) && isset($fr->settings) ? wb_import_obj($fr->settings) : array('submitLabel' => wb_prop($r, 'submitLabel', '방문예약 신청'), 'doneTitle' => wb_prop($r, 'doneTitle', '방문예약이 정상적으로 접수되었습니다.'), 'doneText' => wb_prop($r, 'doneText', ''), 'successRedirect' => '', 'phonePrefix' => wb_prop($r, 'phonePrefix', '010'), 'visitTimes' => wb_prop($r, 'visitTimes', wb_visit_times()), 'agreements' => wb_prop($r, 'agreements', array()), 'spam' => array('honeypot' => true, 'minSeconds' => 3, 'duplicateMinutes' => 10), 'retentionDays' => 365);
    $formId = wb_insert('forms', array('site_id' => $siteId, 'key' => 'reserve', 'name' => '방문예약', 'settings_json' => wb_enc($set), 'status' => 'published', 'version' => 1, 'updated_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'updated_at' => $n));
    $fs = 0; $fields = is_object($fr) && isset($fr->fields) ? $fr->fields : wb_prop($r, 'fields', array());
    foreach ((array)$fields as $f) { $name = wb_str(wb_prop($f, 'name')); if ($name === '') { continue; } $type = wb_str(wb_prop($f, 'type', 'text')); wb_insert('form_fields', array('form_id' => $formId, 'key' => $name, 'type' => ($type === 'text' && $name === 'name') ? 'name' : $type, 'label' => wb_str(wb_prop($f, 'label'), 120), 'description' => wb_str(wb_prop($f, 'description'), 300), 'placeholder' => wb_str(wb_prop($f, 'placeholder'), 160), 'required' => wb_prop($f, 'required') ? 1 : 0, 'width' => wb_prop($f, 'width') ? wb_str(wb_prop($f, 'width'), 20) : ((wb_prop($f, 'full') || $type === 'textarea') ? 'full' : 'half'), 'options_json' => wb_enc(wb_prop($f, 'options', array())), 'validation_json' => wb_enc(wb_prop($f, 'validation', new stdClass())), 'default_value' => wb_str(wb_prop($f, 'default'), 190), 'sort' => $fs++, 'enabled' => wb_prop($f, 'enabled') === false ? 0 : 1)); }
    $report['forms']++;
  }
  /* 디자인 묶음에서 가져온 경우 : 디자인에 들어 있던 예시 전화번호를 이 현장 대표번호로 바꿔 둡니다 (고객 연락처 · 발신번호는 건드리지 않습니다) */
  if ($src['source'] === 'design' && function_exists('wb_tel_bulk')) {
    $tel = wb_tel_current($siteId);
    if ($tel !== '') { try { $tr = wb_tel_bulk($c, $siteId, $tel, null, true, ''); $report['tel'] = wb_int(wb_prop2($tr, 'total')); } catch (Exception $e) { $report['tel'] = 0; } }
  }
  return $report;
}

/* 메인 페이지만 지금 공개 중인 홈페이지 내용으로 되살립니다 (게시가 "메인 구성 0개" 로 막혔을 때 복구용)
   · 메인 행이 없거나 · 지운 표시가 되어 있거나 · 종류가 잘못돼 있어도 찾아서 바로잡습니다. */
function wb_repair_main($c, $s, $userId) {
  $siteId = (int)$s['id'];
  $src = wb_import_source($c, $s); $d = $src['data'];
  $sk = wb_section_keys(); $sections = array(); $i = 0;
  foreach ((array)(isset($d->sections) ? $d->sections : array()) as $sec) {
    $type = wb_str(wb_prop($sec, 'id')); $bag = new stdClass();
    foreach ((isset($sk[$type]) ? $sk[$type] : array()) as $k) { $v = wb_path($d, $k); if ($v !== null) { $short = strpos($k, 'content.') === 0 ? substr($k, 8) : $k; $bag->$short = wb_import_obj($v); } }
    $sections[] = array('uid' => 's' . (++$i), 'type' => $type, 'enabled' => wb_prop($sec, 'enabled') !== false, 'data' => $bag);
  }
  $blocks = isset($d->blocks) && is_object($d->blocks) ? $d->blocks : new stdClass();
  foreach ((array)(isset($blocks->main) ? $blocks->main : array()) as $b) {
    $sections[] = array('uid' => wb_str(wb_prop($b, 'uid'), 40) !== '' ? wb_str(wb_prop($b, 'uid'), 40) : 'b' . substr(md5(json_encode($b)), 0, 8), 'type' => 'block:' . wb_str(wb_prop($b, 'type'), 60), 'enabled' => wb_prop($b, 'enabled') !== false, 'data' => wb_import_obj(wb_prop($b, 'data', new stdClass())), 'style' => wb_import_obj(wb_prop($b, 'style', new stdClass())), 'after' => wb_str(wb_prop($b, 'after'), 60), 'name' => wb_str(wb_prop($b, 'name'), 120), 'anchor' => wb_str(wb_prop($b, 'anchor'), 60), 'locked' => (bool)wb_prop($b, 'locked'));
  }
  $attrs = isset($d->attrs) && is_object($d->attrs) ? $d->attrs : new stdClass();
  $common = isset($d->pageCommon) && is_object($d->pageCommon) ? $d->pageCommon : new stdClass();
  $content = array('sections' => $sections, 'styles' => new stdClass(), 'hidden' => new stdClass(), 'attrs' => isset($attrs->main) ? wb_import_obj($attrs->main) : new stdClass(), 'trash' => array());
  if (isset($common->main)) { $content['common'] = wb_import_obj($common->main); }
  if (!count($sections)) { throw new WbHttpError(422, '지금 공개 중인 홈페이지에서도 메인 화면 구성을 찾지 못했습니다. (' . $src['source'] . ') 홈페이지 파일을 확인해 주세요.'); }
  $row = wb_get("SELECT * FROM pages WHERE site_id = ? AND type = 'main' AND deleted_at IS NULL LIMIT 1", array($siteId));
  if (!$row) { $row = wb_get("SELECT * FROM pages WHERE site_id = ? AND (type = 'main' OR `key` = 'main') ORDER BY (deleted_at IS NULL) DESC, id ASC LIMIT 1", array($siteId)); }
  $created = false; $how = '';
  if (!$row) { wb_create_page($siteId, 'main', '메인', 'main', $content, $userId, 0, true); $created = true; $how = 'created'; }
  else {
    wb_update('pages', array('type' => 'main', 'deleted_at' => null, 'status' => 'published'), 'id = ?', array((int)$row['id']));
    $row = wb_get('SELECT * FROM pages WHERE id = ?', array((int)$row['id']));
    /* 초안에 내용이 있으면 그 초안을 게시본으로 올립니다 (작업하던 내용을 덮지 않음) — 초안까지 비어 있을 때만 공개 홈페이지에서 가져옵니다 */
    $dv = !empty($row['draft_version_id']) ? wb_get('SELECT * FROM page_versions WHERE id = ?', array((int)$row['draft_version_id'])) : null;
    $dj = $dv ? wb_json_safe($dv['content_json'], null) : null;
    $dCount = (is_object($dj) && isset($dj->sections) && is_array($dj->sections)) ? count($dj->sections) : 0;
    if ($dCount > 0) {
      $n = wb_now();
      $vid = wb_new_version((int)$row['id'], $dj, 'published', '메인 복구 · 초안을 게시본으로', $userId);
      wb_update('page_versions', array('published_at' => $n), 'id = ?', array($vid));
      wb_run("UPDATE page_versions SET status = 'archived' WHERE page_id = ? AND status = 'published' AND id <> ?", array((int)$row['id'], $vid));
      wb_update('pages', array('published_version_id' => $vid, 'draft_version_id' => $vid, 'status' => 'published', 'updated_at' => $n), 'id = ?', array((int)$row['id']));
      $how = 'draft';
    } else {
      wb_import_page_fill($row, $content, '메인', $userId); $how = 'public';
    }
  }
  $after = wb_get("SELECT p.id, v.content_json FROM pages p LEFT JOIN page_versions v ON v.id = p.draft_version_id WHERE p.site_id = ? AND p.type = 'main' AND p.deleted_at IS NULL LIMIT 1", array($siteId));
  $cnt = 0;
  if ($after) { $j = wb_json_safe($after['content_json'], null); if (is_object($j) && isset($j->sections) && is_array($j->sections)) { $cnt = count($j->sections); } }
  wb_log($c, $siteId, 'site.repair_main', 'site', $siteId, '메인 페이지 복구 · 구성 ' . $cnt . '개 (' . ($how === 'draft' ? '초안을 게시본으로' : ($how === 'created' ? '새로 만듦' : '공개 홈페이지에서 가져옴')) . ')');
  return array('ok' => true, 'sections' => $cnt, 'created' => $created, 'how' => $how, 'source' => $src['source'], 'file' => $src['file']);
}
wb_route('POST', '/sites/:id/pages/repair-main', function ($c, $p) {
  $s = wb_site_of($c, $p['id'], 'edit');
  if (!wb_rate('pgrepair:' . (int)$s['id'], 10, 60)) { throw new WbHttpError(429, '잠시 후 다시 시도해 주세요.'); }
  return wb_repair_main($c, $s, (int)$c['user']['id']);
});

/* 경로 : 에디터가 페이지 0개일 때 자동으로 부름 · [홈페이지에서 페이지 가져오기] 버튼 */
wb_route('POST', '/sites/:id/pages/import', function ($c, $p) {
  $s = wb_site_of($c, $p['id'], 'edit'); if (!wb_rate('pgimport:' . (int)$s['id'], 10, 60)) { throw new WbHttpError(429, '잠시 후 다시 시도해 주세요.'); }
  $r = wb_import_site($c, $s, (int)$c['user']['id'], !empty($c['body']['force']));
  wb_log($c, (int)$s['id'], 'site.pages_import', 'site', (int)$s['id'], '페이지 가져오기 (' . wb_import_source_name($r['source'], $r['file']) . ') · 페이지 ' . $r['pages'] . '개 · 설정 ' . $r['settings'] . ' · 팝업 ' . $r['popups'] . ' · SEO ' . $r['seo'] . ($r['note'] !== '' ? ' · ' . $r['note'] : ''));
  $r['total'] = wb_int(wb_val('SELECT COUNT(*) FROM pages WHERE site_id = ? AND deleted_at IS NULL', array((int)$s['id'])));
  return $r;
});


/* ---------- 게시 전 미리보기 페이지 ----------
   지금 공개 중인 index.html 의 CMS_CONFIG.api 가 비어 있으면(관리자에서 아직 한 번도 게시하지 않은 홈페이지) 그 파일만으로는 초안을 받지 못함
   → 같은 index.html 을 읽어 "이 응답에서만" api 주소와 <base> 를 넣어 보여 줌 (홈페이지 파일은 읽기만 하고 바꾸지 않음) */
function wb_preview_cfg_api_empty($html) {
  if (!preg_match('/window\.CMS_CONFIG\s*=\s*\{[^\n<]*?\}/', (string)$html, $m)) { return false; }
  return (bool)preg_match('/"api"\s*:\s*""/', $m[0]);
}
function wb_preview_api_abs($c) {
  $dir = isset($_SERVER['SCRIPT_NAME']) ? str_replace('\\', '/', dirname((string)$_SERVER['SCRIPT_NAME'])) : '/api';
  return $c['selfUrl'] . rtrim($dir, '/') . '/index.php?r=';
}
function wb_preview_page_html($html, $base, $api) {
  $html = preg_replace_callback('/window\.CMS_CONFIG\s*=\s*\{[^\n<]*?\}/', function ($m) use ($api) { $p = strpos($m[0], '"api":""'); return $p === false ? $m[0] : substr($m[0], 0, $p) . '"api":' . json_encode($api, JSON_UNESCAPED_SLASHES) . substr($m[0], $p + 8); }, (string)$html, 1);
  $inject = '<base href="' . wb_esc($base) . '"><meta name="robots" content="noindex, nofollow">' . '<script>document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var h=a.getAttribute("href")||"";if(h.indexOf("#page=")===0){e.preventDefault();if(location.hash===h)location.reload();else location.hash=h;}},true);</script>';
  $m = null; if (preg_match('/<head(\s[^>]*)?>/i', $html, $m, PREG_OFFSET_CAPTURE)) { $at = $m[0][1] + strlen($m[0][0]); return substr($html, 0, $at) . $inject . substr($html, $at); }
  return $inject . $html;
}
/* 미리보기 링크 : 공개 index.html 이 초안을 받을 수 있으면 그대로, 아니면 미리보기 페이지 주소 */
function wb_preview_url_for($c, $s, $url, $token, $page) {
  $f = wb_published_html_path($c, $s);
  if (!is_file($f)) { return $url; }
  $h = (string)@file_get_contents($f);
  if (!wb_preview_cfg_api_empty($h)) { return $url; }
  return wb_preview_api_abs($c) . '/public/' . rawurlencode($s['key']) . '/preview-page&cms_preview=' . rawurlencode($token) . ($page === '' || $page === 'main' ? '' : '#page=' . rawurlencode($page));
}
function wb_preview_page_msg($status, $text) {
  wb_send_file($status, 'text/html; charset=utf-8', '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>미리보기</title></head><body style="font:15px/1.6 sans-serif;padding:48px;color:#333"><p>' . wb_esc($text) . '</p></body></html>');
}
wb_route('GET', '/public/:key/preview-page', function ($c, $p) {
  $s = wb_public_site($c, $p['key']);
  $token = (string)wb_q($c, 'cms_preview');
  $row = $token !== '' ? wb_get('SELECT id FROM preview_tokens WHERE site_id = ? AND token_hash = ? AND expires_at > ?', array((int)$s['id'], wb_sha256($token), wb_now())) : null;
  if (!$row) { wb_preview_page_msg(403, '미리보기 링크가 만료되었거나 올바르지 않습니다. 관리자에서 다시 [미리보기]를 눌러 주세요.'); }
  $f = wb_published_html_path($c, $s);
  if (!is_file($f)) { wb_preview_page_msg(404, '공개 홈페이지 파일(index.html)이 아직 없습니다. 먼저 [게시하기]를 해 주세요.'); }
  $hosted = wb_site_hosted_here($c, $s);
  $html = wb_preview_page_html((string)file_get_contents($f), $hosted ? '../' : wb_site_url($s) . '/', $hosted ? './api/index.php?r=' : wb_preview_api_abs($c));
  wb_send_file(200, 'text/html; charset=utf-8', $html, '', array('X-Robots-Tag' => 'noindex, nofollow'));
  return array();
}, array('open' => true));
