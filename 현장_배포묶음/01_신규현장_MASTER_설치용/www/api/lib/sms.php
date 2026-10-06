<?php
/* 방문예약 문자 알림 (SMS · LMS) — 운영(PHP) 서버 전용
   · 문자 업체 API 키 · 비밀키 · 발신번호는 config.php 의 'sms' 에만 둡니다 (HTML · JavaScript 에 절대 포함되지 않음)
   · 수신자는 서버가 DB 권한으로만 결정 : 활성 계정 + '방문예약 문자 수신' 켬 + 올바른 휴대전화번호 + 그 사이트 권한(사이트 지정 · 광고주 단위 · 최고관리자)
   · 예약 저장이 끝난 뒤에만 발송 · 발송 실패는 예약 접수를 막지 않고 sms_logs 에 기록 · (예약, 수신자) 한 줄 = 중복 발송 방지
   · 업체 교체 : wb_sms_send() 의 provider 분기에 함수 하나만 추가하면 됩니다 (solapi · aligo · ncp · log · fail) */

/* ---------- 설정 ---------- */
/* 설정 파일 config/sms.php (관리자 › 시스템 · /install/ 에서 저장) — 있으면 config.php 의 'sms' 보다 우선 */
function wb_sms_file($set = null) { static $f = null; if (is_array($set)) { $f = $set; return $f; } if ($f !== null) { return $f; } $f = array(); if (defined('WB_SMS_FILE') && is_file(WB_SMS_FILE)) { $v = include WB_SMS_FILE; if (is_array($v)) { $f = $v; } } return $f; }
function wb_sms_save_file($data) {
  $keys = array('provider', 'api_key', 'api_secret', 'sender', 'user_id', 'service_id'); $out = array(); foreach ($keys as $k) { $out[$k] = isset($data[$k]) ? trim((string)$data[$k]) : ''; }
  $dir = dirname(WB_SMS_FILE); if (!is_dir($dir) && !@mkdir($dir, 0755, true)) { throw new WbHttpError(500, '설정 폴더를 만들 수 없습니다. (' . basename($dir) . ' 폴더 권한 확인)'); }
  $php = "<?php
/* 방문예약 문자 알림 설정 — 관리자 › 시스템 또는 /install/ 에서 저장됨 (주소로 열어도 아무것도 출력하지 않음 · HTML/JS 로 전달되지 않음) */
if (!defined('WB_API')) { http_response_code(404); exit; }
return " . var_export($out, true) . ";
";
  $tmp = WB_SMS_FILE . '.tmp'; if (@file_put_contents($tmp, $php, LOCK_EX) === false || !@rename($tmp, WB_SMS_FILE)) { @unlink($tmp); throw new WbHttpError(500, '문자 설정을 저장할 수 없습니다. (' . basename($dir) . ' 폴더 쓰기 권한 확인)'); }
  @chmod(WB_SMS_FILE, 0640); if (function_exists('opcache_invalidate')) { @opcache_invalidate(WB_SMS_FILE, true); }
  wb_sms_file($out);   /* 같은 요청 안에서는 방금 저장한 값 사용 (opcache 와 무관) */
  return $out;
}
function wb_sms_cfg($c) {
  $s = (isset($c['config']['sms']) && is_array($c['config']['sms'])) ? $c['config']['sms'] : array(); $file = wb_sms_file(); if (!empty($file['provider']) || array_key_exists('provider', $file)) { $s = array_merge($s, $file); }
  $g = function ($k, $d = '') use ($s) { return isset($s[$k]) ? trim((string)$s[$k]) : $d; };
  $t = (int)$g('timeout', '8');
  return array(
    'enabled' => !isset($s['enabled']) || $s['enabled'] !== false,
    'provider' => strtolower($g('provider')),
    'api_key' => $g('api_key'), 'api_secret' => $g('api_secret'),
    'sender' => wb_sms_digits($g('sender')),
    'user_id' => $g('user_id'),          /* 알리고 */
    'service_id' => $g('service_id'),    /* 네이버클라우드 SENS */
    'testmode' => !empty($s['testmode']),
    'fail_to' => array_values(array_filter(array_map('wb_sms_digits', isset($s['fail_to']) ? (array)$s['fail_to'] : array()))),   /* provider 'log' 전용 : 이 번호는 실패로 처리 (일부 실패 시험용) */
    'timeout' => max(3, min(20, $t ? $t : 8)),
  );
}
/* 발송 가능한 설정인지 — 가능하면 '' , 아니면 이유 */
function wb_sms_ready($cfg) {
  if (!$cfg['enabled'] || $cfg['provider'] === '') { return '문자 업체가 설정되지 않았습니다 (서버의 api/config.php 문자 업체 설정 확인)'; }
  $need = array('solapi' => array('api_key', 'api_secret', 'sender'), 'aligo' => array('api_key', 'user_id', 'sender'), 'ncp' => array('api_key', 'api_secret', 'service_id', 'sender'), 'log' => array(), 'fail' => array());
  if (!isset($need[$cfg['provider']])) { return '지원하지 않는 문자 업체입니다 : ' . $cfg['provider']; }
  foreach ($need[$cfg['provider']] as $k) { if ($cfg[$k] === '') { $lab = array('api_key' => 'API Key', 'api_secret' => 'API Secret', 'sender' => '발신번호', 'user_id' => '알리고 아이디', 'service_id' => 'SENS 서비스 ID'); return (isset($lab[$k]) ? $lab[$k] : $k) . ' 값이 비어 있습니다'; } }
  return '';
}

