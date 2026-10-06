<?php
/* wb-api/health.php 호환 진입점 — 통합 운영 API 의 공개 상태 확인(/public/health)으로 연결 (민감한 정보 없음) */
define('WB_ENTRY_PATH', '/public/health');
require dirname(dirname(__FILE__)) . '/api/index.php';
