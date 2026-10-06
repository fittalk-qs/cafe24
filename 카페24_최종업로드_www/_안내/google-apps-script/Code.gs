/**
 * 통합웹빌더 → Google Sheet 자동 입력 (Apps Script 웹앱)
 * ---------------------------------------------------------------------------
 * 서비스 계정 · Google Cloud 콘솔 작업이 필요 없습니다. 이 스크립트를 웹앱으로 배포하면
 * 카페24(PHP) 서버가 방문예약이 저장된 뒤 이 주소로 HTTPS POST 를 보내고, 시트에 한 행이 추가됩니다.
 *
 * 넣는 열 (이미 만들어 두신 머리글 그대로) :
 *   A 사이트   B 접수일시   C 성함   D 연락처   E 방문일   F 시간   G 문자   H 문의사항
 *
 * 설치 (10분) :
 *   1) 데이터를 넣을 Google Sheet 열기 → 확장 프로그램 → Apps Script
 *   2) 이 파일 전체를 붙여 넣고 저장 (Ctrl+S)
 *   3) 톱니바퀴(프로젝트 설정) → 스크립트 속성 → 속성 추가
 *        이름 : WB_SECRET   값 : 아무 문자열 20자 이상 (관리자 화면에 넣을 [공유 비밀키] 와 같은 값)
 *      (선택) 이름 : WB_SHEET  값 : 기본 시트(탭) 이름 — 넣지 않으면 "시트1"
 *   4) 배포 → 새 배포 → 유형 [웹 앱]
 *        설명 : 통합웹빌더 방문예약
 *        실행 사용자 : 나
 *        액세스 권한 : 모든 사용자   ← 카페24 서버가 호출해야 하므로 반드시 "모든 사용자"
 *      → 배포 → (처음 한 번) 권한 승인 → 웹 앱 URL 복사 (https://script.google.com/macros/s/…/exec)
 *   5) 관리자 → 시스템(또는 사이트 설정) → Google Sheets 에
 *        연결 방식 : Apps Script 웹앱 / 웹앱 주소 : 4번 URL / 공유 비밀키 : 3번 WB_SECRET / 시트 이름 : 시트1
 *      → [연결 테스트] → [설정 저장] → [기존 방문예약 동기화]
 *
 * 안전장치 :
 *   · 비밀키가 다르면 저장하지 않습니다 (FORBIDDEN).
 *   · 같은 접수ID(receipt)는 다시 보내도 행이 늘지 않습니다 (중복 방지).
 *   · 개인정보는 POST 본문으로만 받습니다. 주소(쿼리)로 받은 개인정보는 거부합니다.
 *   · 이 스크립트는 행을 추가·수정만 합니다. 자동 삭제 · 자동 파기 기능은 없습니다.
 *
 * 코드를 고친 뒤에는 반드시 [배포 → 배포 관리 → 편집(연필) → 버전 : 새 버전 → 배포] 를 해야 반영됩니다.
 */

/* 새로 만들 때 쓰는 기본 머리글 (상태 없음 — 상태는 관리자에서만 관리합니다) */
var WB_HEADERS = ['사이트', '접수일시', '성함', '연락처', '방문일', '시간', '문자', '문의사항'];
/* 이미 쓰고 있는 시트의 머리글이 다르더라도(예: 상태 열이 남아 있어도) 이름을 보고 알맞은 칸에 넣습니다.
   → 기존에 쌓인 예약 데이터를 건드리지 않고 그대로 이어서 저장합니다. */