/* ---------- 번호 ---------- */
function wb_sms_digits($v) { return preg_replace('/\D+/', '', (string)$v); }
/* 휴대전화번호만 인정 (010 · 011 · 016 · 017 · 018 · 019) — 아니면 '' */
function wb_sms_mobile($v) { $d = wb_sms_digits($v); return preg_match('/^01[016789]\d{7,8}$/', $d) ? $d : ''; }
function wb_sms_pretty($v) { $d = wb_sms_digits($v); $n = strlen($d); if (substr($d, 0, 2) === '02' && ($n === 9 || $n === 10)) { return '02-' . substr($d, 2, $n - 6) . '-' . substr($d, -4); } if ($n === 8 && preg_match('/^1[5-9]/', $d)) { return substr($d, 0, 4) . '-' . substr($d, 4); } if ($n === 11) { return substr($d, 0, 3) . '-' . substr($d, 3, 4) . '-' . substr($d, 7); } if (strlen($d) === 10) { return substr($d, 0, 3) . '-' . substr($d, 3, 3) . '-' . substr($d, 6); } return $d; }
function wb_sms_mask($v) { $d = wb_sms_digits($v); if (strlen($d) < 8) { return '***'; } return substr($d, 0, 3) . '-****-' . substr($d, -4); }

/* ---------- 문구 ---------- */
function wb_sms_cut($s, $n) { $s = trim(preg_replace('/\s+/u', ' ', (string)$s)); return function_exists('mb_substr') ? mb_substr($s, 0, $n, 'UTF-8') : substr($s, 0, $n * 3); }
/* 방문예약 문자 본문 — 자동 발송 · [문자 다시 보내기] 공통 (wb_sms_context 에서만 만듦)
     {사이트명} 방문예약 알림 / (빈 줄) / 성함 · 연락처 · 방문날짜 · 방문시간 · 문의사항(없으면 "없음" · 300자 넘으면 "... (일부 생략)")
     ※ [Web발신] 은 통신사가 인터넷 발송 문자에 자동으로 붙이므로 본문에 넣지 않음 (넣으면 두 번 보임) */
define('WB_SMS_INQUIRY_MAX', 300);
function wb_sms_subject($siteName) { $t = ' 방문예약 알림'; $n = trim(preg_replace('/\s+/u', ' ', (string)$siteName)); while ($n !== '' && wb_sms_bytes($n . $t) > 40) { $n = wb_sms_substr($n, (function_exists('mb_strlen') ? mb_strlen($n, 'UTF-8') : strlen($n)) - 1); } return trim($n . $t); }   /* LMS 제목 40바이트 이내 */
function wb_sms_inquiry_text($q) { $q = trim(preg_replace('/\s+/u', ' ', (string)$q)); if ($q === '') { return '없음'; } $len = function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q); return $len <= WB_SMS_INQUIRY_MAX ? $q : rtrim(wb_sms_substr($q, WB_SMS_INQUIRY_MAX)) . '... (일부 생략)'; }   /* 문자에만 적용 · DB 원문은 그대로 */
function wb_sms_message($siteName, $sub, $inquiry = '') {
  $v = function ($x) { $x = trim(preg_replace('/\s+/u', ' ', (string)$x)); return $x === '' ? '-' : $x; };
  $lines = array(trim(preg_replace('/\s+/u', ' ', (string)$siteName)) . ' 방문예약 알림', '',
    '성함 : ' . $v(wb_sms_cut(isset($sub['name']) ? $sub['name'] : '', 40)),
    '연락처 : ' . $v(!empty($sub['phone']) ? wb_sms_pretty($sub['phone']) : ''),
    '방문날짜 : ' . $v(isset($sub['visit_date']) ? $sub['visit_date'] : ''),
    '방문시간 : ' . $v(isset($sub['visit_time']) ? $sub['visit_time'] : ''),
    '문의사항 : ' . wb_sms_inquiry_text($inquiry));
  return implode("\n", $lines);
}
/* 한글 2바이트 기준 90바이트 이하 = SMS, 넘으면 LMS */
function wb_sms_bytes($t) { return strlen(preg_replace('/[^\x00-\x7F]/u', 'xx', (string)$t)); }
function wb_sms_type($t) { return wb_sms_bytes($t) <= 90 ? 'SMS' : 'LMS'; }

/* ---------- 수신자 : 서버가 DB 권한으로만 결정 ---------- */
function wb_sms_recipients($siteId) {
  /* 현장 전용 관리자 : 활성 계정 + 휴대전화번호 + 방문예약 문자 수신 ON 이면 받음 (최고관리자도 수신 OFF 면 받지 않음) */
  $rows = wb_all("SELECT u.id, u.name, u.phone, u.role FROM users u WHERE u.status = 'active' AND u.sms_notify = 1 AND u.phone IS NOT NULL AND u.phone <> '' ORDER BY u.id");
  $out = array();
  foreach ($rows as $r) { $m = wb_sms_mobile($r['phone']); if ($m === '') { continue; } $r['id'] = (int)$r['id']; $r['mobile'] = $m; $out[] = $r; }   /* 번호가 없거나 휴대전화가 아니면 제외 */
  return $out;
}

