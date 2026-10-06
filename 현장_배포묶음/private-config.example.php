<?php
/* ===========================================================================
   통합웹빌더 — 여러 현장이 함께 쓰는 개인 비밀설정 (선택 사항)

   · 이 파일을 복사해서 이름을 private-config.php 로 바꾸고 값만 채우면 됩니다.
   · 올리는 위치 :  /www/api/private-config.php     (권장 · 외부에서 열 수 없게 막혀 있습니다)
   · 새 현장을 만들 때 이 파일만 같이 올려 두면 Google Sheets · 문자(Solapi) 설정을
     현장마다 다시 입력하지 않아도 자동으로 연결됩니다.

   ★ 주의
     - 이 파일에는 비밀키가 들어갑니다. 배포본(ZIP) 이나 홈페이지 폴더에 그대로 두지 마세요.
     - private-config.php 는 서버에만 두고, 사본은 개인 PC 에 안전하게 보관하세요.
     - 같은 값이 api/config.php 에도 있으면 그 현장의 config.php 값이 우선합니다.
   =========================================================================== */

return array(

  /* ---------- Google Sheets (방문예약 자동 누적) ----------
     여러 현장이 하나의 시트를 함께 써도 됩니다. 현장명이 첫 칸(A 사이트)에 들어가 구분됩니다. */
  'google_sheet_enabled'     => '1',
  'google_sheet_webhook_url' => 'https://script.google.com/macros/s/AKfycbzHagq7ZxHBTK2qxc-4TJRQXR0znEBZBaOVfuM9RHpGpFlxyac6xZIFxpJ0-Exa-Cpg/exec',
  'google_sheet_secret'      => '여기에_Apps_Script_의_WB_SECRET_값',
  'google_sheet_tab_name'    => '시트1',

  /* ---------- 문자 발송 (Solapi) ----------
     같은 Solapi 계정을 모든 현장에서 함께 쓸 수 있습니다.
     ※ 새 서버(새 현장)마다 Solapi 에 '허용 IP' 를 한 번 추가해야 합니다.
        관리자 → 시스템 · 백업 → 방문예약 문자 알림 에서 현재 서버 IP 와 등록값(xxx.xxx.xxx.xxx/32) 을 복사할 수 있습니다. */
  'sms' => array(
    'provider'   => 'solapi',
    'api_key'    => '여기에_Solapi_API_Key',
    'api_secret' => '여기에_Solapi_API_Secret',
    'sender'     => '0212345678',   /* 발신번호 : Solapi 에 등록된 번호 (숫자만) */
  ),

);