function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return wbOut({ ok: false, code: 'BAD_JSON', error: 'JSON 형식이 아닙니다.' }); }

    /* 개인정보가 주소(쿼리)에 실려 오면 거부 — 본문으로만 받습니다 */
    var q = (e && e.parameter) || {};
    if (q.name || q.phone || q.secret) { return wbOut({ ok: false, code: 'QUERY_PII', error: '개인정보 · 비밀키는 주소가 아니라 본문으로 보내야 합니다.' }); }

    var props = PropertiesService.getScriptProperties();
    var secret = String(props.getProperty('WB_SECRET') || '');
    if (!secret) { return wbOut({ ok: false, code: 'NO_SECRET', error: '스크립트 속성 WB_SECRET 이 없습니다. (프로젝트 설정 → 스크립트 속성)' }); }
    if (String(body.secret || '') !== secret) { return wbOut({ ok: false, code: 'FORBIDDEN', error: '비밀키가 맞지 않습니다.' }); }

    var name = String(body.sheet || props.getProperty('WB_SHEET') || '시트1').trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(name);
    if (!sh) { return wbOut({ ok: false, code: 'SHEET_NOT_FOUND', error: '시트(탭)를 찾을 수 없습니다 : ' + name, sheets: ss.getSheets().map(function (s) { return s.getName(); }) }); }

    wbEnsureHeader(sh);

    /* 연결 테스트 : 아무것도 쓰지 않고 상태만 알려 줍니다 (빈 체크박스 행은 세지 않습니다) */
    if (body.test) { return wbOut({ ok: true, test: true, sheet: name, rows: Math.max(0, wbLastDataRow(sh) - 1), lastRowRaw: sh.getLastRow() }); }

    var row = body.row;
    if (!row || !row.length) { return wbOut({ ok: false, code: 'NO_ROW', error: '보낼 내용이 없습니다.' }); }

    var receipt = String(body.receipt || '').trim();
    var lock = LockService.getScriptLock();
    try { lock.waitLock(20000); } catch (err) { return wbOut({ ok: false, code: 'BUSY', error: '다른 요청을 처리 중입니다. 잠시 뒤 다시 시도해 주세요.' }); }
    try {
      /* 중복 방지 : 같은 접수ID 는 한 번만 (시트에는 접수ID 열이 없으므로 스크립트에 기록해 둡니다) */
      var siteKey = String(body.site_key || body.siteKey || '').trim();   /* 여러 현장이 같은 시트를 쓰므로 현장까지 합쳐서 구분 */
      if (receipt) {
        var key = 'WBR_' + name + '_' + siteKey + '_' + receipt;
        var seen = props.getProperty(key);
        if (seen) { return wbOut({ ok: true, duplicate: true, row: Number(seen), sheet: name }); }
      }
      var head = wbHeaderRow(sh);                       /* 이 시트의 실제 머리글 */
      var fields = body.fields || wbFieldsFromRow(row); /* 이름 → 값 */
      var values = wbRowForSheet(head, fields);         /* 머리글 순서에 맞춘 한 줄 */
      /* 저장 위치 : 미리 만들어 둔 빈 체크박스 행은 건너뛰고, B~J 에 실제 값이 있는 마지막 행 바로 다음 줄 */
      var last = Math.max(1, wbLastDataRow(sh)) + 1;
      if (last > sh.getMaxRows()) { sh.insertRowsAfter(sh.getMaxRows(), 20); }
      sh.getRange(last, 1, 1, values.length).setValues([values]);

      try { var telCol = wbHeaderRow(sh).indexOf('연락처') + 1; if (telCol > 0) { sh.getRange(last, telCol).setNumberFormat('@'); } } catch (err) {}   /* 연락처 : 010… 앞자리 0 유지 */
      if (receipt) { props.setProperty('WBR_' + name + '_' + siteKey + '_' + receipt, String(last)); }
      return wbOut({ ok: true, row: last, sheet: name, columns: WB_HEADERS });
    } finally { try { lock.releaseLock(); } catch (err) {} }
  } catch (err) {
    return wbOut({ ok: false, code: 'SCRIPT_ERROR', error: String(err && err.message ? err.message : err) });
  }
}

/* 브라우저로 주소를 열었을 때 : 살아 있는지만 알려 줍니다 (데이터는 주지 않습니다) */
function doGet() {
  return wbOut({ ok: true, app: '통합웹빌더 방문예약 수집', hint: '이 주소는 POST 전용입니다. 관리자 화면에 이 주소를 넣고 [연결 테스트] 를 눌러 주세요.' });
}