/* 문자 수신 ON 인데 휴대전화번호가 없거나 휴대전화 형식이 아닌 계정 — 발송 대상에서 빠지므로 관리자 화면에 안내 */
function wb_sms_missing_phone($siteId = 0) {
  $sql = "SELECT u.id, u.name, u.phone, u.role FROM users u WHERE u.status = 'active' AND u.sms_notify = 1"; $p = array();
  if ((int)$siteId > 0) { $sql .= " AND (u.role = 'super' OR EXISTS (SELECT 1 FROM site_users su WHERE su.site_id = ? AND su.user_id = u.id) OR EXISTS (SELECT 1 FROM user_advertisers ua JOIN sites s ON s.advertiser_id = ua.advertiser_id WHERE s.id = ? AND ua.user_id = u.id))"; $p = array((int)$siteId, (int)$siteId); }
  $out = array(); foreach (wb_all($sql . ' ORDER BY u.id', $p) as $r) { if (wb_sms_mobile((string)$r['phone']) === '') { $out[] = array('id' => (int)$r['id'], 'name' => (string)$r['name'], 'reason' => trim((string)$r['phone']) === '' ? '문자 수신번호가 등록되지 않았습니다.' : '휴대전화번호 형식이 아닙니다.'); } }
  return $out;
}

/* ---------- 업체 연결 ---------- */
function wb_sms_http($method, $url, $headers, $body, $timeout) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    $opt = array(CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_CONNECTTIMEOUT => min(5, $timeout), CURLOPT_TIMEOUT => $timeout); if ($method !== 'GET') { $opt[CURLOPT_POSTFIELDS] = $body; } curl_setopt_array($ch, $opt);
    $out = curl_exec($ch); $err = curl_error($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return array('code' => $code, 'body' => $out === false ? '' : (string)$out, 'error' => $out === false ? ('연결 실패 : ' . $err) : '');
  }
  $http = array('method' => $method, 'header' => implode("\r\n", $headers), 'timeout' => $timeout, 'ignore_errors' => true); if ($method !== 'GET') { $http['content'] = $body; } $ctx = stream_context_create(array('http' => $http));
  $out = @file_get_contents($url, false, $ctx); $code = 0;
  if (isset($http_response_header[0]) && preg_match('#\s(\d{3})(\s|$)#', $http_response_header[0], $m)) { $code = (int)$m[1]; }
  return array('code' => $code, 'body' => $out === false ? '' : (string)$out, 'error' => $out === false ? '연결 실패' : '');
}
function wb_sms_rand() { if (function_exists('random_bytes')) { return bin2hex(random_bytes(16)); } if (function_exists('openssl_random_pseudo_bytes')) { return bin2hex(openssl_random_pseudo_bytes(16)); } return md5(uniqid('', true) . mt_rand()); }
function wb_sms_fail($code, $msg) { return array('ok' => false, 'id' => '', 'code' => (string)$code, 'error' => wb_sms_cut($msg, 190)); }

