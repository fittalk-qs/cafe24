<?php
/* 통합웹빌더 운영 API — 설정 · 시드 · 페이지 버전 · 폼 · 게시(관리자 브라우저가 만든 게시 파일을 서버에 저장) · 미리보기 · 연결 점검
   게시 데이터 컴파일(DB → SITE_DATA JSON)과 단일 파일 생성은 관리자 브라우저의 공용 코어(lib/wb-core.js)가 담당하고, 이 서버는 행(row)을 내주고 결과를 저장합니다. */
if (!defined('WB_API')) { http_response_code(404); exit; }

/* ---------- 설정 ---------- */
function wb_get_setting($siteId, $group) { $r = wb_get('SELECT data_json FROM settings WHERE site_id = ? AND group_key = ?', array((int)$siteId, $group)); return $r ? wb_json_safe($r['data_json'], new stdClass()) : new stdClass(); }
function wb_put_setting($siteId, $group, $data, $userId = null) { $row = wb_get('SELECT id FROM settings WHERE site_id = ? AND group_key = ?', array((int)$siteId, $group)); $json = wb_enc($data === null ? new stdClass() : $data); if ($row) { wb_update('settings', array('data_json' => $json, 'updated_by' => $userId ? (int)$userId : null, 'updated_at' => wb_now()), 'id = ?', array((int)$row['id'])); } else { wb_insert('settings', array('site_id' => (int)$siteId, 'group_key' => $group, 'data_json' => $json, 'updated_by' => $userId ? (int)$userId : null, 'updated_at' => wb_now())); } }
function wb_setting_groups() { return array('site' => array('site'), 'theme' => array('theme'), 'footer' => array('footer'), 'quick' => array('quickMenuTitle', 'quickMenu'), 'popupOptions' => array('popupOptions'), 'subpage' => array('subpage'), 'misc' => array('imageSettings', 'fullPageScroll', 'settings', 'animation', 'animationPresets', 'sectionMap', 'pageAliases')); }
function wb_section_keys() { return array('mainVisual' => array('mainSlider', 'summaryScene', 'summary', 'content.businessOverview'), 'summaryMobile' => array(), 'premium' => array('premiumSection', 'premium', 'content.premiumItems'), 'environment' => array('environmentSection', 'environment', 'content.location', 'content.complexDesign', 'content.hypert', 'content.mainFeatureCards'), 'type' => array('unitSection', 'content.unitTypes'), 'reserve' => array('reserve')); }
function wb_section_names() { return array('mainVisual' => '메인 슬라이드 + 써머리', 'summaryMobile' => '써머리(모바일)', 'premium' => '프리미엄', 'environment' => '입지환경 · 설계', 'type' => '타입안내', 'reserve' => '방문예약'); }
function wb_page_status_names() { return array('draft' => '작성 중', 'saved' => '임시저장', 'review' => '검토 중', 'published' => '게시됨', 'scheduled' => '예약 게시', 'stopped' => '게시 중지'); }
function wb_visit_times() { return array('10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'); }
function wb_field_types() { return array('name' => '성함', 'text' => '텍스트', 'phone' => '연락처', 'email' => '이메일', 'date' => '방문 날짜', 'time' => '방문 시간', 'number' => '숫자', 'select' => '선택(드롭다운)', 'checkbox' => '체크박스', 'radio' => '라디오', 'textarea' => '문의사항', 'consent' => '개인정보 동의', 'hidden' => '숨김 필드', 'custom' => '사용자 정의'); }
function wb_layouts() { return array('image' => '이미지형', 'text' => '텍스트형', 'card' => '카드형', 'tab' => '탭형', 'document' => '문서형', 'table' => '표형', 'gallery' => '갤러리형', 'video' => '영상형', 'news' => '게시판형', 'map' => '지도형', 'form' => '폼형', 'custom' => '사용자 정의'); }

/* ---------- 시드 : 템플릿 JSON(seeds/*.json · SITE_DATA 모양) → DB (Node publish.js seed 와 같은 규칙) ---------- */
function wb_template_list() { $dir = WB_API_DIR . '/seeds'; $out = array(); if (!is_dir($dir)) { return $out; } foreach (scandir($dir) as $f) { if (substr($f, -5) !== '.json') { continue; } $d = wb_json_safe(@file_get_contents($dir . '/' . $f), null); $key = substr($f, 0, -5); $nm = trim((string)wb_path($d, 'site.name', '')); $out[] = array('key' => $key, 'name' => $key === 'template' ? '기본 (빈 화면 · 디자인은 홈페이지 파일에서 가져옵니다)' : ($nm !== '' ? $nm : $key) . ' 템플릿', 'pages' => is_object($d) && isset($d->pages) ? count((array)$d->pages) : 0); } return $out; }
function wb_load_template($key) {
  $dir = WB_API_DIR . '/seeds/';
  $f = $dir . preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$key) . '.json';
  if (!is_file($f)) { foreach (array('template', 'mokdong') as $alt) { if (is_file($dir . $alt . '.json')) { $f = $dir . $alt . '.json'; break; } } }
  if (!is_file($f)) { throw new WbHttpError(422, '템플릿을 찾을 수 없습니다: ' . $key); } $d = wb_json_safe(file_get_contents($f), null); if (!is_object($d)) { throw new WbHttpError(422, '템플릿 파일이 올바르지 않습니다.'); } return $d; }
