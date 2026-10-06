<?php
/* 통합웹빌더 운영 API 설정 — 이 파일을 복사해 같은 폴더에 config.php 로 저장한 뒤 값을 채웁니다.
   · config.php 는 절대 HTML · JavaScript 에 포함되지 않으며, 주소로 직접 열어도 아무것도 출력되지 않습니다 (return 만 있음).
   · 비밀번호 · 비밀키는 이 파일에만 둡니다. FileZilla 로 올린 뒤 파일 권한을 600 또는 604 로 두는 것을 권장합니다.
   · 카페24 : 나의서비스관리 › 호스팅관리 › MySQL 정보 (DB 이름 · 아이디는 보통 호스팅 아이디와 같고, 호스트는 localhost) */
return array(
  /* 필수 : 세션 · 토큰 서명용 비밀키 — 아무 문자열이나 32자 이상 (예 : https://www.random.org 에서 생성 또는 아래 값을 직접 바꾸기) */
  'secret' => '여기에-32자-이상의-임의-문자열을-입력하세요',

  /* 필수 : MySQL 접속 정보 (카페24 호스팅관리 › MySQL 정보 · 비밀번호는 카페24에서 설정한 DB 비밀번호) */
  'db' => array(
    'host' => 'localhost',
    'name' => 'DB이름(보통 호스팅아이디)',
    'user' => 'DB아이디(보통 호스팅아이디)',
    'pass' => 'DB비밀번호',
    'port' => 3306,
    'prefix' => '',            /* 표 이름 앞에 붙일 접두어 (같은 DB 를 여러 프로그램이 쓸 때만 · 보통 비움) */
    /* 'driver' => 'sqlite',   ← 개발 · 테스트 전용 (api/data/webbuilder.sqlite 에 저장 · 운영에서는 사용하지 마세요) */
  ),

  /* 선택 : 이 서버의 공개 주소 (비우면 요청 도메인으로 자동) — 예 'https://example.mycafe24.com' */
  'base_url' => '',

  /* 선택 : 사이트 식별값별 "이 서버가 그 사이트의 홈페이지를 직접 호스팅하는지" 강제 지정
     (보통은 사이트의 공개 홈페이지 주소 도메인 = 이 서버 도메인 이면 자동으로 판단합니다) */
  'site_hosts' => array(/* 'mokdong' => true */),

  /* 선택 : 업로드 최대 크기(MB) · 프록시 뒤에 있을 때 실제 방문자 IP 사용 · 접수 출처 제한 해제(테스트 전용) */
  'max_upload_mb' => 50,
  'trust_proxy' => false,
  'allow_any_origin' => false,

  /* 선택 : 방문예약 문자 알림 — 이 값들은 서버(PHP)에서만 사용되며 HTML · JavaScript · 관리자 화면으로 절대 나가지 않습니다.
     · provider : 'solapi'(솔라피) · 'aligo'(알리고) · 'ncp'(네이버클라우드 SENS) · 'log'(실제 발송 없이 api/data/logs 에 기록만 · 연결 확인용) · 비우면 문자 알림 꺼짐
     · sender   : 문자 업체에 등록 · 인증이 끝난 발신번호만 (미등록 번호는 업체가 발송을 거부합니다)
     · 솔라피 : api_key + api_secret · 알리고 : api_key + user_id(알리고 아이디) · 네이버 SENS : api_key(Access Key) + api_secret(Secret Key) + service_id
     · 업체 쪽에서 "허용 IP" 를 쓰면 카페24 서버의 외부 IP 를 등록해야 합니다. */
  'sms' => array(
    'provider' => '',
    'api_key' => '',
    'api_secret' => '',
    'sender' => '',            /* 예 '0212345678' 또는 '02-1234-5678' */
    'user_id' => '',           /* 알리고만 */
    'service_id' => '',        /* 네이버 SENS 만 (ncp:sms:kr:...) */
    'timeout' => 8,            /* 업체 응답 대기(초) — 늦어져도 예약 접수는 저장된 상태로 끝납니다 */
    'testmode' => false,       /* 알리고 전용 : true 면 실제 발송 없이 업체 테스트 모드 */
  ),
);
