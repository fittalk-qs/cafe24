/* 통합웹빌더 편집 화면 전용 확장 — 에디터(iframe · ?cms_edit=1)에서만 cms.js 가 불러옵니다. 공개 홈페이지 방문자는 이 파일을 내려받지 않습니다.
   · 섹션 : 아래쪽 가운데 [높이] 핸들 · 위/아래 [여백] 핸들 (드래그 중 값 표시 · 8px 단위 · Shift = 1px · 놓을 때 한 번만 저장/이력)
   · 요소 : 오른쪽 · 아래 · 모서리 핸들로 크기 조절 · 가운데 정렬 안내선 · 빈 섹션 안 요소는 손잡이로 순서 이동
   · 글 : 추가한 섹션/요소의 제목 · 본문 · 버튼 문구 · 캡션을 그 자리에서 편집 (본문은 작은 서식 도구 모음)
   · 왼쪽 [요소] 패널에서 끌어다 놓기 · 단축키(실행 취소 · 저장 · 삭제 · 복제 · 복사/붙여넣기 · Alt+방향키 미세 조절)를 에디터로 전달
   값의 저장 · 실행 취소 · 기기별(PC/태블릿/모바일) 구분은 에디터(부모 창)가 담당하고, 여기서는 화면 조작과 미리보기만 합니다. */