/* 이 시트의 머리글 한 줄 (앞뒤 공백 제거) */
function wbHeaderRow(sh) {
  var wide = Math.max(WB_HEADERS.length, sh.getLastColumn() || WB_HEADERS.length);
  var vals = sh.getRange(1, 1, 1, wide).getValues()[0];
  var out = [];
  for (var i = 0; i < vals.length; i++) { out.push(String(vals[i] == null ? '' : vals[i]).trim()); }
  while (out.length && out[out.length - 1] === '') { out.pop(); }
  return out.length ? out : WB_HEADERS.slice();
}
/* 서버가 보낸 값 배열(선택 · 사이트 · 접수일시 · 성함 · 연락처 · 방문일 · 시간 · 문자 · 문의사항) → 이름으로 */
function wbFieldsFromRow(row) {
  var f = {};
  for (var i = 0; i < WB_HEADERS.length; i++) { f[WB_HEADERS[i]] = i < row.length ? row[i] : ''; }
  return f;
}
/* 이 시트 머리글 순서에 맞춰 한 줄 만들기 — 모르는 칸(예: 예전 상태 열)은 비워 둡니다 */
function wbRowForSheet(head, fields) {
  var out = [];
  for (var i = 0; i < head.length; i++) {
    var name = head[i];
    var v = Object.prototype.hasOwnProperty.call(fields, name) ? fields[name] : '';
    if (name === '선택') { v = false; }   /* 예전 시트에 남아 있는 체크박스 열은 건드리지 않습니다 */
    out.push(v == null ? '' : v);
  }
  return out;
}

/* 실제 데이터가 들어 있는 마지막 줄 (B~J 기준)
   A열에 체크박스만 미리 만들어 둔 빈 줄은 데이터로 세지 않습니다 — 이것 때문에 999행부터 저장되던 문제를 막습니다. */
function wbLastDataRow(sh) {
  var last = sh.getLastRow();
  if (last < 1) { return 0; }
  var wide = Math.max(WB_HEADERS.length, sh.getLastColumn() || WB_HEADERS.length);
  var vals = sh.getRange(1, 1, last, wide).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    for (var j = 0; j < vals[i].length; j++) {
      var v = vals[i][j];
      if (typeof v === 'boolean') { continue; }   /* 체크박스만 있는 줄은 빈 줄로 봅니다 */
      if (v !== null && v !== undefined && String(v).trim() !== '') { return i + 1; }
    }
  }
  return 0;
}

/* 머리글이 비어 있으면 한 번만 만들어 줍니다 (이미 있으면 그대로 둡니다) */
function wbEnsureHeader(sh) {
  if (sh.getLastRow() >= 1) {
    var first = sh.getRange(1, 1, 1, WB_HEADERS.length).getValues()[0].join('').trim();
    if (first !== '') { return; }
  }
  sh.getRange(1, 1, 1, WB_HEADERS.length).setValues([WB_HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function wbOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------------
   한 번만 실행하는 정리 : 예전 시트의 "선택"(체크박스) · "상태" 열을 지워 8열로 맞춥니다.
   · 스크립트 편집기 위쪽 함수 목록에서 wbCleanupColumns 를 골라 [실행] 하면 됩니다.
   · 기존 예약 내용은 그대로 두고 그 두 열만 지웁니다. (되돌리려면 시트의 [수정 → 실행취소] 또는 버전 기록)
   --------------------------------------------------------------------------- */
function wbCleanupColumns() {
  var props = PropertiesService.getScriptProperties();
  var name = String(props.getProperty('WB_SHEET') || '시트1').trim();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) { throw new Error('시트를 찾을 수 없습니다 : ' + name); }
  var removed = [];
  for (var pass = 0; pass < 4; pass++) {
    var head = wbHeaderRow(sh);
    var idx = -1;
    for (var i = 0; i < head.length; i++) { if (head[i] === '선택' || head[i] === '상태') { idx = i; break; } }
    if (idx < 0) { break; }
    removed.push(head[idx]);
    sh.deleteColumn(idx + 1);
  }
  Logger.log(removed.length ? ('지운 열 : ' + removed.join(', ')) : '지울 열이 없습니다 (이미 8열)');
  return removed;
}

/* 스크립트 편집기에서 직접 실행해 확인할 때 사용 (시트에 시험 행을 한 줄 넣습니다) */
function wbSelfTest() {
  var props = PropertiesService.getScriptProperties();
  var res = doPost({ postData: { contents: JSON.stringify({
    secret: props.getProperty('WB_SECRET'), sheet: props.getProperty('WB_SHEET') || '시트1', receipt: 'TEST-' + Date.now(),
    row: ['테스트 현장', '2026-01-01 09:00', '홍길동', '010-0000-0000', '2026-01-02', '11:00', '미발송', '스크립트 자체 테스트']
  }) }, parameter: {} });
  Logger.log(res.getContent());
}
