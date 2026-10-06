/* CMS 로더 v3 (공개 홈페이지용 · 관리 UI 없음 · 통합웹빌더 연동 : 영상 팝업 · 팝업 표시 규칙 추가)
   1) 게시 JSON 을 받아 SITE_DATA 위에 덮어쓴 뒤 common.js · main.js/subpage.js 를 로드 (실패 · 미연결 시 내장 데이터 그대로)
   2) 폼 스키마 렌더 보강 + 관리자 API 로 제출   3) SEO 메타 · 사용자 CSS · 속성 · 추가 블록 · 페이지별 헤더/푸터 예외 · PC/모바일 줄바꿈
   4) 익명 통계 비콘 · 팝업 노출/클릭 집계   5) ?cms_preview=토큰 → 초안 미리보기 · ?cms_edit=1 → 에디터(iframe) 편집 모드 (선택 표시는 편집 화면에서만) */
(function () {
  'use strict';
  var CFG = window.CMS_CONFIG || {};
  var body = document.body, isIndex = body.getAttribute('data-page') === 'index';
  var qs = new URLSearchParams(location.search);
  var hashPage = (location.hash.match(/^#page=([\w-]+)/) || [])[1] || '';   /* 단일 파일 : #page=ID */
  var pageKey = isIndex ? 'main' : (qs.get('page') || hashPage || '');
  var editMode = qs.get('cms_edit') === '1' && window.parent !== window;
  var previewToken = qs.get('cms_preview') || '';
  var api = String(CFG.api || '').replace(/\/+$/, '');
  var __apiOrigin = null;
  function apiOrigin() {   /* api 값("./api/index.php?r=" · "https://…") 을 서버 주소로 바꿔 비교합니다 */
    if (__apiOrigin !== null) { return __apiOrigin; }
    __apiOrigin = '';
    if (api) { try { __apiOrigin = new URL(api, location.href).origin; } catch (e) { __apiOrigin = ''; } }
    return __apiOrigin;
  }
  /* API 주소 만들기 : 개발(Node) = api + '/api/…' · 운영(PHP) = 'api/index.php?r=' + '/…' (질의는 & 로 이어 붙임) */
  function apiUrl(path, qs) { var u = /\?r=$/.test(api) ? api + path.replace(/^\/api/, '') : api + path; if (qs) u += (u.indexOf('?') >= 0 ? '&' : '?') + qs; return u; }
  var scripts = isIndex ? ['assets/js/common.js', 'assets/js/main.js'] : ['assets/js/common.js', 'assets/js/subpage.js'];
  var DATA = null, booted = false;
  /* site-data.js 의 const SITE_DATA 는 window 속성이 아니라 전역 렉시컬 바인딩 → 식별자로 접근 */
  function sd() { try { return (typeof SITE_DATA !== 'undefined') ? SITE_DATA : window.SITE_DATA; } catch (e) { return window.SITE_DATA; } }

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, over) { Object.keys(over).forEach(function (k) { if (isObj(over[k]) && isObj(base[k])) merge(base[k], over[k]); else base[k] = over[k]; }); return base; }
  function loadScript(src, cb) {
    var inline = window.__CMS_INLINE && window.__CMS_INLINE[src];   /* 단일 파일 : common.js · main.js · subpage.js 가 HTML 안에 함수로 들어 있음 (외부 요청 없음) */
    if (inline) { try { inline(); } catch (e) { if (window.console) console.error('[CMS] ' + src, e); } cb(); return; }
    var s = document.createElement('script'); s.src = src + (window.CMS_ASSET_VER ? '?v=' + window.CMS_ASSET_VER : ''); s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- 1. 데이터 가져오기 ---------- */
  function fetchJson(url, timeout) {
    return new Promise(function (resolve, reject) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; reject(new Error('timeout')); } }, timeout || CFG.timeout || 2500);
      fetch(url, { credentials: 'omit', cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (j) { if (!done) { done = true; clearTimeout(t); resolve(j); } }).catch(function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }
  function publishedUrl() { return CFG.published || (api + '/published/' + CFG.siteKey + '.json'); }
  function start() {
    if (editMode) {
      window.addEventListener('message', onEditorMessage);
      var sayHello = function () { if (booted || window.__cmsGotInit) { return; } try { window.parent.postMessage({ type: 'cms:hello', pageKey: pageKey }, '*'); } catch (e) {} };   /* 첫 응답(cms:init)이 오면 더 보내지 않습니다 */
      sayHello(); [400, 1200, 2500, 5000].forEach(function (ms) { setTimeout(sayHello, ms); });   /* 관리자가 늦게 준비돼도 편집 화면이 멈추지 않도록 */
      return;
    }
    if (window.CMS_PUBLISHED && typeof window.CMS_PUBLISHED === 'object' && !(previewToken && api)) { setSource('embedded'); boot(window.CMS_PUBLISHED); return; }   /* 단일 파일 : 게시 데이터 내장 (published.json 요청 없음) · 미리보기 토큰이 있으면 서버의 초안 데이터를 먼저 받음 */
    if (CFG.enabled === false || !CFG.siteKey || (!api && !CFG.published)) { boot(null); return; }
    var p = previewToken && api ? fetchJson(apiUrl('/api/public/' + CFG.siteKey + '/preview', 'token=' + encodeURIComponent(previewToken)), 8000) : fetchJson(publishedUrl());
    p.then(function (json) { if (!previewToken) keepGood(json); setSource('live'); boot(json); }).catch(function (err) {
      /* 게시 데이터를 받지 못함 : 조용히 넘어가지 않고 기록 → 이 브라우저가 마지막으로 정상 수신한 게시본으로 표시 (없으면 홈페이지 파일의 기본 데이터) */
      var last = previewToken ? (window.CMS_PUBLISHED && typeof window.CMS_PUBLISHED === 'object' ? window.CMS_PUBLISHED : null) : lastGood();
      if (window.console) console.error('[CMS] 게시 데이터를 불러오지 못했습니다 (' + (err && err.message) + ') → ' + (last ? '마지막 정상 게시본 v' + ((last.cms || {}).version || '?') + ' 로 표시합니다.' : '홈페이지 기본 데이터로 표시합니다.'), publishedUrl());
      setSource(last ? 'cache' : 'builtin'); boot(last);
    });
  }
  function goodKey() { return 'cms_pub_' + CFG.siteKey; }
  function keepGood(json) { try { var t = JSON.stringify(json); if (t.length < 1500000) localStorage.setItem(goodKey(), t); } catch (e) {} }
  function lastGood() { try { var t = localStorage.getItem(goodKey()); var j = t ? JSON.parse(t) : null; return j && typeof j === 'object' ? j : null; } catch (e) { return null; } }
  function setSource(s) { try { document.documentElement.setAttribute('data-cms-source', s); } catch (e) {} }
  function boot(json) {
    if (booted) return; booted = true;
    if (json && typeof json === 'object') { DATA = json; applyData(json); }
    body.setAttribute('data-cms-page', pageKey || 'main');
    if (json && json.styles && json.styles.css) injectCss('cms-styles', json.styles.css);
    loadScript(scripts[0], function () { loadScript(scripts[1], function () { afterBoot(); }); });
  }
  function applyData(json) {
    var SD = sd(); if (!SD) return;
    var skip = { cms: 1, styles: 1, blocks: 1, seo: 1, forms: 1, boards: 1, analytics: 1, attrs: 1, seoSettings: 1, privacySettings: 1, pageCommon: 1, headerSettings: 1 };
    Object.keys(json).forEach(function (k) { if (skip[k]) return; if (isObj(json[k]) && isObj(SD[k])) merge(SD[k], json[k]); else SD[k] = json[k]; });
    SD.headerMode = { transparent: headerTransparentOf(json) };   /* common.js 의 헤더 상태가 이 값 하나만 봄 */
    if (Array.isArray(json.popupBanners)) SD.popupBanners = json.popupBanners.filter(bannerAllowed);   /* 게시 중인 배너만 · 닫은 기록으로 거르지 않음 */
    if (json.forms && json.forms.reserve && SD.reserve) { var st = json.forms.reserve.settings || {}; if (st.doneTitle) SD.reserve.doneTitle = st.doneTitle; if (st.doneText) SD.reserve.doneText = st.doneText; }
  }
  /* 투명 헤더 : 사이트 공통(헤더 설정의 "첫 화면 투명 헤더") AND 페이지별("이 페이지에서 투명 헤더 사용") — 기기(PC · 태블릿 · 모바일)와 무관한 페이지 단위 값 */
  function headerTransparentOf(json) { var pc = (json && json.pageCommon && json.pageCommon[pageKey || 'main']) || {}; var hs = (json && json.headerSettings) || {}; return !((pc.header && pc.header.transparent === false) || hs.transparent === false); }
  function injectCss(id, css) { var el = document.getElementById(id); if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); } el.textContent = css || ''; }

  /* ---------- 2. 부트 후 보강 ---------- */
  function afterBoot() {
    injectCss('cms-anim', ANIM_CSS);
    try { applyBlocks(); } catch (e) { if (window.console) console.warn('cms blocks', e); }
    try { applyBreaks(); } catch (e) {}
    try { applyAttrs(); } catch (e) { if (window.console) console.warn('cms attrs', e); }
    try { applyPageCommon(); } catch (e) {}
    try { if (window.SITE && SITE.bindSiteValues) SITE.bindSiteValues(document.body); } catch (e) {}   /* 추가 블록 · 속성으로 생긴 링크/문구에도 사이트 공통값 연결 */
    try { enhanceForms(); } catch (e) { if (window.console) console.warn('cms form', e); }
    try { applySeo(); } catch (e) {}
    if (editMode) { initEditMode(); return; }
    try { analytics(); } catch (e) {}
    try { popupStats(); } catch (e) {}
    try { popupRules(); } catch (e) {}
    try { videoPopups(); } catch (e) {}
  }
  var ANIM_CSS = '.cms-anim{opacity:0;transition:opacity .7s ease,transform .7s ease}.cms-anim.is-in{opacity:1;transform:none}.cms-anim-fadeUp{transform:translateY(32px)}.cms-anim-fadeDown{transform:translateY(-32px)}.cms-anim-fadeLeft{transform:translateX(-32px)}.cms-anim-fadeRight{transform:translateX(32px)}.cms-anim-zoomIn{transform:scale(.94)}.cms-anim-zoomOut{transform:scale(1.08)}.cms-anim-slideUp{transform:translateY(96px)}.cms-anim-slideLeft{transform:translateX(96px)}.cms-anim-slideRight{transform:translateX(-96px)}@media (prefers-reduced-motion:reduce){.cms-anim{transition:none!important;transform:none!important;opacity:1!important}}' +
    /* 섹션(블록) : 위아래 여백 · 높이 · 배경은 섹션(.cms-block)에, 좌우 폭은 안쪽(.cms-block__inner)에 — 에디터의 높이/여백 조절 값이 그대로 이 요소의 CSS 가 됨 */
    '.cms-block{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:var(--cms-sec-valign,flex-start);padding:72px 0;background:#fff;color:#1c2b36;background-size:cover;background-position:center}.cms-block::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:var(--cms-sec-overlay,transparent)}' +
    '.cms-block__inner{position:relative;z-index:1;width:100%;max-width:var(--cms-sec-maxw,1200px);margin:0 auto;padding:0 var(--cms-sec-padx,24px);box-sizing:border-box}.cms-block__bgvideo{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;pointer-events:none}.cms-anchor{position:absolute;left:0;top:calc(-1 * var(--header-height,92px));width:0;height:0}' +
    '.cms-block--divider,.cms-block--spacer{padding:0}.cms-block--divider .cms-block__inner,.cms-block--spacer .cms-block__inner{padding:0}' +
    '.cms-el{position:relative;box-sizing:border-box;max-width:100%}.cms-el+.cms-el{margin-top:24px}.cms-el--button{text-align:center}.cms-el--image img{display:block;width:100%;height:auto}.cms-el--imageText{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}.cms-el--imageText[data-align=right] .cms-block__media{order:2}.cms-el--imageText[data-align=top]{grid-template-columns:1fr}.cms-el--table table{width:100%;border-collapse:collapse;font-size:15px}.cms-el--table th,.cms-el--table td{border:1px solid #dfe5ea;padding:12px 14px;text-align:left}.cms-el--table th{background:#f4f6f8}.cms-el--divider hr{border:0;border-top:1px solid #dfe5ea;margin:0}.cms-el--richtext .cms-block__html{font-size:16px;line-height:1.8}' +
    '.cms-block__title{font-size:28px;font-weight:700;margin:0 0 20px;letter-spacing:-.01em}.cms-block--richtext .cms-block__html{font-size:16px;line-height:1.8}.cms-block__html img{max-width:100%;height:auto}.cms-block__html p{margin:0 0 1em}' +
    '.cms-block--image img{display:block;width:100%;height:auto}.cms-block__caption{text-align:center;color:#6b7c88;font-size:13px;margin-top:12px}.cms-block--imageText .cms-block__inner{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}.cms-block--imageText[data-align=right] .cms-block__media{order:2}.cms-block--imageText[data-align=top] .cms-block__inner{grid-template-columns:1fr}.cms-block__media img{width:100%;height:auto;display:block}' +
    '.cms-btn{display:inline-block;padding:16px 36px;background:var(--button-primary,#002f47);color:var(--button-primary-text,#fff);text-decoration:none;font-weight:600;font-size:15px;border-radius:var(--button-radius,0);transition:background .25s ease,color .25s ease}.cms-btn:hover{background:var(--button-primary-hover,#0b5274)}.cms-btn--line{background:transparent;border:1px solid var(--button-primary,#002f47);color:var(--button-primary,#002f47)}.cms-btn--line:hover{background:var(--button-primary,#002f47);color:var(--button-primary-text,#fff)}.cms-btn--ghost,.cms-btn--ghost:hover{background:none;color:var(--link-color,#002f47);padding:16px 0;text-decoration:underline}.cms-block--button .cms-block__inner{text-align:center}' +
    '.cms-block__video{position:relative;aspect-ratio:16/9;background:#000}.cms-block__video iframe,.cms-block__video video{position:absolute;inset:0;width:100%;height:100%;border:0}.cms-gallery{display:grid;gap:12px}.cms-gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}' +
    '.cms-block--table table{width:100%;border-collapse:collapse;font-size:15px}.cms-block--table th,.cms-block--table td{border:1px solid #dfe5ea;padding:12px 14px;text-align:left}.cms-block--table th{background:#f4f6f8}.cms-block--divider hr{border:0;border-top:1px solid #dfe5ea;margin:0 auto;max-width:1200px}.cms-block--spacer{background:transparent}' +
    '.cms-block__embed iframe{max-width:100%}.cms-slide{position:relative;overflow:hidden}.cms-slide__track{display:flex;transition:transform .6s ease}.cms-slide__item{flex:0 0 100%}.cms-slide__item img{width:100%;height:auto;display:block}.cms-slide__dots{text-align:center;padding:12px 0}.cms-slide__dots button{width:8px;height:8px;border-radius:50%;border:0;background:#c9d2d8;margin:0 4px;padding:0;cursor:pointer}.cms-slide__dots button.is-on{background:var(--brand-primary,#002f47)}' +
    '.cms-br--pc{display:none}.cms-br--m{display:inline}@media(min-width:768px){.cms-br--pc{display:inline}.cms-br--m{display:none}}' +
    '.cms-icon-arrow::after{content:" →"}.cms-icon-phone::after{content:" ☎"}.cms-icon-download::after{content:" ⤓"}.cms-icon-mail::after{content:" ✉"}.cms-icon-external::after{content:" ↗"}.cms-icon-left::after{content:none}.cms-icon-left.cms-icon-arrow::before{content:"→ "}.cms-icon-left.cms-icon-phone::before{content:"☎ "}.cms-icon-left.cms-icon-download::before{content:"⤓ "}.cms-icon-left.cms-icon-mail::before{content:"✉ "}.cms-icon-left.cms-icon-external::before{content:"↗ "}' +
    '.cms-hover-dark:hover{filter:brightness(.85)}.cms-hover-light:hover{filter:brightness(1.12)}.cms-hover-invert:hover{background:#fff !important;color:var(--brand-primary,#002f47) !important;border:1px solid var(--brand-primary,#002f47)}.cms-hover-lift:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.18)}.cms-hover-dark,.cms-hover-light,.cms-hover-invert,.cms-hover-lift{transition:filter .25s,transform .25s,box-shadow .25s,background .25s,color .25s}' +
    '@media(max-width:767px){.cms-full{display:block !important;width:100% !important;text-align:center}}.cms-overlay-wrap{position:relative;display:inline-block;max-width:100%}.cms-overlay-wrap::after{content:"";position:absolute;inset:0;background:var(--cms-overlay-color,transparent);pointer-events:none}' +
    '@media(max-width:767px){.cms-block{padding:48px 0}.cms-block--divider,.cms-block--spacer{padding:0}.cms-block__inner{padding:0 var(--cms-sec-padx,20px)}.cms-el--imageText{grid-template-columns:1fr;gap:24px}.cms-el--imageText[data-align=right] .cms-block__media{order:0}.cms-block__title{font-size:22px}.cms-block--imageText .cms-block__inner{grid-template-columns:1fr;gap:24px}.cms-block--imageText[data-align=right] .cms-block__media{order:0}.cms-gallery{grid-template-columns:repeat(2,1fr)!important}}' +
    '.cms-edit-hover{outline:2px dashed rgba(0,47,71,.55)!important;outline-offset:-2px;cursor:pointer!important}.cms-edit-sel{outline:2px solid #002f47!important;outline-offset:-2px}.cms-edit-sec:hover{outline:1px dashed rgba(37,99,235,.55);outline-offset:-1px}.cms-edit-sec.cms-edit-sel{outline:2px solid #2563eb!important;outline-offset:-2px}' +
    '.cms-edit-label{position:absolute;left:8px;top:8px;z-index:9000;background:rgba(17,24,39,.82);color:#fff;font:600 11px/1 Pretendard,sans-serif;padding:5px 8px;border-radius:4px;pointer-events:none;letter-spacing:.02em}' +
    /* + 섹션 추가 : 섹션 경계(아래쪽 · 첫 섹션은 위쪽도) 안쪽에 표시 — 삽입 위치 안내선(.cms-edit-line)과 함께, 마우스를 올린 섹션에만 */
    '.cms-edit-add{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:9001;height:26px;padding:0 12px 0 9px;border-radius:13px;border:0;background:#2563eb;color:#fff;font:600 11.5px/26px Pretendard,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}.cms-edit-add--top{bottom:auto;top:14px}.cms-edit-add:hover{background:#1d4ed8}.cms-edit-line{position:absolute;left:0;right:0;bottom:0;height:2px;background:#2563eb;z-index:9000;pointer-events:none}.cms-edit-line--top{bottom:auto;top:0}' +
    '.cms-edit-label,.cms-edit-handle,.cms-edit-add,.cms-edit-line{opacity:0;visibility:hidden;transition:opacity .15s ease}.cms-edit-sec:hover>.cms-edit-label,.cms-edit-sec:hover>.cms-edit-handle,.cms-edit-sec.cms-edit-sel>.cms-edit-label,.cms-edit-sec.cms-edit-sel>.cms-edit-handle,#header:hover>.cms-edit-label,#footer:hover>.cms-edit-label{opacity:1;visibility:visible}.cms-edit-sec:hover>.cms-edit-add,.cms-edit-sec.cms-edit-sel>.cms-edit-add{opacity:1;visibility:visible}.cms-edit-add:hover+.cms-edit-line{opacity:1;visibility:visible}' +
    '.cms-sec__empty{border:1.5px dashed #b6c2cd;border-radius:6px;min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#6b7c88;font:500 14px/1.5 Pretendard,sans-serif;text-align:center;padding:24px}.cms-sec__empty small{font-size:12px;color:#93a1ad}.cms-sec--drop{outline:2px dashed #2563eb!important;outline-offset:-6px}.cms-edit-locked{cursor:not-allowed}' +
    '.cms-edit-handle{position:absolute;left:8px;top:36px;z-index:9000;background:#fff;color:#1f2937;border:1px solid #cbd5e1;border-radius:4px;font:600 11px/1 Pretendard,sans-serif;padding:6px 8px;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.12)}.cms-edit-handle:active{cursor:grabbing}.cms-edit-dragover{box-shadow:inset 0 4px 0 #2563eb}[contenteditable=true].cms-editing{outline:2px solid #e0533f !important;outline-offset:-2px;cursor:text}' +
    '.cms-field-flash{animation:cmsFieldFlash 1.8s ease both}@keyframes cmsFieldFlash{0%,55%{box-shadow:0 0 0 4px rgba(224,83,63,.5);background:rgba(224,83,63,.07)}100%{box-shadow:0 0 0 0 rgba(224,83,63,0);background:transparent}}';

  /* 추가 블록 렌더 — type:'section' 은 요소를 담는 빈 섹션(컨테이너) : data.items[] 의 각 요소를 같은 블록 렌더러로 그림 */
  function mountBlockContent(host, b) {
    host.innerHTML = renderBlock(b);
    if (b.type === 'imageText') host.setAttribute('data-align', (b.data || {}).align || 'left');
    if (b.type === 'slide') initSlide(host, b.data || {});
    if (b.type === 'form') mountForm(host, b.data || {});
  }
  function applyBlocks() {
    var blocks = DATA && DATA.blocks && DATA.blocks[pageKey || 'main']; if (!blocks || !blocks.length) return;
    blocks.forEach(function (b) {
      if (b.enabled === false && !editMode) return;
      var d = b.data || {};
      var sec = document.createElement('section'); sec.className = 'cms-block cms-block--' + b.type + (b.enabled === false ? ' cms-block--off' : ''); sec.id = 'cms-' + b.uid; sec.setAttribute('data-cms-block', b.uid); if (b.name) sec.setAttribute('data-cms-name', b.name);
      if (b.locked) sec.setAttribute('data-cms-locked', '1');
      if (b.enabled === false) sec.style.opacity = '.4';
      var st = b.style || {}; if (st.background) sec.style.background = st.background;
      if (b.anchor) { var an = document.createElement('span'); an.className = 'cms-anchor'; an.id = String(b.anchor).replace(/[^a-zA-Z0-9_\-]/g, ''); sec.appendChild(an); }
      if (st.bgVideo) { var bv = document.createElement('video'); bv.className = 'cms-block__bgvideo'; bv.src = st.bgVideo; bv.muted = true; bv.loop = true; bv.autoplay = true; bv.setAttribute('playsinline', ''); bv.setAttribute('muted', ''); bv.setAttribute('aria-hidden', 'true'); if (st.bgPoster) bv.poster = st.bgPoster; sec.appendChild(bv); }
      var inner = document.createElement('div'); inner.className = 'cms-block__inner'; if (st.maxWidth) inner.style.maxWidth = st.maxWidth; if (st.padding) { inner.style.padding = st.padding; sec.style.padding = '0'; }   /* 예전 데이터의 padding(안쪽) 호환 */
      if (b.type === 'section') {
        var items = Array.isArray(d.items) ? d.items : [];
        items.forEach(function (it) { if (!it || (it.enabled === false && !editMode)) return; var el = document.createElement('div'); el.className = 'cms-el cms-el--' + it.type + (it.enabled === false ? ' cms-el--off' : ''); el.setAttribute('data-cms-el', it.uid); if (it.enabled === false) el.style.opacity = '.4'; mountBlockContent(el, { type: it.type, data: it.data || {}, uid: it.uid }); inner.appendChild(el); });
        if (!items.length && editMode) inner.innerHTML = '<button type="button" class="cms-sec__empty" data-add-el><b>+ 요소 추가</b><small>글 · 이미지 · 버튼 등을 여기로 끌어다 놓거나, 눌러서 왼쪽 [요소] 목록에서 고르세요</small></button>';   /* 누르면 왼쪽 요소 패널이 열립니다 */   /* 안내는 편집 화면에만 */
        sec.appendChild(inner);
      } else { mountBlockContent(inner, b); sec.appendChild(inner); if (b.type === 'imageText') sec.setAttribute('data-align', d.align || 'left'); }
      placeBlock(sec, b.after);
    });
    if (window.__homeScrollRefresh) { try { window.__homeScrollRefresh(); } catch (e) {} }   /* 메인 원스크롤 : 추가한 섹션도 이동 대상에 포함 */
  }
  function openPopup() { if (window.SITE && SITE.setPopupOpen) SITE.setPopupOpen(true); }   /* common.js 의 열기 함수 하나만 사용 (등장 애니메이션 · 스크롤 잠금 포함) */
  /* 관리자 › 팝업 관리 › [미리보기] : 자동 노출 데이터(영상 · 이미지 배너)에서 id 로 찾아 바로 표시 — 규칙과 무관 */
  function previewPopupById(id) {
    id = String(id == null ? '' : id);
    var v = ((DATA && DATA.videoPopups) || []).filter(function (x) { return String(x.id) === id; })[0];
    if (v) { openVideoLayer({ id: v.id, src: v.src, poster: v.poster, title: v.title, autoplay: v.autoplay, muted: v.muted, loop: v.loop, controls: v.controls, ratioPc: v.ratioPc, ratioMobile: v.ratioMobile, overlay: v.overlay }, {}); return; }
    var b = ((DATA && DATA.popupBanners) || []).filter(function (x) { return String(x.id) === id; })[0];
    if (b) { var SD = sd(); if (SD) { SD.popupBanners = [b]; } if (window.SITE && SITE.rerenderPopup) SITE.rerenderPopup([b]); openPopup(); }
  }
  function placeBlock(sec, after) {
    var footer = $('footer, .footer'); var ref = null;
    if (isIndex && after === 'top') { var firstMain = $('#hero'); if (firstMain && firstMain.parentNode) { var refTop = firstMain; while (refTop.previousElementSibling && refTop.previousElementSibling.classList.contains('cms-block')) refTop = refTop.previousElementSibling; firstMain.parentNode.insertBefore(sec, firstMain); return; } }
    if (isIndex) { var map = { mainVisual: '#hero', premium: '#premium', environment: '#environment', type: '#type', reserve: '#visit-reservation' }; ref = after && map[after] ? $(map[after]) : $('#visit-reservation'); if (ref) { while (ref.nextElementSibling && ref.nextElementSibling.classList.contains('cms-block')) ref = ref.nextElementSibling; ref.parentNode.insertBefore(sec, ref.nextSibling); return; } }
    else { var main = $('.sub-content, .sub-main, main') || body; if (after === 'top') { var first = main.querySelector('.sub-body, .sub-section, section'); if (first) { first.parentNode.insertBefore(sec, first); return; } } var cta = $('.sub-cta, .subpage-cta'); if (cta && cta.parentNode) { cta.parentNode.insertBefore(sec, cta); return; } }
    if (footer && footer.parentNode) footer.parentNode.insertBefore(sec, footer); else body.appendChild(sec);
  }
  function renderBlock(b) {
    var d = b.data || {}; var title = d.title ? '<h2 class="cms-block__title" data-cms-field="title">' + esc(d.title) + '</h2>' : '';
    switch (b.type) {
      case 'richtext': return title + '<div class="cms-block__html" data-cms-field="html">' + (d.html || '') + '</div>';
      case 'image': return title + (d.href ? '<a href="' + esc(d.href) + '">' : '') + '<img src="' + esc(d.src) + '" alt="' + esc(d.alt || '') + '" loading="lazy">' + (d.href ? '</a>' : '') + (d.caption ? '<p class="cms-block__caption" data-cms-field="caption">' + esc(d.caption) + '</p>' : '');
      case 'imageText': return '<div class="cms-block__media"><img src="' + esc(d.src) + '" alt="' + esc(d.alt || '') + '" loading="lazy"></div><div>' + title + '<div class="cms-block__html" data-cms-field="html">' + (d.html || '') + '</div></div>';
      case 'button': return '<a class="cms-btn' + (d.style === 'line' ? ' cms-btn--line' : d.style === 'ghost' ? ' cms-btn--ghost' : '') + '" href="' + esc(d.href || '#') + '" target="' + esc(d.target || '_self') + '" data-track="button:' + esc(d.label || '') + '" data-cms-field="label">' + esc(d.label || '') + '</a>';
      case 'video': { var u = String(d.url || ''); var m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/); var inner = m ? '<iframe src="https://www.youtube.com/embed/' + m[1] + '?rel=0" title="' + esc(d.title || 'video') + '" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>' : (u ? '<video src="' + esc(u) + '" controls playsinline></video>' : ''); return title + '<div class="cms-block__video">' + inner + '</div>'; }
      case 'gallery': return title + '<div class="cms-gallery" style="grid-template-columns:repeat(' + (parseInt(d.columns, 10) || 3) + ',1fr)">' + (d.items || []).map(function (it) { return '<figure style="margin:0">' + (it.href ? '<a href="' + esc(it.href) + '">' : '') + '<img src="' + esc(it.src) + '" alt="' + esc(it.alt || '') + '" loading="lazy">' + (it.href ? '</a>' : '') + (it.caption ? '<figcaption class="cms-block__caption">' + esc(it.caption) + '</figcaption>' : '') + '</figure>'; }).join('') + '</div>';
      case 'slide': return title + '<div class="cms-slide"><div class="cms-slide__track">' + (d.items || []).map(function (it) { return '<div class="cms-slide__item"><img src="' + esc(it.src) + '" alt="' + esc(it.alt || '') + '" loading="lazy"></div>'; }).join('') + '</div><div class="cms-slide__dots">' + (d.items || []).map(function (_, i) { return '<button type="button" aria-label="' + (i + 1) + '"></button>'; }).join('') + '</div></div>';
      case 'table': return title + '<table>' + (d.header && d.header.length ? '<thead><tr>' + d.header.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead>' : '') + '<tbody>' + (d.rows || []).map(function (r) { return '<tr>' + (Array.isArray(r) ? r : [r]).map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
      case 'divider': return '<hr>';
      case 'spacer': return '<div style="height:' + (parseInt(d.height, 10) || 60) + 'px"></div>';
      case 'embed': return title + '<div class="cms-block__embed">' + String(d.html || '').replace(/<script[\s\S]*?<\/script>/gi, '') + '</div>';
      case 'form': return title + '<div class="cms-block__form" data-form-key="' + esc(d.formKey || 'reserve') + '"></div>';
      default: return title;
    }
  }
  function initSlide(sec, d) {
    var track = sec.querySelector('.cms-slide__track'), dots = $$('.cms-slide__dots button', sec), n = dots.length, i = 0; if (n < 2) { if (dots[0]) dots[0].classList.add('is-on'); return; }
    function go(k) { i = (k + n) % n; track.style.transform = 'translateX(-' + (i * 100) + '%)'; dots.forEach(function (b, j) { b.classList.toggle('is-on', j === i); }); }
    dots.forEach(function (b, j) { b.addEventListener('click', function () { go(j); }); }); go(0);
    var t = setInterval(function () { if (!document.hidden) go(i + 1); }, parseInt(d.interval, 10) || 4000); sec.addEventListener('mouseenter', function () { clearInterval(t); });
  }
  function mountForm(sec, d) {
    var box = sec.querySelector('.cms-block__form'); var SD = sd(); if (!box || !window.SITE || !SITE.createReserveForm) return;
    var key = d.formKey || 'reserve'; var schema = DATA && DATA.forms && DATA.forms[key];
    var cfg = Object.assign({}, SD.reserve || {}); if (schema) { cfg.fields = schema.fields; cfg.agreements = schema.settings.agreements || []; cfg.visitTimes = schema.settings.visitTimes || []; cfg.phonePrefix = schema.settings.phonePrefix || '010'; cfg.submitLabel = schema.settings.submitLabel || cfg.submitLabel; }
    var form = SITE.createReserveForm(cfg); form.setAttribute('data-form-key', key); box.appendChild(form); form.querySelectorAll('.anim').forEach(function (el) { el.classList.add('is-in'); });
  }
  /* PC/모바일 전용 줄바꿈 토큰 → <br class="cms-br--pc|m"> (렌더러가 텍스트를 escape 하므로 텍스트 노드에서 변환) */
  function applyBreaks() {
    var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return /\[(PC|모바일)줄바꿈\]/.test(n.nodeValue) && !n.parentNode.closest('script,style,textarea') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; } });
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) { var span = document.createElement('span'); span.innerHTML = esc(n.nodeValue).replace(/\[PC줄바꿈\]/g, '<br class="cms-br cms-br--pc">').replace(/\[모바일줄바꿈\]/g, '<br class="cms-br cms-br--m">'); while (span.firstChild) n.parentNode.insertBefore(span.firstChild, n); n.parentNode.removeChild(n); });
  }
  /* 속성 · 스타일 변수 오버라이드 (에디터 디자인/동작/고급 탭) */
  function applyAttrs() {
    var attrs = DATA && DATA.attrs && DATA.attrs[pageKey || 'main']; var css = ''; var mobile = window.matchMedia('(max-width:767px)').matches;
    if (attrs) Object.keys(attrs).forEach(function (sel) { var a = attrs[sel]; var els; try { els = $$(sel); } catch (e) { return; } els.forEach(function (el) {
      if (a['class']) el.className += ' ' + a['class']; if (a.id) el.id = a.id; if (a.target && el.tagName === 'A') el.target = a.target; if (a.href && el.tagName === 'A') el.href = a.href; if (a.loading && el.tagName === 'IMG') el.loading = a.loading;
      if (a.text != null && (el.tagName === 'A' || el.tagName === 'BUTTON' || isLeaf(el))) el.innerHTML = esc(a.text).replace(/\n/g, '<br>');   /* 화면에서 직접 고친 문구(데이터에 없는 장식 텍스트 포함) · HTML 은 이스케이프 */ if (a.src && el.tagName === 'IMG') { el.removeAttribute('srcset'); el.src = a.src; }
      if (a.mobileSrc && mobile && el.tagName === 'IMG') { el.removeAttribute('srcset'); var pic = el.closest('picture'); if (pic) $$('source', pic).forEach(function (s) { s.remove(); }); el.src = a.mobileSrc; }
      if (a.track) el.setAttribute('data-track', a.track);
      if (a.action) el.addEventListener('click', function (e) { if (a.action === 'popup') { e.preventDefault(); openPopup(); }   /* 'popup' 은 콘텐츠에 저장된 동작 값(DOM 이름과 무관) — 이름 변경 대상 아님 */ else if (a.action === 'scroll:top') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } else if (a.action.indexOf('scroll:') === 0) { e.preventDefault(); var t = document.getElementById(a.action.slice(7)); if (t) { if (window.__homeScrollTo && isIndex) window.__homeScrollTo(t.id); else t.scrollIntoView({ behavior: 'smooth' }); } } else if (a.action === 'tel') { e.preventDefault(); if (window.SITE && SITE.tel) location.href = SITE.telHref; } else if (a.action === 'sms') { e.preventDefault(); if (window.SITE && SITE.smsHref) location.href = SITE.smsHref; } else if (a.action === 'kakao') { e.preventDefault(); if (window.SITE && SITE.kakaoUrl) window.open(SITE.kakaoUrl, '_blank', 'noopener'); } });
    }); if (a.css) css += 'body[data-cms-page="' + (pageKey || 'main') + '"] ' + sel + '{' + a.css.replace(/[{}]/g, '') + '}'; });
    if (css) injectCss('cms-attrs', css);
    /* 스타일 변수(--cms-*) : 등장 애니메이션 · 어둡기 · 블러 · 오버레이 · 버튼 아이콘 · 호버 · 모바일 전체 너비 */
    var animEls = [];
    $$('body *').forEach(function (el) {
      if (el.closest('.wbnote, #quickMenu')) return; var cs = getComputedStyle(el); var v = cs.getPropertyValue('--cms-anim').trim();
      if (v && v !== 'none' && el.children.length < 60 && !el.closest('.cms-anim') && !(cs.getPropertyValue('--cms-anim-mobile').trim() === 'off' && window.innerWidth < 768)) {   /* 지속시간 · 지연 · easing · 반복 · 모바일 끄기 (에디터 애니메이션 설정) */
        el.classList.add('cms-anim', 'cms-anim-' + v); animEls.push(el);
        var du = cs.getPropertyValue('--cms-anim-dur').trim(), dl = cs.getPropertyValue('--cms-anim-delay').trim(), ea = cs.getPropertyValue('--cms-anim-ease').trim();
        if (du || ea) { el.style.transitionDuration = du || ''; el.style.transitionTimingFunction = ea || ''; } if (dl) el.style.transitionDelay = dl;
        if (cs.getPropertyValue('--cms-anim-repeat').trim() === 'repeat') el.setAttribute('data-cms-anim-repeat', '1');
      }
      var dark = parseFloat(cs.getPropertyValue('--cms-darken')), blur = parseFloat(cs.getPropertyValue('--cms-blur'));
      if (el.tagName === 'IMG' && ((dark > 0) || (blur > 0))) el.style.filter = (dark > 0 ? 'brightness(' + (1 - Math.min(dark, 90) / 100) + ') ' : '') + (blur > 0 ? 'blur(' + blur + 'px)' : '');
      var ov = cs.getPropertyValue('--cms-overlay').trim(); if (el.tagName === 'IMG' && ov && !el.parentNode.classList.contains('cms-overlay-wrap')) { var w = document.createElement('span'); w.className = 'cms-overlay-wrap'; w.style.setProperty('--cms-overlay-color', ov); el.parentNode.insertBefore(w, el); w.appendChild(el); }
      var icon = cs.getPropertyValue('--cms-icon').trim(); if (icon && (el.tagName === 'A' || el.tagName === 'BUTTON')) { el.classList.add('cms-icon-' + icon); if (cs.getPropertyValue('--cms-icon-pos').trim() === 'left') el.classList.add('cms-icon-left'); }
      var hv = cs.getPropertyValue('--cms-hover').trim(); if (hv && (el.tagName === 'A' || el.tagName === 'BUTTON')) el.classList.add('cms-hover-' + hv);
      if (cs.getPropertyValue('--cms-full').trim() === '1') el.classList.add('cms-full');
    });
    if (animEls.length && 'IntersectionObserver' in window && !editMode) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { var rep = e.target.getAttribute('data-cms-anim-repeat') === '1'; if (e.isIntersecting) { e.target.classList.add('is-in'); if (!rep) io.unobserve(e.target); } else if (rep) e.target.classList.remove('is-in'); }); }, { threshold: 0.15 }); animEls.forEach(function (el) { io.observe(el); }); } else animEls.forEach(function (el) { el.classList.add('is-in'); });
  }
  /* 페이지별 헤더/푸터 예외 : 투명 헤더 끄기 · 헤더/푸터/퀵메뉴 숨김 · 사이트 공통 헤더 설정(투명 헤더 끔) */
  function applyPageCommon() {
    var pc = (DATA && DATA.pageCommon && DATA.pageCommon[pageKey || 'main']) || {}; var hs = (DATA && DATA.headerSettings) || {};
    var css = '';   /* 투명 헤더 여부는 common.js 헤더 상태(SITE_DATA.headerMode)가 처리 — 여기서 클래스를 덮어쓰지 않음 */
    if (pc.header && pc.header.hidden) css += '#header{display:none !important}';
    if (pc.footer && pc.footer.hidden) css += '#footer,.footer{display:none !important}';
    if (pc.quick && pc.quick.hidden) css += '#quickMenu,.quick{display:none !important}';
    injectCss('cms-page-common', css);
  }

  /* ---------- 3. 폼 : 스키마 보강 + API 제출 ---------- */
  function enhanceForms() { $$('form.reserve__form').forEach(enhanceForm); }
  function enhanceForm(form) {
    {
      var key = form.getAttribute('data-form-key') || 'reserve'; var schema = DATA && DATA.forms && DATA.forms[key];
      if (schema) {
        schema.fields.forEach(function (f) {
          if (f.enabled === false) return;
          var box = form.querySelector('[name="' + f.name + '"]'); box = box && box.closest('.field'); if (!box) return;
          var ctrl = box.querySelector('.field__control'); var labelEl = box.querySelector('.field__label'); var v = f.validation || {};
          if (f.description && labelEl && !box.querySelector('.field__desc')) { var dsc = document.createElement('span'); dsc.className = 'field__desc'; dsc.style.cssText = 'display:block;font-size:12px;color:#7a8791;margin:-4px 0 8px'; dsc.textContent = f.description; labelEl.insertAdjacentElement('afterend', dsc); }
          if (v.mobileWidth === 'half') box.classList.add('field--mhalf');
          if (v.showIf) { var m = String(v.showIf).match(/^\s*([a-zA-Z0-9_]+)\s*=\s*(.+?)\s*$/); if (m) { var upd = function () { var src = form.querySelector('[name="' + m[1] + '"]:checked, select[name="' + m[1] + '"], input[name="' + m[1] + '"]:not([type=radio]):not([type=checkbox])'); var val = src ? src.value : ''; box.style.display = val === m[2] ? '' : 'none'; }; form.addEventListener('change', upd); upd(); } }
          if (f.type === 'hidden') { box.style.display = 'none'; if (ctrl) { ctrl.type = 'hidden'; ctrl.value = f.defaultValue || (f.name.indexOf('utm') === 0 ? (qs.get(f.name) || '') : ''); } return; }
          if (f.type === 'name' || f.type === 'custom') { if (ctrl) ctrl.type = 'text'; }
          if (f.defaultValue && ctrl && !ctrl.value && f.type !== 'hidden') ctrl.value = f.defaultValue;
          if ((f.type === 'checkbox' || f.type === 'radio') && ctrl) {
            var grp = document.createElement('div'); grp.className = 'field__group'; grp.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 18px;padding:6px 0';
            grp.innerHTML = (f.options || []).map(function (o) { return '<label class="check" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;cursor:pointer"><input type="' + f.type + '" name="' + esc(f.name) + (f.type === 'checkbox' ? '[]' : '') + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>'; }).join('');
            ctrl.parentNode.replaceChild(grp, ctrl); if (f.required) grp.setAttribute('data-required-group', '1'); grp.setAttribute('data-error-msg', v.errorMessage || '');
          }
          if (f.type === 'consent' && ctrl) { var cw = document.createElement('label'); cw.className = 'check'; cw.style.cssText = 'display:flex;align-items:flex-start;gap:8px;font-size:14px;cursor:pointer'; cw.innerHTML = '<input type="checkbox" name="' + esc(f.name) + '" value="Y"' + (f.required ? ' data-required="1"' : '') + ' style="margin-top:3px"><span>' + esc(f.label) + (f.required ? ' <em>*</em>' : '') + '</span>'; ctrl.parentNode.replaceChild(cw, ctrl); if (labelEl) labelEl.style.display = 'none'; }
          if (ctrl && ctrl.tagName !== 'SELECT') { if (v.minLength) ctrl.minLength = +v.minLength; if (v.maxLength) ctrl.maxLength = +v.maxLength; if (v.min !== undefined && v.min !== '') ctrl.min = v.min; if (v.max !== undefined && v.max !== '') ctrl.max = v.max; if (v.futureOnly && ctrl.type === 'date') ctrl.min = new Date().toISOString().slice(0, 10); }
          if (v.errorMessage) box.setAttribute('data-error-msg', v.errorMessage);
        });
        var bs = schema.settings.button || {}; var sb = form.querySelector('.reserve__submit'); if (sb) { if (bs.background) sb.style.background = bs.background; if (bs.color) sb.style.color = bs.color; if (bs.radius) sb.style.borderRadius = bs.radius + 'px'; if (bs.border) sb.style.border = bs.border; if (bs.fontSize) sb.style.fontSize = bs.fontSize + 'px'; if (bs.fontWeight) sb.style.fontWeight = bs.fontWeight; if (bs.width === 'auto') { sb.style.width = 'auto'; sb.style.padding = '0 40px'; if (bs.align) { sb.style.display = 'block'; sb.style.margin = bs.align === 'center' ? '24px auto 0' : (bs.align === 'right' ? '24px 0 0 auto' : '24px 0 0'); } } }
        injectCss('cms-form', '@media(max-width:767px){.reserve__form .field--mhalf{width:calc(50% - 8px);display:inline-block;vertical-align:top}}');
        /* 사용자 지정 오류 문구 : common.js 가 표시한 기본 문구를 교체 */
        form.addEventListener('submit', function () { setTimeout(function () { $$('[data-error-msg]', form).forEach(function (box) { var err = box.querySelector('.field__error'); if (err && err.textContent && box.getAttribute('data-error-msg')) err.textContent = box.getAttribute('data-error-msg'); }); }, 0); }, true);
      }
      /* 전송은 common.js createReserveForm 의 단일 파이프라인이 담당 (중복 방지 토큰 · 전송 중 표시 · 완료/오류 안내) — 여기서는 폼 빌더 항목의 추가 검사만 등록 */
      if (editMode) form.__noSubmit = '편집 화면에서는 예약이 전송되지 않습니다.';
      else if (previewToken) form.__noSubmit = '미리보기 화면에서는 예약이 전송되지 않습니다. 공개 홈페이지에서 신청해 주세요.';
      (form.__validators = form.__validators || []).push(function () {
        var bad = null;
        $$('[data-required-group]', form).forEach(function (g) { if (g.closest('.field').style.display === 'none') return; if (!g.querySelector('input:checked')) { bad = bad || (g.querySelector('input') || g); setErr(form, g, g.getAttribute('data-error-msg') || '필수 선택 항목입니다.'); } else setErr(form, g, ''); });
        $$('.field input[data-required="1"]', form).forEach(function (c) { var box = c.closest('.field'); if (!c.checked) { bad = bad || c; setErr(form, box, box.getAttribute('data-error-msg') || '동의가 필요합니다.'); } else setErr(form, box, ''); });
        return bad;
      });
    }
  }
  /* 편집 화면 : 폼 구성이 바뀌면 새로고침 없이 폼만 다시 그림 (추가 · 삭제 · 복제 · 순서 · 필드명 · 안내문구 · 필수 · 너비) → 바뀐 필드로 스크롤 + 잠깐 강조 */
  function rebuildForm(key, schema, focus, flash) {
    var SD = sd() || {}; if (!schema || !window.SITE || !SITE.createReserveForm) return false; key = key || 'reserve';
    DATA = DATA || {}; DATA.forms = DATA.forms || {}; DATA.forms[key] = schema; var st = schema.settings || {};
    var cfg = Object.assign({}, SD.reserve || {}, { fields: schema.fields || [], agreements: st.agreements || [], visitTimes: st.visitTimes || [], phonePrefix: st.phonePrefix || '010', submitLabel: st.submitLabel || (SD.reserve || {}).submitLabel, doneTitle: st.doneTitle || (SD.reserve || {}).doneTitle, doneText: st.doneText || (SD.reserve || {}).doneText });
    if (key === 'reserve' && SD.reserve) { SD.reserve.fields = cfg.fields; SD.reserve.agreements = cfg.agreements; SD.reserve.visitTimes = cfg.visitTimes; SD.reserve.phonePrefix = cfg.phonePrefix; SD.reserve.submitLabel = cfg.submitLabel; }
    var n = 0;
    $$('form.reserve__form').forEach(function (old) {
      if ((old.getAttribute('data-form-key') || 'reserve') !== key) return;
      var form = SITE.createReserveForm(cfg); if (old.getAttribute('data-form-key')) form.setAttribute('data-form-key', key);
      $$('.anim', form).forEach(function (el) { el.classList.add('is-in'); el.style.transition = 'none'; });
      old.parentNode.replaceChild(form, old); try { enhanceForm(form); } catch (e) { if (window.console) console.warn('cms form', e); } n++;
    });
    if (edit.index) buildIndex(); if (edit.sendRects) edit.sendRects();
    if (focus) focusField(key, focus, flash);
    return n > 0;
  }
  function focusField(key, name, flash) {
    var box = null; $$('form.reserve__form').forEach(function (f) { if (box || (f.getAttribute('data-form-key') || 'reserve') !== (key || 'reserve')) return; box = f.querySelector('.field[data-field="' + String(name).replace(/[^a-zA-Z0-9_]/g, '') + '"]'); });
    if (!box) return false;
    if (flash === false) { setSel(box); return true; }   /* 글자 입력 중 : 선택 표시만 유지 (화면을 움직이지 않음) */
    box.scrollIntoView({ block: 'center', behavior: 'smooth' }); box.classList.remove('cms-field-flash'); void box.offsetWidth; box.classList.add('cms-field-flash'); setSel(box);
    setTimeout(function () { box.classList.remove('cms-field-flash'); }, 1900); return true;
  }
  function setErr(form, box, msg) { var el = box.closest('.field') && box.closest('.field').querySelector('.field__error'); if (el) el.textContent = msg; }

  /* ---------- 4. SEO · 게시판 ---------- */
  function applySeo() {
    var seo = DATA && DATA.seo; if (!seo) return; var site = seo.site || {}; var pg = (seo.pages || {})[pageKey] || {};
    var rs = seo.resolved && seo.resolved[isIndex ? 'main' : pageKey];
    if (rs) {
      if (rs.title) document.title = rs.title; setMeta('name', 'description', rs.description); setMeta('name', 'keywords', rs.keywords); setMeta('name', 'robots', rs.robots);
      setMeta('property', 'og:title', rs.ogTitle || rs.title); setMeta('property', 'og:description', rs.ogDescription || rs.description); setMeta('property', 'og:type', 'website'); setMeta('property', 'og:site_name', rs.siteName);
      setMeta('name', 'twitter:title', rs.ogTitle || rs.title); setMeta('name', 'twitter:description', rs.ogDescription || rs.description);
      if (rs.url) setMeta('property', 'og:url', rs.url); if (rs.image) { setMeta('property', 'og:image', absUrl(rs.image)); setMeta('name', 'twitter:image', absUrl(rs.image)); }
      if (rs.canonical) { var lc = $('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' })); lc.href = rs.canonical; }
      if (rs.google) setMeta('name', 'google-site-verification', rs.google); if (rs.naver) setMeta('name', 'naver-site-verification', rs.naver);
      if (rs.favicon) $$('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (l) { l.href = rs.favicon; });
      var st0 = pg.structured || site.structured; if (st0) { var s0 = document.getElementById('cms-ld'); if (!s0) { s0 = document.createElement('script'); s0.type = 'application/ld+json'; s0.id = 'cms-ld'; document.head.appendChild(s0); } s0.textContent = JSON.stringify(st0); }
      return;
    }
    var pick = function (k) { return pg[k] || site[k] || ''; };
    var title = pg.title || (isIndex ? site.title : ''); if (title) document.title = title;
    setMeta('name', 'description', pick('description')); setMeta('name', 'keywords', pick('keywords')); setMeta('name', 'robots', pg.robots || site.robots || '');
    var og = Object.assign({}, site.og || {}, pg.og || {}); var ogImg = og.image || pg.shareImage || site.shareImage || '';
    setMeta('property', 'og:title', og.title || document.title); setMeta('property', 'og:description', og.description || pick('description')); if (ogImg) { setMeta('property', 'og:image', absUrl(ogImg)); setMeta('property', 'og:image:secure_url', absUrl(ogImg)); setMeta('name', 'twitter:image', absUrl(ogImg)); } setMeta('property', 'og:url', location.href.split('#')[0]); setMeta('property', 'og:type', 'website');
    var canon = pg.canonical || (isIndex ? site.canonical : ''); if (canon) { var l = $('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' })); l.href = canon; }
    var ver = site.verification || {}; if (ver.google) setMeta('name', 'google-site-verification', ver.google); if (ver.naver) setMeta('name', 'naver-site-verification', ver.naver);
    var fav = site.favicon; if (fav) $$('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (l) { l.href = fav; });
    var st = pg.structured || site.structured; if (st) { var s = document.getElementById('cms-ld'); if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'cms-ld'; document.head.appendChild(s); } s.textContent = JSON.stringify(st); }
  }
  function setMeta(attr, key, val) { if (!val) return; var m = $('meta[' + attr + '="' + key + '"]'); if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); } m.setAttribute('content', val); }
  function absUrl(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
  /* ---------- 5. 통계 · 팝업 집계 ---------- */
  var sid = null;
  function sessionId() { if (sid) return sid; try { sid = sessionStorage.getItem('cms_sid'); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('cms_sid', sid); } } catch (e) { sid = 'x'; } return sid; }
  var queue = [], flushTimer = null;
  function track(event, extra) {
    if (CFG.enabled === false || CFG.analytics === false || !api || !CFG.siteKey || previewToken || editMode) return;
    if (DATA && DATA.analytics && DATA.analytics.enabled === false) return;
    var w = window.innerWidth; var ev = Object.assign({ event: event, path: location.pathname + (isIndex ? '' : '?page=' + pageKey), title: document.title, referrer: document.referrer, device: w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'pc', screen_w: screen.width, screen_h: screen.height, utm: {} }, extra || {});
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) { if (qs.get(k)) ev.utm[k] = qs.get(k); });
    queue.push(ev); clearTimeout(flushTimer); flushTimer = setTimeout(flush, 800);
  }
  function beacon(url, payload) { try { if (navigator.sendBeacon) { navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain' })); return; } } catch (e) {} fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload, keepalive: true }).catch(function () {}); }
  function flush() { if (!queue.length || !api) return; beacon(apiUrl('/api/public/' + CFG.siteKey + '/events'), JSON.stringify({ sid: sessionId(), events: queue.splice(0, 20) })); }
  document.addEventListener('reserve:submitted', function (e) { track('submit', { label: (e.detail && e.detail.formKey) || 'reserve' }); });   /* 접수 완료(common.js) → 통계 */
  function analytics() {
    track('pageview');
    var ga = DATA && DATA.analytics && DATA.analytics.ga4Id; if (ga && /^G-[A-Z0-9]+$/i.test(ga) && !window.gtag) { var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga; document.head.appendChild(s); window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); }; window.gtag('js', new Date()); window.gtag('config', ga, { anonymize_ip: true }); }
    if (DATA && DATA.analytics && DATA.analytics.trackClicks === false) return;
    document.addEventListener('click', function (e) { var a = e.target.closest('a, button'); if (!a) return; var label = a.getAttribute('data-track') || (a.href && a.href.indexOf('tel:') === 0 ? 'tel' : a.closest('.quick, .quick-menu, #quickMenu') ? 'quick:' + (a.textContent || '').trim().slice(0, 30) : a.classList.contains('reserve__submit') ? null : (a.closest('.wbnote') ? 'popup' : null)); if (label) track('click', { label: label }); }, true);   /* 통계 라벨 값은 기존 그대로 'popup' 유지(DOM 이름 변경과 무관) */
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
  }
  function popupStats() {
    var pop = document.getElementById('wbnote'); if (!pop || pop.hidden || !DATA || !Array.isArray(DATA.popupBanners) || previewToken || CFG.enabled === false) return;
    var SD = sd() || {}; var list = (SD.popupBanners || []).filter(function (p) { return p.id; });
    list.forEach(function (p) { hit(p.id, 'impression'); });
    pop.addEventListener('click', function (e) { var a = e.target.closest('a[href]'); if (!a) return; var img = a.querySelector('img'); var p = list.filter(function (x) { return img && (img.getAttribute('src') === x.src || img.currentSrc === x.src || (img.src || '').indexOf(x.src.replace(/^\.\//, '')) >= 0); })[0] || (list.length === 1 ? list[0] : null); if (p) hit(p.id, 'click'); }, true);
  }
  function hit(id, type) { if (!api || !id || editMode || previewToken) return; beacon(apiUrl('/api/public/' + CFG.siteKey + '/popups/' + id + '/hit'), JSON.stringify({ type: type })); }

  /* ---------- 6. 편집 모드 (에디터 iframe 전용 · 실제 사이트에서는 동작하지 않음) ---------- */
  var edit = { index: null, hover: null, sel: null, editing: null, dragging: null };
  var SEC_MAP = { hero: 'mainVisual', premium: 'premium', environment: 'environment', type: 'type', 'visit-reservation': 'reserve', 'summary-mobile': 'summaryMobile', header: 'header', footer: 'footer' };
  var SEC_NAMES = { mainVisual: '메인 슬라이드 + 써머리', summaryMobile: '써머리 (모바일)', premium: '프리미엄', environment: '입지환경 · 설계', type: '타입', reserve: '방문예약', header: '헤더 (공통)', footer: '푸터 (공통)' };
  function toParent(msg) { try { window.parent.postMessage(msg, '*'); } catch (x) {} }
  function onEditorMessage(e) {
    var m = e.data || {}; if (!m || typeof m.type !== 'string' || m.type.indexOf('cms:') !== 0) return;
    /* 보낸 곳 확인 : api 값이 './api/index.php?r=' 처럼 상대 주소일 수 있으므로 '주소(origin)' 로 바꿔 비교합니다.
       같은 서버(이 홈페이지와 같은 주소)에서 온 메시지는 항상 허용합니다 — 카페24처럼 홈페이지와 관리자가 같은 서버인 경우 */
    if (apiOrigin() && e.origin !== apiOrigin() && e.origin !== location.origin && e.origin !== 'null' && !/^https?:\/\/(l[o]calh[o]st|12[7]\.0\.0\.1)(:\d+)?$/.test(e.origin)) return;   /* 이 PC 의 관리 서버 · 'null' = 로컬 파일로 연 통합 관리자 */
    if (m.type === 'cms:init') { window.__cmsGotInit = true; if (!booted) { window.__cmsScroll = m.scrollY; boot(m.data); } else { location.reload(); } }
    else if (m.type === 'cms:reload') { try { window.parent.postMessage({ type: 'cms:reloading', scrollY: window.scrollY }, '*'); } catch (x) {} location.reload(); }
    /* 공통 요소 편집 모드 : 'header' · 'footer' · 'quick' 또는 빈 값(일반 페이지 편집) — 그 영역 안만 선택할 수 있습니다 */
    else if (m.type === 'cms:commonMode') {
      edit.commonMode = m.which || '';
      body.classList.toggle('cms-common-mode', !!edit.commonMode);
      body.setAttribute('data-cms-common', edit.commonMode || '');
      if (!edit.commonMode) { setSel(null); }
      if (window.__CMS_EDIT && window.__CMS_EDIT.onMessage) window.__CMS_EDIT.onMessage(m);
    }
    else if (m.type === 'cms:patch') patchText(m.path, m.value);
    else if (m.type === 'cms:css') injectCss('cms-styles', m.css);
    else if (m.type === 'cms:scrollTo') { var t = sectionEl(m.section); if (t) { if (window.__homeScrollTo && isIndex && t.classList.contains('home-section')) window.__homeScrollTo(t.id); else t.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }
    else if (m.type === 'cms:selectSection') { var s = sectionEl(m.section); if (s) selectEl(s, true); }
    else if (m.type === 'cms:selectEl') { var host = document.getElementById('cms-' + m.blockUid); var ce = host && m.elUid ? host.querySelector('[data-cms-el="' + String(m.elUid).replace(/[^\w-]/g, '') + '"]') : null; if (ce) { selectEl(ce); try { ce.scrollIntoView({ block: 'nearest' }); } catch (x) {} } else if (host) selectEl(host, true); }   /* 빈 섹션 안의 요소 : 레이어 목록 · 추가 직후 선택 */
    else if (m.type === 'cms:clearSelection') setSel(null);
    else if (m.type === 'cms:pageCommon') { DATA = DATA || {}; DATA.pageCommon = DATA.pageCommon || {}; DATA.pageCommon[pageKey || 'main'] = m.common || {}; var SDh = sd(); if (SDh) SDh.headerMode = { transparent: headerTransparentOf(DATA) }; if (window.SITE && SITE.updateHeaderTheme) SITE.updateHeaderTheme(); try { applyPageCommon(); } catch (x) {} }   /* 체크 즉시 반영 (새로고침 없음) */
    else if (m.type === 'cms:form') { var okf = rebuildForm(m.key, m.schema, m.focus, m.flash !== false); try { window.parent.postMessage({ type: 'cms:formApplied', key: m.key || 'reserve', ok: okf, focus: m.focus || '' }, '*'); } catch (x) {} }
    else if (m.type === 'cms:focusField') focusField(m.key, m.name);
    else if (m.type === 'cms:openPopup') { if (m.videos && DATA) DATA.videoPopups = m.videos; previewPopupById(m.id); }
    else if (m.type === 'cms:inlineStart') { if (edit.sel && isLeaf(edit.sel) && edit.sel.tagName !== 'IMG') beginTextEdit(edit.sel); }
    else if (window.__CMS_EDIT && window.__CMS_EDIT.onMessage) window.__CMS_EDIT.onMessage(m);   /* 섹션 핸들 · 요소 크기 등 확장 기능(cms-edit.js) */
  }
  function sectionEl(id) { if (!id) return null; if (id.indexOf('cms-') === 0) return document.getElementById(id); var sel = { mainVisual: '#hero', premium: '#premium', environment: '#environment', type: '#type', reserve: '#visit-reservation', summaryMobile: '#summary-mobile', header: '#header', footer: '#footer' }[id]; return sel ? $(sel) : document.getElementById(id); }
  function sectionsOf() { var els = []; ['#hero', '#summary-mobile', '#premium', '#environment', '#type', '#visit-reservation'].forEach(function (s) { var el = $(s); if (el && getComputedStyle(el).display !== 'none') els.push(el); }); $$('.cms-block').forEach(function (el) { els.push(el); }); if (!isIndex) $$('#subpage > section, .sub-section, .sub-body').forEach(function (el) { if (els.indexOf(el) < 0 && el.offsetHeight > 40) els.push(el); }); els.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; }); return els; }
  function secId(el) { if (el.classList.contains('cms-block')) return 'cms-' + el.getAttribute('data-cms-block'); return SEC_MAP[el.id] || el.id || el.className.split(' ')[0]; }
  function secName(el) { if (el.classList.contains('cms-block')) return el.getAttribute('data-cms-name') || ('블록 · ' + (el.className.match(/cms-block--([a-zA-Z]+)/) || ['', ''])[1]); return SEC_NAMES[SEC_MAP[el.id]] || (el.querySelector('h1,h2,h3') ? el.querySelector('h1,h2,h3').textContent.trim().slice(0, 20) : (el.id || '섹션')); }
  function initEditMode() { var __err = null; try { initEditModeInner(); } catch (e) { __err = e; try { window.console && console.error('[CMS] edit init', e); } catch (x) {} }
    if (__err) { try { window.parent.postMessage({ type: 'cms:ready', pageKey: pageKey, error: String(__err && __err.message ? __err.message : __err).slice(0, 200), sections: [] }, '*'); } catch (x2) {} }
  }
  /* 공개 홈페이지에 로딩/프리로더 요소가 있으면 편집 화면에서만 감춥니다. (공개 방문자 화면은 그대로) */
  function hideSiteLoaders() {
    var SEL = '#loader, #preloader, .loader, .preloader, .page-loader, .loading-overlay, .site-loading, [data-preloader], [data-loading]';
    var sweep = function () {
      $$(SEL).forEach(function (el) { if (el.closest && el.closest('.cms-x')) { return; } el.setAttribute('data-cms-edit-hidden', '1'); el.style.setProperty('display', 'none', 'important'); });
    };
    sweep(); [200, 800, 2000].forEach(function (ms) { setTimeout(sweep, ms); });
  }
  function initEditModeInner() {
    body.classList.add('cms-edit-mode', 'is-editor-preview'); $$('.anim').forEach(function (el) { el.classList.add('is-in'); });
    document.documentElement.setAttribute('data-editor-mode', 'true');   /* 편집 캔버스임을 명확히 표시 — 미리보기 · 공개 홈페이지에는 없는 값 */
    window.__EDITOR_PREVIEW__ = true;   /* 이 화면이 에디터 안(iframe)인지 확실히 구분 */
    hideSiteLoaders();   /* 공개 홈페이지 자체의 로딩 표시는 편집 화면에서 감춤 (에디터 로딩 UI 와 섞이지 않게) */
    var pop = document.getElementById('wbnote'); if (pop) pop.hidden = true;
    decorateSections();
    /* 편집 모드 전용 : 링크 · 메뉴 · 버튼의 이동을 캡처 단계에서 먼저 막습니다.
       stopPropagation 까지 해서 요소에 걸린 기존 이동 · 스크롤 핸들러(메뉴 → 섹션 이동 등)가 아예 실행되지 않습니다.
       같은 document 에 등록된 아래 선택 핸들러는 그대로 실행되므로 '클릭 = 편집 대상 선택' 이 됩니다. */
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('a[href], [data-page], [data-section], button[type="submit"], .cms-edit-nav') : null;
      if (!t || t.closest('.cms-edit-add, .cms-edit-handle, .cms-x')) return;
      e.preventDefault(); e.stopPropagation();   /* 주소 · 해시 · 페이지 상태를 바꾸지 않음 */
    }, true);
    document.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); }, true);   /* 편집 화면에서는 폼이 전송되지 않음 */
    decorateMenus();
    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest && e.target.closest('[data-add-el]');
      if (addBtn) { e.preventDefault(); e.stopPropagation(); var sec0 = addBtn.closest('.cms-block, section'); try { window.parent.postMessage({ type: 'cms:openElements', section: sec0 ? secId(sec0) : '' }, '*'); } catch (x) {} return; }
    }, true);
    document.addEventListener('click', function (e) { if (e.target.closest('.cms-edit-add, .cms-edit-handle, .cms-x')) return; if (edit.dragged) { e.preventDefault(); e.stopPropagation(); return; }   /* 핸들을 끈 직후의 클릭은 선택으로 처리하지 않음 */ if (edit.fieldEditing) { if (edit.fieldEditing.contains(e.target)) return; if (window.__CMS_EDIT) window.__CMS_EDIT.endFieldEdit(true); } if (edit.editing) { if (e.target === edit.editing) return; endInline(true); } var el = pick(e.target); if (!el) { pinMega(false); return; } e.preventDefault(); e.stopPropagation(); selectEl(el, false, true); }, true);
    document.addEventListener('dblclick', function (e) {
      if (e.target.closest && e.target.closest('.cms-x')) return;
      var el = pick(e.target); if (el && isLeaf(el) && el.tagName !== 'IMG' && el.tagName !== 'PICTURE' && !el.closest('.wbnote, #quickMenu')) { e.preventDefault(); selectEl(el); beginTextEdit(el, e.target); } }, true);
    document.addEventListener('mouseover', function (e) { if (edit.editing || edit.fieldEditing || edit.busy) return; var el = pick(e.target); if (edit.hover && edit.hover !== el) edit.hover.classList.remove('cms-edit-hover'); edit.hover = el; if (el && el !== edit.sel) el.classList.add('cms-edit-hover'); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (edit.fieldEditing && window.__CMS_EDIT) { window.__CMS_EDIT.endFieldEdit(false); return; } if (edit.editing) { endInline(false); return; } setSel(null); pinMega(false); try { window.parent.postMessage({ type: 'cms:deselect' }, '*'); } catch (x) {} } });
    var rectTimer = null; var sendRects = function () { clearTimeout(rectTimer); rectTimer = setTimeout(function () { try { window.parent.postMessage({ type: 'cms:rects', sections: sectionsOf().map(function (s) { var r = s.getBoundingClientRect(); return { id: secId(s), name: secName(s), rect: { top: r.top, left: r.left, width: r.width, height: r.height } }; }), sel: edit.sel ? { rect: rectOf(edit.sel) } : null, view: { w: window.innerWidth, h: window.innerHeight } }, '*'); } catch (x) {} if (window.__CMS_EDIT && window.__CMS_EDIT.reposition) window.__CMS_EDIT.reposition(); }, 80); };
    window.addEventListener('scroll', sendRects, true); window.addEventListener('resize', sendRects); edit.sendRects = sendRects;
    buildIndex();
    /* 확장 편집 기능(섹션 높이 · 여백 핸들 · 요소 크기 · 요소 이동 · 서식 도구)은 편집 화면에서만 내려받는 별도 파일 — 공개 방문자는 받지 않음 */
    window.__CMS_EDIT_API = { edit: edit, $: $, $$: $$, esc: esc, body: body, isIndex: isIndex, pageKey: pageKey, sectionsOf: sectionsOf, secId: secId, secName: secName, sectionEl: sectionEl, selectorFor: selectorFor, selectEl: selectEl, setSel: setSel, rectOf: rectOf, isLeaf: isLeaf, injectCss: injectCss, pick: pick, post: function (msg) { try { window.parent.postMessage(msg, '*'); } catch (x) {} } };
    loadScript('assets/js/cms-edit.js', function () {});
    if (typeof window.__cmsScroll === 'number') setTimeout(function () { window.scrollTo(0, window.__cmsScroll); }, 60);
    try { window.parent.postMessage({ type: 'cms:ready', pageKey: pageKey, sections: sectionsOf().map(function (s) { return { id: secId(s), name: secName(s) }; }) }, '*'); } catch (x) {}
  }
  function rectOf(el) { var r = el.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; }
  function decorateSections() {
    var secs = sectionsOf();
    secs.forEach(function (s, idx) {
      if (getComputedStyle(s).position === 'static') s.style.position = 'relative';
      s.classList.add('cms-edit-sec');
      var locked = s.getAttribute('data-cms-locked') === '1' || ((DATA && DATA.sections) || []).some(function (x) { return x.id === secId(s) && x.locked; }); if (locked) s.setAttribute('data-cms-locked', '1');
      var lab = document.createElement('span'); lab.className = 'cms-edit-label cms-x'; lab.textContent = (locked ? '🔒 ' : '') + secName(s); s.appendChild(lab);
      var handle = document.createElement('span'); handle.className = 'cms-edit-handle cms-x'; handle.textContent = '⋮⋮ 이동'; handle.draggable = true; handle.title = '이 손잡이를 끌어 섹션 순서를 바꿉니다'; if (!locked) s.appendChild(handle);
      handle.addEventListener('dragstart', function (e) { edit.dragging = s; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'wb-sec:' + secId(s)); } catch (x) {} });
      handle.addEventListener('dragend', function () { edit.dragging = null; $$('.cms-edit-dragover').forEach(function (x) { x.classList.remove('cms-edit-dragover'); }); });
      s.addEventListener('dragover', function (e) { if (!edit.dragging || edit.dragging === s) return; e.preventDefault(); s.classList.add('cms-edit-dragover'); });
      s.addEventListener('dragleave', function () { s.classList.remove('cms-edit-dragover'); });
      s.addEventListener('drop', function (e) { s.classList.remove('cms-edit-dragover'); if (!edit.dragging || edit.dragging === s) return; e.preventDefault(); var order = sectionsOf().map(secId); var from = order.indexOf(secId(edit.dragging)), to = order.indexOf(secId(s)); order.splice(from, 1); order.splice(to, 0, secId(edit.dragging)); edit.dragging = null; try { window.parent.postMessage({ type: 'cms:reorder', order: order }, '*'); } catch (x) {} });
      var mk = function (pos) {
        var add = document.createElement('button'); add.type = 'button'; add.className = 'cms-edit-add cms-x' + (pos === 'before' ? ' cms-edit-add--top' : ''); add.textContent = '+ 섹션 추가'; add.title = pos === 'before' ? '이 섹션 위에 새 섹션 추가' : '이 섹션 아래에 새 섹션 추가'; s.appendChild(add);
        var line = document.createElement('span'); line.className = 'cms-edit-line' + (pos === 'before' ? ' cms-edit-line--top' : ''); s.appendChild(line);
        add.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var r = add.getBoundingClientRect(); try { window.parent.postMessage({ type: 'cms:addAt', section: secId(s), pos: pos, x: r.left + r.width / 2, y: r.top + r.height / 2 }, '*'); } catch (x) {} });
      };
      mk('after'); if (idx === 0) mk('before');
    });
    var hdr = $('#header'); if (hdr) { var l = document.createElement('span'); l.className = 'cms-edit-label cms-x'; l.textContent = '헤더 (공통)'; l.style.left = 'auto'; l.style.right = '8px'; l.style.top = 'auto'; l.style.bottom = '-22px'; hdr.appendChild(l); }
    var ftr = $('#footer'); if (ftr) { if (getComputedStyle(ftr).position === 'static') ftr.style.position = 'relative'; var l2 = document.createElement('span'); l2.className = 'cms-edit-label cms-x'; l2.textContent = '푸터 (공통)'; ftr.appendChild(l2); }
  }
  /* 텍스트 바로 고치기 : 추가 블록/요소의 글(제목 · 본문 · 버튼 문구 · 캡션)은 그 자리에서 편집(cms-edit.js) · 기본 섹션의 글은 기존 인라인 편집 */
  function beginTextEdit(el, target) { var f = (target && target.closest && target.closest('[data-cms-field]')) || (el.closest && el.closest('[data-cms-field]')); if (f && f.closest('.cms-block') && window.__CMS_EDIT && window.__CMS_EDIT.startFieldEdit) { window.__CMS_EDIT.startFieldEdit(f); return; } startInline(el); }
  function pick(target) {
    if (!target || target.nodeType !== 1) return null; if (target.closest('.wbnote, .cms-pop, .cms-vpop, .cms-x')) return null;
    /* 헤더 · 푸터 · 퀵메뉴(공통 요소)는 일반 페이지 편집에서 건드리지 않습니다 — 에디터가 [헤더 편집] 안내를 띄웁니다.
       (헤더 편집 모드에서는 헤더 안쪽만 선택 가능) */
    var common = target.closest('#header, header, #footer, footer, #quickMenu, .quick-menu');
    if (common) {
      var which = target.closest('#footer, footer') ? 'footer' : (target.closest('#quickMenu, .quick-menu') ? 'quick' : 'header');
      if (!(edit.commonMode && edit.commonMode === which)) { toParent({ type: 'cms:commonBlocked', which: which }); return null; }
    } else if (edit.commonMode) { toParent({ type: 'cms:commonBlocked', which: edit.commonMode, outside: true }); return null; }
    var lockedSec = target.closest('[data-cms-locked="1"]'); if (lockedSec) return lockedSec;   /* 잠긴 섹션 : 안쪽 요소는 선택되지 않고 섹션만 선택 */
    var el = target;
    for (var i = 0; i < 5 && el && el !== body; i++) { if (isLeaf(el)) return el; el = el.parentElement; }
    var sec = target.closest('.cms-block, section, header, footer'); return sec || null;
  }
  function isLeaf(el) { var tag = el.tagName; if (tag === 'IMG' || tag === 'PICTURE' || tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true; var kids = el.children; if (!kids.length) return !!(el.textContent || '').trim(); for (var i = 0; i < kids.length; i++) { var t = kids[i].tagName; if (!(t === 'BR' || t === 'SPAN' || t === 'EM' || t === 'STRONG' || t === 'B' || t === 'I' || t === 'SMALL' || t === 'SUP')) return false; } return !!(el.textContent || '').trim(); }
  function norm(s) { return String(s || '').replace(/\s+/g, '').replace(/^\.\//, '').replace(/\[PC줄바꿈\]|\[모바일줄바꿈\]/g, ''); }
  function buildIndex() {
    var map = {}; var SD = sd() || {};
    (function walk(v, path) { if (typeof v === 'string') { var k = norm(v); if (k.length) (map[k] = map[k] || []).push(path); } else if (Array.isArray(v)) v.forEach(function (x, i) { walk(x, path ? path + '.' + i : String(i)); }); else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { if (typeof v[k] === 'function') return; walk(v[k], path ? path + '.' + k : k); }); })(SD, '');
    edit.index = map;
  }
  function pathsFor(el) {
    var cands = [];
    if (el.tagName === 'IMG' || el.tagName === 'PICTURE') { var img = el.tagName === 'IMG' ? el : el.querySelector('img'); if (img) { [img.getAttribute('src'), img.currentSrc, img.getAttribute('alt')].forEach(function (v) { if (!v) return; var k = norm(v); var rel = k.replace(/^https?:\/\/[^/]+\//, ''); (edit.index[k] || edit.index[rel] || edit.index['./' + rel] || []).forEach(function (p) { cands.push(p); }); }); } }
    else { var txt = norm(el.textContent); if (txt) (edit.index[txt] || []).forEach(function (p) { cands.push(p); }); if (el.tagName === 'A' && el.getAttribute('href')) (edit.index[norm(el.getAttribute('href'))] || []).forEach(function (p) { cands.push(p); }); }
    var pre = 'pages.' + pageKey + '.';
    cands = cands.filter(function (p, i) { return cands.indexOf(p) === i; });
    cands.sort(function (a, b) { var sa = (isIndex ? (a.indexOf('pages.') === 0 ? 2 : 0) : (a.indexOf(pre) === 0 ? 0 : 2)) + (/\.(alt|cardAlt)$/.test(a) && el.tagName !== 'IMG' ? 1 : 0); var sb = (isIndex ? (b.indexOf('pages.') === 0 ? 2 : 0) : (b.indexOf(pre) === 0 ? 0 : 2)) + (/\.(alt|cardAlt)$/.test(b) && el.tagName !== 'IMG' ? 1 : 0); return sa - sb; });
    return cands;
  }
  function selectorFor(el) {
    if (el.id && !/^\d/.test(el.id)) return '#' + CSS.escape(el.id);
    var parts = []; var cur = el;
    while (cur && cur !== body && parts.length < 6) { if (cur.getAttribute && cur.getAttribute('data-cms-el')) { var host = cur.closest('.cms-block'); parts.unshift((host ? '#' + CSS.escape(host.id) + ' ' : '') + '[data-cms-el="' + cur.getAttribute('data-cms-el') + '"]'); break; } if (cur.id && !/^\d/.test(cur.id)) { parts.unshift('#' + CSS.escape(cur.id)); break; } var seg = cur.tagName.toLowerCase(); var cls = Array.prototype.filter.call(cur.classList, function (c) { return !/^(is-|anim|cms-|no-transition)/.test(c); }).slice(0, 2); if (cls.length) seg += '.' + cls.map(function (c) { return CSS.escape(c); }).join('.'); var sibs = cur.parentElement ? Array.prototype.filter.call(cur.parentElement.children, function (s) { return s.tagName === cur.tagName; }) : []; if (sibs.length > 1) seg += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')'; parts.unshift(seg); cur = cur.parentElement; }
    return parts.join(' > ');
  }
  /* 헤더 메뉴 : 1차 메뉴(.gnb__link) · 메가메뉴 소메뉴(.mega__link) 를 데이터 위치로 알려 줍니다 (표시 중인 것만 세므로 숨긴 메뉴는 관리자 쪽에서 맞춰 계산) */
  /* 메뉴 순서 바꾸기 : 같은 단계(1차 메뉴끼리 · 같은 그룹의 소메뉴끼리)만 끌어다 놓을 수 있습니다 */
  function decorateMenus() {
    $$('a.gnb__link, a.mega__link').forEach(function (a) {
      a.setAttribute('draggable', 'true'); a.classList.add('cms-menu-drag');
      a.addEventListener('dragstart', function (e) {
        if (edit.editing) { e.preventDefault(); return; }
        edit.menuDrag = menuRefOf(a); a.classList.add('cms-menu-dragging');
        try { e.dataTransfer.setData('text/plain', 'wb-menu'); e.dataTransfer.effectAllowed = 'move'; } catch (x) {}
      });
      a.addEventListener('dragend', function () { a.classList.remove('cms-menu-dragging'); edit.menuDrag = null; $$('.cms-menu-over').forEach(function (x) { x.classList.remove('cms-menu-over'); }); });
      a.addEventListener('dragover', function (e) {
        var f = edit.menuDrag; if (!f) return; var t = menuRefOf(a); if (!t || t.sub !== f.sub || (t.sub && t.group !== f.group)) return;
        e.preventDefault(); e.stopPropagation(); a.classList.add('cms-menu-over');
      });
      a.addEventListener('dragleave', function () { a.classList.remove('cms-menu-over'); });
      a.addEventListener('drop', function (e) {
        a.classList.remove('cms-menu-over'); var f = edit.menuDrag; edit.menuDrag = null; if (!f) return;
        var t = menuRefOf(a); if (!t || t.sub !== f.sub || (t.sub && t.group !== f.group)) return;
        e.preventDefault(); e.stopPropagation();
        try { window.parent.postMessage({ type: 'cms:menuReorder', from: f, to: t }, '*'); } catch (x) {}
      });
    });
  }
  function menuRefOf(el) {
    var a = el && el.closest ? el.closest('a.gnb__link, a.mega__link') : null; if (!a) return null;
    var sub = a.classList.contains('mega__link');
    var col = a.closest('[data-col]'), gi = a.closest('.gnb__item');
    var group = sub ? (col && col.getAttribute('data-col')) : (gi && gi.getAttribute('data-group'));
    var idx = -1;
    if (sub && col) { var ls = [].slice.call(col.querySelectorAll('a.mega__link')); idx = ls.indexOf(a); }
    return { group: group || '', item: idx, sub: sub, label: (a.textContent || '').trim(), href: a.getAttribute('href') || '', page: a.getAttribute('data-page') || '', external: a.getAttribute('data-external') === 'true' };
  }
  /* 메뉴를 편집하는 동안 메가메뉴가 갑자기 닫히지 않도록 고정 (Esc · 다른 곳 선택 시 해제) */
  function pinMega(on) { var h = document.getElementById('header'); if (!h) return; h.classList.toggle('is-mega-pinned', !!on); if (on) h.classList.add('is-mega-open'); }
  function selectEl(el, fromParent, noScroll) {
    setSel(el);
    var mref = menuRefOf(el); pinMega(!!(mref && mref.sub));
    var isSec = el.matches('section, .cms-block, header, footer') && !isLeaf(el);
    var kind = isSec ? 'section' : (el.tagName === 'IMG' || el.tagName === 'PICTURE') ? 'image' : (el.tagName === 'A' || el.tagName === 'BUTTON') ? 'link' : isLeaf(el) ? 'text' : 'element';
    var blk = el.closest('.cms-block'); var secEl = el.closest('section[id], header, footer'); var sectionId = blk ? 'cms-' + blk.getAttribute('data-cms-block') : (secEl ? (SEC_MAP[secEl.id] || secEl.id || secEl.tagName.toLowerCase()) : '');
    var img = el.tagName === 'IMG' ? el : el.querySelector && el.querySelector('img');
    try { window.parent.postMessage({ type: 'cms:select', paths: isSec ? [] : pathsFor(el), selector: selectorFor(el), tag: el.tagName.toLowerCase(), kind: kind, text: (el.textContent || '').trim().slice(0, 120), section: sectionId, blockUid: blk ? blk.getAttribute('data-cms-block') : null, src: img ? (img.getAttribute('src') || '') : '', href: el.tagName === 'A' ? (el.getAttribute('href') || '') : '', rect: rectOf(el), field: (el.closest('.reserve__form .field[data-field]') || { getAttribute: function () { return ''; } }).getAttribute('data-field'), formKey: el.closest('form.reserve__form') ? (el.closest('form.reserve__form').getAttribute('data-form-key') || 'reserve') : '', popupId: el.closest('[data-open-popup]') ? el.closest('[data-open-popup]').getAttribute('data-open-popup') : null, elUid: el.closest('[data-cms-el]') ? el.closest('[data-cms-el]').getAttribute('data-cms-el') : null, dataField: el.closest('[data-cms-field]') ? el.closest('[data-cms-field]').getAttribute('data-cms-field') : '', locked: !!el.closest('[data-cms-locked="1"]'), container: !!(blk && blk.classList.contains('cms-block--section')), secKind: blk ? 'block' : (secEl && secEl.classList && secEl.classList.contains('home-section') ? 'home' : 'builtin'), menuRef: mref }, '*'); } catch (e) {}
    if (window.__CMS_EDIT && window.__CMS_EDIT.onSelect) window.__CMS_EDIT.onSelect(el, isSec);
    if (edit.sendRects) edit.sendRects();
    if (!fromParent && !noScroll && kind !== 'section') el.scrollIntoView({ block: 'nearest' });   /* 화면에서 직접 누른 경우에는 스크롤을 건드리지 않음 */
  }
  function setSel(el) { if (edit.sel) edit.sel.classList.remove('cms-edit-sel'); edit.sel = el; if (el) { el.classList.remove('cms-edit-hover'); el.classList.add('cms-edit-sel'); } else if (window.__CMS_EDIT && window.__CMS_EDIT.onSelect) window.__CMS_EDIT.onSelect(null, false); if (edit.sendRects) edit.sendRects(); }
  /* 인라인 편집 : 더블클릭 → contenteditable → 입력마다 부모에 전달 · Enter/blur 확정 · Esc 취소 */
  function startInline(el) {
    if (edit.editing) endInline(true);
    var paths = pathsFor(el); var selector = selectorFor(el);   /* 데이터에 연결된 텍스트는 그 값을, 연결되지 않은 장식 텍스트는 선택자 기준으로 저장 */
    edit.editing = el; el.__menuRef = menuRefOf(el); el.__orig = el.innerHTML; el.__origText = el.innerText; el.__paths = paths; el.__selector = selector; el.contentEditable = 'true'; el.classList.add('cms-editing'); el.focus();
    var sel = window.getSelection(); var range = document.createRange(); range.selectNodeContents(el); range.collapse(false); sel.removeAllRanges(); sel.addRange(range);
    var send = function (done) { var v = el.innerText.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n'); try { window.parent.postMessage({ type: 'cms:inline', menuRef: (el.__menuRef || null), paths: paths, selector: selector, value: v, done: !!done }, '*'); } catch (x) {} };
    el.__onInput = function () { send(false); }; el.__onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); endInline(false); } if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); endInline(true); return; }   /* Ctrl/Cmd + Enter : 편집 완료 (여러 줄 요소 포함) */ if (e.key === 'Enter' && !e.shiftKey && el.tagName !== 'P' && el.tagName !== 'DIV') { e.preventDefault(); endInline(true); } }; el.__onBlur = function () { endInline(true); };
    el.addEventListener('input', el.__onInput); el.addEventListener('keydown', el.__onKey); el.addEventListener('blur', el.__onBlur);
  }
  function endInline(commit) {
    var el = edit.editing; if (!el) return; edit.editing = null;
    el.removeEventListener('input', el.__onInput); el.removeEventListener('keydown', el.__onKey); el.removeEventListener('blur', el.__onBlur);
    el.contentEditable = 'false'; el.classList.remove('cms-editing');
    if (!commit) { el.innerHTML = el.__orig; try { window.parent.postMessage({ type: 'cms:inline', menuRef: (el.__menuRef || null), paths: el.__paths, selector: el.__selector, value: el.__origText != null ? el.__origText : el.innerText, done: true, cancel: true }, '*'); } catch (x) {} return; }
    var v = el.innerText.replace(/ /g, ' ');
    el.innerHTML = esc(v).replace(/\n/g, '<br>');
    try { window.parent.postMessage({ type: 'cms:inline', menuRef: (el.__menuRef || null), paths: el.__paths, selector: el.__selector, value: v, done: true }, '*'); } catch (x) {}
    if (el.__paths && el.__paths.length) { var k = norm(v); (edit.index[k] = edit.index[k] || []).push(el.__paths[0]); }
  }
  function patchText(path, value) {
    if (!path || !edit.index) return false; var SD = sd() || {};
    var parts = path.split('.'); var cur = SD; for (var i = 0; i < parts.length; i++) { if (cur == null) break; if (i === parts.length - 1) { var old = cur[parts[i]]; if (typeof old !== 'string') return false; cur[parts[i]] = value; var found = false; var oldN = norm(old); var html = esc(value).replace(/\[PC줄바꿈\]/g, '<br class="cms-br cms-br--pc">').replace(/\[모바일줄바꿈\]/g, '<br class="cms-br cms-br--m">').replace(/\n/g, '<br>'); if (edit.sel && norm(edit.sel.textContent) === oldN && edit.sel.tagName !== 'IMG') { edit.sel.innerHTML = html; found = true; } else if (oldN) { $$('h1,h2,h3,h4,p,span,li,a,button,em,strong,dt,dd,td,th,figcaption,small').forEach(function (n) { if (!found && isLeaf(n) && norm(n.textContent) === oldN) { n.innerHTML = html; found = true; } }); } (edit.index[norm(value)] = edit.index[norm(value)] || []).push(path); return found; } cur = cur[parts[i]]; }
    return false;
  }

  /* ---------- 7. 팝업 표시 규칙 · 영상 팝업 (통합웹빌더) ----------
     규칙(영상 팝업에만 적용) : always 새로고침마다 · session 세션당 한 번(sessionStorage) · today 자정까지 · daily 하루 한 번(닫으면 24시간)
     ※ 이미지 배너 팝업은 규칙과 무관하게 페이지에 들어올 때마다 표시(닫은 기록 저장 안 함) */
  function ruleKey(p) { return 'cms_pop_' + CFG.siteKey + '_' + p.id; }
  function ruleHidden(p) { var r = p.rule || p.hideRule || 'today'; if (r === 'always') return false; try { if (r === 'session') return !!sessionStorage.getItem(ruleKey(p)); var until = parseInt(localStorage.getItem(ruleKey(p)) || '0', 10); return until > Date.now(); } catch (e) { return false; } }
  function markRule(p, force) { var r = p.rule || p.hideRule || 'today'; try { if (r === 'session') sessionStorage.setItem(ruleKey(p), '1'); else if (r === 'daily') localStorage.setItem(ruleKey(p), String(Date.now() + 86400000)); else if (r === 'today' && force) { var d = new Date(); d.setHours(24, 0, 0, 0); localStorage.setItem(ruleKey(p), String(d.getTime())); } } catch (e) {} }
  /* 게시 중 여부 : 사용 · 표시 페이지 · 기기(PC/모바일) · 게시 기간 */
  function popupActive(p) {
    if (p.enabled === false) return false; var pages = p.pages || ['main']; if (pages.indexOf(pageKey || 'main') < 0 && pages.indexOf('*') < 0) return false;
    var mobile = window.matchMedia('(max-width:767px)').matches; if (p.devices === 'pc' && mobile) return false; if (p.devices === 'mobile' && !mobile) return false;
    if (p.start && p.start > nowStr()) return false; if (p.end && p.end < nowStr()) return false;
    return true;
  }
  /* 이미지 배너 팝업 : 게시 중이면 페이지에 들어올 때마다(새로고침 · 재방문 포함) 표시 — 닫은 기록으로 숨기지 않음('오늘 하루 보지 않기' 사용 안 함) */
  function bannerAllowed(p) { return popupActive(p); }
  /* 영상 팝업 : 관리자 노출 주기 규칙 적용 */
  function popupAllowed(p) { return popupActive(p) && (editMode || previewToken || !ruleHidden(p)); }
  function nowStr() { var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds()); }
  /* 이미지 배너 팝업(기존 패널) : 닫아도 브라우저에 기록하지 않음 → 새로고침 · 재방문 때 다시 자동 표시
     예전 버전이 '오늘 자정까지 숨김'으로 남긴 기록(cms_pop_사이트_배너ID)은 지워서, 이미 닫았던 방문자에게도 즉시 다시 표시 */
  function popupRules() {
    var list = ((DATA && DATA.popupBanners) || []).filter(function (p) { return p && p.id != null; });
    list.forEach(function (p) { try { localStorage.removeItem(ruleKey(p)); } catch (e) {} try { sessionStorage.removeItem(ruleKey(p)); } catch (e) {} });
  }
  /* 영상 팝업 : 화면 중앙 모달 · MP4 / YouTube / Vimeo · 페이지 로드 시 한 번만 (닫은 뒤 스크롤해도 다시 열리지 않음) */
  /* ===== 영상 팝업 템플릿 (자동 노출 · 팝업 열기 버튼 · 미리보기 공용) =====
     구조 : .cms-vpop(화면 전체 어두운 배경) > .cms-vpop__box(영상 비율 그대로) > X 버튼 + 영상 — 그 밖의 UI(흰 바 · 체크박스 · 닫기 버튼 영역 · 링크) 없음
     크기 : PC 최대 78vw × 82vh · 모바일 좌우 16px · 원본 비율 유지(MP4 는 실제 영상 크기 · YouTube/Vimeo 는 설정 비율, Shorts 는 9:16) · 스크롤바 없음
     닫기 : X · 바깥(어두운 영역) 클릭 · Esc · 모바일 뒤로가기 — 영상 컨트롤 클릭은 닫지 않음 · 닫는 즉시 영상/소리 정지 · 스크롤 잠금은 common.js lockScroll(가로 밀림 없음) */
  var VPOP_CSS = '.cms-vpop{position:fixed;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(0,0,0,var(--cms-vpop-overlay,.78));opacity:0;transition:opacity .24s ease;-webkit-tap-highlight-color:transparent}.cms-vpop.is-open{opacity:1}' +
    '.cms-vpop__box{position:relative;flex:none;width:min(78vw,calc(82vh * var(--cms-vpop-r,1.7778)));max-width:calc(100vw - 32px);aspect-ratio:var(--cms-vpop-ar,16 / 9);background:#000;transform:scale(.96);transition:transform .28s cubic-bezier(.22,.8,.3,1)}.cms-vpop.is-open .cms-vpop__box{transform:none}' +
    '.cms-vpop__media{position:absolute;inset:0}.cms-vpop__media video,.cms-vpop__media iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000}.cms-vpop__media video{object-fit:contain}' +
    '.cms-vpop__x{position:absolute;right:-6px;top:-46px;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.86;transition:opacity .2s ease,transform .2s ease,background .2s ease}.cms-vpop__x svg{width:22px;height:22px;display:block}.cms-vpop__x:hover{opacity:1;transform:scale(1.08);background:rgba(255,255,255,.12)}.cms-vpop__x:focus-visible{outline:2px solid #fff;outline-offset:2px;opacity:1}' +
    '.cms-vpop.is-x-inside .cms-vpop__x{top:8px;right:8px;background:rgba(0,0,0,.45)}' +
    '@media(max-width:767px){.cms-vpop__box{width:min(calc(100vw - 32px),calc(78vh * var(--cms-vpop-r,1.7778)))}.cms-vpop__x{width:44px;height:44px;right:-8px;top:-50px}.cms-vpop.is-x-inside .cms-vpop__x{top:6px;right:6px}}' +
    '@media(prefers-reduced-motion:reduce){.cms-vpop,.cms-vpop__box{transition-duration:.01s}}';
  var vpopLayer = null;
  function ratioOf(v, fallback) { var m = String(v || '').match(/([\d.]+)\s*[\/:]\s*([\d.]+)/); var w = m ? parseFloat(m[1]) : 0, h = m ? parseFloat(m[2]) : 0; if (!(w > 0 && h > 0)) { w = fallback ? fallback[0] : 16; h = fallback ? fallback[1] : 9; } return [w, h]; }
  function openVideoLayer(v, opts) {
    opts = opts || {}; if (vpopLayer) return null; var src = String(v.src || ''); if (!src) return null;
    injectCss('cms-vpop-css', VPOP_CSS);
    var mobile = window.matchMedia('(max-width:767px)').matches;
    var yt = src.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/); var vm = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    var rt = ratioOf(mobile ? v.ratioMobile : v.ratioPc, /\/shorts\//.test(src) ? [9, 16] : [16, 9]);
    var au = v.autoplay === false ? 0 : 1, mu = v.muted ? 1 : 0, lp = v.loop ? 1 : 0, ct = v.controls === false ? 0 : 1;
    var media = yt ? '<iframe src="https://www.youtube.com/embed/' + yt[1] + '?autoplay=' + au + '&mute=' + mu + '&loop=' + lp + (lp ? '&playlist=' + yt[1] : '') + '&controls=' + ct + '&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="' + esc(v.title || '영상') + '"></iframe>'
      : vm ? '<iframe src="https://player.vimeo.com/video/' + vm[1] + '?autoplay=' + au + '&muted=' + mu + '&loop=' + lp + '&controls=' + ct + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="' + esc(v.title || '영상') + '"></iframe>'
      : '<video src="' + esc(src) + '"' + (v.poster ? ' poster="' + esc(v.poster) + '"' : '') + (au ? ' autoplay' : '') + (mu ? ' muted' : '') + (lp ? ' loop' : '') + (ct ? ' controls' : '') + ' playsinline preload="metadata"></video>';
    var wrap = document.createElement('div'); wrap.className = 'cms-vpop'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', v.title || '영상 팝업'); if (v.id != null) wrap.setAttribute('data-popup-id', String(v.id));   /* 이 영상 팝업(cms-vpop)은 별개 기능 — 배너 팝업 이름 변경과 무관 */
    if (v.overlay != null && v.overlay !== '') wrap.style.setProperty('--cms-vpop-overlay', String(v.overlay));
    var setRatio = function (w, h) { if (!(w > 0 && h > 0)) return; wrap.style.setProperty('--cms-vpop-ar', w + ' / ' + h); wrap.style.setProperty('--cms-vpop-r', String(Math.round(w / h * 10000) / 10000)); placeX(); };
    wrap.innerHTML = '<div class="cms-vpop__box"><button type="button" class="cms-vpop__x" aria-label="팝업 닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5L5 19"/></svg></button><div class="cms-vpop__media">' + media + '</div></div>';
    var box = wrap.querySelector('.cms-vpop__box'), xb = wrap.querySelector('.cms-vpop__x'), vid = wrap.querySelector('video');
    /* X 가 화면 위로 잘릴 만큼 영상이 크면(가로로 눕힌 휴대폰 등) 영상 안쪽 모서리에 표시 */
    var placeX = function () { var r = box.getBoundingClientRect(); wrap.classList.toggle('is-x-inside', r.top < (mobile ? 54 : 50)); };
    setRatio(rt[0], rt[1]);
    if (vid) vid.addEventListener('loadedmetadata', function () { setRatio(vid.videoWidth, vid.videoHeight); });   /* MP4 : 실제 영상 비율 (세로 영상은 세로 그대로) */
    document.body.appendChild(wrap); vpopLayer = wrap;
    if (window.SITE && SITE.lockScroll) SITE.lockScroll(true);
    void wrap.offsetWidth; wrap.classList.add('is-open'); placeX();
    var closed = false, pushed = false;
    var stop = function () { if (vid) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) {} } var f = wrap.querySelector('iframe'); if (f) { try { f.src = 'about:blank'; } catch (e) {} } };
    var close = function (fromBack) {
      if (closed) return; closed = true; stop();   /* 닫는 즉시 영상 · 소리 정지 */
      document.removeEventListener('keydown', onKey, true); window.removeEventListener('popstate', onPop); window.removeEventListener('resize', placeX);
      wrap.classList.remove('is-open');
      if (pushed && fromBack !== true) { pushed = false; try { history.back(); } catch (e) {} }
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); vpopLayer = null; if (window.SITE && SITE.lockScroll) SITE.lockScroll(false); if (opts.opener && opts.opener.focus) { try { opts.opener.focus({ preventScroll: true }); } catch (e) {} } if (opts.onClose) opts.onClose(); }, 240);
    };
    var onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    var onPop = function () { pushed = false; close(true); };   /* 모바일 뒤로가기 = 팝업만 닫힘 (페이지는 그대로) */
    document.addEventListener('keydown', onKey, true); window.addEventListener('resize', placeX);
    if (!editMode && window.history && history.pushState) { try { history.pushState({ cmsVpop: 1 }, ''); pushed = true; window.addEventListener('popstate', onPop); } catch (e) {} }
    xb.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });   /* 어두운 바깥 영역만 — 영상 · 컨트롤 클릭은 닫지 않음 */
    try { xb.focus({ preventScroll: true }); } catch (e) {}
    return { close: close, el: wrap };
  }
  /* 자동 노출 영상 팝업 : 페이지 로드 시 한 번 (닫은 뒤 다시 열리지 않음) · '오늘 하루 보지 않기'는 영상 팝업에 없음 → 표시 규칙 today 는 '세션당 한 번'으로 처리 */
  function videoRule(p) { var r = p.rule || p.hideRule || 'session'; return Object.assign({}, p, { rule: r === 'today' ? 'session' : r, hideRule: null }); }
  function videoPopups() {
    var list = (DATA && DATA.videoPopups) || []; if (!list.length || editMode) return;
    var force = qs.get('cms_popup');   /* 관리자 › 팝업 관리 › [미리보기] : 규칙과 무관하게 그 팝업을 바로 표시 */
    var vp = force ? list.filter(function (p) { return String(p.id) === force; })[0] : list.map(videoRule).filter(popupAllowed).sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); })[0]; if (!vp) return;
    if (!force && vp.firstVisitOnly) { try { if (sessionStorage.getItem('cms_visited_' + CFG.siteKey)) return; sessionStorage.setItem('cms_visited_' + CFG.siteKey, '1'); } catch (e) {} }
    var layer = openVideoLayer({ id: vp.id, src: vp.src, poster: vp.poster, title: vp.title, autoplay: vp.autoplay, muted: vp.muted, loop: vp.loop, controls: vp.controls, ratioPc: vp.ratioPc, ratioMobile: vp.ratioMobile, overlay: vp.overlay }, { onClose: function () { if (!force) markRule(vp, false); } });
    if (layer) hit(vp.id, 'impression');
  }

  /* ---------- 시작 ---------- */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