(function () {
  'use strict';
  var A = window.__CMS_EDIT_API; if (!A || window.__CMS_EDIT) return;
  var edit = A.edit, $ = A.$, $$ = A.$$, body = A.body, post = A.post;
  var SNAP = 8, coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;

  /* ---------- 편집 캔버스 : 공개 홈페이지 인터랙션 차단 ----------
     공개 화면의 마우스 올림(메가메뉴) · 자동 슬라이드 · 휠/터치 섹션 이동이 편집을 방해하지 않도록,
     편집 화면에서만 그 이벤트가 요소까지 내려가지 않게 막습니다. (문서 단계의 선택 · 편집 이벤트는 그대로 동작)
     링크 이동 · 폼 전송 차단 · 팝업 숨김은 cms.js 가 담당하고, 미리보기 · 공개 홈페이지에는 이 파일 자체가 없습니다. */
  var PUB = (function () {
    var UISEL = '.cms-x, .cms-h, .cms-pad, .cms-rz, .cms-bar, .cms-bubble, .cms-edit-add, .cms-edit-handle, [contenteditable="true"]';
    var NAMES = ['mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'focusin', 'focusout', 'focus', 'blur', 'wheel', 'touchstart', 'touchmove', 'touchend'];
    function guard(e) {
      if (edit.dragging || edit.busy || edit.editing || edit.fieldEditing) { return; }   /* 편집 도구를 조작하는 중에는 그대로 */
      var t = e.target; if (t && t.closest && t.closest(UISEL)) { return; }
      e.stopPropagation();   /* preventDefault 는 하지 않음 → 캔버스 스크롤 · 글자 선택은 그대로 */
    }
    NAMES.forEach(function (n) { document.addEventListener(n, guard, true); });
    /* 자동 슬라이드 · 자동 전환 정지 (편집 화면에서만 · 이 창 안에서만) */
    function stopTimers() { var top = setInterval(function () {}, 86400000); for (var i = 1; i <= top; i++) { clearInterval(i); } }
    stopTimers(); setTimeout(stopTimers, 1200); setTimeout(stopTimers, 3000);
    $$('video').forEach(function (v) { try { v.autoplay = false; v.pause(); } catch (x) {} });
    /* 메가메뉴 : 마우스 올림으로는 열리지 않고, 1차 메뉴를 클릭했을 때만 펼침 (소메뉴 편집용) */
    function header() { return document.getElementById('header'); }
    function megaClose() {
      var h = header(); if (!h) { return; }
      h.classList.remove('is-mega-open', 'is-mega-pinned');
      $$('.mega__col').forEach(function (c) { c.classList.remove('is-focus'); });
      $$('.gnb__item').forEach(function (i) { i.classList.remove('is-hover'); });
    }
    function megaOpen(item) {
      var h = header(); if (!h || !item) { return; }
      var g = item.getAttribute('data-group') || '';
      h.classList.add('is-mega-open', 'is-mega-pinned');
      var cols = $$('.mega__col'), hit = null;
      cols.forEach(function (c) { if (c.getAttribute('data-col') === g) { hit = c; } });
      if (!hit) { var items = $$('.gnb__item'), idx = items.indexOf ? items.indexOf(item) : -1; if (idx >= 0 && cols[idx]) { hit = cols[idx]; } }
      cols.forEach(function (c) { c.classList.toggle('is-focus', c === hit); });
      $$('.gnb__item').forEach(function (i) { i.classList.toggle('is-hover', i === item); });
    }
    /* 일반 페이지 편집에서는 마우스를 올려도 · 눌러도 소메뉴(메가메뉴)가 열리지 않습니다.
       헤더 편집 모드에서만 1차 메뉴를 눌러 그 소메뉴를 펼쳐 볼 수 있고, 에디터 오른쪽 패널에서도 켜고 끌 수 있습니다. */
    function headerMode() { return edit.commonMode === 'header'; }
    document.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.closest) { return; }
      if (t.closest(UISEL)) { return; }
      var gi = t.closest('.gnb__item');
      if (gi && !t.closest('.mega')) { if (headerMode()) { megaOpen(gi); post({ type: 'cms:menuPick', group: gi.getAttribute('data-group') || '', label: (gi.textContent || '').trim().slice(0, 40) }); } else { megaClose(); } return; }
      if (!t.closest('#header, .header')) { megaClose(); }
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { megaClose(); } }, true);
    /* 편집모드에서 어떤 이유로든 메가메뉴가 열려 있으면 곧바로 닫습니다 (헤더 편집 모드 제외) */
    function autoClose() { if (!headerMode()) { var h = header(); if (h && h.classList.contains('is-mega-open')) { megaClose(); } } }
    megaClose(); setTimeout(function () { setInterval(autoClose, 400); }, 3300);   /* 위 stopTimers 가 끝난 뒤에 시작 (같이 지워지지 않게) */
    try { new MutationObserver(autoClose).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class'] }); } catch (x) {}
    /* 팝업(배너 · 영상) : 편집 화면에서는 자동으로 열리지 않음 — 에디터에서 [팝업 미리보기]를 눌렀을 때만 표시
       (공개 홈페이지 · 미리보기에서는 원래 노출 조건 그대로 · 팝업 내용 편집은 관리자 [팝업 · 배너] 화면) */
    var popupPreview = false;
    window.addEventListener('message', function (e) { var m = e && e.data; if (m && (m.type === 'cms:openPopup' || m.type === 'cms:previewPopup')) { popupPreview = true; } }, false);
    function hidePopups() {
      if (popupPreview) { return; }
      var n = document.getElementById('wbnote');
      if (n && !n.hidden) { n.hidden = true; n.setAttribute('data-cms-edit-hidden', '1'); }
      $$('.cms-vpop').forEach(function (v) { if (v.parentNode) { v.parentNode.removeChild(v); } });
      $$('body > .cms-vpop, .cms-vpop video, .cms-vpop iframe').forEach(function (m2) { try { if (m2.pause) { m2.pause(); } } catch (x) {} });
    }
    hidePopups();
    [300, 900, 2000, 4000].forEach(function (ms) { setTimeout(hidePopups, ms); });
    var popupTick = 0;
    function hidePopupsSoon() { if (popupTick) { return; } popupTick = setTimeout(function () { popupTick = 0; hidePopups(); }, 120); }   /* 화면이 바뀔 때마다 부르지 않고 모아서 한 번 */
    try { new MutationObserver(hidePopupsSoon).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] }); } catch (x) {}
    return { megaClose: megaClose, megaOpen: megaOpen, popupsShown: function () { return popupPreview; } };
  })();


  /* ================= 헤더 · 푸터 · 퀵메뉴 전용 편집 화면 =================
     편집 캔버스에서만 : 그 영역만 남기고 본문을 감춘 뒤, 소메뉴(메가메뉴)를 펼친 상태로 크게 보여 줍니다.
     공개 홈페이지 · 미리보기에는 이 파일 자체가 없으므로 영향이 없습니다. */
  var COMMON = (function () {
    var which = '', megaOn = false;
    A.injectCss('cms-edit-common', [
      '[data-cms-hide="1"]{display:none !important}',
      '[data-cms-keep="1"]{display:block !important;position:static !important;opacity:1 !important;visibility:visible !important;transform:none !important;max-height:none !important;height:auto !important;min-height:0 !important;margin:0 !important;overflow:visible !important;width:auto !important}',
      'body.cms-only{background:#eef2f7 !important;min-height:auto !important;overflow:visible !important;padding:0 !important}',
      'body.cms-only--header #header{background:#fff !important;color:#1c2b36 !important;box-shadow:0 1px 0 rgba(0,0,0,.06)}',
      'body.cms-only--quick #quickMenu,body.cms-only--quick .quick-menu{margin:40px auto !important;width:max-content !important}',
      /* 소메뉴 전체 펼치기 (편집 화면 전용) */
      'body.cms-mega-all .header__mega,body.cms-mega-all #headerMega{display:block !important;max-height:none !important;height:auto !important;opacity:1 !important;overflow:visible !important;visibility:visible !important;pointer-events:auto !important;position:static !important}',
      'body.cms-mega-all .mega__col{opacity:1 !important;display:block !important}',
      'body.cms-only .cms-edit-label,body.cms-only .cms-edit-add,body.cms-only .cms-edit-line{display:none !important}'
    ].join(''));
    function target() {
      return which === 'footer' ? (document.getElementById('footer') || document.querySelector('footer'))
        : which === 'quick' ? (document.getElementById('quickMenu') || document.querySelector('.quick-menu'))
        : (document.getElementById('header') || document.querySelector('header'));
    }
    function clearIsolate() {
      $$('[data-cms-hide]').forEach(function (e) { e.removeAttribute('data-cms-hide'); });
      $$('[data-cms-keep]').forEach(function (e) { e.removeAttribute('data-cms-keep'); });
    }
    /* 대상 요소만 남기고 : 조상을 따라 올라가며 형제 요소만 감춥니다 (감싸는 요소가 있어도 안전) */
    function isolate(el) {
      clearIsolate(); if (!el) { return; }
      var node = el;
      while (node && node !== document.body && node.parentElement) {
        var parent = node.parentElement;
        Array.prototype.forEach.call(parent.children, function (c) {
          if (c === node || c.classList.contains('cms-x') || c.tagName === 'SCRIPT' || c.tagName === 'STYLE' || c.tagName === 'LINK') { return; }
          c.setAttribute('data-cms-hide', '1');
        });
        node.setAttribute('data-cms-keep', '1');
        node = parent;
      }
    }
    function rect() {
      var el = target(); var h = 0;
      if (el) { var r = el.getBoundingClientRect(); h = Math.ceil(r.height + Math.max(0, r.top + window.pageYOffset)); }
      if (!h) { h = Math.ceil(document.body.scrollHeight); }
      post({ type: 'cms:commonRect', which: which, height: Math.max(160, h + 40), mega: megaOn });
    }
    function apply(w) {
      which = w; edit.commonMode = w;   /* 예전 홈페이지 파일(게시 전)에서도 같게 동작하도록 여기서도 표시 */
      body.setAttribute('data-cms-common', w || '');
      body.classList.toggle('cms-only', !!w);
      ['header', 'footer', 'quick'].forEach(function (k) { body.classList.toggle('cms-only--' + k, w === k); });
      if (w) { isolate(target()); } else { clearIsolate(); }
      if (w !== 'header') { megaAll(false); PUB.megaClose(); }
      if (!w) { body.classList.remove('cms-mega-all'); }
      setTimeout(rect, 60); setTimeout(rect, 400);
    }
    function megaAll(on) {
      megaOn = !!on && which === 'header';
      body.classList.toggle('cms-mega-all', megaOn);
      var h = document.getElementById('header');
      if (h) { h.classList.toggle('is-mega-open', megaOn); h.classList.toggle('is-mega-pinned', megaOn); }
      $$('.mega__col').forEach(function (c) { c.classList.toggle('is-focus', megaOn); });
      setTimeout(rect, 80); setTimeout(rect, 400);
    }
    window.addEventListener('resize', function () { if (which) { setTimeout(rect, 60); } });
    return { apply: apply, megaAll: megaAll, rect: rect, current: function () { return which; } };
  })();

  A.injectCss('cms-edit-x', [
    '.cms-dragging,.cms-dragging *{user-select:none!important;-webkit-user-select:none!important}.cms-dragging img{-webkit-user-drag:none!important}.cms-dragging iframe{pointer-events:none!important}',
    '.cms-h{position:absolute;z-index:9100;touch-action:none;display:flex;align-items:center;justify-content:center;box-sizing:border-box;font:600 10px/1 Pretendard,sans-serif;color:#fff;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.28)}',
    '.cms-h--height{left:50%;bottom:3px;width:64px;height:14px;margin-left:-32px;border-radius:8px;background:#2563eb;cursor:ns-resize}.cms-h--height::after{content:"";width:20px;height:2px;border-top:2px solid rgba(255,255,255,.9);border-bottom:2px solid rgba(255,255,255,.9);box-sizing:content-box;height:2px}',
    '.cms-h--divl,.cms-h--divr{width:16px;height:16px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:ew-resize}.cms-h--divc{width:22px;height:22px;border-radius:6px;background:#111827;color:#fff;font:700 12px/22px sans-serif;text-align:center;cursor:grab}.cms-h--divc::after{content:"⇔"}' +
    '.cms-h--pt,.cms-h--pb{width:44px;height:12px;border-radius:7px;background:#0d9488;cursor:ns-resize}.cms-h--pt{left:50%;margin-left:-22px}.cms-h--pb{left:28%;margin-left:-22px;bottom:3px}.cms-h--pt::after,.cms-h--pb::after{content:"";width:14px;height:0;border-top:2px solid rgba(255,255,255,.9)}',
    '@media(pointer:coarse){.cms-h--height{width:84px;height:24px;margin-left:-42px;border-radius:12px}.cms-h--pt,.cms-h--pb{width:64px;height:22px;border-radius:11px}.cms-h--pt{margin-left:-32px}.cms-rz i{width:22px!important;height:22px!important}}',
    '.cms-pad{position:absolute;left:0;right:0;z-index:9050;pointer-events:none;opacity:0;transition:opacity .12s ease;background:repeating-linear-gradient(135deg,rgba(13,148,136,.20) 0,rgba(13,148,136,.20) 6px,rgba(13,148,136,.08) 6px,rgba(13,148,136,.08) 12px);outline:1px dashed rgba(13,148,136,.65);outline-offset:-1px}.cms-pad--top{top:0}.cms-pad--bottom{bottom:0}.cms-pad.is-on{opacity:1}',
    '.cms-bubble{position:fixed;z-index:9300;transform:translate(-50%,-140%);background:#111827;color:#fff;font:600 12px/1 Pretendard,sans-serif;padding:7px 10px;border-radius:6px;white-space:nowrap;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.3)}',
    '.cms-rz{position:absolute;z-index:9100;pointer-events:none;outline:1px solid #2563eb;outline-offset:0;box-sizing:border-box}.cms-rz i{position:absolute;width:11px;height:11px;background:#fff;border:2px solid #2563eb;border-radius:2px;box-sizing:border-box;pointer-events:auto;touch-action:none}.cms-rz i[data-d=e]{right:-6px;top:50%;margin-top:-6px;cursor:ew-resize}.cms-rz i[data-d=s]{bottom:-6px;left:50%;margin-left:-6px;cursor:ns-resize}.cms-rz i[data-d=se]{right:-6px;bottom:-6px;cursor:nwse-resize}',
    '.cms-guide-v{position:absolute;z-index:9090;width:0;border-left:1px dashed #e0533f;pointer-events:none}.cms-insline{position:absolute;z-index:9095;height:3px;background:#2563eb;border-radius:2px;pointer-events:none}',
    '.cms-elgrip{position:absolute;z-index:9110;width:22px;height:26px;border-radius:4px;background:#111827;color:#fff;font:700 11px/26px sans-serif;text-align:center;cursor:grab;touch-action:none;box-shadow:0 1px 6px rgba(0,0,0,.3)}.cms-elgrip:active{cursor:grabbing}',
    '.cms-rt{position:absolute;z-index:9200;display:flex;gap:2px;align-items:center;padding:4px;border-radius:8px;background:#111827;box-shadow:0 6px 20px rgba(0,0,0,.35)}.cms-rt button,.cms-rt label{min-width:28px;height:28px;padding:0 7px;border:0;border-radius:5px;background:transparent;color:#fff;font:600 12px/28px Pretendard,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.cms-rt button:hover,.cms-rt label:hover{background:rgba(255,255,255,.16)}.cms-rt input[type=color]{width:18px;height:18px;padding:0;border:0;background:none;cursor:pointer}.cms-rt span{width:1px;height:16px;background:rgba(255,255,255,.22);margin:0 2px}',
    '[data-cms-field].cms-field-editing{outline:2px solid #e0533f!important;outline-offset:2px;cursor:text;min-height:1em}'
  ].join(''));

  function snap(v, e) { return e && e.shiftKey ? Math.round(v) : Math.round(v / SNAP) * SNAP; }
  function px(v) { return parseFloat(v) || 0; }
  function mk(tag, cls, parent) { var el = document.createElement(tag); el.className = cls + ' cms-x'; (parent || body).appendChild(el); return el; }
  var bubble = null;
  function showBubble(text, x, y) { if (!bubble) bubble = mk('div', 'cms-bubble'); bubble.textContent = text; bubble.style.left = x + 'px'; bubble.style.top = Math.max(34, y) + 'px'; }
  function hideBubble() { if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble); bubble = null; }
  /* 포인터 드래그 공통 : 포인터 캡처(빠르게 끌어도 놓치지 않음) · 글자 선택/이미지 끌기 방지 · 끝난 직후의 클릭을 선택으로 처리하지 않게 표시 · 화면 가장자리 자동 스크롤 */
  function drag(handle, opts) {
    handle.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button > 0) return; e.preventDefault(); e.stopPropagation();
      try { handle.setPointerCapture(e.pointerId); } catch (x) {}
      edit.busy = true; body.classList.add('cms-dragging'); var ctx = opts.start(e) || {}; var last = e, scroller = null;
      var tick = function () { if (last.clientY > window.innerHeight - 36) window.scrollBy(0, 14); else if (last.clientY < 36) window.scrollBy(0, -14); else return; opts.move(fake(last), ctx); };
      var fake = function (ev) { return { clientX: ev.clientX, clientY: ev.clientY, pageX: ev.clientX + window.pageXOffset, pageY: ev.clientY + window.pageYOffset, shiftKey: ev.shiftKey, altKey: ev.altKey }; };
      var move = function (ev) { last = ev; opts.move(fake(ev), ctx); if (!scroller) scroller = setInterval(tick, 30); };
      var up = function (ev) {
        clearInterval(scroller); try { handle.releasePointerCapture(e.pointerId); } catch (x) {}
        handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up);
        body.classList.remove('cms-dragging'); edit.busy = false; edit.dragged = true; setTimeout(function () { edit.dragged = false; }, 80); hideBubble();
        opts.end(fake(ev.clientX != null ? ev : last), ctx, ev.type === 'pointercancel');
      };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    });
    handle.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
  }
  /* 드래그 중 미리보기 = 인라인 !important (게시용 CSS 도 !important 라서) · 에디터가 확정 CSS 를 보내오면 지움 */
  var inlined = [];
  function setInline(el, prop, value) { el.style.setProperty(prop, value, 'important'); if (!inlined.some(function (x) { return x[0] === el && x[1] === prop; })) inlined.push([el, prop]); }
  function clearInline() { inlined.forEach(function (x) { x[0].style.removeProperty(x[1]); }); inlined = []; }

  /* ================= 섹션 : 높이 · 여백 ================= */
  var S = { sec: null, parts: [] };
  function isHomeFull(sec) { return A.isIndex && sec.classList.contains('home-section') && window.innerWidth >= 1024; }
  function clearSection() { S.parts.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); S.parts = []; S.sec = null; }
  function sectionHandles(sec) {
    clearSection(); if (!sec || sec.getAttribute('data-cms-locked') === '1' || sec.id === 'header' || sec.id === 'footer' || sec.tagName === 'HEADER' || sec.tagName === 'FOOTER') return;
    S.sec = sec; var selector = A.selectorFor(sec), id = A.secId(sec);
    var padT = mk('div', 'cms-pad cms-pad--top', sec), padB = mk('div', 'cms-pad cms-pad--bottom', sec), hT = mk('div', 'cms-h cms-h--pt', sec), hB = mk('div', 'cms-h cms-h--pb', sec);
    hT.title = '위 여백 — 위아래로 끌어 조절'; hB.title = '아래 여백 — 위아래로 끌어 조절'; S.parts = [padT, padB, hT, hB];
    var place = function () { var cs = getComputedStyle(sec); var pt = px(cs.paddingTop), pb = px(cs.paddingBottom); padT.style.height = pt + 'px'; padB.style.height = pb + 'px'; hT.style.top = Math.max(3, pt - 6) + 'px'; };
    S.place = place; place();
    var padDrag = function (handle, pad, side) {
      handle.addEventListener('mouseenter', function () { pad.classList.add('is-on'); }); handle.addEventListener('mouseleave', function () { if (!edit.busy) pad.classList.remove('is-on'); });
      drag(handle, {
        start: function (e) { pad.classList.add('is-on'); return { y: e.pageY, v0: px(getComputedStyle(sec)[side === 'top' ? 'paddingTop' : 'paddingBottom']), v: null, both: false }; },
        /* Alt 를 누른 채 끌거나 오른쪽 패널의 [위·아래 같이]가 켜져 있으면 위 · 아래 여백을 같은 값으로 */
        move: function (e, c) { var v = Math.max(0, Math.min(480, snap(c.v0 + (e.pageY - c.y), e))); c.v = v; c.both = !!(e.altKey || edit.padLinked); setInline(sec, 'padding-' + side, v + 'px'); if (c.both) { setInline(sec, 'padding-' + (side === 'top' ? 'bottom' : 'top'), v + 'px'); padT.classList.add('is-on'); padB.classList.add('is-on'); } place(); showBubble((c.both ? '위 · 아래 여백 ' : side === 'top' ? '위 여백 ' : '아래 여백 ') + v + 'px', e.clientX, e.clientY); },
        end: function (e, c, cancel) { padT.classList.remove('is-on'); padB.classList.remove('is-on'); if (cancel || c.v == null || (c.v === c.v0 && !c.both)) { clearInline(); place(); return; } var props = {}; props[side === 'top' ? 'paddingTop' : 'paddingBottom'] = c.v + 'px'; if (c.both) props[side === 'top' ? 'paddingBottom' : 'paddingTop'] = c.v + 'px'; post({ type: 'cms:sectionStyle', section: id, selector: selector, props: props, label: c.both ? '위 · 아래 여백' : side === 'top' ? '위 여백' : '아래 여백' }); }
      });
    };
    padDrag(hT, padT, 'top'); padDrag(hB, padB, 'bottom');
    if (!isHomeFull(sec)) {   /* 메인의 풀페이지 기본 섹션은 화면 높이에 맞춰 표시 → 높이 핸들 없음 (여백 · 배경은 조절 가능) */
      var hH = mk('div', 'cms-h cms-h--height', sec); hH.title = '섹션 높이 — 위아래로 끌어 조절 (내용보다 작아지지 않습니다)'; S.parts.push(hH);
      drag(hH, {
        start: function (e) { var keep = sec.style.getPropertyValue('min-height'), pr = sec.style.getPropertyPriority('min-height'); sec.style.setProperty('min-height', '0px', 'important'); var natural = sec.offsetHeight; if (keep) sec.style.setProperty('min-height', keep, pr); else sec.style.removeProperty('min-height'); return { y: e.pageY, h0: sec.offsetHeight, natural: natural, h: null, auto: false }; },
        move: function (e, c) { var h = Math.max(40, snap(c.h0 + (e.pageY - c.y), e)); c.auto = h <= c.natural + 1; c.h = c.auto ? c.natural : h; setInline(sec, 'min-height', c.auto ? '0px' : h + 'px'); place(); showBubble(c.auto ? '내용에 맞춤 (자동) · ' + c.natural + 'px' : h + 'px', e.clientX, e.clientY); },
        end: function (e, c, cancel) { if (cancel || c.h == null) { clearInline(); return; } post({ type: 'cms:sectionStyle', section: id, selector: selector, props: { minHeight: c.auto ? '' : c.h + 'px', height: '' }, label: '섹션 높이' }); }
      });
    }
  }

  /* ---- 구분선 : 양 끝 손잡이 = 길이(%) · 가운데 손잡이 = 정렬 ---- */
  function dividerHandles(sec) {
    var hr = sec.querySelector('hr'); if (!hr) return; var inner = hr.parentNode; var selector = '#' + sec.id + ' hr';
    var hl = mk('div', 'cms-h cms-h--divl cms-x', sec), hr2 = mk('div', 'cms-h cms-h--divr cms-x', sec), hc = mk('div', 'cms-h cms-h--divc cms-x', sec); S.parts.push(hl, hr2, hc);
    hl.title = '길이 조절'; hr2.title = '길이 조절'; hc.title = '위치 이동 (왼쪽 · 가운데 · 오른쪽)';
    var place = function () { var r = hr.getBoundingClientRect(), s = sec.getBoundingClientRect(); var top = r.top - s.top + r.height / 2 - 7; hl.style.top = top + 'px'; hl.style.left = (r.left - s.left - 8) + 'px'; hr2.style.top = top + 'px'; hr2.style.left = (r.right - s.left - 8) + 'px'; hc.style.top = (top - 4) + 'px'; hc.style.left = (r.left - s.left + r.width / 2 - 11) + 'px'; };
    var prevPlace = S.place; S.place = function () { if (prevPlace) prevPlace(); place(); }; place();
    var pct = function (w) { var iw = inner.getBoundingClientRect().width || 1; return Math.max(10, Math.min(100, Math.round(w / iw * 100))); };
    var endDrag = function (side) { return { start: function (e) { return { x: e.pageX, w0: hr.getBoundingClientRect().width, w: null }; }, move: function (e, c) { var d = (e.pageX - c.x) * (side === 'left' ? -1 : 1); var al = getComputedStyle(hr).marginLeft === '0px' && getComputedStyle(hr).marginRight !== '0px' ? 'left' : (getComputedStyle(hr).marginRight === '0px' && getComputedStyle(hr).marginLeft !== '0px' ? 'right' : 'center'); c.w = pct(c.w0 + (al === 'center' ? d * 2 : d)); setInline(hr, 'width', c.w + '%'); place(); showBubble('길이 ' + c.w + '%', e.clientX, e.clientY); }, end: function (e, c, cancel) { if (cancel || c.w == null) { clearInline(); place(); return; } post({ type: 'cms:elementStyle', selector: selector, props: { width: c.w + '%' }, label: '구분선 길이' }); } }; };
    drag(hl, endDrag('left')); drag(hr2, endDrag('right'));
    drag(hc, { start: function (e) { return { x: e.pageX, al: null }; }, move: function (e, c) { var ir = inner.getBoundingClientRect(); var cx = e.clientX - ir.left; var al = cx < ir.width / 3 ? 'left' : (cx > ir.width * 2 / 3 ? 'right' : 'center'); if (al !== c.al) { c.al = al; setInline(hr, 'margin-left', al === 'left' ? '0px' : 'auto'); setInline(hr, 'margin-right', al === 'right' ? '0px' : 'auto'); place(); } showBubble({ left: '왼쪽', center: '가운데', right: '오른쪽' }[al], e.clientX, e.clientY); }, end: function (e, c, cancel) { if (cancel || !c.al) { clearInline(); place(); return; } post({ type: 'cms:elementStyle', selector: selector, props: c.al === 'left' ? { marginLeft: '0', marginRight: 'auto' } : c.al === 'right' ? { marginLeft: 'auto', marginRight: '0' } : { marginLeft: 'auto', marginRight: 'auto' }, label: '구분선 위치' }); } });
  }
  /* ================= 요소 : 크기 조절 · 가운데 안내선 ================= */
  var Rz = { el: null, frame: null, guide: null };
  function clearResize() { [Rz.frame, Rz.guide, Rz.grip, Rz.ins].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); }); Rz = { el: null, frame: null, guide: null }; }
  function sizable(el) { if (!el || el.closest('#header, #footer, .popup, #quickMenu, form, [data-cms-locked="1"]')) return false; var t = el.tagName; if (t === 'IMG' || t === 'PICTURE') return true; if (t === 'A' || t === 'BUTTON') return /cms-btn|btn/.test(el.className); return !!el.closest('.cms-block') && A.isLeaf(el); }
  function pageRect(el) { var r = el.getBoundingClientRect(); return { left: r.left + window.pageXOffset, top: r.top + window.pageYOffset, width: r.width, height: r.height }; }
  function placeResize() { if (!Rz.el || !Rz.frame) return; if (!document.body.contains(Rz.el)) { clearResize(); return; } var r = pageRect(Rz.el); Rz.frame.style.left = r.left + 'px'; Rz.frame.style.top = r.top + 'px'; Rz.frame.style.width = r.width + 'px'; Rz.frame.style.height = r.height + 'px'; if (Rz.grip) { Rz.grip.style.left = Math.max(2, r.left - 28) + 'px'; Rz.grip.style.top = r.top + 'px'; } }
  function elementHandles(el) {
    clearResize(); if (!el) return; var target = el.tagName === 'PICTURE' ? (el.querySelector('img') || el) : el;
    var wrap = el.closest('[data-cms-el]');
    if (sizable(el)) {
      Rz.el = target; Rz.frame = mk('div', 'cms-rz'); Rz.frame.innerHTML = '<i data-d="e"></i><i data-d="s"></i><i data-d="se"></i>';
      var selector = A.selectorFor(target), isImg = target.tagName === 'IMG', isText = !isImg && target.tagName !== 'A' && target.tagName !== 'BUTTON';
      $$('i', Rz.frame).forEach(function (h) {
        var d = h.getAttribute('data-d');
        drag(h, {
          start: function (e) { var r = target.getBoundingClientRect(); var host = target.closest('.cms-block__inner, .cms-el, section') || target.parentElement; return { x: e.pageX, y: e.pageY, w0: r.width, h0: r.height, maxW: host ? host.getBoundingClientRect().width : window.innerWidth, host: host, w: null, h: null }; },
          move: function (e, c) {
            if (d !== 's') { var w = Math.max(24, snap(c.w0 + (e.pageX - c.x), e)); if (w >= c.maxW - 4) { c.w = '100%'; setInline(target, 'width', '100%'); } else { c.w = w + 'px'; setInline(target, 'width', w + 'px'); } setInline(target, 'max-width', '100%'); if (isImg && d === 'e') setInline(target, 'height', 'auto'); if (target.tagName === 'A' || target.tagName === 'BUTTON') { setInline(target, 'box-sizing', 'border-box'); if (getComputedStyle(target).display === 'inline') setInline(target, 'display', 'inline-block'); } }
            if (d !== 'e') { if (!(isImg && d === 'se')) { var hh = Math.max(16, snap(c.h0 + (e.pageY - c.y), e)); c.h = hh + 'px'; setInline(target, isText ? 'min-height' : 'height', hh + 'px'); if (isImg) setInline(target, 'object-fit', 'cover'); } else setInline(target, 'height', 'auto'); }
            placeResize(); var r = target.getBoundingClientRect(); showBubble(Math.round(r.width) + ' × ' + Math.round(r.height), e.clientX, e.clientY);
            /* 가운데 정렬 안내선 : 요소의 가운데가 섹션(안쪽 영역)의 가운데와 맞으면 표시 */
            if (c.host) { var hr = c.host.getBoundingClientRect(); var on = Math.abs((r.left + r.width / 2) - (hr.left + hr.width / 2)) <= 3; if (on) { if (!Rz.guide) Rz.guide = mk('div', 'cms-guide-v'); Rz.guide.style.left = (hr.left + hr.width / 2 + window.pageXOffset) + 'px'; Rz.guide.style.top = (hr.top + window.pageYOffset) + 'px'; Rz.guide.style.height = hr.height + 'px'; } else if (Rz.guide) { Rz.guide.parentNode.removeChild(Rz.guide); Rz.guide = null; } }
          },
          end: function (e, c, cancel) { if (Rz.guide) { Rz.guide.parentNode.removeChild(Rz.guide); Rz.guide = null; } if (cancel || (c.w == null && c.h == null)) { clearInline(); placeResize(); return; } var props = {}; if (c.w != null) { props.width = c.w; props.maxWidth = '100%'; if (isImg && d === 'e') props.height = 'auto'; if (target.tagName === 'A' || target.tagName === 'BUTTON') { props.boxSizing = 'border-box'; props.display = 'inline-block'; } } if (c.h != null) { props[isText ? 'minHeight' : 'height'] = c.h; if (isImg) props.objectFit = 'cover'; } else if (isImg && d === 'se') props.height = 'auto'; post({ type: 'cms:elementStyle', selector: selector, props: props, label: '요소 크기' }); }
        });
      });
    }
    /* 빈 섹션 안의 요소 : 왼쪽 손잡이를 위아래로 끌어 순서 이동 (삽입 위치 안내선) */
    if (wrap && !wrap.closest('[data-cms-locked="1"]')) {
      if (!Rz.el) Rz.el = wrap; Rz.grip = mk('div', 'cms-elgrip'); Rz.grip.textContent = '⋮⋮'; Rz.grip.title = '끌어서 이 섹션 안에서 요소 순서 이동';
      var host = wrap.parentElement, blk = wrap.closest('.cms-block');
      drag(Rz.grip, {
        start: function () { return { to: null }; },
        move: function (e, c) { var sibs = $$(':scope > .cms-el', host); var idx = sibs.length; for (var i = 0; i < sibs.length; i++) { var r = sibs[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { idx = i; break; } } c.to = idx; if (!Rz.ins) Rz.ins = mk('div', 'cms-insline'); var ref = sibs[idx] || sibs[sibs.length - 1]; var rr = ref.getBoundingClientRect(); var hr = host.getBoundingClientRect(); Rz.ins.style.left = (hr.left + window.pageXOffset) + 'px'; Rz.ins.style.width = hr.width + 'px'; Rz.ins.style.top = ((idx < sibs.length ? rr.top : rr.bottom) + window.pageYOffset - 1) + 'px'; },
        end: function (e, c, cancel) { if (Rz.ins) { Rz.ins.parentNode.removeChild(Rz.ins); Rz.ins = null; } if (cancel || c.to == null) return; var sibs = $$(':scope > .cms-el', host); var from = sibs.indexOf(wrap); var to = c.to > from ? c.to - 1 : c.to; if (to === from) return; post({ type: 'cms:moveElement', blockUid: blk.getAttribute('data-cms-block'), elUid: wrap.getAttribute('data-cms-el'), to: to }); }
      });
    }
    placeResize();
  }

  /* ================= 글 : 그 자리에서 편집 (추가한 섹션/요소) ================= */
  var F = null;
  function cleanHtml(html) { return String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, ''); }
  function startFieldEdit(el) {
    if (F) endFieldEdit(true); var blk = el.closest('.cms-block'); if (!blk || blk.getAttribute('data-cms-locked') === '1') return;
    var field = el.getAttribute('data-cms-field'), rich = field === 'html', wrap = el.closest('[data-cms-el]');
    F = { el: el, orig: el.innerHTML, field: field, rich: rich, blockUid: blk.getAttribute('data-cms-block'), elUid: wrap ? wrap.getAttribute('data-cms-el') : null, timer: null, bar: null };
    edit.fieldEditing = el; clearResize(); clearSection();
    try { el.contentEditable = rich ? 'true' : 'plaintext-only'; } catch (x) { el.contentEditable = 'true'; }
    if (el.contentEditable !== 'true' && el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.classList.add('cms-field-editing'); el.focus();
    var send = function (done, cancel) { if (!F) return; var v = F.rich ? cleanHtml(el.innerHTML) : (el.innerText || '').replace(/ /g, ' ').replace(/\n+$/g, ''); post({ type: 'cms:blockField', blockUid: F.blockUid, elUid: F.elUid, field: F.field, value: v, done: !!done, cancel: !!cancel }); };
    F.send = send;
    F.onInput = function () { clearTimeout(F.timer); F.timer = setTimeout(function () { send(false); }, 160); if (F.bar) placeBar(); };
    F.onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endFieldEdit(false); } else if (e.key === 'Enter' && !F.rich) { e.preventDefault(); endFieldEdit(true); } e.stopPropagation(); };
    F.onClick = function (e) { e.preventDefault(); };
    F.onBlur = function () { setTimeout(function () { if (!F) return; var a = document.activeElement; if (F.bar && a && F.bar.contains(a)) return; endFieldEdit(true); }, 120); };
    el.addEventListener('input', F.onInput); el.addEventListener('keydown', F.onKey, true); el.addEventListener('click', F.onClick); el.addEventListener('blur', F.onBlur);
    if (rich) { buildBar(); placeBar(); }
    post({ type: 'cms:fieldEditing', on: true });
  }
  function endFieldEdit(commit) {
    if (!F) return; var f = F, el = f.el; clearTimeout(f.timer);
    el.removeEventListener('input', f.onInput); el.removeEventListener('keydown', f.onKey, true); el.removeEventListener('click', f.onClick); el.removeEventListener('blur', f.onBlur);
    el.contentEditable = 'false'; el.classList.remove('cms-field-editing'); if (f.bar && f.bar.parentNode) f.bar.parentNode.removeChild(f.bar);
    if (!commit) { el.innerHTML = f.orig; f.send(true, true); } else f.send(true, false);
    F = null; edit.fieldEditing = null; post({ type: 'cms:fieldEditing', on: false });
  }
  function buildBar() {
    var bar = mk('div', 'cms-rt'); F.bar = bar;
    bar.innerHTML = '<button type="button" data-c="bold" title="굵게 (Ctrl+B)"><b>B</b></button><button type="button" data-c="italic" title="기울임"><i>I</i></button><button type="button" data-c="underline" title="밑줄"><u>U</u></button><span></span>' +
      '<button type="button" data-b="h3" title="제목으로">제목</button><button type="button" data-b="p" title="본문으로">본문</button><span></span>' +
      '<button type="button" data-c="justifyLeft" title="왼쪽 정렬">좌</button><button type="button" data-c="justifyCenter" title="가운데 정렬">중</button><button type="button" data-c="justifyRight" title="오른쪽 정렬">우</button><span></span>' +
      '<button type="button" data-c="insertUnorderedList" title="목록">• 목록</button><button type="button" data-link title="선택한 글에 링크">링크</button><label title="글자색"><input type="color" value="#1c2b36"></label><button type="button" data-c="removeFormat" title="서식 지우기">초기화</button>';
    bar.addEventListener('mousedown', function (e) { if (e.target.tagName !== 'INPUT') e.preventDefault(); });   /* 글 선택 영역 유지 */
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !F) return; e.preventDefault(); e.stopPropagation(); F.el.focus();
      if (b.hasAttribute('data-link')) { var u = window.prompt('연결할 주소 (비우면 링크 해제)', 'https://'); if (u === null) return; if (u && u !== 'https://') document.execCommand('createLink', false, u); else document.execCommand('unlink'); }
      else if (b.getAttribute('data-b')) document.execCommand('formatBlock', false, b.getAttribute('data-b'));
      else document.execCommand(b.getAttribute('data-c'), false, null);
      F.onInput();
    });
    bar.querySelector('input[type=color]').addEventListener('input', function (e) { if (!F) return; F.el.focus(); document.execCommand('foreColor', false, e.target.value); F.onInput(); });
  }
  function placeBar() { if (!F || !F.bar) return; var r = pageRect(F.el); var bw = F.bar.offsetWidth || 420; F.bar.style.left = Math.max(8, Math.min(r.left, window.pageXOffset + window.innerWidth - bw - 8)) + 'px'; var top = r.top - 44; if (top < window.pageYOffset + 8) top = r.top + r.height + 8; F.bar.style.top = top + 'px'; }

  /* ================= 왼쪽 [요소] 패널에서 끌어다 놓기 ================= */
  var dropSec = null;
  function dropTarget(t) { return t && t.closest ? t.closest('.cms-block, .cms-edit-sec') : null; }
  document.addEventListener('dragover', function (e) { if (edit.dragging) return; var types = e.dataTransfer && e.dataTransfer.types ? Array.prototype.slice.call(e.dataTransfer.types) : []; if (types.indexOf('text/plain') < 0 && types.indexOf('Text') < 0) return; var sec = dropTarget(e.target); if (!sec || sec.getAttribute('data-cms-locked') === '1') return; e.preventDefault(); if (dropSec !== sec) { if (dropSec) dropSec.classList.remove('cms-sec--drop'); dropSec = sec; sec.classList.add('cms-sec--drop'); } }, true);
  document.addEventListener('dragleave', function (e) { if (dropSec && !dropTarget(e.relatedTarget)) { dropSec.classList.remove('cms-sec--drop'); dropSec = null; } }, true);
  document.addEventListener('drop', function (e) {
    if (edit.dragging) return; var data = ''; try { data = e.dataTransfer.getData('text/plain') || ''; } catch (x) {} if (data.indexOf('wb-el:') !== 0) return; e.preventDefault(); e.stopPropagation();
    var sec = dropTarget(e.target); if (dropSec) { dropSec.classList.remove('cms-sec--drop'); dropSec = null; } if (!sec) return;
    var msg = { type: 'cms:dropElement', elType: data.slice(6), section: A.secId(sec), container: sec.classList.contains('cms-block--section'), blockUid: sec.getAttribute('data-cms-block') || null, index: null };
    if (msg.container) { var host = sec.querySelector('.cms-block__inner'); var sibs = $$(':scope > .cms-el', host); var idx = sibs.length; for (var i = 0; i < sibs.length; i++) { var r = sibs[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { idx = i; break; } } msg.index = idx; }
    post(msg);
  }, true);

  /* ================= 단축키 → 에디터 ================= */
  document.addEventListener('keydown', function (e) {
    if (F || edit.editing) return; var tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    var mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase(), key = '';
    if (mod && k === 'z') key = e.shiftKey ? 'redo' : 'undo'; else if (mod && k === 'y') key = 'redo'; else if (mod && k === 's') key = 'save'; else if (mod && k === 'd') key = 'duplicate'; else if (mod && k === 'c') key = 'copy'; else if (mod && k === 'v') key = 'paste'; else if ((k === 'delete' || k === 'backspace') && edit.sel) key = 'delete';
    if (key) { e.preventDefault(); post({ type: 'cms:key', key: key }); return; }
    /* Alt + 방향키 : 미세 조절 (8px · Shift = 1px) — 섹션 = 높이(↑↓) · 요소 = 너비(←→) */
    if (e.altKey && edit.sel && /^arrow/.test(k)) {
      var step = (e.shiftKey ? 1 : SNAP) * (k === 'arrowup' || k === 'arrowleft' ? -1 : 1); var el = edit.sel; e.preventDefault();
      if (S.sec === el && (k === 'arrowup' || k === 'arrowdown') && !isHomeFull(el)) post({ type: 'cms:sectionStyle', section: A.secId(el), selector: A.selectorFor(el), props: { minHeight: Math.max(40, Math.round(el.offsetHeight + step)) + 'px' }, label: '섹션 높이', nudge: true });
      else if (Rz.el && sizable(el) && (k === 'arrowleft' || k === 'arrowright')) post({ type: 'cms:elementStyle', selector: A.selectorFor(Rz.el), props: { width: Math.max(24, Math.round(Rz.el.getBoundingClientRect().width + step)) + 'px', maxWidth: '100%' }, label: '요소 너비', nudge: true });
    }
  }, true);

  /* ================= 연결 ================= */
  window.addEventListener('message', function (e) { var m = e.data || {}; if (m.type === 'cms:css') { clearInline(); setTimeout(reposition, 30); } });
  function reposition() { if (S.place) { try { S.place(); } catch (x) {} } placeResize(); if (F) placeBar(); }
  window.addEventListener('scroll', function () { if (F) placeBar(); }, true);
  window.__CMS_EDIT = {
    onSelect: function (el, isSec) { if (F && el !== F.el && !(el && F.el.contains(el))) endFieldEdit(true); if (!el) { clearSection(); clearResize(); return; } if (isSec) { clearResize(); sectionHandles(el); if (el.classList.contains('cms-block--divider')) dividerHandles(el); } else { clearSection(); elementHandles(el); } },
    onMessage: function (m) {
      if (m.type === 'cms:endFieldEdit') endFieldEdit(true);
      else if (m.type === 'cms:padLinked') edit.padLinked = !!m.on;
      else if (m.type === 'cms:commonMode') { COMMON.apply(m.which || ''); }   /* 헤더 · 푸터 · 퀵메뉴 전용 편집 화면 */
      else if (m.type === 'cms:megaAll') { COMMON.megaAll(!!m.on); }   /* [전체 메뉴 펼치기] · [접기] */
      else if (m.type === 'cms:megaOpen') {   /* 오른쪽 패널의 [소메뉴 펼쳐 보기] 로만 펼칩니다 (마우스 올림으로는 열리지 않음) */
        if (!m.group) { PUB.megaClose(); return; }
        var items = $$('.gnb__item'), hit = null;
        items.forEach(function (i) { if ((i.getAttribute('data-group') || '') === m.group) { hit = i; } });
        if (hit) { PUB.megaOpen(hit); } else { PUB.megaClose(); }
      }
    },
    startFieldEdit: startFieldEdit, endFieldEdit: endFieldEdit, reposition: reposition
  };
  if (edit.sel) window.__CMS_EDIT.onSelect(edit.sel, edit.sel.matches('section, .cms-block') && !A.isLeaf(edit.sel));
})();
