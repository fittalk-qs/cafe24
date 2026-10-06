/* =========================================================================
   main.js : 메인페이지(index.html) 전용 섹션 렌더링
   ------------------------------------------------------------------------
   섹션 순서와 노출은 SITE_DATA.sections 에서 관리합니다.
   ========================================================================= */
(function () {
  'use strict';

  SITE.bootCommon();          /* 공통 헤더 · 메뉴 · 팝업 · 퀵메뉴 · 모달 생성 */

  const $ = SITE.$, $$ = SITE.$$, esc = SITE.esc, setMedia = SITE.setMedia;
  const isOn = SITE.isOn, onlyOn = SITE.onlyOn, clamp = SITE.clamp, openModal = SITE.openModal;
  const pickMedia = SITE.pickMedia, createLinkedImage = SITE.createLinkedImage;
  /* 모든 이미지 데이터는 media 키를 우선 사용하고, 예전 키(image · thumb · background)도 지원합니다. */
  const MK = ['media', 'image', 'thumb', 'background'];
  const ANIM = SITE.ANIM, prefersReduced = SITE.prefersReduced;
  const mqMobile = SITE.mqMobile, mqTablet = SITE.mqTablet;
  /* 써머리 하단 안내문 : ※ 기호(또는 줄바꿈)마다 문단을 나눠 서로 다른 <p> 로 출력하고 .summary-notice 로 감쌉니다.
     PC · 모바일이 같은 함수를 쓰므로 모바일에서도 두 문장이 붙지 않습니다. (<br> 로 잇지 않고 실제 문단 분리) */
  function noticeHtml(text, cls) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw) return '';
    const parts = raw.split(/\n+|\s*(?=※)/).map(function (t) { return t.trim(); }).filter(Boolean);
    const list = parts.length ? parts : [raw];
    return '<div class="summary-notice">' + list.map(function (t) { return '<p' + (cls ? ' class="' + cls + '"' : '') + ' data-summary-note>' + esc(t) + '</p>'; }).join('') + '</div>';
  }

  const CONTENT = SITE_DATA.content || {};          /* siteContent : 메인 · 소메뉴 공통 데이터 */
  const mount = $('#sections');
  const afterMount = [];

  /* ---------- (1) 메인 첫 화면 : 5장 이미지 슬라이드 + 같은 화면 위 SUMMARY 오버레이 (한 섹션 · 100svh) ----------
     <section class="hero-stage main-visual home-section" id="hero" data-hero-state="slider|summary">
       <div class="main-slider"> .main-slide × 5 (<picture><source media="(max-width: 767px)"><img>) </div>
       <div class="main-slider-pagination"> 버튼 5개 </div>
       <div class="hero-summary-overlay">                        어두운 오버레이 (summaryScene.overlayColor · 0.7s 페이드)
       <div class="hero-summary-content" id="summary">           SUMMARY · 사업개요 표 · 유의 문구 (오버레이 뒤 0.75s 페이드 · 0.2s 지연)
     · heroState 0 = 슬라이드 재생 / 1 = 현재 슬라이드에서 정지 + 오버레이 + 써머리  →  sec.__stage.set(0|1) (원스크롤 휠 · 키보드 · 모바일 스와이프가 호출)
     · 써머리 상태 : 자동재생 · 스와이프 · 이전/다음 · 페이지 표시 잠금, 진행 중인 페이드는 더 선명한 이미지로 즉시 확정, 슬라이더는 숨기지 않음(뒤에 계속 보임)
     · 슬라이드 : 자동 5초(mainSlider.interval) · 옆으로 이동 1초(duration) · 무한 반복 · 하단 페이지 표시 · 가로 스와이프 · 탭 비활성 정지 · 다음 이미지 decode 후 전환
     · 23차 : 마우스 드래그(현재 · 이웃 슬라이드가 함께 따라옴) · 트랙패드 가로 이동(wheel deltaX) — 모두 go() 한 곳을 거쳐 busy 잠금 · 자동재생 재계산을 공유,
       슬라이드가 한 장뿐이면(.is-single) 화살표를 만들지 않고 페이지 표시도 숨김 · 개수는 mainSlider.slides(관리자 게시 데이터 포함)에서 자동 계산 */
  function buildHeroStage() {
    const cfg = SITE_DATA.mainSlider;
    const slides = (cfg && isOn(cfg) && cfg.slides) ? cfg.slides.filter(function (s) { return s && s.src && s.enabled !== false; }) : [];
    if (!slides.length) return null;
    const INTERVAL = cfg.interval || 5000, DURATION = cfg.duration || 1000;
    const scene = SITE_DATA.summaryScene || {};
    const bo = CONTENT.businessOverview;
    const banks = bo && (bo.rows || []).length ? [{ enabled: true, tab: bo.name || '', rows: bo.rows }] : onlyOn(SITE_DATA.summary);
    const hasSummary = isOn(scene) && banks.length > 0;

    const sec = document.createElement('section');
    sec.className = 'hero-stage main-visual home-section'; sec.id = 'hero';
    /* 헤더 테마 : PC 는 이미지 위 오버레이(투명), 모바일(767px 이하)은 흰 헤더 영역이 이미지와 겹치지 않도록 solid(흰 배경) */
    const applyHeaderTheme = function () { sec.setAttribute('data-header-theme', mqMobile.matches ? 'solid' : 'overlay'); if (SITE.updateHeaderTheme) SITE.updateHeaderTheme(); };
    applyHeaderTheme();
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', applyHeaderTheme); else if (mqMobile.addListener) mqMobile.addListener(applyHeaderTheme);
    sec.setAttribute('data-hero-state', 'slider');
    sec.setAttribute('aria-label', '메인 이미지 슬라이드 · 사업개요');
    sec.style.setProperty('--slide-duration', DURATION + 'ms');
    if (scene.overlayColor) sec.style.setProperty('--hero-overlay', scene.overlayColor);
    if (scene.overlayColorMobile) sec.style.setProperty('--hero-overlay-mobile', scene.overlayColorMobile);

    /* ----- 슬라이드 ----- */
    const slider = document.createElement('div'); slider.className = 'main-slider';
    slider.setAttribute('aria-roledescription', 'carousel'); slider.setAttribute('aria-label', '메인 이미지 슬라이드');
    const dots = document.createElement('div'); dots.className = 'main-slider-pagination'; dots.setAttribute('role', 'tablist'); dots.setAttribute('aria-label', '슬라이드 선택');
    const imgs = [], lazySlides = [];
    /* 이미지 소스 : 모바일 webp + jpg 대체(767px 이하) → PC webp 1280w/1920w(srcset · sizes 100vw) → <img src> jpg 대체.
       1번만 즉시(fetchpriority=high · index.html preload), 2~5번은 loading=lazy · decoding=async 로 1번 로딩 뒤 순서대로 소스를 지정합니다. */
    function fillSources(pic, s) {
      const add = function (attrs) { const el = document.createElement('source'); Object.keys(attrs).forEach(function (k) { if (attrs[k]) el.setAttribute(k, attrs[k]); }); pic.appendChild(el); };
      if (s.mobileWebp) add({ media: '(max-width: 767px)', type: 'image/webp', srcset: s.mobileWebp });
      if (s.mobileSrc) add({ media: '(max-width: 767px)', srcset: s.mobileSrc });
      if (s.webp) add({ type: 'image/webp', srcset: (s.webp1280 ? s.webp1280 + ' 1280w, ' : '') + s.webp + ' 1920w', sizes: '100vw' });
    }
    slides.forEach(function (s, i) {
      const slide = document.createElement('div');
      slide.className = 'main-slide' + (i === 0 ? ' is-active' : '');
      slide.setAttribute('role', 'group'); slide.setAttribute('aria-roledescription', 'slide'); slide.setAttribute('aria-label', (i + 1) + ' / ' + slides.length);
      slide.appendChild(document.createComment(' 슬라이드 ' + (i + 1) + ' : PC ' + (s.webp || s.src) + ' (대체 ' + s.src + ')' + ((s.mobileWebp || s.mobileSrc) ? ' · 모바일 ' + (s.mobileWebp || s.mobileSrc) : '') + ' '));
      const pic = document.createElement('picture');
      const img = document.createElement('img');
      img.alt = s.alt || ('목동윤슬자이 메인 슬라이드 ' + (i + 1));
      img.decoding = 'async';
      if (i === 0) { img.loading = 'eager'; img.setAttribute('fetchpriority', 'high'); fillSources(pic, s); pic.appendChild(img); img.src = s.src; }
      else { img.loading = 'lazy'; pic.appendChild(img); lazySlides.push({ pic: pic, img: img, s: s }); }   /* 소스는 loadLazySlides() 에서 지정 */
      slide.appendChild(pic); slider.appendChild(slide); imgs.push(img);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'main-slider-dot' + (i === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', '슬라이드 ' + (i + 1)); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () { go(i); });
      dots.appendChild(b);
    });
    sec.appendChild(slider);
    /* 모바일 전용 : 이미지 아래 흰 슬로건 영역 (mainSlider.mobileSlogan · PC display:none) — 페이지 표시는 그 아래 */
    const slogan = cfg.mobileSlogan;
    if (slogan && (slogan.latin || (slogan.lines && slogan.lines.length))) {
      const sg = document.createElement('div'); sg.className = 'mobile-hero-slogan';
      sg.innerHTML = (slogan.latin ? '<p class="mobile-hero-slogan__latin">' + esc(slogan.latin) + '</p>' : '') +
                     ((slogan.lines && slogan.lines.length) ? '<p class="mobile-hero-slogan__text">' + slogan.lines.map(esc).join('<br>') + '</p>' : '');
      sec.appendChild(sg);
    }
    sec.appendChild(dots);
    /* ----- 이전 · 다음 화살표 : 사용하지 않습니다 (요청으로 완전 삭제 — 버튼 DOM · 클릭 이벤트 모두 없음)
           자동 넘김 · 마우스 드래그 · 터치 스와이프 · 하단 위치 표시 점은 그대로 유지하고, 슬라이드가 한 장이면 점도 숨깁니다(.is-single) ----- */
    sec.classList.toggle('is-single', slides.length < 2);

    /* ----- SUMMARY 오버레이 + 내용 (같은 섹션 · 현재 슬라이드 이미지 위) ----- */
    if (hasSummary) {
      const latin = scene.latin || (bo && bo.latin) || 'SUMMARY';
      const title = scene.title || (bo && bo.title) || '';
      const desc = scene.desc || (bo && bo.description) || '';
      const note = scene.note || (bo && bo.note) || '';
      const overlay = document.createElement('div'); overlay.className = 'hero-summary-overlay'; overlay.setAttribute('aria-hidden', 'true');
      const content = document.createElement('div'); content.className = 'hero-summary-content'; content.id = 'summary'; content.setAttribute('data-stage', 'summary'); content.setAttribute('aria-label', '사업개요'); content.setAttribute('aria-hidden', 'true');
      content.innerHTML =
        '<div class="home-section__inner">' +
          '<div class="summary__layout">' +
            '<div class="summary__col">' +
              '<p class="summary__latin">' + esc(latin) + '</p>' +
              (title ? '<p class="summary__title">' + esc(title) + '</p>' : '') +
              (desc ? '<p class="summary__desc">' + esc(desc) + '</p>' : '') +
            '</div>' +
            '<div class="summary__col">' +
              '<div class="summary__pane-wrap"></div>' +
              noticeHtml(note, 'summary__note') +
            '</div>' +
          '</div>' +
        '</div>';
      const paneWrap = content.querySelector('.summary__pane-wrap');
      const pane = document.createElement('div'); pane.className = 'summary__pane';
      const rows = document.createElement('div'); rows.className = 'summary__rows';
      (banks[0].rows || []).forEach(function (r) {
        const box = document.createElement('div'); box.className = 'summary__row';
        box.innerHTML = '<p class="summary__label">' + esc(r.label) + '</p><span class="summary__hr"></span><p class="summary__value">' + esc(r.value) + '</p>';
        rows.appendChild(box);
      });
      pane.appendChild(rows); paneWrap.appendChild(pane);
      sec.appendChild(overlay); sec.appendChild(content);
    }

    /* ----- 슬라이드 동작 : 옆으로 넘어가는 이동 (transform: translate3d · DURATION) — 활성 · 나가는 2장만 애니메이션, 나머지는 숨김(렌더링 없음) ----- */
    let index = 0, timer = null, busy = false, locked = false, leavingTimer = null, lazyStarted = false;
    const slideEls = slider.children, dotEls = dots.children;
    function loadLazySlides() {
      if (lazyStarted) return; lazyStarted = true;
      lazySlides.forEach(function (l) { fillSources(l.pic, l.s); l.pic.appendChild(l.img); l.img.src = l.s.src; });   /* 2 → 5번 순서 · lazy 속성이라 브라우저가 낮은 우선순위로 받음 */
    }
    if (imgs[0].complete) loadLazySlides(); else { imgs[0].addEventListener('load', loadLazySlides, { once: true }); imgs[0].addEventListener('error', loadLazySlides, { once: true }); }
    setTimeout(loadLazySlides, 2500);   /* 1번 로딩이 늦어도 2.5초 뒤에는 시작 */
    function ready(img) {
      if (!img.getAttribute('src')) loadLazySlides();
      const wait = img.complete ? Promise.resolve() : new Promise(function (r) { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
      return wait.then(function () { return img.decode ? img.decode().catch(function () {}) : null; });
    }
    function preload(i) { return ready(imgs[(i + slides.length) % slides.length]); }
    function paint() {
      for (let k = 0; k < slideEls.length; k++) { dotEls[k].classList.toggle('is-active', k === index); dotEls[k].setAttribute('aria-selected', k === index ? 'true' : 'false'); }
    }
    /* dir 1 = 다음(새 슬라이드가 오른쪽에서 들어오고 현재는 왼쪽으로 나감) · -1 = 이전(반대) */
    function show(i, dir) {
      const prev = index; index = i;
      const incoming = slideEls[i], outgoing = slideEls[prev];
      slider.classList.add('no-transition');
      incoming.classList.remove('is-leaving'); incoming.classList.add('is-entering');
      incoming.style.transform = 'translate3d(' + (dir > 0 ? 100 : -100) + '%,0,0)';   /* 시작 위치 (전환 없이) */
      void slider.offsetWidth;
      slider.classList.remove('no-transition');
      requestAnimationFrame(function () {
        incoming.classList.remove('is-entering'); incoming.classList.add('is-active'); incoming.style.transform = '';
        outgoing.classList.remove('is-active'); outgoing.classList.add('is-leaving');
        outgoing.style.transform = 'translate3d(' + (dir > 0 ? -100 : 100) + '%,0,0)';
      });
      paint();
      clearTimeout(leavingTimer);
      leavingTimer = setTimeout(function () { outgoing.classList.remove('is-leaving'); outgoing.style.transform = ''; }, DURATION + 60);
    }
    function go(i, dir) {
      if (locked || busy || slides.length < 2) return;            /* 써머리 상태(locked) : 버튼 · 페이지 표시 · 스와이프 · 자동 전환 모두 잠금 */
      const target = (i + slides.length) % slides.length;
      if (target === index) { start(); return; }
      if (!dir) dir = target > index ? 1 : -1;
      busy = true; stop();
      preload(target).then(function () {
        show(target, dir);
        setTimeout(function () { busy = false; }, DURATION);
        preload(target + 1);
        start();                                                  /* 조작(버튼 · 페이지 표시 · 스와이프) 뒤 자동재생 대기 시간 다시 계산 */
      });
    }
    /* 진행 중인 페이드가 있으면 현재 더 선명한 이미지로 즉시 확정 (써머리를 띄우는 순간 슬라이드가 계속 바뀌지 않도록) */
    function settle() {
      const leaving = slider.querySelector('.main-slide.is-leaving');
      if (!busy && !leaving) return;
      const cur = slideEls[index];
      let tx = 0; const mt = getComputedStyle(cur).transform;
      if (mt && mt !== 'none') { const p = mt.match(/matrix(?:3d)?\(([^)]+)\)/); if (p) { const v = p[1].split(',').map(parseFloat); tx = mt.indexOf('matrix3d') === 0 ? v[12] : v[4]; } }
      const w = cur.getBoundingClientRect().width || 1;
      slider.classList.add('no-transition');
      if (Math.abs(tx) > w / 2 && leaving) {                       /* 새 이미지가 절반도 안 들어옴 → 이전 이미지로 되돌려 고정 */
        index = Array.prototype.indexOf.call(slideEls, leaving);
        cur.classList.remove('is-active', 'is-entering'); cur.style.transform = '';
        leaving.classList.remove('is-leaving'); leaving.classList.add('is-active'); leaving.style.transform = '';
        paint();
      } else if (leaving) { leaving.classList.remove('is-leaving'); leaving.style.transform = ''; cur.classList.remove('is-entering'); cur.classList.add('is-active'); cur.style.transform = ''; }   /* 새 이미지로 확정 */
      void slider.offsetWidth;                                     /* 전환 없이 즉시 적용 */
      requestAnimationFrame(function () { slider.classList.remove('no-transition'); });
      for (let k = 0; k < slideEls.length; k++) slideEls[k].style.transitionDuration = '';   /* 드래그 마무리용 임시 전환 시간 초기화 */
      clearTimeout(leavingTimer); busy = false;
    }
    function tick() { timer = setTimeout(function () { if (document.hidden) { tick(); return; } go(index + 1, 1); }, INTERVAL); }
    function start() { stop(); if (!locked && slides.length > 1) tick(); }
    function stop() { clearTimeout(timer); timer = null; }
    function lock(on) { locked = !!on; sec.classList.toggle('is-locked', locked); if (locked) { dragCancel(); stop(); settle(); } else start(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    /* 가로 스와이프 : 슬라이드 이동 (세로 스크롤은 그대로 · 써머리 상태에서는 잠금) */
    let sx = 0, sy = 0, touching = false;
    slider.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; touching = true; }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      if (!touching) return; touching = false;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    }, { passive: true });
    dots.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1, 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1, -1); } });
    /* ----- 마우스 드래그 (PC) : 누른 채 좌우로 끌면 현재 · 이웃 슬라이드가 함께 따라오고, 놓으면 넘기거나(폭의 15% 이상 · 빠른 끌기) 제자리로 — 터치 스와이프(모바일)는 위 핸들러 그대로 ----- */
    let drag = null;
    function dragCancel() {                                        /* 써머리 전환 등으로 중단 : 전환 없이 즉시 원위치 */
      const d = drag; drag = null;
      if (!d) return;
      try { slider.releasePointerCapture(d.id); } catch (err) {}
      if (!d.moved) return;
      slider.classList.remove('is-dragging');
      slideEls[index].style.transform = '';
      if (d.nb) { d.nb.classList.remove('is-entering'); d.nb.style.transform = ''; }
      void slider.offsetWidth; slider.classList.remove('no-transition');
    }
    function dragFinish() {
      const d = drag; drag = null;
      if (!d) return;
      try { slider.releasePointerCapture(d.id); } catch (err) {}
      if (!d.moved) return;
      slider.classList.remove('is-dragging');
      const cur = slideEls[index], nb = d.nb;
      const ratio = Math.min(1, Math.abs(d.dx) / d.w);
      const fast = (performance.now() - d.t) < 300 && Math.abs(d.dx) > 30;
      const commit = !locked && !!nb && (ratio > 0.15 || fast);
      const ms = Math.round(Math.max(240, DURATION * 0.8 * (commit ? 1 - ratio : ratio + 0.2)));   /* 남은 거리만큼만 시간 사용 */
      busy = true;
      void slider.offsetWidth; slider.classList.remove('no-transition');   /* 끌던 위치를 시작점으로 확정한 뒤 전환 켜기 */
      cur.style.transitionDuration = ms + 'ms'; if (nb) nb.style.transitionDuration = ms + 'ms';
      requestAnimationFrame(function () {
        if (commit) {
          nb.classList.remove('is-entering'); nb.classList.add('is-active'); nb.style.transform = '';
          cur.classList.remove('is-active'); cur.classList.add('is-leaving'); cur.style.transform = 'translate3d(' + (d.dir > 0 ? -100 : 100) + '%,0,0)';
        } else {
          cur.style.transform = '';
          if (nb) { nb.classList.remove('is-entering'); nb.classList.add('is-leaving'); nb.style.transform = 'translate3d(' + (d.dir > 0 ? 100 : -100) + '%,0,0)'; }
        }
      });
      const gone = commit ? cur : nb;
      if (commit) { index = d.ni; paint(); preload(index + 1); }
      clearTimeout(leavingTimer);
      leavingTimer = setTimeout(function () {
        if (gone) { gone.classList.remove('is-leaving'); gone.style.transform = ''; gone.style.transitionDuration = ''; }
        cur.style.transitionDuration = ''; if (nb) nb.style.transitionDuration = '';
        busy = false;
      }, ms + 60);
      start();                                                     /* 직접 조작 뒤 자동재생 대기 시간 다시 계산 */
    }
    slider.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || locked || busy || drag || slides.length < 2) return;
      drag = { id: e.pointerId, x: e.clientX, dx: 0, dir: 0, ni: -1, nb: null, w: slider.getBoundingClientRect().width || 1, moved: false, t: performance.now() };
    });
    slider.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;                              /* 클릭과 구분 */
        if (locked || busy) { drag = null; return; }
        drag.moved = true; stop();
        slider.classList.add('is-dragging', 'no-transition');
        try { slider.setPointerCapture(drag.id); } catch (err) {}
      }
      drag.dx = dx;
      const dir = dx < 0 ? 1 : -1;                                 /* 왼쪽으로 끌면 다음 · 오른쪽으로 끌면 이전 (마지막 ↔ 첫 장 무한 반복) */
      if (dir !== drag.dir) {
        if (drag.nb) { drag.nb.classList.remove('is-entering'); drag.nb.style.transform = ''; }
        drag.dir = dir; drag.ni = (index + dir + slides.length) % slides.length; drag.nb = slideEls[drag.ni];
        preload(drag.ni); drag.nb.classList.add('is-entering');
      }
      slideEls[index].style.transform = 'translate3d(' + dx + 'px,0,0)';
      drag.nb.style.transform = 'translate3d(' + (dir * drag.w + dx) + 'px,0,0)';
    });
    slider.addEventListener('pointerup', function (e) { if (drag && e.pointerId === drag.id) dragFinish(); });
    slider.addEventListener('pointercancel', function (e) { if (drag && e.pointerId === drag.id) dragCancel(); });
    slider.addEventListener('dragstart', function (e) { e.preventDefault(); });   /* 이미지 기본 드래그(반투명 복사본) 방지 */
    /* ----- 트랙패드 가로 이동 · Shift+휠 : 가로 성분이 더 큰 wheel 만 처리 — 한 번의 제스처에 한 장, 이어지는 관성 입력은 무시 (세로 휠은 common.js 원스크롤이 그대로 처리) ----- */
    let wheelAcc = 0, wheelLockUntil = 0, wheelIdle = null;
    sec.addEventListener('wheel', function (e) {
      if (slides.length < 2 || mqMobile.matches || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();                                          /* 브라우저 뒤로/앞으로 제스처 · 화면 좌우 흔들림 방지 */
      const t = performance.now();
      clearTimeout(wheelIdle); wheelIdle = setTimeout(function () { wheelAcc = 0; }, 180);
      if (locked || busy || t < wheelLockUntil) { wheelAcc = 0; if (t < wheelLockUntil) wheelLockUntil = Math.max(wheelLockUntil, t + 200); return; }
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) < 50) return;
      const dir = wheelAcc > 0 ? 1 : -1; wheelAcc = 0; wheelLockUntil = t + DURATION + 250;
      go(index + dir, dir);
    }, { passive: false });
    sec.__slider = { go: go, get index() { return index; }, get locked() { return locked; }, get busy() { return busy; }, count: slides.length, stop: stop, start: start, lock: lock, settle: settle };

    /* ----- 상태 API : heroState 0(슬라이드) ↔ 1(써머리) — 원스크롤(common.js stepStage) · 퀵메뉴 · 모바일 스와이프가 호출 ----- */
    const SHOW_MS = 900, HIDE_MS = 750;    /* 오버레이 0.7s · 내용 0.75s + 0.2s 지연 → 약 0.9s 뒤 resolve (그동안 입력 잠금 · common.js 쿨다운 포함 약 1.1s) */
    const content = sec.querySelector('.hero-summary-content');
    sec.__stage = {
      count: (hasSummary && !mqMobile.matches) ? 2 : 1,   /* 모바일(767px 이하)은 오버레이 대신 별도 써머리 섹션(summaryMobile) → 첫 섹션에 단계 없음 */
      index: 0,
      busy: false,
      set: function (i) {
        const st = this;
        i = Math.max(0, Math.min(i, st.count - 1));
        return new Promise(function (resolve) {
          if (i === st.index || st.count < 2) { st.index = i; resolve(); return; }
          st.index = i; st.busy = true;
          if (i === 1) {                                          /* showHeroSummary : 슬라이드 정지 · 현재 이미지 고정 · 오버레이 → 써머리 */
            lock(true);
            sec.classList.add('is-summary'); sec.setAttribute('data-hero-state', 'summary');
            if (content) content.setAttribute('aria-hidden', 'false');
          } else {                                                /* hideHeroSummary : 오버레이 제거 · 슬라이드 재생 */
            sec.classList.remove('is-summary'); sec.setAttribute('data-hero-state', 'slider');
            if (content) content.setAttribute('aria-hidden', 'true');
            lock(false);
          }
          setTimeout(function () { st.busy = false; resolve(); }, i === 1 ? SHOW_MS : HIDE_MS);
        });
      }
    };

    /* ----- 모바일 · 태블릿(원스크롤 없음) : 맨 위에서 위로 스와이프 1회 → 써머리, 써머리에서 위로 1회 → 프리미엄 섹션, 써머리에서 아래로 → 슬라이드 (한 번에 두 단계 없음 · 900ms 잠금) ----- */
    let ty = 0, tx = 0, tOn = false, tLock = 0;
    /* 모바일(767px 이하)에서는 이 단계 전환을 아예 쓰지 않습니다 :
       · 세로 스크롤을 막는 preventDefault 없음 (touchmove 리스너 자체를 붙이지 않음 → 브라우저가 바로 스크롤)
       · 히어로 → 써머리로 강제로 넘기는 이동 없음 (사용자가 움직인 만큼만 연속 스크롤)
       태블릿(768~1023px)에서는 오버레이 써머리 단계가 있어 기존 동작을 그대로 둡니다. */
    const stageSwipeOn = function () { return mqTablet.matches && !mqMobile.matches && sec.__stage.count > 1; };
    sec.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; tx = e.touches[0].clientX; tOn = stageSwipeOn() && window.pageYOffset <= 2; }, { passive: true });
    const stageMove = function (e) {
      if (!tOn) return;
      const dy = e.touches[0].clientY - ty, dx = e.touches[0].clientX - tx;
      if (Math.abs(dy) > Math.abs(dx)) e.preventDefault();          /* 태블릿 단계 전환에서만 사용 */
    };
    const bindStageMove = function () {
      sec.removeEventListener('touchmove', stageMove, { passive: false });
      if (!mqMobile.matches) sec.addEventListener('touchmove', stageMove, { passive: false });   /* 모바일에는 비‑passive 리스너를 아예 두지 않음 */
    };
    bindStageMove();
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', bindStageMove); else if (mqMobile.addListener) mqMobile.addListener(bindStageMove);
    sec.addEventListener('touchend', function (e) {
      if (!tOn || !stageSwipeOn()) return;   /* 모바일 : 강제 전환 · scrollIntoView 이동 없음 */
      const dy = e.changedTouches[0].clientY - ty, dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dy) < 40 || Math.abs(dy) <= Math.abs(dx)) return;
      if (sec.__stage.busy || performance.now() < tLock) return;
      tLock = performance.now() + 900;
      const st = sec.__stage;
      if (dy < 0) {
        if (st.count > 1 && st.index === 0) st.set(1);   /* 태블릿 : 오버레이 단계 · 모바일 : 바로 다음 섹션(모바일 SUMMARY)으로 */
        else { const next = sec.nextElementSibling; if (window.__homeScrollTo && next && next.id) window.__homeScrollTo(next.id); else if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      } else if (st.index === 1) st.set(0);
    }, { passive: true });

    afterMount.push(function () { preload(1); start(); });
    return sec;
  }

  /* ---------- (1-2) 모바일 전용 SUMMARY 섹션 (767px 이하) : 슬라이드 다음에 오는 독립 섹션 · 배경 #002F47 · 배경 이미지 · 오버레이 없음 · 내용만큼 늘어남
     PC · 태블릿은 display:none 이고 home-section 도 아니라 원스크롤 대상에서 빠집니다 (첫 섹션 오버레이 방식 유지). 화면 폭을 바꾼 뒤에는 새로고침이 필요합니다. ---------- */
  function buildSummaryMobile() {
    const scene = SITE_DATA.summaryScene || {};
    const bo = CONTENT.businessOverview;
    const banks = bo && (bo.rows || []).length ? [{ enabled: true, tab: bo.name || '', rows: bo.rows }] : onlyOn(SITE_DATA.summary);
    if (!isOn(scene) || !banks.length) return null;
    const latin = scene.latin || (bo && bo.latin) || 'SUMMARY';
    const title = scene.title || (bo && bo.title) || '';
    const desc = scene.desc || (bo && bo.description) || '';
    const note = scene.note || (bo && bo.note) || '';
    const sec = document.createElement('section');
    sec.className = 'summary-section summary-section--mobile' + (mqMobile.matches ? ' home-section' : '');
    sec.id = 'summary-mobile';
    sec.setAttribute('data-header-theme', 'overlay');
    sec.setAttribute('aria-label', '사업개요');
    /* 등장 순서 : SUMMARY 제목 → 사업개요 제목 → (설명) → 항목(사업명 · 대지위치 · 연면적 · 타입 · 공급규모 · 분양물 용도) → 하단 주의 문구
       각 요소는 data-reveal + --i(순번) 를 가지며 CSS 가 opacity 0 · translateY(-24px) 에서 0.8s cubic-bezier(.22,1,.36,1) · 순번 × 0.13s 지연으로 내려옵니다.
       (opacity · transform 만 바뀌므로 애니메이션 전에도 섹션 높이는 그대로 확보됩니다) */
    let order = 0;
    const rv = function (html) { return html.replace(/^<(p|div) class="/, function (m, tag) { return '<' + tag + ' data-reveal style="--i:' + (order++) + '" class="'; }); };
    sec.innerHTML =
      '<div class="summary-section__inner">' +
        rv('<p class="summary-title">' + esc(latin) + '</p>') +
        (title ? rv('<p class="summary-subtitle">' + esc(title) + '</p>') : '') +
        (desc ? rv('<p class="summary-desc">' + esc(desc) + '</p>') : '') +
        '<div class="summary-grid">' + (banks[0].rows || []).map(function (r) { return rv('<div class="summary-item"><p class="label">' + esc(r.label) + '</p><p class="value">' + esc(r.value) + '</p></div>'); }).join('') + '</div>' +
        (note ? rv(noticeHtml(note, '')) : '') +   /* 모바일도 문단 분리 (한 문단으로 붙지 않음) */
      '</div>';
    afterMount.push(function () { initSummaryReveal(sec); });
    return sec;
  }

  /* 모바일 써머리 : 섹션이 약 20% 보일 때 한 번만 .is-in → 순차 등장 (스크롤마다 반복 없음) · prefers-reduced-motion 또는 IO 미지원 시 즉시 표시 */
  function initSummaryReveal(sec) {
    const show = function () { sec.classList.add('is-in'); };
    if (prefersReduced || !('IntersectionObserver' in window)) { show(); return; }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio >= 0.2) { show(); io.disconnect(); } });
    }, { threshold: [0.2] });
    io.observe(sec);
  }

  /* ---------- (2) PREMIUM : 전체화면 분할 ---------- */
  function buildPremium() {
    const cfg = SITE_DATA.premiumSection;
    /* 항목은 siteContent.premiumItems (단지안내 > 프리미엄 페이지와 동일). 예전 premium[] 도 지원 */
    const list = onlyOn((CONTENT.premiumItems && CONTENT.premiumItems.length) ? CONTENT.premiumItems : SITE_DATA.premium);
    if (!isOn(cfg) || !list.length) return null;

    const sec = document.createElement('section');
    sec.className = 'premium home-section mobile-premium-section'; sec.id = 'premium';   /* mobile-premium-section : 767px 이하 전용 스타일의 기준 (PC 규칙 없음) */
    sec.setAttribute('data-header-theme', 'overlay');
    sec.setAttribute('aria-label', cfg.title || 'PREMIUM');
    sec.style.setProperty('--premium-count', list.length);     /* 개수만큼 자동 분할 */
    if (cfg.minHeight) sec.style.setProperty('--premium-min-height', cfg.minHeight);
    sec.innerHTML =
      '<div class="premium__backgrounds" data-premium-bgs aria-hidden="true"></div>' +   /* 이미지 교체 영역 : SITE_DATA.premium[].image */
      '<div class="premium__overlay"></div>' +
      '<div class="premium__inner">' +
        '<div class="premium__head' + (cfg.showHeading === false ? ' is-hidden' : '') + '">' +
          /* 모바일 전용 표기 "PREMIUM 5" (PC 는 display:none · PC 는 아래 eyebrow 를 그대로 사용) */
          '<p class="mobile-premium-label" aria-hidden="true">' + esc(cfg.mobileEyebrow || ((cfg.eyebrow || 'PREMIUM') + ' ' + list.length)) + '</p>' +
          (cfg.eyebrow ? '<p class="section__eyebrow anim">' + esc(cfg.eyebrow) + '</p>' : '') +
          '<h2 class="section__title premium-title anim">' + ((cfg.titleLines && cfg.titleLines.length) ? cfg.titleLines.map(function (t) { return '<span class="premium__title-line">' + esc(t) + '</span>'; }).join('') : esc(cfg.title || '')) + '</h2>' +
          (cfg.desc ? '<p class="section__desc anim">' + esc(cfg.desc) + '</p>' : '') +
        '</div>' +
        '<div class="premium__list" data-anim-group></div>' +
        '<div class="mobile-premium-deck" aria-hidden="true"></div>' +   /* 모바일 전용 : 라운드 아치 카드 덱 5장 (PC display:none · 목록 뒤에 두어 PC 의 head + list 인접 규칙 유지) */
      '</div>' +
      '<div class="premium__controls">' +
        '<button class="premium__arrow" type="button" data-dir="-1" aria-label="이전 프리미엄"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 4 7 12l8 8"/></svg></button>' +
        '<span class="premium__count" data-count></span>' +
        '<button class="premium__arrow" type="button" data-dir="1" aria-label="다음 프리미엄"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4l8 8-8 8"/></svg></button>' +
      '</div>';

    /* 항목마다 섹션 전체를 채우는 배경 레이어를 만듭니다. (호버 시 크로스페이드) */
    const bgWrap = sec.querySelector('[data-premium-bgs]');
    list.forEach(function (d, i) {
      const layer = document.createElement('div');
      layer.className = 'premium__bg media media--dark' + (i === 0 ? ' is-active' : '');
      /* 프리미엄 배경 이미지 : SITE_DATA.premium[].media.src 만 교체 */
      setMedia(layer, pickMedia(d, MK, d.title), d.title, 'PREMIUM ' + ('0' + (i + 1)).slice(-2) + ' 배경 이미지', { eager: true });
      bgWrap.appendChild(layer);
    });

    const listEl = sec.querySelector('.premium__list');
    list.forEach(function (d, i) {
      const hasLink = !!(d.link && String(d.link).trim());
      const el = document.createElement(hasLink ? 'a' : 'button');
      el.className = 'premium__item anim';
      el.style.setProperty('--anim-delay', (i * (ANIM.stagger || 150)) + 'ms');
      if (hasLink) { el.href = d.link; el.target = d.target || '_self'; if (el.target === '_blank') el.rel = 'noopener'; }
      else { el.type = 'button'; }
      el.innerHTML =
        '<span class="premium__num"><span class="premium__num-label">PREMIUM </span>' + ('0' + (i + 1)).slice(-2) + '</span>' +   /* 모바일은 번호만("01") 표시 */
        '<span class="premium__title">' + esc(d.title) + '</span>' +
        '<span class="premium__line" aria-hidden="true"></span>' +
        '<span class="premium__desc"><span>' + esc(d.description) + '</span></span>' +
        (hasLink ? '<span class="premium__more">' + esc(cfg.moreLabel || '자세히 보기') + '</span>' : '');
      listEl.appendChild(el);
    });
    /* 모바일 카드 덱 : 항목 이미지와 같은 파일 (siteContent.premiumItems[].media · premium-01~05.png) */
    const deckEl = sec.querySelector('.mobile-premium-deck');
    list.forEach(function (d, i) {
      const card = document.createElement('div'); card.className = 'mobile-premium-card';
      setMedia(card, pickMedia(d, MK, d.title), d.title, 'PREMIUM ' + ('0' + (i + 1)).slice(-2) + ' 카드 이미지', { eager: i < 2 });
      deckEl.appendChild(card);
    });
    afterMount.push(function () { initPremium(sec, list); });
    return sec;
  }

  function initPremium(sec, list) {
    const backgrounds = $$('.premium__bg', sec);
    const items = $$('.premium__item', sec);
    const countEl = sec.querySelector('[data-count]');
    const cards = $$('.mobile-premium-card', sec);
    const mqM = window.matchMedia ? window.matchMedia('(max-width: 767px)') : { matches: false };   /* 모바일 전용 동작(카드 덱 · 자동 전환 · 전환 잠금)의 기준 */
    let current = -1, lastSwitch = -1e9;

    /* 미리 로드 + 디코딩해 전환이 끊기지 않게 합니다. (레이어는 이미 만들어져 있고 class 만 바뀝니다) */
    list.forEach(function (d) {
      const info = SITE.resolveImage(pickMedia(d, MK, d.title));
      if (!info || !info.src) return;
      const im = new Image();
      im.src = info.src;
      if (im.decode) im.decode().catch(function () {});
    });

    /* 모바일 카드 덱 : 활성 카드가 가운데 · 맨 앞, 나머지는 좌우 뒤쪽에 부채처럼 겹침 (위치 · 회전 · 크기 · 투명도는 CSS 변수로 전달 → CSS transition 이 부드럽게 이동) */
    function layoutDeck(i) {
      const n = cards.length; if (!n) return;
      cards.forEach(function (card, k) {
        let pos = ((k - i) % n + n) % n; if (pos > n / 2) pos -= n;   /* -2 … 2 (활성 = 0) */
        const a = Math.abs(pos), s = pos < 0 ? -1 : 1;
        card.style.setProperty('--tx', (a === 0 ? 0 : s * (a === 1 ? 30 : 46)) + '%');   /* 1단계 30% · 2단계 46% (375px 에서도 화면 안) */
        card.style.setProperty('--ty', (a * 12) + 'px');
        card.style.setProperty('--rot', (pos * 5) + 'deg');
        card.style.setProperty('--sc', String(1 - a * 0.12));
        card.style.setProperty('--op', a === 0 ? '1' : '0.6');   /* 활성 1 · 비활성 0.6 (비활성은 CSS 에서 blur · 어둡게) */
        card.style.zIndex = String(10 - a);
        card.classList.toggle('is-active', a === 0);
      });
    }

    /* 섹션 전체 배경을 해당 항목 이미지로 교체 (카드 안이 아닙니다) · 모바일은 카드 덱 · 번호 · 제목 · 설명 · 카운트 동기화 */
    function activatePremium(index) {
      const i = (index + list.length) % list.length;
      if (i === current) return;                 /* 같은 항목 반복 호버 : 아무것도 갱신하지 않음 */
      if (mqM.matches && current >= 0 && performance.now() - lastSwitch < 700) return;   /* 모바일 : 전환 중(0.7s) 겹치는 입력 무시 → 자동 · 수동 전환 충돌 없음 */
      current = i; lastSwitch = performance.now();
      items.forEach(function (el, n) {
        el.classList.toggle('is-active', n === i);
        if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', n === i ? 'true' : 'false');
      });
      backgrounds.forEach(function (bg, n) { bg.classList.toggle('is-active', n === i); });
      if (countEl) countEl.textContent = ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + list.length).slice(-2);
      layoutDeck(i);
    }

    /* ---- 모바일 자동 전환 (참고 사이트와 같은 5초) : 섹션 진입 후 시작 · 화면 밖 · 탭 비활성 · 터치 중 정지 · 수동 조작 뒤 다시 시작 (PC 는 동작하지 않음) ---- */
    const AUTO_MS = 5000;
    let autoTimer = null, entered = false, inView = false;
    function autoStop() { clearTimeout(autoTimer); autoTimer = null; }
    function autoStart() {
      autoStop();
      if (!mqM.matches || !entered || !inView || document.hidden || prefersReduced) return;
      autoTimer = setTimeout(function () { activatePremium(current + 1); autoStart(); }, AUTO_MS);
    }

    items.forEach(function (el, i) {
      el.addEventListener('mouseenter', function () { if (!mqMobile.matches) activatePremium(i); });
      el.addEventListener('focusin', function () { activatePremium(i); });
      el.addEventListener('click', function (e) { if (el.tagName === 'BUTTON') e.preventDefault(); activatePremium(i); autoStart(); });
    });
    /* 마우스가 밖으로 나가도 마지막 활성 항목을 그대로 유지합니다. (타이머 없음 · PC) */

    $$('.premium__arrow', sec).forEach(function (btn) {
      btn.addEventListener('click', function () { activatePremium(current + Number(btn.getAttribute('data-dir'))); autoStart(); });
    });
    /* 터치 스와이프 : 텍스트 영역 · 카드 덱 모두 (가로만 · 세로 스크롤은 그대로) — 터치 중 자동 전환 정지, 손을 떼면 다시 시작 */
    function swipe(el) {
      if (!el) return;
      let sx = 0, sy = 0, moved = false;
      el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false; autoStop(); }, { passive: true });
      el.addEventListener('touchmove', function () { moved = true; }, { passive: true });
      el.addEventListener('touchend', function (e) {
        if (moved) {
          const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
          if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) activatePremium(current + (dx < 0 ? 1 : -1));
        }
        autoStart();
      }, { passive: true });
      el.addEventListener('touchcancel', function () { autoStart(); }, { passive: true });
    }
    const listEl = sec.querySelector('.premium__list');
    swipe(listEl); swipe(sec.querySelector('.mobile-premium-deck'));
    listEl.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault(); activatePremium(current + (e.key === 'ArrowRight' ? 1 : -1)); autoStart();
    });

    /* ---- 진입 시퀀스 : 섹션이 화면에 30% 이상 들어오면 1회만 is-visible (PREMIUM 5 → 제목 → 카드 5장 순차 → 첫 항목 번호 · 제목 · 설명 → 컨트롤)
            1.9s 뒤 is-settled(이후 전환은 순차 지연 없이) · 2.6s 뒤 자동 전환 시작. 다시 스크롤해도 초기화되지 않습니다. ---- */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          inView = en.isIntersecting && en.intersectionRatio > 0;
          if (!entered && en.isIntersecting && en.intersectionRatio >= 0.3) {
            entered = true; sec.classList.add('is-visible');
            setTimeout(function () { sec.classList.add('is-settled'); }, 1900);
            setTimeout(autoStart, 2600);
          } else if (entered) { if (inView) autoStart(); else autoStop(); }
        });
      }, { threshold: [0, 0.3] });
      io.observe(sec);
    } else { entered = true; inView = true; sec.classList.add('is-visible'); sec.classList.add('is-settled'); autoStart(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) autoStop(); else autoStart(); });
    const onMq = function () { if (mqM.matches) autoStart(); else autoStop(); };
    if (mqM.addEventListener) mqM.addEventListener('change', onMq); else if (mqM.addListener) mqM.addListener(onMq);

    activatePremium(0);
  }

  /* ---------- (3) 메인 3카드 : 입지환경 · 단지설계 · 하이퍼트 ----------
     · 항목은 siteContent.mainFeatureCards, 제목 · 설명 · 이미지는 각 상세 데이터(location · complexDesign · hypert)를 그대로 사용
     · PC 3열 · 모바일 한 장씩 자동 슬라이드(스와이프 후 자동재생 재시작)
     · 카드마다 번호 · 제목 · 설명 · 실제 <img> · 상세 소메뉴 링크 · 순차 등장 애니메이션 */
  function buildEnvironment() {
    const cfg = SITE_DATA.environmentSection;
    const cards = onlyOn(CONTENT.mainFeatureCards);
    if (!isOn(cfg) || !cards.length) return null;
    const stagger = 120;   /* 01 → 02 → 03 카드 시차 */

    const sec = document.createElement('section');
    sec.className = 'section env home-section'; sec.id = 'location';
    sec.setAttribute('data-header-theme', 'solid');
    sec.innerHTML =
      '<div class="section__inner">' +
        (cfg.eyebrow ? '<p class="section__eyebrow anim anim--fade">' + esc(cfg.eyebrow) + '</p>' : '') +
        '<h2 class="section__title anim" style="--anim-delay:120ms">' + esc(cfg.title || '') + '</h2>' +
        (cfg.desc ? '<p class="section__desc anim anim--fade" style="--anim-delay:260ms">' + esc(cfg.desc) + '</p>' : '') +
        '<div class="env__viewport"><div class="env__grid" data-env-track></div></div>' +
        '<div class="env__dots" data-env-dots aria-hidden="true"></div>' +
      '</div>';
    const grid = sec.querySelector('.env__grid');
    grid.style.setProperty('--env-count', cards.length);
    if (cfg.imageAspectRatio) grid.style.setProperty('--env-ratio', cfg.imageAspectRatio);
    if (cfg.imageGap) grid.style.setProperty('--env-media-gap', cfg.imageGap);
    if (cfg.cardGap) grid.style.setProperty('--env-gap', cfg.cardGap);

    cards.forEach(function (c, i) {
      const detail = CONTENT[c.key] || {};
      const title = c.title || detail.title || '';
      const desc = c.description || detail.summary || detail.description || '';
      const link = c.link || (c.page ? SITE_DATA.pageUrl(c.page) : '');
      const href = link ? SITE.normalizeUrl(link) : '';
      const base = i * stagger;
      const mediaCfg = pickMedia(c.media ? c : detail, ['media', 'cardImage', 'facade', 'map', 'visual'], title + ' 이미지');

      const card = document.createElement('article');
      card.className = 'env__card environment-card';
      card.setAttribute('data-key', c.key || '');
      card.innerHTML =
        '<span class="env__top environment-card__number anim anim--fade" style="--anim-delay:' + base + 'ms">' + esc(c.number || ('0' + (i + 1)).slice(-2)) + '</span>' +
        '<h3 class="env__title environment-card__title anim anim--fade" style="--anim-delay:' + (base + 60) + 'ms">' + esc(title) + '</h3>' +
        '<p class="env__desc environment-card__description anim" style="--anim-delay:' + (base + 120) + 'ms">' + esc(desc) + '</p>';

      /* 이미지 : 실제 <a href="상세 페이지"><img></a> — 이미지 경로는 siteContent.<key>.cardImage 한 곳 */
      const mediaBox = document.createElement(href ? 'a' : 'div');
      mediaBox.className = 'env__media environment-card__image-link media anim anim--env' + (href ? ' content-image-link' : ' content-image-wrap');
      mediaBox.style.setProperty('--anim-delay', (base + 200) + 'ms');
      /* 카드별 이미지 래퍼 클래스 : 세 박스 모두 같은 크기의 각진 사각형 (style.css [26]) */
      mediaBox.classList.add(c.key === 'location' ? 'location-card-image' : c.key === 'complexDesign' ? 'complex-design-image-wrap' : c.key === 'hypert' ? 'hypert-card-image' : 'feature-card-image');
      if (href) { mediaBox.href = href; mediaBox.setAttribute('aria-label', title + ' 자세히 보기'); }
      setMedia(mediaBox, mediaCfg, title + ' 이미지', title + ' 카드 이미지');
      const img = mediaBox.querySelector('.media__img');
      if (img) img.classList.add('environment-card__image');
      const shade = document.createElement('span'); shade.className = 'env__shade'; shade.setAttribute('aria-hidden', 'true');
      mediaBox.appendChild(shade);
      card.appendChild(mediaBox);

      const more = document.createElement('a');
      more.className = 'env__more environment-card__link anim anim--fade';
      more.style.setProperty('--anim-delay', (base + 280) + 'ms');
      more.href = href || '#';
      more.innerHTML = esc(cfg.moreLabel || '자세히 보기') + '<i class="env__arrow" aria-hidden="true"></i>';
      card.appendChild(more);
      grid.appendChild(card);
    });
    afterMount.push(function () { initFeatureSlider(sec, cards.length, cfg); });
    return sec;
  }

  /* 모바일(767px 이하) : 카드 한 장씩 자동 슬라이드 · 스와이프 · 점. PC 는 3열 grid 그대로 */
  function initFeatureSlider(sec, count, cfg) {
    const track = sec.querySelector('[data-env-track]');
    const dotsEl = sec.querySelector('[data-env-dots]');
    const INTERVAL = cfg.autoplayInterval || 5000, RESUME = (cfg.resumeDelay != null) ? cfg.resumeDelay : 0;
    let index = 0, timer = null, resumeTimer = null, active = false;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('button'); d.type = 'button'; d.className = 'env__dot'; d.setAttribute('aria-label', (i + 1) + '번째 카드');
      d.addEventListener('click', function () { go(i); pause(); });
      dotsEl.appendChild(d);
    }
    function paint() {
      track.style.transform = active ? 'translate3d(' + (-index * 100) + '%,0,0)' : '';
      $$('.env__dot', dotsEl).forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
    }
    function go(i) { index = ((i % count) + count) % count; paint(); }
    function stop() { clearInterval(timer); timer = null; clearTimeout(resumeTimer); }
    function start() {
      stop();
      active = mqMobile.matches && count > 1 && !prefersReduced;
      if (!active) { paint(); return; }
      paint();
      timer = setInterval(function () { if (!document.hidden) go(index + 1); }, INTERVAL);
    }
    /* 스와이프 등 사용자 조작 후 자동재생이 자연스럽게 다시 시작 */
    function pause() { clearInterval(timer); timer = null; clearTimeout(resumeTimer); resumeTimer = setTimeout(start, RESUME); }
    let sx = 0, sy = 0, dragging = false;
    track.addEventListener('touchstart', function (e) { if (!active) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; dragging = true; clearInterval(timer); timer = null; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (!active || !dragging) return; dragging = false;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) >= 36 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
      pause();
    }, { passive: true });
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', start);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { clearInterval(timer); timer = null; } else if (active) start(); });
    start();
  }

  /* ---------- (4) 타입안내 : 115㎡A · 114㎡B · 203㎡AD (3카드) ----------
     · 카드 = 타입명 → 버튼(평면타입 · e모델하우스 : 세 카드 동일 2개) → 실제 <img> 세로 평면 이미지
     · 타입 목록은 unitSection.mainTypes (id 로 siteContent.unitTypes 의 이미지를 그대로 사용 · 중복 저장 없음)
     · PC 는 3장이 동시에 보이고, 모바일은 카드 디자인 그대로 1장씩 자동 슬라이드 + 스와이프 */
  function buildType() {
    const cfg = SITE_DATA.unitSection;
    const all = onlyOn(CONTENT.unitTypes);
    const picks = (cfg && cfg.mainTypes && cfg.mainTypes.length) ? onlyOn(cfg.mainTypes) : all.slice(0, 3).map(function (u) { return { id: u.id, buttons: ['floorPlan', 'interior', 'modelHouse'] }; });
    const list = picks.map(function (m) {
      const u = all.filter(function (x) { return x.id === m.id; })[0];
      return u ? Object.assign({}, u, { buttons: m.buttons || [] }) : null;
    }).filter(Boolean);
    if (!isOn(cfg) || !list.length) return null;
    const labels = cfg.linkLabels || { floorPlan: '평면타입', modelHouse: 'e모델하우스' };
    const linkTpl = cfg.links || {};

    const sec = document.createElement('section');
    sec.className = 'type home-section'; sec.id = 'type';
    sec.setAttribute('data-header-theme', 'overlay');
    sec.innerHTML =
      '<div class="type__bg media media--dark" data-media="typebg" data-parallax="0.05"></div>' +
      '<div class="type__overlay"></div>' +
      '<div class="type__inner">' +
        '<div class="type__head">' +
          (cfg.eyebrow ? '<p class="section__eyebrow anim">' + esc(cfg.eyebrow) + '</p>' : '') +
          '<h2 class="section__title anim">' + esc(cfg.title || '타입안내') + '</h2>' +
        '</div>' +
        '<div class="type__viewport anim" tabindex="0" role="group" aria-label="타입 목록 (좌우 방향키 · 스와이프로 이동)"><div class="type__track"></div></div>' +
        '<div class="type__controls">' +
          '<button class="type__arrow" data-type-prev type="button" aria-label="이전 타입 보기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 4 7 12l8 8"/></svg></button>' +
          '<span class="type__dots" data-type-dots></span>' +
          '<button class="type__arrow" data-type-next type="button" aria-label="다음 타입 보기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4l8 8-8 8"/></svg></button>' +
        '</div>' +
      '</div>';
    setMedia(sec.querySelector('[data-media="typebg"]'), pickMedia(cfg, MK, '타입안내 배경'), '타입안내 배경', '타입안내 배경 이미지', { eager: true });

    const cards = list.map(function (d) {
      const card = document.createElement('article');
      card.className = 'type__card'; card.setAttribute('data-type', d.id || '');
      let btns = '', count = 0;
      (d.buttons || []).forEach(function (key) {
        const tpl = linkTpl[key]; if (!tpl || !String(tpl).trim()) return;
        /* {id} → 타입 ID · {modelHouseUrl} → 타입별 E-모델하우스 주소 (unitTypes[].modelHouseUrl, 타입마다 개별 저장) */
        let url = String(tpl).split('{id}').join(encodeURIComponent(d.id || ''));
        if (url.indexOf('{modelHouseUrl}') > -1) { if (!d.modelHouseUrl) return; url = url.split('{modelHouseUrl}').join(d.modelHouseUrl); }
        const t = /^https?:\/\//i.test(url) ? '_blank' : '_self';
        count++;
        btns += '<a class="type__link" href="' + esc(url) + '" target="' + t + '"' + (t === '_blank' ? ' rel="noopener noreferrer"' : '') + '>' + esc(labels[key] || key) + '</a>';
      });
      card.__buttonCount = count;
      card.innerHTML =
        '<h3 class="type__name">' + esc(d.title || d.type || '') + '</h3>' +
        '<div class="type__links">' + btns + '</div>' +
        '<div class="type__media media media--dark"></div>';   /* 이미지 교체 : siteContent.unitTypes[].cardImage (351×468 · 없으면 image) · PC · 모바일 공통 */
      const box = card.querySelector('.type__media');
      box.style.setProperty('--type-image-ratio', cfg.imageRatio || '3 / 4');
      box.style.setProperty('--type-image-fit', cfg.imageFit || 'contain');
      const alt = d.alt || ((d.title || '') + ' 타입');
      const cardSrc = d.cardImage || d.image, cardAlt = d.cardImage ? (d.cardAlt || alt) : alt;   /* 카드 전용 이미지(351×468)가 있으면 우선 · 평면정보 페이지는 image(고해상) */
      setMedia(box, { enabled: true, src: cardSrc, mobileSrc: '', alt: cardAlt, objectFit: cfg.imageFit || 'contain', objectPosition: 'center center' }, cardAlt, (d.title || '') + ' 타입 이미지');
      return card;
    });
    afterMount.push(function () { initTypePager(sec, cards, cfg); });
    return sec;
  }

  function initTypePager(sec, cards, cfg) {
    const track = sec.querySelector('.type__track');
    const viewport = sec.querySelector('.type__viewport');
    const prevBtn = sec.querySelector('[data-type-prev]');
    const nextBtn = sec.querySelector('[data-type-next]');
    const controls = sec.querySelector('.type__controls');
    const dotsEl = sec.querySelector('[data-type-dots]');
    const perViewPc = Math.max(1, Number(cfg.perView) || 3);
    const INTERVAL = cfg.autoplayInterval || 5000;
    const RESUME = (cfg.resumeDelay != null) ? cfg.resumeDelay : 0;
    let page = 0, perView = 0, pages = 1;

    if (sec.__typeAutoplay) sec.__typeAutoplay.stop();
    const auto = {
      timer: null, paused: false, resumeTimer: null,
      start: function () {
        this.stop();
        if (pages <= 1 || prefersReduced || cfg.autoplay === false) return;
        const self = this;
        this.timer = setInterval(function () { if (!self.paused && !document.hidden) go(page + 1); }, INTERVAL);
      },
      stop: function () { clearInterval(this.timer); this.timer = null; clearTimeout(this.resumeTimer); }
    };
    sec.__typeAutoplay = auto;

    function build() {
      const w = window.innerWidth;
      const next = w >= 1024 ? perViewPc : (w >= 768 ? Math.min(2, perViewPc) : 1);
      if (next === perView && track.children.length) { apply(); return; }
      perView = next;
      pages = Math.ceil(cards.length / perView);
      track.innerHTML = '';
      for (let p = 0; p < pages; p++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'type__page';
        pageEl.style.setProperty('--type-visible', perView);
        const pageCards = cards.slice(p * perView, p * perView + perView);
        /* 같은 화면의 카드 중 버튼이 가장 많은 개수 기준으로 버튼 영역 높이를 맞춰 이미지 상단 기준선을 통일 */
        const maxButtonCount = Math.max.apply(null, pageCards.map(function (c) { return c.__buttonCount || 0; }).concat([0]));
        const btnH = 42, btnGap = 8, topGap = 20;
        pageEl.style.setProperty('--type-buttons-height', (maxButtonCount > 0 ? (topGap + maxButtonCount * btnH + (maxButtonCount - 1) * btnGap) : 0) + 'px');
        pageCards.forEach(function (c, ci) {
          c.style.setProperty('--anim-delay', (ci * (ANIM.stagger || 120)) + 'ms');
          c.classList.add('anim');
          pageEl.appendChild(c);
        });
        track.appendChild(pageEl);
      }
      if (window.SITE && SITE.initAnimations) SITE.initAnimations();
      dotsEl.innerHTML = '';
      for (let p = 0; p < pages; p++) {
        const dot = document.createElement('button');
        dot.type = 'button'; dot.className = 'type__dot';
        dot.setAttribute('aria-label', (p + 1) + '번째 타입 보기');
        dot.addEventListener('click', function () { userGo(p); });
        dotsEl.appendChild(dot);
      }
      controls.classList.toggle('is-hidden', pages <= 1);
      if (page > pages - 1) page = pages - 1;
      apply();
      auto.start();
    }
    function apply() {
      track.style.transform = 'translate3d(' + (-page * 100) + '%,0,0)';
      $$('.type__dot', dotsEl).forEach(function (d, i) { d.classList.toggle('is-active', i === page); });
    }
    function go(p) { page = ((p % pages) + pages) % pages; apply(); }
    /* 사용자가 직접 조작하면 즉시 이동 후 자동재생을 다시 시작 */
    function userGo(p) { go(p); auto.stop(); auto.resumeTimer = setTimeout(function () { auto.paused = false; auto.start(); }, RESUME); }

    prevBtn.addEventListener('click', function () { userGo(page - 1); });
    nextBtn.addEventListener('click', function () { userGo(page + 1); });
    viewport.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); userGo(page + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); userGo(page - 1); }
    });
    [viewport, controls].forEach(function (zone) {
      zone.addEventListener('mouseenter', function () { auto.paused = true; });
      zone.addEventListener('mouseleave', function () { auto.paused = false; });
      zone.addEventListener('focusin', function () { auto.paused = true; });
      zone.addEventListener('focusout', function () { auto.paused = false; });
    });
    let sx = 0, sy = 0, moved = false;
    viewport.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false; auto.paused = true; }, { passive: true });
    viewport.addEventListener('touchmove', function () { moved = true; }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      auto.paused = false;
      if (!moved) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
      userGo(page + (dx < 0 ? 1 : -1));
    }, { passive: true });
    if (!sec.__typeVisibilityBound) {
      sec.__typeVisibilityBound = true;
      document.addEventListener('visibilitychange', function () { const a = sec.__typeAutoplay; if (!a) return; if (document.hidden) a.stop(); else a.start(); });
    }
    build();
    let resizeTimer = null;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 150); });
  }

  /* ---------- (5) 방문예약 ---------- */
  function buildReserve() {
    const cfg = SITE_DATA.reserve;
    if (!isOn(cfg)) return null;
    const descLines = String(cfg.desc || '').split(/\n+/).filter(function (t) { return t.trim(); });

    const sec = document.createElement('section');
    sec.className = 'section reserve home-section';
    sec.id = 'visit-reservation';  /* 헤더 · 모바일 메뉴 · 퀵메뉴 · 버튼이 #visit-reservation 으로 연결됩니다 (소메뉴는 ./index.html#visit-reservation) */
    sec.setAttribute('data-header-theme', 'solid');
    sec.innerHTML =
      '<div class="section__inner reserve__inner reservation-inner">' +
        '<h2 class="section__title anim" style="--anim-delay:0ms">' + esc(cfg.title || '방문예약') + '</h2>' +
        (descLines.length ? '<p class="reserve__desc anim anim--fade" style="--anim-delay:100ms">' + descLines.map(esc).join('<br>') + '</p>' : '') +
        '<div class="reserve__slot anim" style="--anim-delay:200ms"></div>' +
      '</div>';
    sec.querySelector('.reserve__slot').appendChild(SITE.createReserveForm(cfg));
    return sec;
  }

  /* ---------- 섹션 마운트 ---------- */
  const BUILDERS = {
    mainVisual: buildHeroStage,
    summaryMobile: buildSummaryMobile,
    premium: buildPremium,
    environment: buildEnvironment,
    type: buildType,
    reserve: buildReserve
  };
  onlyOn(SITE_DATA.sections).forEach(function (s) {
    const build = BUILDERS[s.id];
    if (!build) return;
    const el = build();
    if (el) mount.appendChild(el);
  });
  afterMount.forEach(function (fn) { fn(); });

  /* 퀵메뉴의 섹션 이동 링크를 다시 연결 (섹션 생성 이후) */
  SITE.renderQuickMenu('#quickMenu');
  SITE.initPageEffects();

})();