/* 솔라피 (https://api.solapi.com/messages/v4/send · HMAC-SHA256) */
function wb_sms_solapi($cfg, $to, $text, $type, $title) {
  $date = gmdate('Y-m-d\TH:i:s\Z'); $salt = wb_sms_rand();
  $auth = 'HMAC-SHA256 apiKey=' . $cfg['api_key'] . ', date=' . $date . ', salt=' . $salt . ', signature=' . hash_hmac('sha256', $date . $salt, $cfg['api_secret']);
  $msg = array('to' => $to, 'from' => $cfg['sender'], 'text' => $text); if ($type === 'LMS') { $msg['type'] = 'LMS'; $msg['subject'] = $title; }
  $r = wb_sms_http('POST', 'https://api.solapi.com/messages/v4/send', array('Authorization: ' . $auth, 'Content-Type: application/json; charset=utf-8'), json_encode(array('message' => $msg)), $cfg['timeout']);
  $j = json_decode($r['body'], true);
  if ($r['code'] >= 200 && $r['code'] < 300 && is_array($j) && (!isset($j['statusCode']) || in_array((string)$j['statusCode'], array('2000', '3000'), true))) { return array('ok' => true, 'id' => isset($j['messageId']) ? (string)$j['messageId'] : '', 'code' => '', 'error' => ''); }
  return wb_sms_fail(is_array($j) && !empty($j['errorCode']) ? $j['errorCode'] : (is_array($j) && !empty($j['statusCode']) ? $j['statusCode'] : 'HTTP' . $r['code']), is_array($j) && !empty($j['errorMessage']) ? $j['errorMessage'] : (is_array($j) && !empty($j['statusMessage']) ? $j['statusMessage'] : ($r['error'] ? $r['error'] : substr($r['body'], 0, 150))));
}
/* 알리고 (https://apis.aligo.in/send/ · form) */
function wb_sms_aligo($cfg, $to, $text, $type, $title) {
  $f = array('key' => $cfg['api_key'], 'user_id' => $cfg['user_id'], 'sender' => $cfg['sender'], 'receiver' => $to, 'msg' => $text, 'msg_type' => $type);
  if ($type === 'LMS') { $f['title'] = $title; } if ($cfg['testmode']) { $f['testmode_yn'] = 'Y'; }
  $r = wb_sms_http('POST', 'https://apis.aligo.in/send/', array('Content-Type: application/x-www-form-urlencoded; charset=utf-8'), http_build_query($f), $cfg['timeout']);
  $j = json_decode($r['body'], true);
  if (is_array($j) && (string)(isset($j['result_code']) ? $j['result_code'] : '') === '1' && (int)(isset($j['success_cnt']) ? $j['success_cnt'] : 1) >= 1) { return array('ok' => true, 'id' => isset($j['msg_id']) ? (string)$j['msg_id'] : '', 'code' => '', 'error' => ''); }
  return wb_sms_fail(is_array($j) && isset($j['result_code']) ? $j['result_code'] : 'HTTP' . $r['code'], is_array($j) && !empty($j['message']) ? $j['message'] : ($r['error'] ? $r['error'] : substr($r['body'], 0, 150)));
}
/* 네이버클라우드 SENS (https://sens.apigw.ntruss.com/sms/v2/services/{serviceId}/messages · 서명 v2) */
function wb_sms_ncp($cfg, $to, $text, $type, $title) {
  $ts = (string)round(microtime(true) * 1000); $uri = '/sms/v2/services/' . rawurlencode($cfg['service_id']) . '/messages';
  $sig = base64_encode(hash_hmac('sha256', "POST " . $uri . "\n" . $ts . "\n" . $cfg['api_key'], $cfg['api_secret'], true));
  $body = array('type' => $type, 'contentType' => 'COMM', 'countryCode' => '82', 'from' => $cfg['sender'], 'content' => $text, 'messages' => array(array('to' => $to))); if ($type === 'LMS') { $body['subject'] = $title; }
  $r = wb_sms_http('POST', 'https://sens.apigw.ntruss.com' . $uri, array('Content-Type: application/json; charset=utf-8', 'x-ncp-apigw-timestamp: ' . $ts, 'x-ncp-iam-access-key: ' . $cfg['api_key'], 'x-ncp-apigw-signature-v2: ' . $sig), json_encode($body), $cfg['timeout']);
  $j = json_decode($r['body'], true);
  if ($r['code'] === 202 && is_array($j) && (string)(isset($j['statusCode']) ? $j['statusCode'] : '202') === '202') { return array('ok' => true, 'id' => isset($j['requestId']) ? (string)$j['requestId'] : '', 'code' => '', 'error' => ''); }
  return wb_sms_fail(is_array($j) && !empty($j['statusCode']) ? $j['statusCode'] : 'HTTP' . $r['code'], is_array($j) && !empty($j['statusName']) ? $j['statusName'] : (is_array($j) && !empty($j['errorMessage']) ? $j['errorMessage'] : ($r['error'] ? $r['error'] : substr($r['body'], 0, 150))));
}
/* 발송 (업체별 함수로 분기 — 새 업체는 여기에 한 줄 추가) */
function wb_sms_send($cfg, $to, $text, $type, $title) {
  $why = wb_sms_ready($cfg); if ($why !== '') { return wb_sms_fail('NOT_CONFIGURED', $why); }
  $to = wb_sms_mobile($to); if ($to === '') { return wb_sms_fail('BAD_NUMBER', '수신 휴대전화번호가 올바르지 않습니다.'); }
  try {
    switch ($cfg['provider']) {
      case 'solapi': return wb_sms_solapi($cfg, $to, $text, $type, $title);
      case 'aligo': return wb_sms_aligo($cfg, $to, $text, $type, $title);
      case 'ncp': return wb_sms_ncp($cfg, $to, $text, $type, $title);
      case 'fail': return wb_sms_fail('TEST_FAIL', '테스트용 실패 (config.php sms.provider = fail)');
      case 'log':   /* 실제 발송 없이 기록만 (설치 · 흐름 확인용) — 번호는 가려서 저장 */
        if (in_array($to, $cfg['fail_to'], true)) { return wb_sms_fail('TEST_FAIL_TO', '테스트용 실패 (지정 번호)'); }
        $dir = WB_DATA_DIR . '/logs'; if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
        $f = $dir . '/sms-outbox.log.php'; if (!is_file($f)) { @file_put_contents($f, "<?php exit; ?>\n", LOCK_EX); }
        @file_put_contents($f, json_encode(array('at' => wb_now(), 'to' => wb_sms_mask($to), 'type' => $type, 'text' => $text)) . "\n", FILE_APPEND | LOCK_EX);
        return array('ok' => true, 'id' => 'log-' . substr(wb_sms_rand(), 0, 12), 'code' => '', 'error' => '');
    }
  } catch (Exception $e) { return wb_sms_fail('EXCEPTION', $e->getMessage()); }
  return wb_sms_fail('NOT_CONFIGURED', '지원하지 않는 문자 업체입니다.');
}

