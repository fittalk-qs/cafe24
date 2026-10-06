<?php
/* 통합웹빌더 운영 API — 경로 (설정 파일 · 데이터 폴더)
   · 새 구조 : /www/config/config.php (DB · 비밀키) · /www/config/sms.php (문자 업체) · /www/storage/ (로그 · 백업 · 게시 기록)
   · 예전 구조 : /www/api/config.php · /www/api/data/ — 새 구조 파일이 없으면 그대로 사용 (이미 운영 중인 서버를 끊지 않음)
   · config · storage 폴더는 .htaccess 로 주소 접근 차단 + PHP 파일은 직접 열어도 아무것도 출력하지 않음 */
if (!defined('WB_API')) { http_response_code(404); exit; }
if (!defined('WB_WEB_ROOT')) { define('WB_WEB_ROOT', dirname(WB_API_DIR)); }   /* 공개 홈페이지 폴더(index.html · assets/) = api 폴더의 상위 */
if (!defined('WB_CONFIG_DIR')) { define('WB_CONFIG_DIR', WB_WEB_ROOT . '/config'); }
if (!defined('WB_CONFIG_FILE')) {
  if (is_file(WB_CONFIG_DIR . '/config.php')) { define('WB_CONFIG_FILE', WB_CONFIG_DIR . '/config.php'); }
  elseif (is_file(WB_API_DIR . '/config.php')) { define('WB_CONFIG_FILE', WB_API_DIR . '/config.php'); }
  else { define('WB_CONFIG_FILE', WB_CONFIG_DIR . '/config.php'); }
}
if (!defined('WB_SMS_FILE')) { define('WB_SMS_FILE', dirname(WB_CONFIG_FILE) . '/sms.php'); }   /* 문자 업체 설정 (관리자 › 시스템 또는 /install/ 에서 저장) */
if (!defined('WB_LOCK_FILE')) { define('WB_LOCK_FILE', WB_CONFIG_DIR . '/installed.lock'); }
/* 데이터 폴더 : 이미 쓰고 있는 api/data(SQLite DB · 기록)가 있으면 반드시 그대로 사용 — 새 설치에서만 storage/ */
if (!defined('WB_DATA_DIR')) { define('WB_DATA_DIR', (is_dir(WB_API_DIR . '/data') && (is_file(WB_API_DIR . '/data/webbuilder.sqlite') || !is_dir(WB_WEB_ROOT . '/storage'))) ? WB_API_DIR . '/data' : WB_WEB_ROOT . '/storage'); }
/* 새 현장 설치 : 데이터 폴더(DB · 기록 · 백업)를 주소로 열 수 없게 보호 파일을 만듦 — 이미 있는 파일(운영 서버의 .htaccess 등)은 절대 건드리지 않음 */
if (is_dir(WB_DATA_DIR) || @mkdir(WB_DATA_DIR, 0755, true)) { if (!is_file(WB_DATA_DIR . '/.htaccess')) { @file_put_contents(WB_DATA_DIR . '/.htaccess', "Options -Indexes
<IfModule mod_authz_core.c>
  Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
  Order allow,deny
  Deny from all
</IfModule>
"); } if (!is_file(WB_DATA_DIR . '/index.html')) { @file_put_contents(WB_DATA_DIR . '/index.html', ''); } }
