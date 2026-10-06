<?php
/* 공개 상태 확인 (민감한 정보 없음) : 통합 관리자의 [공개 서버 연결 점검]이 PHP 실행 여부 · 설정 전송 여부 · 저장소(DB) 사용 가능 여부 · 폼 구성 유무를 확인할 때 사용 */
define('WB_API', 1);
require dirname(__FILE__) . '/lib.php';
$cfg = wb_config();
$writable = wb_ensure_data();
$form = wb_read_json(WB_DATA . '/form.php');
$db = (bool)wb_db();
wb_json(200, array('ok' => true, 'app' => 'wb-relay', 'version' => WB_VERSION, 'configured' => (bool)$cfg, 'writable' => (bool)$writable, 'db' => $db, 'driver' => wb_db_driver(), 'pdo' => class_exists('PDO'), 'pdo_sqlite' => class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers(), true), 'pdo_mysql' => class_exists('PDO') && in_array('mysql', PDO::getAvailableDrivers(), true), 'form' => ($form && !empty($form['fields'])), 'form_version' => ($form && isset($form['version'])) ? (int)$form['version'] : 0, 'php' => PHP_VERSION));
