<?php
/* wb-api/reserve.php 호환 진입점 — 예전에 게시된 홈페이지(./wb-api/reserve.php 로 접수)도 통합 운영 API 의 같은 DB(form_submissions)에 저장되도록 연결합니다.
   · 본문의 site_key(또는 site_id) 로 사이트를 찾아 /reservations/create 와 같은 검증 · 저장을 수행합니다 (별도 DB · 별도 설정 없음)
   · 운영 서버 폴더 구조 : /wb-api/reserve.php (이 파일) → /api/index.php */
if (!isset($_SERVER['REQUEST_METHOD']) || strtoupper($_SERVER['REQUEST_METHOD']) === 'OPTIONS') { http_response_code(204); exit; }
if (strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST') { header('Allow: POST, OPTIONS'); header('Content-Type: application/json; charset=utf-8'); http_response_code(405); echo '{"ok":false,"error":"POST 요청만 허용됩니다."}'; exit; }
define('WB_ENTRY_PATH', '/reservations/create');
require dirname(dirname(__FILE__)) . '/api/index.php';