function wb_seed($siteId, $d, $userId, $opts = array()) {
  $n = wb_now(); $report = array('settings' => 0, 'menus' => 0, 'pages' => 0, 'forms' => 0, 'popups' => 0);
  foreach (wb_setting_groups() as $group => $keys) { $bag = new stdClass(); foreach ($keys as $k) { if (isset($d->$k)) { $bag->$k = json_decode(json_encode($d->$k)); } } if ($group === 'site') { $site = isset($bag->site) && is_object($bag->site) ? $bag->site : new stdClass(); if (!empty($opts['site']) && is_array($opts['site'])) { foreach ($opts['site'] as $k => $v) { $site->$k = $v; } } $bag->site = $site; } wb_put_setting($siteId, $group, $bag, $userId); $report['settings']++; }
  wb_put_setting($siteId, 'analytics', array('enabled' => true, 'ga4Id' => '', 'trackClicks' => true, 'anonymize' => true), $userId);
  wb_put_setting($siteId, 'privacy', array('submissionRetentionDays' => 365), $userId);
  wb_put_setting($siteId, 'header', array('transparent' => true, 'fixed' => true, 'mobileMenu' => true, 'mobileTel' => true), $userId);
  $site = isset($d->site) && is_object($d->site) ? $d->site : new stdClass(); $siteName = !empty($opts['site']['name']) ? $opts['site']['name'] : (isset($site->name) ? $site->name : '');
  $shareImage = !empty($site->shareImage) ? './' . preg_replace('#^\./|^/#', '', (string)$site->shareImage) : '';
  $menuId = wb_insert('menus', array('site_id' => (int)$siteId, 'key' => 'main', 'name' => '메인 메뉴', 'updated_at' => $n)); $sort = 0;
  foreach ((array)(isset($d->menu) ? $d->menu : array()) as $g) { $pid = wb_insert('menu_items', array('menu_id' => $menuId, 'parent_id' => null, 'label' => wb_str(wb_prop($g, 'label'), 190), 'latin' => wb_str(wb_prop($g, 'latin'), 190), 'link_type' => 'group', 'page_key' => wb_str(wb_prop($g, 'id'), 190), 'url' => '', 'target' => '_self', 'sort' => $sort++, 'enabled' => wb_prop($g, 'enabled') === false ? 0 : 1)); $cs = 0; foreach ((array)wb_prop($g, 'items', array()) as $it) { wb_insert('menu_items', array('menu_id' => $menuId, 'parent_id' => $pid, 'label' => wb_str(wb_prop($it, 'label'), 190), 'latin' => '', 'link_type' => wb_prop($it, 'url') ? 'url' : 'page', 'page_key' => wb_str(wb_prop($it, 'page'), 190), 'url' => wb_str(wb_prop($it, 'url'), 500), 'target' => wb_str(wb_prop($it, 'target', '_self'), 20), 'sort' => $cs++, 'enabled' => wb_prop($it, 'enabled') === false ? 0 : 1)); } $report['menus']++; }
  $sections = array(); $i = 0; $sk = wb_section_keys();
  foreach ((array)(isset($d->sections) ? $d->sections : array()) as $s) { $type = wb_str(wb_prop($s, 'id')); $bag = new stdClass(); foreach ((isset($sk[$type]) ? $sk[$type] : array()) as $k) { $v = wb_path($d, $k); if ($v !== null) { $short = strpos($k, 'content.') === 0 ? substr($k, 8) : $k; $bag->$short = json_decode(json_encode($v)); } } $sections[] = array('uid' => 's' . (++$i), 'type' => $type, 'enabled' => wb_prop($s, 'enabled') !== false, 'data' => $bag); }
  wb_create_page($siteId, 'main', '메인', 'main', array('sections' => $sections, 'styles' => new stdClass(), 'hidden' => new stdClass(), 'attrs' => new stdClass(), 'trash' => array()), $userId, 0, true); $report['pages']++;
  $order = 1;
  foreach ((array)(isset($d->pages) ? $d->pages : new stdClass()) as $key => $p) { wb_create_page($siteId, $key, wb_str(wb_prop($p, 'title', $key), 150), 'sub', array('page' => json_decode(json_encode($p)), 'sections' => array(), 'styles' => new stdClass(), 'hidden' => new stdClass()), $userId, $order++, wb_prop($p, 'enabled') !== false, wb_str(wb_prop($p, 'layoutType'), 40), wb_str(wb_prop($p, 'category'), 60)); $report['pages']++; }
  $r = isset($d->reserve) && is_object($d->reserve) ? $d->reserve : new stdClass();
  $vt = wb_prop($r, 'visitTimes'); $vt = is_array($vt) && count($vt) ? $vt : wb_visit_times();
  $formId = wb_insert('forms', array('site_id' => (int)$siteId, 'key' => 'reserve', 'name' => '방문예약', 'settings_json' => wb_enc(array('submitLabel' => wb_prop($r, 'submitLabel', '방문예약 신청'), 'doneTitle' => wb_prop($r, 'doneTitle', '방문예약이 정상적으로 접수되었습니다.'), 'doneText' => wb_prop($r, 'doneText', '담당자가 확인 후 안내 연락을 드리겠습니다.'), 'successRedirect' => '', 'phonePrefix' => wb_prop($r, 'phonePrefix', '010'), 'visitTimes' => $vt, 'agreements' => wb_prop($r, 'agreements', array()), 'button' => array('color' => '', 'background' => '', 'radius' => 0, 'width' => 'full'), 'spam' => array('honeypot' => true, 'minSeconds' => 3, 'duplicateMinutes' => 10), 'notifyEmail' => '', 'retentionDays' => 365)), 'status' => 'published', 'version' => 1, 'updated_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'updated_at' => $n));
  $fs = 0; foreach ((array)wb_prop($r, 'fields', array()) as $f) { $type = wb_str(wb_prop($f, 'type', 'text')); $name = wb_str(wb_prop($f, 'name')); wb_insert('form_fields', array('form_id' => $formId, 'key' => $name, 'type' => ($type === 'text' && $name === 'name') ? 'name' : $type, 'label' => wb_str(wb_prop($f, 'label'), 120), 'description' => '', 'placeholder' => wb_str(wb_prop($f, 'placeholder'), 160), 'required' => wb_prop($f, 'required') ? 1 : 0, 'width' => (wb_prop($f, 'full') || $type === 'textarea') ? 'full' : 'half', 'options_json' => wb_enc(wb_prop($f, 'options', array())), 'validation_json' => '{}', 'default_value' => '', 'sort' => $fs++, 'enabled' => wb_prop($f, 'enabled') === false ? 0 : 1)); }
  $report['forms'] = 1; $ps = 0;
  foreach ((array)(isset($d->popupBanners) ? $d->popupBanners : array()) as $p) { wb_insert('popups', array('site_id' => (int)$siteId, 'name' => '팝업 배너 ' . ($ps + 1), 'type' => 'image', 'pc_src' => wb_str(wb_prop($p, 'src'), 500), 'mobile_src' => wb_str(wb_prop($p, 'mobileSrc'), 500), 'alt' => wb_str(wb_prop($p, 'alt'), 190), 'link' => wb_str(wb_prop($p, 'href'), 500), 'target' => wb_str(wb_prop($p, 'target', '_self'), 20), 'pages_json' => '["main"]', 'position_json' => '{}', 'size_json' => '{}', 'sort' => $ps++, 'status' => wb_prop($p, 'enabled') === false ? 'draft' : 'published', 'hide_rule' => 'today', 'reshow_hours' => 24, 'devices' => 'all', 'priority' => 0, 'options_json' => '{}', 'created_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'updated_at' => $n)); $report['popups']++; }
  wb_insert('seo', array('site_id' => (int)$siteId, 'scope' => 'site', 'page_id' => null, 'title' => $siteName . ' | 분양 홈페이지', 'description' => '', 'keywords' => '', 'canonical' => '', 'robots' => 'index,follow', 'og_json' => wb_enc(array('title' => '', 'description' => '', 'image' => $shareImage)), 'structured_json' => wb_enc(array('@context' => 'https://schema.org', '@type' => 'Organization', 'name' => $siteName, 'telephone' => !empty($opts['site']['tel']) ? $opts['site']['tel'] : wb_prop($site, 'tel', ''))), 'verification_json' => wb_enc(array('google' => '', 'naver' => '')), 'updated_at' => $n));
  return $report;
}
function wb_create_page($siteId, $key, $title, $type, $content, $userId, $sort, $publish, $layoutType = '', $category = '') {
  $n = wb_now();
  $pageId = wb_insert('pages', array('site_id' => (int)$siteId, 'key' => $key, 'title' => $title, 'type' => $type, 'layout_type' => $layoutType ? $layoutType : '', 'category' => $category ? $category : '', 'status' => $publish ? 'published' : 'draft', 'sort' => (int)$sort, 'created_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'updated_at' => $n));
  $vid = wb_insert('page_versions', array('page_id' => $pageId, 'version_no' => 1, 'status' => $publish ? 'published' : 'draft', 'content_json' => wb_enc($content), 'note' => '초기 등록', 'created_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'published_at' => $publish ? $n : null));
  wb_update('pages', array('draft_version_id' => $vid, 'published_version_id' => $publish ? $vid : null), 'id = ?', array($pageId));
  return $pageId;
}
function wb_copy_site($fromId, $toId, $userId) {
  $n = wb_now();
  foreach (wb_all('SELECT group_key, data_json FROM settings WHERE site_id = ?', array((int)$fromId)) as $s) { wb_put_setting($toId, $s['group_key'], wb_json_safe($s['data_json'], new stdClass()), $userId); }
  foreach (wb_all('SELECT * FROM menus WHERE site_id = ?', array((int)$fromId)) as $m) { $mid = wb_insert('menus', array('site_id' => (int)$toId, 'key' => $m['key'], 'name' => $m['name'], 'updated_at' => $n)); $map = array(); foreach (wb_all('SELECT * FROM menu_items WHERE menu_id = ? ORDER BY sort, id', array((int)$m['id'])) as $it) { $row = $it; unset($row['id']); $row['menu_id'] = $mid; $row['parent_id'] = $it['parent_id'] ? (isset($map[$it['parent_id']]) ? $map[$it['parent_id']] : null) : null; $map[$it['id']] = wb_insert('menu_items', $row); } }
  foreach (wb_all('SELECT * FROM pages WHERE site_id = ? AND deleted_at IS NULL ORDER BY sort, id', array((int)$fromId)) as $p) { wb_create_page($toId, $p['key'], $p['title'], $p['type'], wb_page_content(wb_draft_version($p)), $userId, (int)$p['sort'], $p['status'] === 'published', $p['layout_type'], $p['category']); }
  foreach (wb_all('SELECT * FROM forms WHERE site_id = ?', array((int)$fromId)) as $f) { $fid = wb_insert('forms', array('site_id' => (int)$toId, 'key' => $f['key'], 'name' => $f['name'], 'settings_json' => $f['settings_json'], 'status' => $f['status'], 'version' => 1, 'updated_by' => $userId ? (int)$userId : null, 'created_at' => $n, 'updated_at' => $n)); foreach (wb_all('SELECT * FROM form_fields WHERE form_id = ? ORDER BY sort', array((int)$f['id'])) as $ff) { $row = $ff; unset($row['id']); $row['form_id'] = $fid; wb_insert('form_fields', $row); } }
  foreach (wb_all("SELECT * FROM popups WHERE site_id = ? AND status <> 'deleted'", array((int)$fromId)) as $p) { $row = $p; unset($row['id']); $row['site_id'] = (int)$toId; $row['impressions'] = 0; $row['clicks'] = 0; $row['pc_media_id'] = null; $row['mobile_media_id'] = null; $row['video_media_id'] = null; $row['poster_media_id'] = null; $row['created_at'] = $n; wb_insert('popups', $row); }
  foreach (wb_all("SELECT * FROM seo WHERE site_id = ? AND scope = 'site'", array((int)$fromId)) as $s) { $row = $s; unset($row['id']); $row['site_id'] = (int)$toId; $row['favicon_media_id'] = null; $row['share_image_media_id'] = null; wb_insert('seo', $row); }
}

/* ---------- 페이지 · 버전 ---------- */
function wb_no_popup_button($sections) { $out = array(); foreach ((array)$sections as $s) { if (!$s || wb_prop($s, 'type') === 'block:popupButton') { continue; } if (wb_prop($s, 'type') === 'block:section') { $data = wb_prop($s, 'data'); if ($data && is_array(wb_prop($data, 'items'))) { $items = array(); foreach (wb_prop($data, 'items') as $it) { if ($it && wb_prop($it, 'type') !== 'popupButton') { $items[] = $it; } } if (is_object($data)) { $data->items = $items; } else { $data['items'] = $items; if (is_object($s)) { $s->data = $data; } else { $s['data'] = $data; } } } } $out[] = $s; } return $out; }
function wb_page_content($v) { $c = $v ? wb_json_safe($v['content_json'], new stdClass()) : new stdClass(); if (!is_object($c)) { $c = new stdClass(); } if (isset($c->sections) && is_array($c->sections)) { $c->sections = wb_no_popup_button($c->sections); } return $c; }
function wb_new_version($pageId, $content, $status, $note, $userId) { $no = wb_int(wb_val('SELECT COALESCE(MAX(version_no), 0) + 1 FROM page_versions WHERE page_id = ?', array((int)$pageId)), 1); return wb_insert('page_versions', array('page_id' => (int)$pageId, 'version_no' => $no, 'status' => $status, 'content_json' => wb_enc($content), 'note' => wb_str($note, 190), 'created_by' => $userId ? (int)$userId : null, 'created_at' => wb_now())); }
function wb_draft_version(&$page, $forWrite = true) {
  $v = !empty($page['draft_version_id']) ? wb_get('SELECT * FROM page_versions WHERE id = ?', array((int)$page['draft_version_id'])) : null;
  if ($v && $forWrite && !empty($page['published_version_id']) && (int)$v['id'] === (int)$page['published_version_id']) { $vid = wb_new_version((int)$page['id'], wb_page_content($v), 'draft', '초안 분리', null); wb_update('pages', array('draft_version_id' => $vid), 'id = ?', array((int)$page['id'])); $page['draft_version_id'] = $vid; $v = wb_get('SELECT * FROM page_versions WHERE id = ?', array($vid)); }
  if (!$v) { $pub = !empty($page['published_version_id']) ? wb_get('SELECT * FROM page_versions WHERE id = ?', array((int)$page['published_version_id'])) : null; $vid = wb_new_version((int)$page['id'], $pub ? wb_page_content($pub) : array('sections' => array(), 'styles' => new stdClass()), 'draft', '초안 생성', null); wb_update('pages', array('draft_version_id' => $vid), 'id = ?', array((int)$page['id'])); $page['draft_version_id'] = $vid; $v = wb_get('SELECT * FROM page_versions WHERE id = ?', array($vid)); }
  return $v;
}
function wb_save_draft($page, $content, $snapshot, $note, $userId) {
  $d = wb_draft_version($page);
  wb_update('page_versions', array('content_json' => wb_enc($content), 'created_by' => $userId ? (int)$userId : null), 'id = ?', array((int)$d['id']));
  $status = in_array($page['status'], array('published', 'scheduled', 'stopped'), true) ? $page['status'] : ($snapshot ? 'saved' : 'draft');
  $title = $page['type'] === 'main' ? $page['title'] : wb_substr((string)(wb_path($content, 'page.title', '') ? wb_path($content, 'page.title', '') : $page['title']), 150);
  wb_update('pages', array('status' => $status, 'updated_at' => wb_now(), 'title' => $title, 'layout_type' => wb_str(wb_path($content, 'page.layoutType', $page['layout_type'] ? $page['layout_type'] : ''), 40), 'category' => wb_str(wb_path($content, 'page.category', $page['category'] ? $page['category'] : ''), 60)), 'id = ?', array((int)$page['id']));
  $vid = $snapshot ? wb_new_version((int)$page['id'], $content, 'saved', $note ? $note : '임시저장', $userId) : null;
  $after = wb_get('SELECT * FROM pages WHERE id = ?', array((int)$page['id']));
  return array('draft_id' => (int)$d['id'], 'snapshot_id' => $vid, 'status' => $status, 'pub_state' => $after ? wb_page_row($after)['pub_state'] : 'waiting', 'version_no' => $vid ? (int)wb_val('SELECT version_no FROM page_versions WHERE id = ?', array($vid)) : null);
}
function wb_publish_page($page, $note, $userId) {
  $content = wb_page_content(wb_draft_version($page));
  $vid = wb_new_version((int)$page['id'], $content, 'published', $note ? $note : '게시', $userId);
  wb_update('page_versions', array('published_at' => wb_now()), 'id = ?', array($vid));
  wb_run("UPDATE page_versions SET status = 'archived' WHERE page_id = ? AND status = 'published' AND id <> ?", array((int)$page['id'], $vid));
  wb_update('pages', array('status' => 'published', 'published_version_id' => $vid, 'publish_at' => null, 'updated_at' => wb_now()), 'id = ?', array((int)$page['id']));
  return $vid;
}
function wb_published_content($page) { if (empty($page['published_version_id'])) { return null; } $v = wb_get('SELECT content_json FROM page_versions WHERE id = ?', array((int)$page['published_version_id'])); return $v ? wb_page_content($v) : null; }
function wb_versions($pageId) { return array_map(function ($r) { return wb_ints($r, array('id', 'version_no')); }, wb_all('SELECT v.id, v.version_no, v.status, v.note, v.created_at, v.published_at, u.name AS user_name FROM page_versions v LEFT JOIN users u ON u.id = v.created_by WHERE v.page_id = ? ORDER BY v.version_no DESC LIMIT 100', array((int)$pageId))); }
/* 초안과 게시본의 내용이 같은가 (같으면 고친 것이 없음 → 게시됨) */
function wb_same_version_content($dv, $pv) {
  if (!$dv || !$pv) { return false; }
  if ((int)$dv === (int)$pv) { return true; }
  $r = wb_get('SELECT d.content_json AS a, v.content_json AS b FROM page_versions d, page_versions v WHERE d.id = ? AND v.id = ?', array((int)$dv, (int)$pv));
  return $r ? ((string)$r['a'] === (string)$r['b']) : false;
}
function wb_page_row($p) {
  $dv = isset($p['draft_version_id']) ? (int)$p['draft_version_id'] : 0; $pv = isset($p['published_version_id']) ? (int)$p['published_version_id'] : 0;
  $pubState = 'waiting';
  if ($p['status'] === 'stopped') { $pubState = 'hidden'; }
  elseif ($pv && ($dv === $pv || $dv === 0 || wb_same_version_content($dv, $pv))) { $pubState = 'published'; }
  return array('pub_state' => $pubState, 'draft_version_id' => $dv, 'published_version_id' => $pv, 'published_at' => isset($p['published_at']) ? $p['published_at'] : null,
    'id' => (int)$p['id'], 'key' => $p['key'], 'title' => $p['title'], 'type' => $p['type'], 'status' => $p['status'], 'layout_type' => $p['layout_type'], 'category' => $p['category'], 'sort' => (int)$p['sort'], 'updated_at' => $p['updated_at'], 'publish_at' => $p['publish_at'], 'deleted_at' => $p['deleted_at']); }

/* ---------- 폼 (규칙은 wb-core 와 동일) ---------- */
function wb_field_full($type, $width) { return $width === 'full' || ($width !== 'half' && in_array($type, array('textarea', 'checkbox', 'radio', 'consent', 'custom', 'hidden'), true)); }
function wb_new_fid() { return 'f' . substr(base_convert((string)time(), 10, 36), -4) . substr(str_shuffle('abcdefghijklmnopqrstuvwxyz0123456789'), 0, 6); }
function wb_field_id($v) { if (is_string($v) && preg_match('/^f[0-9a-z]{1,14}$/', $v)) { return $v; } if (is_int($v) && $v > 0) { return 'f' . $v; } return wb_new_fid(); }
function wb_normalize_fields($fields) { $used = array(); $out = array(); $types = wb_field_types(); $i = 0; foreach ((array)$fields as $f) { $f = wb_arr($f); $type = isset($f['type']) && isset($types[$f['type']]) ? $f['type'] : 'text'; $width = isset($f['width']) && in_array($f['width'], array('half', 'full', 'auto'), true) ? $f['width'] : 'full'; $id = wb_field_id(isset($f['id']) ? $f['id'] : null); if (isset($used[$id])) { $id = wb_new_fid(); } $used[$id] = true; $name = preg_replace('/[^a-zA-Z0-9_]/', '', wb_str(isset($f['name']) ? $f['name'] : '')); $out[] = array('id' => $id, 'enabled' => !(isset($f['enabled']) && $f['enabled'] === false), 'name' => $name !== '' ? $name : 'field' . $i, 'type' => $type, 'label' => wb_str(isset($f['label']) ? $f['label'] : '', 120), 'description' => wb_str(isset($f['description']) ? $f['description'] : '', 250), 'placeholder' => wb_str(isset($f['placeholder']) ? $f['placeholder'] : '', 160), 'required' => !empty($f['required']), 'full' => wb_field_full($type, $width), 'width' => $width, 'options' => array_values(array_filter(array_map('strval', (array)(isset($f['options']) ? $f['options'] : array())), function ($o) { return $o !== ''; })), 'validation' => isset($f['validation']) && is_array($f['validation']) ? $f['validation'] : new stdClass(), 'defaultValue' => wb_str(isset($f['defaultValue']) ? $f['defaultValue'] : '', 250)); $i++; } return $out; }
function wb_form_schema($formId, $preferDraft = false) {
  if ($preferDraft) { $d = wb_form_draft($formId); if ($d) { return $d; } }
  $f = wb_get('SELECT * FROM forms WHERE id = ?', array((int)$formId)); if (!$f) { return array('key' => '', 'fields' => array(), 'settings' => new stdClass()); }
  $fields = array(); foreach (wb_all('SELECT * FROM form_fields WHERE form_id = ? ORDER BY sort, id', array((int)$formId)) as $r) { $fields[] = array('id' => $r['fid'] ? $r['fid'] : 'f' . $r['id'], 'enabled' => (int)$r['enabled'] === 1, 'name' => $r['key'], 'type' => $r['type'], 'label' => $r['label'], 'description' => $r['description'] ? $r['description'] : '', 'placeholder' => $r['placeholder'] ? $r['placeholder'] : '', 'required' => (int)$r['required'] === 1, 'full' => wb_field_full($r['type'], $r['width']), 'width' => $r['width'], 'options' => wb_arr($r['options_json']), 'validation' => wb_json_safe($r['validation_json'], new stdClass()), 'defaultValue' => $r['default_value'] ? $r['default_value'] : ''); }
  return array('id' => (int)$f['id'], 'key' => $f['key'], 'name' => $f['name'], 'version' => (int)$f['version'], 'status' => $f['status'], 'settings' => wb_json_safe($f['settings_json'], new stdClass()), 'fields' => $fields);
}
function wb_form_draft($formId) { $f = wb_get('SELECT id, `key`, name, version, status, draft_json FROM forms WHERE id = ?', array((int)$formId)); if (!$f || empty($f['draft_json'])) { return null; } $d = wb_json_safe($f['draft_json'], null); if (!is_object($d)) { return null; } return array('id' => (int)$f['id'], 'key' => $f['key'], 'name' => $f['name'], 'version' => (int)$f['version'] + 1, 'status' => $f['status'], 'draft' => true, 'settings' => isset($d->settings) && is_object($d->settings) ? $d->settings : new stdClass(), 'fields' => wb_normalize_fields(isset($d->fields) ? $d->fields : array())); }
function wb_save_form_draft($formId, $settings, $fields, $userId) { wb_update('forms', array('draft_json' => wb_enc(array('settings' => wb_is_obj($settings) ? $settings : new stdClass(), 'fields' => wb_normalize_fields($fields), 'saved_at' => wb_now(), 'saved_by' => $userId ? (int)$userId : null)), 'updated_by' => $userId ? (int)$userId : null, 'updated_at' => wb_now()), 'id = ?', array((int)$formId)); }
function wb_discard_form_draft($formId) { wb_update('forms', array('draft_json' => null), 'id = ?', array((int)$formId)); }
function wb_save_form($formId, $settings, $fields, $userId) {
  wb_tx(function () use ($formId, $settings, $fields, $userId) {
    wb_update('forms', array('settings_json' => wb_enc($settings), 'updated_by' => $userId ? (int)$userId : null, 'updated_at' => wb_now()), 'id = ?', array((int)$formId));
    wb_run('UPDATE forms SET version = version + 1 WHERE id = ?', array((int)$formId));
    wb_del('form_fields', 'form_id = ?', array((int)$formId));
    $sort = 0; $seen = array(); $types = wb_field_types();
    foreach ((array)$fields as $f) { $f = wb_arr($f); $key = preg_replace('/[^a-zA-Z0-9_]/', '', wb_str(isset($f['name']) ? $f['name'] : '')); if ($key === '') { $key = 'field' . $sort; } while (isset($seen[$key])) { $key .= '_' . $sort; } $seen[$key] = true; $type = isset($f['type']) && isset($types[$f['type']]) ? $f['type'] : 'text'; wb_insert('form_fields', array('form_id' => (int)$formId, 'fid' => wb_field_id(isset($f['id']) ? $f['id'] : null), 'key' => $key, 'type' => $type, 'label' => wb_str(isset($f['label']) ? $f['label'] : '', 120), 'description' => wb_str(isset($f['description']) ? $f['description'] : '', 250), 'placeholder' => wb_str(isset($f['placeholder']) ? $f['placeholder'] : '', 160), 'required' => !empty($f['required']) ? 1 : 0, 'width' => isset($f['width']) && in_array($f['width'], array('half', 'full', 'auto'), true) ? $f['width'] : 'full', 'options_json' => wb_enc(array_values(array_filter(array_map('strval', (array)(isset($f['options']) ? $f['options'] : array())), function ($o) { return $o !== ''; }))), 'validation_json' => wb_enc(isset($f['validation']) ? $f['validation'] : new stdClass()), 'default_value' => wb_str(isset($f['defaultValue']) ? $f['defaultValue'] : '', 250), 'sort' => $sort++, 'enabled' => (isset($f['enabled']) && $f['enabled'] === false) ? 0 : 1)); }
  });
}
function wb_promote_form_drafts($siteId, $userId) { $n = 0; foreach (wb_all('SELECT id FROM forms WHERE site_id = ? AND draft_json IS NOT NULL', array((int)$siteId)) as $f) { $d = wb_form_draft((int)$f['id']); if ($d) { wb_save_form((int)$f['id'], $d['settings'], $d['fields'], $userId); $n++; } wb_update('forms', array('draft_json' => null), 'id = ?', array((int)$f['id'])); } return $n; }

/* ---------- 게시 데이터 번들 : 관리자 브라우저(공용 코어)가 컴파일할 행 묶음 ---------- */
function wb_bundle($c, $s) {
  $siteId = (int)$s['id'];
  $pages = array(); foreach (wb_all('SELECT * FROM pages WHERE site_id = ? AND deleted_at IS NULL ORDER BY sort, id', array($siteId)) as $p) { $row = wb_ints($p, array('id', 'site_id', 'sort', 'draft_version_id', 'published_version_id')); $row['draft'] = wb_page_content(wb_draft_version($p, false)); $row['published'] = in_array($p['status'], array('published', 'scheduled'), true) ? wb_published_content($p) : null; $pages[] = $row; }
  $forms = array(); $formFields = new stdClass(); foreach (wb_all('SELECT * FROM forms WHERE site_id = ?', array($siteId)) as $f) { $f = wb_ints($f, array('id', 'site_id', 'version')); $forms[] = $f; $formFields->{$f['id']} = array_map(function ($r) { return wb_ints($r, array('id', 'form_id', 'required', 'sort', 'enabled')); }, wb_all('SELECT * FROM form_fields WHERE form_id = ? ORDER BY sort, id', array((int)$f['id']))); }
  $media = new stdClass(); foreach (wb_all('SELECT * FROM media WHERE site_id = ? AND deleted_at IS NULL', array($siteId)) as $m) { $media->{$m['id']} = wb_ints($m, array('id', 'site_id', 'size', 'width', 'height')); }
  $menu = wb_get("SELECT id FROM menus WHERE site_id = ? AND `key` = 'main'", array($siteId));
  $src = array('site' => array('id' => $siteId, 'key' => $s['key'], 'name' => $s['name'], 'tel' => $s['tel'] ? $s['tel'] : '', 'public_url' => $s['public_url'] ? $s['public_url'] : '', 'advertiser_id' => $s['advertiser_id'] ? (int)$s['advertiser_id'] : null), 'settings' => wb_all('SELECT group_key, data_json FROM settings WHERE site_id = ?', array($siteId)), 'pages' => $pages, 'seo' => array_map(function ($r) { return wb_ints($r, array('id', 'site_id', 'page_id', 'favicon_media_id', 'share_image_media_id', 'noindex')); }, wb_all('SELECT * FROM seo WHERE site_id = ?', array($siteId))), 'forms' => $forms, 'formFields' => $formFields, 'popups' => array_map(function ($r) { return wb_ints($r, array('id', 'site_id', 'pc_media_id', 'mobile_media_id', 'video_media_id', 'poster_media_id', 'sort', 'reshow_hours', 'impressions', 'clicks', 'priority')); }, wb_all("SELECT * FROM popups WHERE site_id = ? AND status <> 'deleted' ORDER BY priority DESC, sort, id", array($siteId))), 'media' => $media, 'menuItems' => $menu ? array_map(function ($r) { return wb_ints($r, array('id', 'menu_id', 'parent_id', 'sort', 'enabled')); }, wb_all('SELECT * FROM menu_items WHERE menu_id = ? ORDER BY sort, id', array((int)$menu['id']))) : array(), 'maxVersion' => wb_int(wb_val('SELECT COALESCE(MAX(version_no), 0) FROM publish_snapshots WHERE site_id = ?', array($siteId))));
  $hosted = wb_site_hosted_here($c, $s);
  return array('src' => $src, 'base' => wb_media_base($c), 'self' => $c['selfUrl'] . '/assets', 'publicBase' => '', 'platform' => 'php', 'publicUrl' => wb_site_url($s), 'hosted' => $hosted, 'siteApi' => './api/index.php?r=', 'reserve' => './api/index.php?r=/public/' . rawurlencode($s['key']) . '/forms/reserve', 'analytics' => true, 'allow' => array());
}
/* ---------- 게시 결과 저장 : 관리자 브라우저가 만든 index.html · sitemap · robots · 폼 구성 → 홈페이지 폴더 + 게시 버전 기록 ---------- */
function wb_publish_result($c, $s) {
  $b = $c['body']; $siteId = (int)$s['id'];
  $no = wb_int(wb_val('SELECT COALESCE(MAX(version_no), 0) + 1 FROM publish_snapshots WHERE site_id = ?', array($siteId)), 1);
  if (wb_int(isset($b['version']) ? $b['version'] : 0) !== $no) { throw new WbHttpError(409, '게시 버전이 맞지 않습니다 (서버 v' . $no . ' · 보낸 v' . wb_int(isset($b['version']) ? $b['version'] : 0) . '). 화면을 새로 고친 뒤 다시 게시해 주세요.', array('version' => $no)); }
  $html = isset($b['html']) ? (string)$b['html'] : ''; $data = wb_bo($c, 'data'); if ($html === '' || !is_object($data)) { throw new WbHttpError(422, '게시 파일 또는 게시 데이터가 없습니다.'); }
  if (strpos($html, '"version":' . $no) === false) { throw new WbHttpError(422, '게시 파일의 버전이 맞지 않습니다.'); }
  if (preg_match('#https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(?![\w.-])#i', $html)) { throw new WbHttpError(422, '게시 파일에 localhost 주소가 남아 있어 저장하지 않았습니다.'); }
  if (!isset($data->cms) || !is_object($data->cms)) { $data->cms = new stdClass(); } $data->cms->version = $no; $data->cms->publishedAt = wb_now(); $data->cms->publishedBy = $c['user']['name'];
  $json = wb_enc($data);
  $sid = wb_insert('publish_snapshots', array('site_id' => $siteId, 'version_no' => $no, 'content_json' => $json, 'note' => wb_str(isset($b['note']) ? $b['note'] : '', 190), 'created_by' => (int)$c['user']['id'], 'created_at' => wb_now(), 'summary_json' => isset($b['summary']) ? wb_enc(wb_bo($c, 'summary')) : null, 'status' => 'published'));
  $hosted = wb_site_hosted_here($c, $s);
  $root = $hosted ? WB_WEB_ROOT : WB_DATA_DIR . '/published/' . preg_replace('/[^a-z0-9_\-]/', '', $s['key']); if (!is_dir($root)) { @mkdir($root, 0755, true); }
  /* 새 파일 검증 : 게시 데이터 · 닫는 태그 · 최소 크기 — 이상하면 파일을 건드리지 않고 중단 */
  $bad = array();
  if (strpos($html, 'window.CMS_PUBLISHED') === false) { $bad[] = '게시 데이터(window.CMS_PUBLISHED)'; }
  if (stripos($html, '</html>') === false) { $bad[] = '닫는 태그(</html>)'; }
  if (strlen($html) < 20000) { $bad[] = '파일 크기(' . strlen($html) . ' bytes)'; }
  if (count($bad)) { wb_update('publish_snapshots', array('status' => 'failed', 'result_json' => wb_enc(array('error' => '새 게시 파일 검증 실패 : ' . implode(' · ', $bad)))), 'id = ?', array($sid)); throw new WbHttpError(422, '새로 만든 게시 파일이 올바르지 않아 저장하지 않았습니다 (' . implode(' · ', $bad) . '). 지금 공개 홈페이지는 그대로입니다.'); }
  $files = array(array('index.html', $html), array('sitemap.xml', isset($b['sitemap']) ? (string)$b['sitemap'] : ''), array('robots.txt', isset($b['robots']) ? (string)$b['robots'] : '')); $written = 0; $failed = array();
  $backup = wb_publish_backup_current($c, $s, 'v' . $no);   /* 게시 전 자동 백업 : 지금 공개 중인 홈페이지 */
  foreach ($files as $f) { if ($f[1] === '') { continue; } if (wb_write_atomic($root . '/' . $f[0], $f[1])) { $written++; } else { $failed[] = $f[0]; } }
  /* 저장 뒤 다시 읽어 확인 : 다르면 방금 만든 백업본으로 되돌림 */
  if (!in_array('index.html', $failed, true)) {
    $after = (string)@file_get_contents($root . '/index.html');
    if ($after === '' || strlen($after) !== strlen($html) || strpos($after, 'window.CMS_PUBLISHED') === false) {
      $back = $backup ? wb_publish_backup_dir($s) . '/' . $backup : '';
      $restored = ($back && is_file($back)) ? @copy($back, $root . '/index.html') : false;
      wb_update('publish_snapshots', array('status' => 'failed', 'result_json' => wb_enc(array('error' => '저장 후 확인 실패' . ($restored ? ' · 이전 홈페이지로 되돌림' : '')))), 'id = ?', array($sid));
      throw new WbHttpError(500, '게시 파일을 저장한 뒤 확인하는 데 실패했습니다.' . ($restored ? ' 이전 홈페이지로 되돌렸습니다.' : ' 게시 이력 화면에서 백업본으로 복원할 수 있습니다.'));
    }
  }
  if (in_array('index.html', $failed, true)) { wb_update('publish_snapshots', array('status' => 'failed', 'result_json' => wb_enc(array('error' => 'index.html 저장 실패'))), 'id = ?', array($sid)); throw new WbHttpError(500, '홈페이지 폴더(' . ($hosted ? '/' : 'api/data/published') . ')에 index.html 을 저장할 수 없습니다. 폴더 · 파일 쓰기 권한(707 또는 755 · 파일 666)을 확인해 주세요.', array('failedStep' => 'upload', 'version' => $no)); }
  /* 접수 API 검증용 폼 구성 : 게시된 폼 기준 (wb-api 호환 파일도 함께) */
  $form = wb_bo($c, 'form'); if (is_object($form)) { $fd = WB_DATA_DIR . '/forms'; if (!is_dir($fd)) { @mkdir($fd, 0755, true); } wb_write_atomic($fd . '/' . preg_replace('/[^a-z0-9_\-]/', '', $s['key']) . '.php', "<?php exit; ?>\n" . wb_enc($form)); if ($hosted) { $wd = WB_WEB_ROOT . '/wb-api/data'; if (is_dir($wd) || @mkdir($wd, 0755, true)) { @wb_write_atomic($wd . '/form.php', "<?php exit; ?>\n" . wb_enc($form)); } } }
  wb_update('sites', array('published_snapshot_id' => $sid, 'last_published_at' => wb_now(), 'updated_at' => wb_now()), 'id = ?', array($siteId));
  $promoted = wb_promote_form_drafts($siteId, (int)$c['user']['id']);
  $out = array('ok' => true, 'status' => 'published', 'version' => $no, 'snapshot_id' => $sid, 'bytes' => strlen($html), 'publicUrl' => wb_site_url($s) . '/index.html', 'domain' => wb_host_of($s['public_url'] ? $s['public_url'] : ''), 'deploy' => array('ok' => true, 'mode' => 'server', 'files' => $written, 'target' => $hosted ? '홈페이지 폴더(/)' : 'api/data/published/' . $s['key'], 'hosted' => $hosted), 'formsPromoted' => $promoted, 'backup' => $backup, 'files' => array_values(array_filter(array_map(function ($f) { return $f[1] === '' ? null : $f[0]; }, $files))));
  if (!$hosted) { $out['warning'] = '이 서버의 도메인(' . $c['host'] . ')과 사이트의 공개 주소(' . wb_host_of($s['public_url']) . ')가 달라 게시 파일을 api/data/published/ 에 저장했습니다. [게시된 index.html 내려받기]로 받아 그 사이트의 서버에 올려 주세요.'; }
  if (!empty($b['restoredFrom'])) { $out['restoredFrom'] = wb_int($b['restoredFrom']); }
  wb_update('publish_snapshots', array('result_json' => wb_enc($out), 'deployed' => 'server:' . wb_now()), 'id = ?', array($sid));
  wb_log($c, $siteId, 'site.publish', 'site', $siteId, '사이트 게시 v' . $no . ' · 게시 파일 저장 ' . $written . '개' . (!empty($out['restoredFrom']) ? ' · v' . $out['restoredFrom'] . ' 복원' : ''));
  return $out;
}
/* 게시 백업 : api/data/published/backups/{사이트}/index-날짜-시각-v번호.html (주소로 열 수 없는 데이터 폴더) */
function wb_publish_backup_dir($s) { return WB_DATA_DIR . '/published/backups/' . preg_replace('/[^a-z0-9_\-]/', '', $s['key']); }
function wb_publish_backup_current($c, $s, $tag) {
  try { $cur = wb_published_html_path($c, $s); if (!is_file($cur)) { return ''; } $dir = wb_publish_backup_dir($s); if (!is_dir($dir) && !@mkdir($dir, 0755, true)) { wb_log_error('publish backup: mkdir'); return ''; }
    $name = 'index-' . date('Ymd-His') . (preg_match('/^v[0-9]+$/', (string)$tag) ? '-' . $tag : '') . '.html'; if (!@copy($cur, $dir . '/' . $name)) { wb_log_error('publish backup: copy failed'); return ''; }
    $all = glob($dir . '/index-*.html'); if ($all && count($all) > 30) { sort($all); foreach (array_slice($all, 0, count($all) - 30) as $old) { @unlink($old); } }
    return $name; } catch (Exception $e) { wb_log_error('publish backup: ' . $e->getMessage()); return ''; }
}
function wb_publish_backups($s) { $dir = wb_publish_backup_dir($s); $out = array(); $all = is_dir($dir) ? glob($dir . '/index-*.html') : array(); if (!$all) { return $out; } rsort($all); foreach ($all as $f) { $n = basename($f); $ver = preg_match('/-v([0-9]+)\.html$/', $n, $m) ? (int)$m[1] : null; $out[] = array('name' => $n, 'bytes' => (int)@filesize($f), 'at' => date('Y-m-d H:i:s', (int)@filemtime($f)), 'beforeVersion' => $ver); } return $out; }
function wb_publish_current_info($c, $s) { $f = wb_published_html_path($c, $s); if (!is_file($f)) { return null; } $h = (string)@file_get_contents($f, false, null, 0, 400000); $v = preg_match('/"cms":\{[^}]*"version":([0-9]+)/', $h, $m) ? (int)$m[1] : null; $tpl = preg_match('/<meta name="wb-tpl" content="([^"]*)"/', $h, $m2) ? $m2[1] : ''; return array('bytes' => (int)@filesize($f), 'at' => date('Y-m-d H:i:s', (int)@filemtime($f)), 'version' => $v, 'tpl' => $tpl); }
function wb_published_html_path($c, $s) { return wb_site_hosted_here($c, $s) ? WB_WEB_ROOT . '/index.html' : WB_DATA_DIR . '/published/' . preg_replace('/[^a-z0-9_\-]/', '', $s['key']) . '/index.html'; }
/* 게시 상태 : 바뀐 페이지(초안 ≠ 게시본) · 폼 초안 · 마지막 게시 */
function wb_publish_state($c, $s) {
  $siteId = (int)$s['id']; $pagesOut = array(); $dirtyPages = 0;
  foreach (wb_all('SELECT * FROM pages WHERE site_id = ? AND deleted_at IS NULL ORDER BY sort, id', array($siteId)) as $pg) { $draft = wb_enc(wb_page_content(wb_draft_version($pg, false))); $pub = $pg['published_version_id'] ? wb_enc(wb_published_content($pg)) : ''; if ($draft === $pub) { continue; } $changed = 1; $pagesOut[] = array('id' => (int)$pg['id'], 'title' => $pg['title'], 'status' => $pg['status'], 'changes' => $changed, 'current' => false); if ($pg['status'] === 'published') { $dirtyPages++; } }
  $formDrafts = wb_int(wb_val('SELECT COUNT(*) FROM forms WHERE site_id = ? AND draft_json IS NOT NULL', array($siteId)));
  $last = wb_get('SELECT v.id, v.version_no, v.note, v.created_at, v.status, v.result_json, u.name AS user_name FROM publish_snapshots v LEFT JOIN users u ON u.id = v.created_by WHERE v.site_id = ? ORDER BY v.id DESC LIMIT 1', array($siteId));
  $cur = $s['published_snapshot_id'] ? wb_get('SELECT v.id, v.version_no, v.created_at, v.status, u.name AS user_name FROM publish_snapshots v LEFT JOIN users u ON u.id = v.created_by WHERE v.id = ?', array((int)$s['published_snapshot_id'])) : null;
  $settingsChanged = false; if ($cur) { $lastSet = wb_val('SELECT MAX(updated_at) FROM settings WHERE site_id = ?', array($siteId)); $lastMenu = wb_val('SELECT MAX(updated_at) FROM menus WHERE site_id = ?', array($siteId)); $lastPop = wb_val('SELECT MAX(updated_at) FROM popups WHERE site_id = ?', array($siteId)); $lastSeo = wb_val('SELECT MAX(updated_at) FROM seo WHERE site_id = ?', array($siteId)); foreach (array($lastSet, $lastMenu, $lastPop, $lastSeo) as $t) { if ($t && $t > $cur['created_at']) { $settingsChanged = true; } } }
  $dirty = !$cur || $dirtyPages > 0 || $formDrafts > 0 || $settingsChanged; $res = $last ? wb_json_safe($last['result_json'], null) : null;
  return array('dirty' => $dirty, 'pages' => $pagesOut, 'formDrafts' => $formDrafts, 'settingsChanged' => $settingsChanged, 'never' => !$cur, 'mode' => 'server', 'relay' => false, 'publicUrl' => wb_site_url($s) ? wb_site_url($s) . '/index.html' : '', 'domain' => wb_host_of($s['public_url'] ? $s['public_url'] : ''), 'hosted' => wb_site_hosted_here($c, $s),
    'current' => $cur ? array('version' => (int)$cur['version_no'], 'at' => $cur['created_at'], 'by' => $cur['user_name'] ? $cur['user_name'] : '', 'status' => $cur['status'] ? $cur['status'] : 'published') : null,
    'last' => $last ? array('version' => (int)$last['version_no'], 'at' => $last['created_at'], 'by' => $last['user_name'] ? $last['user_name'] : '', 'status' => $last['status'] ? $last['status'] : 'published', 'error' => $res ? (string)wb_prop($res, 'error', '') : '', 'failedStep' => $res ? (string)wb_prop($res, 'failedStep', '') : '', 'warning' => $res ? (string)wb_prop($res, 'warning', '') : '', 'verify' => $res ? wb_prop($res, 'verify') : null, 'deploy' => $res && wb_prop($res, 'deploy') ? array('mode' => 'server', 'files' => wb_int(wb_prop(wb_prop($res, 'deploy'), 'files')), 'uploaded' => 0, 'target' => (string)wb_prop(wb_prop($res, 'deploy'), 'target', ''), 'error' => '') : null) : null, 'job' => null);
}
/* 게시 전 점검(간단) : 필수 동의 항목 · SEO · 공개 주소 */
function wb_publish_check($s, $currentPageId = 0) {
  $st = wb_publish_state(array('host' => '', 'config' => array()), $s); $summary = array('pages' => $st['pages'], 'text' => 0, 'images' => 0, 'links' => 0, 'deleted' => 0, 'added' => 0, 'mobile' => 0, 'forms' => $st['formDrafts']);
  foreach ($summary['pages'] as $i => $p) { $summary['pages'][$i]['current'] = (int)$p['id'] === (int)$currentPageId; }
  $issues = array(); $form = wb_get("SELECT id, settings_json FROM forms WHERE site_id = ? AND `key` = 'reserve'", array((int)$s['id']));
  if ($form) { $agree = wb_prop(wb_json_safe($form['settings_json'], new stdClass()), 'agreements', array()); if (!count((array)$agree) && !wb_int(wb_val("SELECT COUNT(*) FROM form_fields WHERE form_id = ? AND type = 'consent'", array((int)$form['id'])))) { $issues[] = array('level' => 'error', 'text' => '방문예약 폼에 개인정보 수집 동의 항목이 없습니다.'); } }
  $seo = wb_get("SELECT title, description FROM seo WHERE site_id = ? AND scope = 'site'", array((int)$s['id'])); if (!$seo || empty($seo['title']) || empty($seo['description'])) { $issues[] = array('level' => 'info', 'text' => 'SEO 제목 또는 설명이 비어 있습니다. (SEO 메뉴에서 입력)'); }
  if (empty($s['public_url']) || preg_match('/example\.com/', $s['public_url'])) { $issues[] = array('level' => 'warn', 'text' => '공개 홈페이지 주소가 비어 있거나 예시 주소입니다. 사이트 관리에서 실제 주소를 입력해 주세요.'); }
  $hasErr = false; foreach ($issues as $i) { if ($i['level'] === 'error') { $hasErr = true; } }
  return array('summary' => $summary, 'issues' => $issues, 'hasErrors' => $hasErr);
}
/* 공개 서버 연결 점검 : 홈페이지 폴더 쓰기 · DB · 게시 버전 · 공개 주소 응답 */
function wb_deploy_check($c, $s) {
  $checks = array(); $add = function ($key, $label, $ok, $detail = '') use (&$checks) { $checks[] = array('key' => $key, 'label' => $label, 'ok' => (bool)$ok, 'detail' => (string)$detail); };
  $hosted = wb_site_hosted_here($c, $s); $add('host', '이 서버가 공개 홈페이지를 호스팅', $hosted, $hosted ? $c['host'] . ' = ' . wb_host_of($s['public_url']) : '사이트 공개 주소(' . wb_host_of($s['public_url']) . ')와 이 서버(' . $c['host'] . ')의 도메인이 다릅니다 — 게시 파일은 api/data/published 에 저장됩니다');
  $probe = WB_WEB_ROOT . '/.wb-write-test-' . mt_rand(1000, 9999); $w = @file_put_contents($probe, 'ok') !== false; if ($w) { @unlink($probe); } $add('write', '홈페이지 폴더(index.html) 쓰기 권한', $w, $w ? '정상' : '폴더 권한을 707(또는 755) · index.html 파일 권한을 666 으로 바꿔 주세요');
  try { wb_val('SELECT COUNT(*) FROM sites'); $add('db', '데이터베이스(' . wb_db_driver() . ')', true, '정상'); } catch (Exception $e) { $add('db', '데이터베이스', false, '연결 실패'); }
  $dd = WB_DATA_DIR; $add('data', 'api/data 폴더 쓰기(로그 · 백업)', is_dir($dd) && is_writable($dd), is_dir($dd) && is_writable($dd) ? '정상' : 'api/data 폴더 권한을 707(또는 755)로 바꿔 주세요');
  $last = wb_get("SELECT version_no, status FROM publish_snapshots WHERE site_id = ? ORDER BY version_no DESC LIMIT 1", array((int)$s['id']));
  if (!$last) { $add('publish', '게시 데이터', false, '아직 게시하지 않았습니다. 상단 [게시하기]를 먼저 실행하세요.'); }
  else {
    $add('publish', '게시 데이터', true, 'v' . $last['version_no']);
    $file = wb_published_html_path($c, $s); $vf = null; if (is_file($file)) { $h = @file_get_contents($file, false, null, 0, 400000); if (preg_match('/"cms":\{[^}]*"version":(\d+)/', (string)$h, $m)) { $vf = (int)$m[1]; } }
    $add('file', '서버의 index.html 버전', is_file($file) && $vf === (int)$last['version_no'], is_file($file) ? ('파일 v' . ($vf === null ? '?' : $vf) . ' / 게시 v' . $last['version_no']) : '파일이 없습니다');
    $pub = wb_site_url($s);
    if (preg_match('#^https?://#', $pub) && function_exists('curl_init')) { $ch = curl_init($pub . '/index.html?t=' . time()); curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => true, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_USERAGENT => 'webbuilder-verify')); $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); $vp = null; if (is_string($body) && preg_match('/"cms":\{[^}]*"version":(\d+)/', $body, $m)) { $vp = (int)$m[1]; } $add('public', '공개 주소(/index.html) 응답', $code === 200 && $vp === (int)$last['version_no'], 'HTTP ' . $code . ' · 공개 버전 ' . ($vp === null ? '확인 불가' : 'v' . $vp) . ' / 게시 v' . $last['version_no']); }
    elseif (preg_match('#^https?://#', $pub)) { $add('public', '공개 주소 응답', true, 'curl 확장이 없어 서버에서 확인하지 못함 — 브라우저에서 ' . $pub . ' 을 열어 확인'); }
    else { $add('public', '공개 홈페이지 주소', false, '사이트 설정에 공개 홈페이지 주소(https://…)를 입력해 주세요.'); }
  }
  $ok = true; foreach ($checks as $k) { if (!$k['ok']) { $ok = false; } }
  return array('ok' => $ok, 'mode' => 'server', 'publicUrl' => wb_site_url($s), 'checks' => $checks);
}