/* ---------- 오류 해석 · 서버 발신 IP · 기록 (API Key · Secret · 전체 휴대전화번호는 절대 남기지 않음) ---------- */
/* 업체 오류 코드 · 문구 → 종류 · 상태 표시 · 한글 안내 (원래 코드 · 문구는 기록에 그대로) */
function wb_sms_classify($code, $msg) {
  $c = strtolower(trim((string)$code)); $m = (string)$msg; $all = $c . ' ' . strtolower($m); $ip = '';
  if (preg_match('/(\d{1,3}(?:\.\d{1,3}){3})/', $m, $mm) && filter_var($mm[1], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) { $ip = $mm[1]; }
  $kind = 'other';
  if ($c === 'not_configured') { $kind = 'config'; }
  elseif ($c === 'bad_number') { $kind = 'number'; }
  elseif (strpos($m, '허용되지 않은 IP') !== false || strpos($m, '허용되지 않은 아이피') !== false || preg_match('/not ?allowed ?ip|ip ?not ?allowed|forbidden ?ip|ip.{0,20}(not allowed|denied|whitelist|허용)|allowedip|ipaddress/', $all)) { $kind = 'ip'; }
  elseif ($c === 'invalidapikey' || preg_match('/apikey\s*정보가|api ?key.{0,20}(invalid|올바르지|not found|없습니다)|invalid ?api ?key|unknown ?api ?key/', $all)) { $kind = 'key'; }
  elseif (preg_match('/signature|secret|hmac|unauthori[sz]ed|authenticat|인증 ?(정보|실패|오류)|invalidauth|expired ?date|날짜/', $all)) { $kind = 'secret'; }
  elseif (preg_match('/발신 ?번호|sender|senderid|from ?number|등록되지 않은 (발신 )?번호|notregistered/', $all)) { $kind = 'sender'; }
  elseif (preg_match('/잔액|잔고|포인트|충전|balance|insufficient|not ?enough|credit|point/', $all)) { $kind = 'balance'; }
  elseif (preg_match('/연결 실패|timed? ?out|could not resolve|connection|curl|network/', $all)) { $kind = 'network'; }
  $map = array(
    'config' => array('⚠ API 설정 필요', '문자 업체 설정(API Key · API Secret · 발신번호)이 필요합니다.'),
    'ip' => array('⚠ 허용 IP 불일치', '현재 서버 IP가 Solapi 허용 IP에 등록되어 있지 않습니다.'),
    'key' => array('✕ API Key/Secret 확인 필요', 'API Key가 올바르지 않습니다.'),
    'secret' => array('✕ API Key/Secret 확인 필요', 'API Secret 또는 인증 서명을 확인해주세요.'),
    'sender' => array('✕ 발신번호 미등록 또는 인증 필요', 'Solapi에 등록된 발신번호인지 확인해주세요.'),
    'balance' => array('✕ Solapi 잔액 부족', 'Solapi 잔액을 확인해주세요.'),
    'number' => array('✕ 문자 발송 오류', '수신 휴대전화번호가 올바르지 않습니다.'),
    'network' => array('✕ 문자 발송 오류', '문자 업체 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
    'other' => array('✕ 문자 발송 오류', '문자 발송 중 오류가 발생했습니다.'),
  );
  return array('kind' => $kind, 'label' => $map[$kind][0], 'reason' => $map[$kind][1], 'ip' => $ip);
}
/* 기록 · 화면에 쓰기 전 : API Key · Secret 이 문구에 섞여 있으면 가리고, 휴대전화번호는 가운데를 가림 */
function wb_sms_scrub($s, $cfg) {
  $s = (string)$s; foreach (array('api_key', 'api_secret') as $k) { if (!empty($cfg[$k]) && strlen($cfg[$k]) >= 4) { $s = str_replace($cfg[$k], '[hidden]', $s); } }
  return preg_replace_callback('/01[016789]-?\d{3,4}-?\d{4}/', function ($m) { return wb_sms_mask($m[0]); }, $s);
}
function wb_sms_mask_key($k) { $k = (string)$k; $n = strlen($k); if ($n === 0) { return ''; } if ($n <= 8) { return str_repeat('*', $n); } return substr($k, 0, 4) . '****' . substr($k, -4); }
/* 서버 발신 IP : 외부에서 보이는 공인 IP (문자 업체가 인식하는 주소) — 6시간 보관 · 내부 · 사설 IP 는 쓰지 않음 */
function wb_sms_ip_file() { return WB_DATA_DIR . '/sms-ip.php'; }
function wb_sms_read_json($f) { if (!is_file($f)) { return null; } $raw = (string)@file_get_contents($f); $p = strpos($raw, "\n"); $j = json_decode($p === false ? $raw : substr($raw, $p + 1), true); return is_array($j) ? $j : null; }
function wb_sms_write_json($f, $data) { $dir = dirname($f); if (!is_dir($dir)) { @mkdir($dir, 0755, true); } @file_put_contents($f, "<?php exit; ?>\n" . json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX); }
function wb_sms_remember_ip($ip, $src) { if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) { return null; } $o = array('ip' => $ip, 't' => time(), 'at' => wb_now(), 'src' => $src); wb_sms_write_json(wb_sms_ip_file(), $o); return $o; }
function wb_sms_server_ip($refresh = false) {
  $old = wb_sms_read_json(wb_sms_ip_file());
  if (!$refresh && $old && !empty($old['ip']) && time() - (int)$old['t'] < 21600) { return $old; }
  foreach (array('https://api.ipify.org', 'https://ifconfig.me/ip', 'https://icanhazip.com') as $u) {
    $r = wb_sms_http('GET', $u, array('Accept: text/plain', 'User-Agent: webbuilder'), '', 4); $t = trim((string)$r['body']);
    if ($r['code'] === 200) { $o = wb_sms_remember_ip($t, parse_url($u, PHP_URL_HOST)); if ($o) { return $o; } }
  }
  return $old ? $old : array('ip' => '', 't' => 0, 'at' => '', 'src' => '');
}
/* 발송 기록 (logs/sms-연월.log.php · 첫 줄 exit 로 주소 접근 차단) + 마지막 상태 */
function wb_sms_state_file() { return WB_DATA_DIR . '/sms-state.php'; }
function wb_sms_record($reqType, $siteId, $to, $cfg, $res, $meta = array()) {
  $cls = $res['ok'] ? null : wb_sms_classify($res['code'], $res['error']);
  $ip = ''; if ($cls && $cls['ip'] !== '') { $ip = $cls['ip']; wb_sms_remember_ip($ip, 'provider'); } else { $o = wb_sms_read_json(wb_sms_ip_file()); $ip = $o && !empty($o['ip']) ? $o['ip'] : ''; }
  $ev = array('at' => wb_now(), 'site' => (int)$siteId, 'site_name' => isset($meta['site_name']) ? wb_sms_substr((string)$meta['site_name'], 40) : '', 'receipt' => isset($meta['receipt']) ? wb_sms_substr((string)$meta['receipt'], 30) : '', 'type' => $reqType, 'to' => wb_sms_mask($to), 'provider' => $cfg['provider'], 'ok' => (bool)$res['ok'], 'code' => $res['ok'] ? '' : (string)$res['code'], 'msg' => $res['ok'] ? '' : wb_sms_substr(wb_sms_scrub($res['error'], $cfg), 190), 'kind' => $cls ? $cls['kind'] : '', 'ip' => $ip);
  try { $dir = WB_DATA_DIR . '/logs'; if (!is_dir($dir)) { @mkdir($dir, 0755, true); } $f = $dir . '/sms-' . date('Y-m') . '.log.php'; if (!is_file($f)) { @file_put_contents($f, "<?php exit; ?>\n", LOCK_EX); } @file_put_contents($f, json_encode($ev, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX); wb_sms_write_json(wb_sms_state_file(), $ev); } catch (Exception $e) {}
  return array_merge($res, array('kind' => $cls ? $cls['kind'] : '', 'label' => $cls ? $cls['label'] : '✓ 발송 가능', 'reason' => $cls ? $cls['reason'] : '', 'ip' => $ip, 'raw' => $ev['msg']));
}
function wb_sms_last_test() { foreach (wb_sms_recent_events(40, false) as $e) { if (isset($e['type']) && $e['type'] === 'test') { $cl = !empty($e['ok']) ? null : wb_sms_classify(isset($e['code']) ? $e['code'] : '', isset($e['msg']) ? $e['msg'] : ''); return array('at' => $e['at'], 'ok' => !empty($e['ok']), 'to' => isset($e['to']) ? $e['to'] : '', 'label' => $cl ? $cl['label'] : '✓ 발송 성공', 'reason' => $cl ? $cl['reason'] : ''); } } return null; }
function wb_sms_substr($s, $n) { return function_exists('mb_substr') ? mb_substr((string)$s, 0, $n, 'UTF-8') : substr((string)$s, 0, $n); }
function wb_sms_recent_events($limit, $onlyFail) {
  $out = array(); $files = glob(WB_DATA_DIR . '/logs/sms-*.log.php'); if (!$files) { return $out; } rsort($files);
  foreach (array_slice($files, 0, 2) as $f) { $lines = @file($f, FILE_IGNORE_NEW_LINES); if (!$lines) { continue; } for ($i = count($lines) - 1; $i >= 1 && count($out) < $limit; $i--) { $j = json_decode($lines[$i], true); if (!is_array($j) || ($onlyFail && !empty($j['ok']))) { continue; } $out[] = $j; } if (count($out) >= $limit) { break; } }
  return $out;
}
/* 발송 + 기록 (예약 알림 · 테스트 · 다시 보내기 공통) */
function wb_sms_send_logged($cfg, $to, $text, $type, $title, $reqType, $siteId, $meta = array()) {
  $res = wb_sms_send($cfg, $to, $text, $type, $title);
  try { return wb_sms_record($reqType, $siteId, $to, $cfg, $res, $meta); }   /* 기록 파일 쓰기에 문제가 있어도 발송 결과(성공/실패)는 그대로 돌려줌 → sms_logs 에 반영 */
  catch (Throwable $e) { wb_log_error('sms record: ' . $e->getMessage()); return array_merge($res, array('kind' => '', 'label' => '', 'reason' => '', 'ip' => '', 'raw' => '')); }
}

/* ---------- 예약 알림 ---------- */
function wb_sms_deliver($cfg, $logId, $to, $text, $type, $title, $reqType = 'auto', $siteId = 0, $meta = array()) {
  wb_run('UPDATE sms_logs SET attempts = attempts + 1, updated_at = ? WHERE id = ?', array(wb_now(), (int)$logId));
  $res = wb_sms_send_logged($cfg, $to, $text, $type, $title, $reqType, $siteId, $meta);
  if ($res['ok']) { wb_update('sms_logs', array('status' => 'sent', 'provider' => $cfg['provider'], 'provider_message_id' => $res['id'], 'error_code' => null, 'error_message' => null, 'sent_at' => wb_now(), 'updated_at' => wb_now()), 'id = ?', array((int)$logId)); }
  else { wb_update('sms_logs', array('status' => 'failed', 'provider' => $cfg['provider'], 'error_code' => $res['code'], 'error_message' => wb_sms_scrub($res['error'], $cfg), 'updated_at' => wb_now()), 'id = ?', array((int)$logId)); wb_log_error('sms failed log#' . (int)$logId . ' ' . $res['code'] . ' ' . wb_sms_scrub($res['error'], $cfg)); }
  return $res['ok'];
}
function wb_sms_context($siteId, $subId) {
  $site = wb_get('SELECT id, name FROM sites WHERE id = ?', array((int)$siteId));
  $sub = wb_get('SELECT id, site_id, name, phone, visit_date, visit_time, receipt_no, data_json, fields_json FROM form_submissions WHERE id = ? AND site_id = ?', array((int)$subId, (int)$siteId));
  if (!$site || !$sub) { return null; }
  $inquiry = ''; try { $inquiry = function_exists('wb_sub_inquiry') ? (string)wb_sub_inquiry($sub, wb_arr($sub['data_json'])) : ''; } catch (Throwable $e) { $inquiry = ''; wb_log_error('sms inquiry: ' . $e->getMessage()); }   /* 방문예약 폼의 문의사항(textarea · 현장명 = memo) 원문 — 읽지 못하면 "없음"으로 발송 */
  $text = wb_sms_message($site['name'], $sub, $inquiry); $receipt = (string)$sub['receipt_no'];
  return array('site' => $site, 'text' => $text, 'type' => wb_sms_type($text), 'title' => wb_sms_subject($site['name']),
    'meta' => array('site_name' => (string)$site['name'], 'receipt' => $receipt),
    'logBody' => wb_sms_subject($site['name']) . ' · 접수번호 ' . ($receipt !== '' ? $receipt : '#' . (int)$sub['id']) . ' (고객 정보는 예약 상세에서 확인)');   /* sms_logs 에는 고객 정보 전문을 남기지 않음 (개인정보 파기 후에도 남지 않게) */
}
/* (예약, 수신자) 줄을 먼저 만들고(중복이면 UNIQUE 로 실패 → 건너뜀) 그 줄에만 발송 */
function wb_sms_claim($siteId, $subId, $r, $ctx, $provider) {
  try { return wb_insert('sms_logs', array('site_id' => (int)$siteId, 'reservation_id' => (int)$subId, 'recipient_user_id' => (int)$r['id'], 'recipient_name' => wb_sms_cut($r['name'], 60), 'recipient_phone' => wb_sms_pretty($r['mobile']), 'message_type' => $ctx['type'], 'message_body' => $ctx['logBody'], 'provider' => $provider, 'status' => 'pending', 'attempts' => 0, 'created_at' => wb_now(), 'updated_at' => wb_now())); }
  catch (Exception $e) { return 0; }
}
/* 사이트별 문자 알림 사용 여부 (사이트 관리에서 끄면 그 사이트 예약은 문자 없음 · 기본 사용) */
function wb_site_sms_enabled($siteId) { try { $n = wb_arr(wb_get_setting((int)$siteId, 'notify')); return !array_key_exists('sms', $n) || $n['sms'] !== false; } catch (Exception $e) { return true; } }
/* 새 방문예약 저장 직후 호출 — 어떤 오류도 밖으로 던지지 않음 (예약 접수는 항상 성공) */
function wb_sms_notify_reservation($c, $siteId, $subId) {
  try {
    $cfg = wb_sms_cfg($c); if (wb_sms_ready($cfg) !== '') { return array('sent' => 0, 'failed' => 0, 'skipped' => 'not-configured'); }
    if (!wb_site_sms_enabled($siteId)) { return array('sent' => 0, 'failed' => 0, 'skipped' => 'site-off'); }
    $ctx = wb_sms_context($siteId, $subId); if (!$ctx) { return array('sent' => 0, 'failed' => 0); }
    $sent = 0; $failed = 0;
    foreach (wb_sms_recipients($siteId) as $r) {
      $logId = wb_sms_claim($siteId, $subId, $r, $ctx, $cfg['provider']); if (!$logId) { continue; }   /* 이미 이 수신자에게 보낸(보내는 중인) 예약 */
      if (wb_sms_deliver($cfg, $logId, $r['mobile'], $ctx['text'], $ctx['type'], $ctx['title'], 'auto', $siteId, $ctx['meta'])) { $sent++; } else { $failed++; }
    }
    return array('sent' => $sent, 'failed' => $failed);
  } catch (Throwable $e) { wb_log_error('sms notify: ' . $e->getMessage()); return array('sent' => 0, 'failed' => 0, 'error' => true); }
}
/* 다시 보내기 : 실패한 수신자 + 아직 받지 못한 현재 수신자 — 수신자는 지금의 권한 · 번호 기준으로 서버가 다시 결정 */
function wb_sms_resend($c, $siteId, $subId) {
  $cfg = wb_sms_cfg($c); $why = wb_sms_ready($cfg); if ($why !== '') { throw new WbHttpError(422, '문자를 보낼 수 없습니다 : ' . $why); }
  $ctx = wb_sms_context($siteId, $subId); if (!$ctx) { throw new WbHttpError(404, '예약을 찾을 수 없습니다.'); }
  $now = array(); foreach (wb_sms_recipients($siteId) as $r) { $now[$r['id']] = $r; }
  $sent = 0; $failed = 0; $skipped = 0; $have = array();
  foreach (wb_all('SELECT id, recipient_user_id, status FROM sms_logs WHERE reservation_id = ? AND site_id = ?', array((int)$subId, (int)$siteId)) as $l) {
    $uid = (int)$l['recipient_user_id']; $have[$uid] = true;
    if ($l['status'] !== 'failed') { continue; }
    if (!isset($now[$uid])) { $skipped++; continue; }   /* 그 사이 권한 · 수신 설정 · 번호가 바뀌어 더 이상 대상이 아님 */
    if (wb_run("UPDATE sms_logs SET status = 'pending', recipient_phone = ?, message_body = ?, message_type = ?, updated_at = ? WHERE id = ? AND status = 'failed'", array(wb_sms_pretty($now[$uid]['mobile']), $ctx['logBody'], $ctx['type'], wb_now(), (int)$l['id'])) !== 1) { continue; }   /* 동시에 누른 다른 요청이 이미 가져감 */
    if (wb_sms_deliver($cfg, (int)$l['id'], $now[$uid]['mobile'], $ctx['text'], $ctx['type'], $ctx['title'], 'resend', $siteId, $ctx['meta'])) { $sent++; } else { $failed++; }
  }
  foreach ($now as $uid => $r) {
    if (isset($have[$uid])) { continue; }
    $logId = wb_sms_claim($siteId, $subId, $r, $ctx, $cfg['provider']); if (!$logId) { continue; }
    if (wb_sms_deliver($cfg, $logId, $r['mobile'], $ctx['text'], $ctx['type'], $ctx['title'], 'resend', $siteId, $ctx['meta'])) { $sent++; } else { $failed++; }
  }
  return array('sent' => $sent, 'failed' => $failed, 'skipped' => $skipped);
}

/* ---------- 관리자 표시용 ---------- */
function wb_sms_summary_map($ids) {
  $ids = array_values(array_filter(array_map('intval', (array)$ids))); if (!count($ids)) { return array(); }
  $rows = wb_all('SELECT reservation_id, status, provider, COUNT(*) AS n FROM sms_logs WHERE reservation_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') GROUP BY reservation_id, status, provider', $ids);
  $m = array(); foreach ($rows as $r) { $k = (int)$r['reservation_id']; if (!isset($m[$k])) { $m[$k] = array('sent' => 0, 'failed' => 0, 'pending' => 0, 'test' => 0); } $st = ($r['provider'] === 'log' && $r['status'] === 'sent') ? 'test' : $r['status']; if (!isset($m[$k][$st])) { $m[$k][$st] = 0; } $m[$k][$st] += (int)$r['n']; }   /* provider log = 기록만 (실제 발송 아님) → 발송 완료로 세지 않음 */
  return $m;
}
function wb_sms_logs_of($subId) {
  $roles = function_exists('wb_roles') ? wb_roles() : array();
  return array_map(function ($l) use ($roles) { return array('id' => (int)$l['id'], 'name' => (string)$l['recipient_name'], 'role' => isset($roles[$l['role']]) ? $roles[$l['role']] : (string)$l['role'], 'phone' => wb_sms_mask($l['recipient_phone']), 'status' => (string)$l['status'], 'type' => (string)$l['message_type'], 'provider' => (string)$l['provider'], 'attempts' => (int)$l['attempts'], 'error' => (string)$l['error_message'], 'sent_at' => $l['sent_at'], 'created_at' => $l['created_at'], 'cause' => $l['status'] === 'failed' ? wb_sms_classify($l['error_code'], $l['error_message']) : null); },
    wb_all('SELECT l.*, u.role FROM sms_logs l LEFT JOIN users u ON u.id = l.recipient_user_id WHERE l.reservation_id = ? ORDER BY l.id', array((int)$subId)));
}
function wb_sms_status($c) {
  $cfg = wb_sms_cfg($c); $why = wb_sms_ready($cfg);
  $st = wb_sms_read_json(wb_sms_state_file()); $cfgTime = is_file(WB_CONFIG_FILE) ? (int)@filemtime(WB_CONFIG_FILE) : 0; if (defined('WB_SMS_FILE') && is_file(WB_SMS_FILE)) { $cfgTime = max($cfgTime, (int)@filemtime(WB_SMS_FILE)); }
  if ($st && $cfgTime && strtotime((string)$st['at']) < $cfgTime) { $st = null; }   /* 설정을 바꾼 뒤에는 예전 실패 상태를 쓰지 않음 */
  if ($why !== '') { $state = array('code' => 'config', 'label' => '⚠ API 설정 필요', 'reason' => $why); }
  elseif ($st && empty($st['ok'])) { $cl = wb_sms_classify($st['code'], $st['msg']); $state = array('code' => $cl['kind'], 'label' => $cl['label'], 'reason' => $cl['reason'], 'at' => $st['at'], 'type' => $st['type'], 'ip' => $st['ip']); }
  else { $state = array('code' => 'ok', 'label' => '✓ 발송 가능', 'reason' => '', 'at' => $st ? $st['at'] : ''); }
  $ipc = wb_sms_read_json(wb_sms_ip_file());
  $names = array('solapi' => '솔라피', 'aligo' => '알리고', 'ncp' => '네이버클라우드 SENS', 'log' => '기록만 (실제 발송 안 함)', 'fail' => '실패 테스트');
  return array('ready' => $why === '', 'test' => $why === '' && in_array($cfg['provider'], array('log', 'fail'), true), 'reason' => $why, 'provider' => $cfg['provider'], 'providerName' => ($cfg['provider'] === '' ? '' : (isset($names[$cfg['provider']]) ? $names[$cfg['provider']] : $cfg['provider'])), 'sender' => $cfg['sender'] !== '' ? wb_sms_pretty($cfg['sender']) : '',
    'state' => $state, 'keyMask' => wb_sms_mask_key($cfg['api_key']), 'hasKey' => $cfg['api_key'] !== '', 'hasSecret' => $cfg['api_secret'] !== '', 'serverIp' => $ipc && !empty($ipc['ip']) ? $ipc['ip'] : '', 'serverIpAt' => $ipc && !empty($ipc['at']) ? $ipc['at'] : '',
    'recentErrors' => array_map(function ($e) { $cl = wb_sms_classify(isset($e['code']) ? $e['code'] : '', isset($e['msg']) ? $e['msg'] : ''); return array('at' => $e['at'], 'type' => $e['type'], 'to' => $e['to'], 'code' => $e['code'], 'kind' => $cl['kind'], 'label' => $cl['label'], 'reason' => $cl['reason'], 'msg' => $e['msg'], 'ip' => $e['ip']); }, wb_sms_recent_events(5, true)),
    'lastTest' => wb_sms_last_test(), 'noPhone' => wb_sms_missing_phone(0), 'source' => (defined('WB_SMS_FILE') && is_file(WB_SMS_FILE)) ? 'file' : 'config',
    'recent' => array('sent' => wb_int(wb_val("SELECT COUNT(*) FROM sms_logs WHERE status = 'sent' AND created_at >= ?", array(wb_now(time() - 7 * 86400)))), 'failed' => wb_int(wb_val("SELECT COUNT(*) FROM sms_logs WHERE status = 'failed' AND created_at >= ?", array(wb_now(time() - 7 * 86400))))));
}
