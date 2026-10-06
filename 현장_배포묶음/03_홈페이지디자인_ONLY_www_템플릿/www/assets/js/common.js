/* =========================================================================
   common.js : 모든 페이지가 공통으로 사용하는 기능
   ------------------------------------------------------------------------
   · 테마(컬러·폰트) 적용        · 공통 헤더 / 메가메뉴 / 모바일 메뉴
   · 좌측 가로형 팝업            · 우측 퀵메뉴
   · 공통 푸터 / 이미지 모달 / 상단 이동 버튼
   · 헤더 컬러 자동 전환(overlay ↔ solid)
   · 스크롤 등장 애니메이션      · 방문예약 폼 생성기
   index.html 과 subpage.html 모두 이 파일을 불러옵니다.
   ========================================================================= */
window.SITE = (function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mqMobile = window.matchMedia ? window.matchMedia('(max-width:767px)')  : { matches: false };
  const mqTablet = window.matchMedia ? window.matchMedia('(max-width:1023px)') : { matches: false };
  const isOn   = (o) => !!o && o.enabled !== false;
  const onlyOn = (a) => (a || []).filter(isOn);
  const clamp  = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc    = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ANIM = SITE_DATA.animation || {};

  /* 현재 페이지 정보 : index.html 인지, 서브페이지라면 어떤 page 인지 */
  const params = new URLSearchParams(window.location.search);
  const hashPage = (window.location.hash.match(/^#page=([\w-]+)/) || [])[1] || '';
  /* 단일 파일(전체 통합 HTML)로 열었을 때 true */
  const singleFile = !!window.SINGLE_FILE;
  const HOME = singleFile ? '#' : 'index.html';
  const bodyPage = (document.body && document.body.getAttribute('data-page')) ||
                   (hashPage ? 'subpage' : (/subpage\.html/i.test(window.location.pathname) ? 'subpage' : 'index'));
  const isIndex = bodyPage === 'index';
  /* 대표번호 단일 소스 (site.tel) → tel: 링크 · 접근성 문구 (PC 헤더 · 모바일 아이콘 · 모바일 메뉴 · 푸터 · 소메뉴 CTA 공통 · SITE.telHref / SITE.telAria 로 공개) */
  const SITE_TEL = (SITE_DATA.site && SITE_DATA.site.tel) || '';
  const TEL_HREF = 'tel:' + SITE_TEL.replace(/[^0-9+]/g, '');
  const TEL_ARIA = '대표번호 ' + SITE_TEL + '으로 전화하기';
  /* 문자 문의 번호(site.smsTel · 없으면 대표번호) · 카카오톡 상담 링크(site.kakaoUrl) — 퀵메뉴 · 버튼의 "문자 보내기 / 카카오톡 상담" 이 참조 */
  const SITE_SMS = (SITE_DATA.site && SITE_DATA.site.smsTel) || SITE_TEL;
  const SMS_HREF = 'sms:' + String(SITE_SMS).replace(/[^0-9+]/g, '');
  const KAKAO_URL = (SITE_DATA.site && SITE_DATA.site.kakaoUrl) || '';
  /* 문구 안의 사이트 공통값 토큰 : {대표번호} {사이트명} {현장명} {이메일} {상담시간} {주소} — 페이지 본문에 번호를 직접 적지 않고 토큰으로 두면 사이트 설정의 값이 표시됩니다 (숫자를 찾아 바꾸는 방식이 아님) */
  function siteTokens() { const s = SITE_DATA.site || {}; return { '대표번호': SITE_TEL, '사이트명': s.name || '', '현장명': s.fieldName || '', '이메일': s.email || '', '상담시간': s.consultHours || '', '주소': s.address || '' }; }
  function fillTokens(text) { const map = siteTokens(); return String(text == null ? '' : text).replace(/\{(대표번호|사이트명|현장명|이메일|상담시간|주소)\}/g, function (m, k) { return map[k] != null ? map[k] : m; }); }
  /* 화면에 그려진 뒤 호출 : ① 글자 속 토큰 채우기 ② "사이트 대표번호 사용" 링크(tel: 만 있는 링크 · tel:site)에 실제 번호 연결 ③ sms:site · #kakao 연결 */
  function bindSiteValues(root) {
    root = root || document.body; if (!root) return;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return /\{(대표번호|사이트명|현장명|이메일|상담시간|주소)\}/.test(n.nodeValue) && !(n.parentNode && n.parentNode.closest && n.parentNode.closest('script,style,textarea,[contenteditable="true"]')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; } });
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) { n.nodeValue = fillTokens(n.nodeValue); });
    } catch (err) {}
    $$('a[href]', root).forEach(function (a) {
      const h = a.getAttribute('href') || '';
      if (/^tel:(site|\{대표번호\})?$/i.test(h)) { if (SITE_TEL) { a.setAttribute('href', TEL_HREF); if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', TEL_ARIA); a.setAttribute('data-site-tel', '1'); } }
      else if (/^sms:(site)?$/i.test(h)) { if (SITE_SMS) { a.setAttribute('href', SMS_HREF); a.setAttribute('data-site-sms', '1'); } }
      else if (/^#kakao$/i.test(h)) { if (KAKAO_URL) { a.setAttribute('href', KAKAO_URL); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); a.setAttribute('data-site-kakao', '1'); } else a.hidden = true; }
    });
  }
  /* 전화 라인 아이콘(SVG · 선 1.6 · currentColor) : PC 헤더 번호 앞 18px · 모바일 헤더 22px — PNG 대신 벡터라 어떤 배율에서도 선명 */
  const PHONE_SVG = '<svg class="tel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5.3 3.6h3.1l1.6 3.9-2 1.4a11.6 11.6 0 0 0 5.1 5.1l1.4-2 3.9 1.6v3.1a1.8 1.8 0 0 1-1.9 1.8A15.6 15.6 0 0 1 3.5 5.5a1.8 1.8 0 0 1 1.8-1.9z"/></svg>';
  /* 투명 헤더 사용 여부 (단일 기준) : 사이트 공통 헤더 설정 + 페이지별 "이 페이지에서 투명 헤더 사용" — 게시 데이터(cms.js)가 SITE_DATA.headerMode 로 전달.
     false 면 첫 화면이 이미지여도 항상 흰 헤더 · 값이 없으면(관리자 미연결) 투명 헤더 사용 */
  function headerTransparent() { return !(SITE_DATA.headerMode && SITE_DATA.headerMode.transparent === false); }
  const rawPage = isIndex ? 'index' : (params.get('page') || hashPage || '');
  const currentPage = (SITE_DATA.pageAliases && SITE_DATA.pageAliases[rawPage]) || rawPage;   /* 예전 ID 호환 (interior → hypert) */

  /* ---------------------------------------------------------------
     테마 적용 (SITE_DATA.theme → CSS 변수)
     --------------------------------------------------------------- */
  (function applyTheme() {
    const t = SITE_DATA.theme || {};
    const root = document.documentElement;
    if (t.fonts) {
      if (t.fonts.display) root.style.setProperty('--font-display', t.fonts.display);
      if (t.fonts.body) root.style.setProperty('--font-body', t.fonts.body);
    }
    [t.colors, t.typography, t.layout].forEach(function (group) {
      if (!group) return;
      Object.keys(group).forEach(function (k) {
        root.style.setProperty(k.indexOf('--') === 0 ? k : '--' + k, group[k]);
      });
    });
    root.style.setProperty('--animation-duration', (ANIM.duration || 1000) + 'ms');
    root.style.setProperty('--animation-delay-step', (ANIM.stagger || 140) + 'ms');
    /* 모바일(767px 이하) 헤더 높이 : layout["--header-height-mobile"] 이 있으면 화면 폭에 따라 --header-height 를 바꿉니다 (없으면 PC 값 그대로) */
    const layout = t.layout || {};
    const mobileHeader = layout['--header-height-mobile'];
    if (mobileHeader && window.matchMedia) {
      const mq = window.matchMedia('(max-width:767px)');
      const applyHeaderHeight = function () { root.style.setProperty('--header-height', mq.matches ? mobileHeader : (layout['--header-height'] || '92px')); };
      applyHeaderHeight();
      if (mq.addEventListener) mq.addEventListener('change', applyHeaderHeight); else if (mq.addListener) mq.addListener(applyHeaderHeight);
    }
  })();

  /* ---------------------------------------------------------------
     [공통 이미지 시스템] createLinkedImage
     ---------------------------------------------------------------
     사이트의 모든 이미지는 아래 한 가지 데이터 형식과 한 가지 함수로 만듭니다.
       media: {
         enabled: true,
         src: "./assets/images/a.jpg",      // 이미지 (assets/images/ 한 곳 · alt 는 파일명과 동일)
         mobileSrc: "assets/images/a-m.jpg",// 모바일(767px 이하) 전용 이미지 (없으면 src)
         alt: "이미지 설명",
         href: "",                          // 클릭 시 이동 주소 (비우면 링크 없음)
         target: "_self",                   // _blank 이면 rel="noopener" 자동
         ratio: "4 / 3",                    // 이미지 영역 비율
         objectFit: "cover",                // cover | contain
         objectPosition: "center center"    // 잘릴 때 초점
       }
     · 생성되는 DOM :
         <a|div class="editable-image"><picture><source media="(max-width:767px)"><img src alt></picture></a|div>
       → 개발자도구에서 img 의 src 만 바꾸면 즉시 교체됩니다.
     · src 가 비었거나 로딩에 실패해도 임시 이미지로 바꾸지 않고 영역(비율)만 유지합니다. (같은 이름의 파일을 올리면 바로 표시)
     · enabled:false 로 명시했을 때만 영역과 여백이 함께 사라집니다.
     · 문자열("assets/images/a.jpg")과 예전 표기(image / mobileImage / position)도 그대로 지원합니다.
     --------------------------------------------------------------- */
  const IMG_SET = SITE_DATA.imageSettings || {};
  const FALLBACK_IMAGE = '';   /* 임시 이미지(placeholder) 를 사용하지 않습니다 : 파일이 없으면 영역(비율)만 유지 */
  /* 파일명 (alt 는 항상 src 의 파일명과 같게 : 파일질라에서 같은 이름으로 덮어쓰기) */
  function fileNameOf(src) { const m = String(src || '').split('?')[0].split('#')[0].match(/([^\/]+)$/); return m ? m[1] : ''; }

  /* 기본 media 값 : 데이터에 media 가 없어도 항상 실제 <img> 가 생성되도록 사용합니다. */
  function defaultMedia(alt, ratio) {
    return {
      enabled: true,
      src: FALLBACK_IMAGE,
      mobileSrc: '',
      alt: alt || '이미지',
      href: '',
      target: '_self',
      ratio: ratio || '4 / 3',
      objectFit: IMG_SET.defaultObjectFit || 'cover',
      objectPosition: IMG_SET.defaultObjectPosition || 'center center'
    };
  }

  /* 객체에서 이미지 설정을 찾습니다. keys 순서대로(기본 media → 예전 키) 찾고,
     하나도 없으면 기본 placeholder 설정을 만들어 돌려줍니다.
     enabled:false 로 명시된 경우에만 null 을 돌려줍니다. (영역 + 여백 제거) */
  function pickMedia(obj, keys, alt, ratio) {
    keys = keys || ['media'];
    if (obj) {
      for (let i = 0; i < keys.length; i++) {
        const v = obj[keys[i]];
        if (v == null || v === '') continue;
        if (typeof v === 'string') return Object.assign(defaultMedia(alt, ratio), { src: v });
        if (typeof v === 'object') {
          if (v.enabled === false) return null;
          const out = Object.assign(defaultMedia(alt, ratio), v);
          out.enabled = true;
          out.src = String(v.src || v.image || '').trim() || FALLBACK_IMAGE;
          out.mobileSrc = String(v.mobileSrc || v.mobileImage || '').trim();
          out.alt = v.alt || alt || out.alt;
          out.ratio = v.ratio || ratio || '';
          out.objectPosition = v.objectPosition || v.position || out.objectPosition;
          return out;
        }
      }
    }
    return defaultMedia(alt, ratio);
  }

  function normalizeImage(cfg, defaults) {
    defaults = defaults || {};
    if (cfg == null || cfg === '') return null;
    if (typeof cfg === 'string') cfg = { src: cfg };
    if (typeof cfg !== 'object') return null;
    if (cfg.enabled === false) return null;
    return {
      src: String(cfg.src || cfg.image || '').trim() || FALLBACK_IMAGE,
      mobileSrc: String(cfg.mobileSrc || cfg.mobileImage || '').trim(),
      alt: fileNameOf(String(cfg.src || cfg.image || '').trim()) || cfg.alt || defaults.alt || '',   /* alt = 파일명 */
      ratio: cfg.ratio || defaults.ratio || '',
      objectFit: cfg.objectFit || IMG_SET.defaultObjectFit || 'cover',
      objectPosition: cfg.objectPosition || cfg.position || IMG_SET.defaultObjectPosition || 'center center',
      href: String(cfg.href || '').trim(),
      target: cfg.target || '_self',
      eager: !!(cfg.eager || defaults.eager)
    };
  }
  function resolveImage(cfg) {
    const info = normalizeImage(cfg);
    return info ? { src: info.src, mobileSrc: info.mobileSrc, alt: info.alt, position: info.objectPosition } : null;
  }

  /* <picture><source(모바일)><img></picture> 를 만듭니다. (모든 이미지가 이 한 곳을 거칩니다) */
  function buildPicture(info, label, onLoaded) {
    const frag = document.createDocumentFragment();
    /* HTML 소스에서 이미지 주소를 바로 찾을 수 있도록 주석을 함께 넣습니다. */
    frag.appendChild(document.createComment(' ' + (label || info.alt || '이미지') + ' : 아래 img 의 src 만 교체 '));
    const picture = document.createElement('picture');
    picture.className = 'editable-image__picture';
    if (info.mobileSrc) {
      const source = document.createElement('source');
      source.media = '(max-width: 767px)';
      source.srcset = info.mobileSrc;
      picture.appendChild(source);
    }
    const img = document.createElement('img');
    img.className = 'media__img content-image editable-image__img';
    img.alt = info.alt || '';
    img.loading = info.eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.style.objectFit = info.objectFit || 'cover';
    img.style.objectPosition = info.objectPosition || 'center center';
    img.addEventListener('load', function () {
      img.classList.add('is-loaded');
      if (onLoaded) onLoaded();
    });
    /* 로딩 실패 → 이미지를 바꾸지 않고 is-missing 만 표시 (태그 · src · 영역 · 비율은 그대로 : 같은 이름의 파일을 올리면 바로 표시됨) */
    img.addEventListener('error', function () { img.classList.add('is-missing'); });
    picture.appendChild(img);
    /* src 는 <picture> 안에 넣은 뒤 지정 : 모바일에서는 <source> 가 먼저 선택되어 PC 이미지(hero.png 등)를 추가로 받지 않습니다. */
    if (info.src) img.src = info.src; else img.classList.add('is-missing');
    frag.appendChild(picture);
    return { frag: frag, picture: picture, img: img };
  }

  /* 실제 <img> 와 이미지 링크를 만드는 공통 함수 (모든 페이지 렌더러가 이 함수를 호출합니다)
       media      : 위 형식의 이미지 설정 (없으면 placeholder 로 생성)
       defaultAlt : alt 가 비었을 때 사용할 설명
       options    : { className, ratio, label, eager }
     반환 : <a|div class="editable-image"> 요소 · enabled:false 일 때만 null */
  function createLinkedImage(media, defaultAlt, options) {
    options = options || {};
    const config = (media == null || media === '') ? defaultMedia(defaultAlt, options.ratio) : media;
    const info = normalizeImage(config, { alt: defaultAlt, ratio: options.ratio, eager: options.eager });
    if (!info) return null;

    const wrapper = document.createElement(info.href ? 'a' : 'div');
    wrapper.className = 'editable-image media' +
      (info.href ? ' content-image-link' : ' content-image-wrap') +
      (options.className ? ' ' + options.className : '');
    if (info.href) {
      wrapper.href = normalizeUrl(info.href);
      wrapper.target = info.target || '_self';
      if (wrapper.target === '_blank') wrapper.rel = 'noopener noreferrer';
    }
    wrapper.style.aspectRatio = info.ratio || options.ratio || '4 / 3';
    const built = buildPicture(info, options.label, function () { wrapper.classList.add('is-loaded'); });
    wrapper.appendChild(built.frag);
    wrapper.__mediaCfg = config;
    return wrapper;
  }

  /* 이미 있는 박스(.media) 안에 실제 <img> 를 넣습니다. (배경형 이미지 : 조감도 · 프리미엄 · 타입 배경 · 팝업 · 모달 등)
     enabled:false 여도 placeholder 를 넣습니다. 영역을 없애려면 호출하는 쪽에서 박스를 제거합니다. */
  function setMedia(box, cfg, altFallback, label, options) {
    if (!box) return;
    options = options || {};
    const info = normalizeImage(cfg, { alt: altFallback, eager: options.eager }) ||
                 normalizeImage(defaultMedia(altFallback), { eager: options.eager });
    box.classList.add('media', 'editable-image');
    box.classList.remove('is-loaded');
    Array.prototype.slice.call(box.childNodes).forEach(function (n) {
      if (n.nodeType === 8 || (n.nodeType === 1 && (n.tagName === 'PICTURE' || n.classList.contains('media__img')))) n.remove();
    });
    box.__mediaCfg = cfg; box.__mediaAlt = altFallback; box.__mediaLabel = label; box.__mediaOpts = options;
    if (info.alt) box.setAttribute('data-image', info.alt);
    if (info.ratio) box.style.aspectRatio = info.ratio;
    const built = buildPicture(info, label, function () { box.classList.add('is-loaded'); });
    if (options.imgClass) built.img.classList.add(options.imgClass);           /* 필요 시 img 에 추가할 클래스 */
    if (options.pictureClass) built.picture.classList.add(options.pictureClass); /* 필요 시 picture 에 추가할 클래스 */
    box.insertBefore(built.frag, box.firstChild);
  }

  /* createImage(cfg, { className, ratio, alt, label }) : createLinkedImage 의 예전 이름 (하위 호환) */
  function createImage(cfg, options) {
    options = options || {};
    return createLinkedImage(cfg, options.alt, options);
  }

  /* 창 크기 변경 시 배경형 이미지만 다시 그립니다. (일반 이미지는 <picture> 가 모바일 전환을 처리) */
  function refreshMedia() {
    $$('.media').forEach(function (b) {
      /* static:true (배경 이미지) 는 다시 만들지 않습니다 : <picture> 가 PC/모바일 전환을 처리합니다 */
      if (b.__mediaOpts && b.__mediaOpts.static) return;
      if (b.__mediaCfg && !b.classList.contains('content-image-wrap') && !b.classList.contains('content-image-link')) setMedia(b, b.__mediaCfg, b.__mediaAlt, b.__mediaLabel, b.__mediaOpts);
    });
  }

  /* 전역에서도 바로 쓸 수 있게 노출합니다. */
  window.createLinkedImage = createLinkedImage;

  /* ---------------------------------------------------------------
     공통 도우미
     --------------------------------------------------------------- */
  function headerHeight() {
    const el = document.getElementById('header');
    if (el && el.offsetHeight) return el.offsetHeight;
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 92;
  }
  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    /* 메인페이지에서는 원스크롤 이동 함수를 그대로 사용합니다. */
    if (window.__homeScrollTo && window.__homeScrollTo(id)) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - (headerHeight() - 1);
    window.scrollTo({ top: Math.max(top, 0), behavior: prefersReduced ? 'auto' : 'smooth' });
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  /* 배경 스크롤 잠금 — 세로 스크롤바가 사라지면서 화면 폭이 달라져 헤더 · 조감도 · 퀵메뉴가 좌우로 밀리던 문제 해결
     ① CSS html{scrollbar-gutter:stable} : 지원 브라우저는 스크롤바 자리를 항상 유지 → 보정 불필요
     ② 미지원 브라우저 : 잠그는 순간 사라질 스크롤바 폭(innerWidth − clientWidth)만큼 body padding-right + 고정 요소용 --lock-gap 을 주고, 풀 때 원래 인라인 값을 그대로 복원
     잠금은 횟수로 관리(팝업 · 모달 · 모바일 메뉴가 겹쳐도 처음 1회만 적용 · 마지막에 1회만 해제) → 보정값이 누적되지 않음 · overflow 만 바꾸므로 세로 스크롤 위치는 그대로 */
  let lockCount = 0, lockSaved = null;
  function lockScroll(on) {
    const before = lockCount;
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    if (before === 0 && lockCount > 0) {
      const root = document.documentElement;
      const stable = /stable/.test(getComputedStyle(root).scrollbarGutter || '');
      const gap = stable ? 0 : Math.max(0, window.innerWidth - root.clientWidth);
      lockSaved = { paddingRight: document.body.style.paddingRight };
      if (gap > 0) {
        document.body.style.paddingRight = ((parseFloat(getComputedStyle(document.body).paddingRight) || 0) + gap) + 'px';
        root.style.setProperty('--lock-gap', gap + 'px');
      }
      document.body.classList.add('is-locked'); root.classList.add('is-scroll-locked');
    } else if (before > 0 && lockCount === 0) {
      document.body.classList.remove('is-locked'); document.documentElement.classList.remove('is-scroll-locked');
      if (lockSaved) { document.body.style.paddingRight = lockSaved.paddingRight; lockSaved = null; }
      document.documentElement.style.removeProperty('--lock-gap');
    }
  }
  /* 서브페이지에서는 '#섹션' 링크를 index.html#섹션 으로 변환 */
  function normalizeUrl(url) {
    if (!url) return '#';
    if (url.charAt(0) === '#' && !isIndex && !singleFile) return './index.html' + url;
    return url;
  }
  /* 메뉴 링크 주소 */
  function menuHref(page) {
    const sec = SITE_DATA.sectionMap && SITE_DATA.sectionMap[page];
    if (sec) return isIndex ? ('#' + sec) : ('./index.html#' + sec);
    return SITE_DATA.pageUrl(page);
  }
  function bindMenuLink(a, item) {
    const page = typeof item === 'string' ? item : (item && item.page) || '';
    const ext = (item && typeof item === 'object' && item.url && String(item.url).trim()) ? String(item.url).trim() : '';
    a.setAttribute('data-page', page);
    if (ext) {
      /* 외부 링크(항공 VR · E-모델하우스 등) : 라우터가 가로채지 않는 실제 링크 */
      a.href = ext;
      a.target = item.target || '_blank';
      if (a.target === '_blank') a.rel = 'noopener noreferrer';
      a.setAttribute('data-external', 'true');
      return;
    }
    const sec = SITE_DATA.sectionMap && SITE_DATA.sectionMap[page];
    a.href = menuHref(page);
    if (sec && isIndex) {
      a.setAttribute('data-section', sec);
      a.addEventListener('click', function (e) {
        if (!document.getElementById(sec)) return;   /* 섹션이 없으면 기본 링크 동작 */
        e.preventDefault(); closeMega(); closeMobileNav(); scrollToSection(sec);
      });
    }
    if (page === currentPage) {
      a.classList.add('is-current');
      a.setAttribute('aria-current', 'page');
    }
  }

  /* =======================================================================
     공통 화면 요소 생성 (헤더 · 모바일메뉴 · 푸터 · 팝업 · 퀵메뉴 · 모달)
     ======================================================================= */
  function buildShell() {
    /* 로고는 이미지 한 장만 사용합니다. (영문 보조 텍스트 없음)
       어두운 헤더 → imageLight(화이트) / 흰색 헤더 → imageDark(네이비) 자동 전환 */
    const logo = SITE_DATA.site.logo || {};
    const logoAlt = logo.alt || SITE_DATA.site.name;
    const light = logo.imageLight || logo.image || '';
    const dark = logo.imageDark || logo.image || '';
    document.documentElement.style.setProperty('--logo-width', (logo.width || 200) + 'px');
    const logoInner =
      '<img class="header__logo-img header__logo-img--overlay" src="' + esc(light) + '" alt="' + esc(logoAlt) + '">' +
      '<img class="header__logo-img header__logo-img--solid" src="' + esc(dark) + '" alt="' + esc(dark.split('/').pop()) + '" aria-hidden="true">';
    const reg = SITE_DATA.site.register || {};
    const tel = SITE_DATA.site.tel || '';
    /* 대표번호 단일 소스 : site.tel 하나로 표시 문구 · tel: 링크 · aria-label 을 만듭니다 (PC 헤더 · 모바일 아이콘 · 푸터 공통) */
    const telHref = TEL_HREF, telAria = TEL_ARIA;

    const header = document.createElement('header');
    header.className = 'header ' + (headerTransparent() ? 'is-overlay' : 'is-solid');
    header.id = 'header';
    header.innerHTML =
      '<div class="header__inner">' +
        '<a class="header__logo" id="headerLogo" href="' + HOME + '" aria-label="' + esc(SITE_DATA.site.name) + ' 홈">' + logoInner + '</a>' +
        '<nav class="gnb" id="gnb" aria-label="주메뉴"></nav>' +
        '<div class="header__util">' +
          /* 헤더 마지막 항목 = 전화 아이콘(SVG 라인) + 대표번호 한 그룹 · 그룹 전체가 tel: 링크 (테두리 · 배경 없음 · 테두리형 방문예약 버튼 없음) */
          (tel ? '<a class="header__tel" href="' + esc(telHref) + '" aria-label="' + esc(telAria) + '">' + PHONE_SVG + '<span class="header__tel-text">' + esc(tel) + '</span></a>' : '') +
        '</div>' +
        /* 모바일(1023px 이하) : 번호 없이 전화 아이콘만 · 로고 → 여유 공간 → 전화 아이콘 → 햄버거 · 44×44 터치 영역 */
        (tel ? '<a class="header__tel-m" href="' + esc(telHref) + '" aria-label="' + esc(telAria) + '">' + PHONE_SVG + '</a>' : '') +
        '<button class="header__toggle" id="navToggle" type="button" aria-label="전체 메뉴 열기" aria-expanded="false" aria-controls="mobileNav">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +
      '<div class="header__mega" id="headerMega"><div class="mega" id="megaInner"></div></div>';

    const mobileNav = document.createElement('nav');
    mobileNav.className = 'mobile-nav';
    mobileNav.id = 'mobileNav';
    mobileNav.setAttribute('aria-label', '모바일 전체메뉴');
    mobileNav.setAttribute('aria-hidden', 'true');

    /* 로고 이미지 파일이 아직 없을 때만 임시 텍스트를 표시합니다. */
    $$('.header__logo-img', header).forEach(function (im) {
      im.addEventListener('error', function () {
        im.remove();
        const box = header.querySelector('#headerLogo');
        if (box && !box.querySelector('.header__logo-text')) {
          box.insertAdjacentHTML('beforeend', '<span class="header__logo-text">' + esc(logo.fallbackText || SITE_DATA.site.name) + '</span>');
        }
      });
    });

    /* 로고 클릭 : 지금 어느 화면(써머리 · 프리미엄 · 소메뉴)에 있든 메인 첫 화면(히어로 조감도) 맨 위로 갑니다.
       · 메인에서는 새로고침 없이 써머리 단계만 풀고 부드럽게 맨 위로 (팝업이 다시 뜨지 않습니다)
       · 소메뉴에서는 메인 주소로 이동 · scrollIntoView · 스크롤 스냅은 쓰지 않습니다 */
    const logoLink = header.querySelector('#headerLogo');
    if (logoLink) logoLink.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;   /* 새 탭으로 열기는 그대로 */
      closeMega(true); closeMobileNav();
      if (!isIndex) {
        if (singleFile) { e.preventDefault(); const base = location.pathname + location.search; if (location.hash) location.href = base; else location.reload(); }
        return;   /* 파일이 나뉜 구조에서는 링크 기본 동작(index.html)으로 이동 */
      }
      e.preventDefault();
      const heroEl = document.getElementById('hero');
      if (heroEl && heroEl.__stage && heroEl.__stage.index !== 0) heroEl.__stage.set(0);   /* 써머리 상태 → 조감도 슬라이드로 되돌림 */
      if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (err) { location.hash = ''; } }   /* 새로고침 없이 주소만 홈으로 */
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });

    const mountHeader = $('#siteHeader');
    if (mountHeader) { mountHeader.appendChild(header); mountHeader.appendChild(mobileNav); }
    else { document.body.insertBefore(mobileNav, document.body.firstChild); document.body.insertBefore(header, document.body.firstChild); }

    /* --- 푸터 (모든 페이지 공통) : 유의사항 + 상담 문의 + (입력한 경우에만) 회사 정보 --- */
    /* 회사명 · 사업자 정보/주소 · 이메일 · 상담 가능 시간 · 푸터 로고 : 값이 있는 항목만 출력하고, 모두 비어 있으면 영역 자체를 만들지 않음 */
    function footerInfoHtml(ft) {
      const st = SITE_DATA.site || {};
      const lab = function (l, v) { v = String(v == null ? '' : v).trim(); return v ? l + ' ' + v : ''; };
      const items = [ft.company, lab('시행', st.developer), lab('시공', st.builder), ft.address, lab('현장', st.address), lab('견본주택', st.modelHouseAddress),
        lab('E-mail', ft.email || st.email), lab('상담 가능 시간', st.consultHours), ft.copyright]
        .map(function (v) { return String(v == null ? '' : v).trim(); }).filter(Boolean);   /* 빈 값은 줄 자체를 만들지 않음 */
      const logo = String(ft.logo || '').trim();
      if (!items.length && !logo) return '';
      return '<div class="footer-info">' +
        (logo ? '<img class="footer-info__logo" src="' + esc(logo) + '" alt="' + esc(ft.company || st.name || '') + '" loading="lazy" decoding="async">' : '') +
        (items.length ? '<ul class="footer-info__list">' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      '</div>';
    }
    const f = SITE_DATA.footer || {};
    if (isOn(f)) {
      /* 푸터 상담번호 : footer.phoneDisplay / phoneLink 가 비어 있으면 site.tel(단일 설정값)을 그대로 사용 → 관리자에서 번호 한 번 변경 시 함께 바뀜 */
      const phoneDisplay = f.phoneDisplay || tel;
      const phoneLink = (f.phoneLink || phoneDisplay).replace(/[^0-9+]/g, '');
      const footer = document.createElement('footer');
      footer.className = 'footer';
      footer.id = 'footer';
      footer.setAttribute('data-header-theme', 'overlay');
      /* 상담 문의 · 전화번호 : 등장 효과(.anim) 없이 처음부터 항상 표시되는 실제 전화 링크 */
      footer.innerHTML =
        '<div class="footer__inner">' +
          ((f.notices && f.notices.length) ?
            '<ul class="footer__notices">' +
              f.notices.map(t => '<li>※' + esc(t) + '</li>').join('') +
            '</ul>' : '') +
          '<div class="footer-contact">' +
            '<span class="footer-contact__label">' + esc(f.phoneLabel || '상담 문의') + '</span>' +
            '<a class="footer-contact__tel" href="tel:' + esc(phoneLink) + '" aria-label="' + esc(f.phoneLabel || '상담 문의') + ' 전화 ' + esc(phoneDisplay) + '">' + esc(phoneDisplay) + '</a>' +
          '</div>' +
          footerInfoHtml(f) +
        '</div>';
      const mountFooter = $('#siteFooter');
      if (mountFooter) mountFooter.appendChild(footer); else document.body.appendChild(footer);
    }

    /* --- 좌측 팝업 · 우측 퀵메뉴 · 모달 · 상단 버튼 --- */
    const extras = document.createElement('div');
    extras.innerHTML =
      /* 팝업 : PC = 왼쪽 패널(배너 3장 가로 정렬) + POPUP 재열기 탭 / 모바일 = 화면 중앙 모달(배너 1장 슬라이드) */
      '<div class="wbnote-dim" id="wbnoteDim" hidden></div>' +   /* PC : 팝업이 펼쳐진 동안 전체 화면 반투명 오버레이 (팝업 아래 · 헤더/퀵메뉴/TOP 위) */
      '<div class="wbnote is-collapsed is-offscreen is-hidden" id="wbnote" hidden>' +   /* 처음에는 화면 왼쪽 바깥(탭 포함) → 메인은 화면이 그려진 뒤 오버레이 페이드인 + 패널 슬라이드인(첫 1회 · 0.75s) → 카드 순으로 등장 */
        '<div class="wbnote__panel" id="wbnotePanel" role="dialog" aria-label="분양 안내 팝업">' +
          '<div class="wbnote__bar">' +
            '<span class="wbnote__count" id="wbnoteCount" aria-live="polite"></span>' +
            '<button class="wbnote__today wbnote__today--bar" type="button">오늘 다시 보지 않기</button>' +   /* 모바일 : 이미지 위 오른쪽 (PC 는 아래쪽 버튼을 사용) */
            '<button class="wbnote__x" id="wbnoteX" type="button" aria-label="팝업 닫기">✕</button>' +
          '</div>' +
          '<div class="wbnote__viewport" id="wbnoteViewport"><div class="wbnote-gallery" id="wbnoteList"></div></div>' +
          '<div class="wbnote__controls" id="wbnoteControls">' +
            '<button class="wbnote__nav" type="button" data-dir="-1" aria-label="이전 배너"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 4 7 12l8 8"/></svg></button>' +
            '<span class="wbnote__dots" id="wbnoteDots" role="tablist" aria-label="배너 선택"></span>' +
            '<button class="wbnote__nav" type="button" data-dir="1" aria-label="다음 배너"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg></button>' +
          '</div>' +
          '<div class="wbnote__foot"><button class="wbnote__today" id="wbnoteToday" type="button">오늘 다시 보지 않기</button></div>' +   /* 누르면 오늘 하루(현지 시간 다음 날 00시까지) 숨김 */
        '</div>' +
        '<button class="wbnote__tab" id="wbnoteTab" type="button" aria-expanded="false" aria-controls="wbnotePanel">' +
          '<span class="wbnote__tab-text">POPUP</span><span class="wbnote__tab-arrow" aria-hidden="true">▶</span>' +
        '</button>' +
      '</div>' +
      '<aside class="quick" id="quickMenu" aria-label="퀵메뉴" hidden></aside>' +
      '<div class="modal" id="modal" role="dialog" aria-modal="true" aria-hidden="true" aria-label="이미지 크게 보기">' +
        '<div class="modal__box">' +
          '<button class="modal__close" id="modalClose" type="button" aria-label="닫기">✕</button>' +
          '<div class="modal__media media" id="modalMedia"></div>' +
          '<p class="modal__caption" id="modalCaption"></p>' +
        '</div>' +
      '</div>' +
      '<button class="topbtn" id="topBtn" type="button" aria-label="맨 위로 이동" title="맨 위로 이동">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' +
      '</button>';
    while (extras.firstChild) document.body.appendChild(extras.firstChild);
  }

  /* =======================================================================
     헤더 메뉴 렌더링 (기존 메뉴 명칭 · 순서 · 하위메뉴 유지)
     ======================================================================= */
  function renderMenu() {
    const gnbEl = $('#gnb'), megaEl = $('#megaInner'), mobileEl = $('#mobileNav');
    const groups = onlyOn(SITE_DATA.menu).filter(function (g) { return onlyOn(g.items).length > 0; });
    /* 메인 메뉴와 메가메뉴가 같은 열 개수를 사용합니다. */
    document.documentElement.style.setProperty('--menu-count', groups.length);

    groups.forEach(function (group) {
      const items = onlyOn(group.items);
      const inGroup = items.some(function (it) { return it.page === currentPage; });
      /* 소메뉴가 1개뿐인 카테고리(관심고객등록)는 메가메뉴에 다시 출력하지 않고 1차 메뉴에서 바로 이동합니다. */
      const hasSub = items.length > 1;

      /* --- PC 1차 메뉴 (한 줄) --- */
      const item = document.createElement('div');
      item.className = 'gnb__item' + (inGroup ? ' is-active' : '');
      item.setAttribute('data-group', group.id);
      const link = document.createElement('a');
      link.className = 'gnb__link';
      link.textContent = group.label;
      bindMenuLink(link, items[0]);          /* 1차 메뉴 클릭 → 첫 번째 소메뉴 페이지 */
      if (inGroup) link.setAttribute('aria-current', 'page');
      if (document.documentElement.getAttribute('data-editor-mode') !== 'true') {   /* 편집 캔버스에서는 마우스 올림 · 포커스로 메가메뉴를 열지 않음 (클릭으로만 펼침) */
        link.addEventListener('mouseenter', openMega);
        link.addEventListener('focus', openMega);
      }
      item.appendChild(link);
      gnbEl.appendChild(item);

      /* --- PC 메가메뉴 열 : 카테고리 제목 없이 소메뉴 링크만 (1차 메뉴와 같은 열 위치) --- */
      const col = document.createElement('div');
      col.className = 'mega__col' + (hasSub ? '' : ' mega__col--empty');
      col.setAttribute('data-col', group.id);
      if (hasSub) {
        const list = document.createElement('div'); list.className = 'mega__list';
        items.forEach(function (it) {
          const a = document.createElement('a');
          a.className = 'mega__link'; a.textContent = it.label;
          bindMenuLink(a, it); list.appendChild(a);
        });
        col.appendChild(list);
      } else {
        col.setAttribute('aria-hidden', 'true');
      }
      const focusGroup = function () {
        $$('.mega__col').forEach(function (c) { c.classList.toggle('is-focus', c === col); });
        $$('.gnb__item').forEach(function (i) { i.classList.toggle('is-hover', i === item); });   /* 소메뉴 영역으로 마우스를 옮겨도 1차 메뉴 강조(굵게 · 라인 · 색) 유지 */
      };
      link.addEventListener('mouseenter', focusGroup);
      col.addEventListener('mouseenter', function () { if (hasSub) focusGroup(); });   /* 드롭다운 안에서 다른 열로 옮기면 그 열의 1차 메뉴로 강조 이동 */
      megaEl.appendChild(col);

      /* --- 모바일 메뉴 : 카테고리명 1회 + 소메뉴 아코디언 (PC 메가메뉴 DOM 과 완전히 별개) --- */
      if (hasSub) {
        const mg = document.createElement('div'); mg.className = 'mobile-nav__group' + (inGroup ? ' is-open' : '');
        const head = document.createElement('button');
        head.type = 'button'; head.className = 'mobile-nav__head' + (inGroup ? ' is-active' : '');
        head.setAttribute('aria-expanded', inGroup ? 'true' : 'false');
        head.innerHTML = '<span>' + esc(group.label) + '</span><span class="mobile-nav__mark" aria-hidden="true">' + (inGroup ? '−' : '+') + '</span>';
        const panel = document.createElement('div'); panel.className = 'mobile-nav__panel';
        const mList = document.createElement('div'); mList.className = 'mobile-nav__list';
        items.forEach(function (it) {
          const a = document.createElement('a');
          a.className = 'mobile-nav__link'; a.textContent = it.label;
          bindMenuLink(a, it); mList.appendChild(a);
        });
        panel.appendChild(mList);
        head.addEventListener('click', function () {
          const open = mg.classList.toggle('is-open');
          head.setAttribute('aria-expanded', open ? 'true' : 'false');
          head.querySelector('.mobile-nav__mark').textContent = open ? '−' : '+';
        });
        mg.appendChild(head); mg.appendChild(panel); mobileEl.appendChild(mg);
      } else {
        /* 소메뉴가 하나뿐이면 카테고리명 자체가 링크 (같은 이름을 두 번 출력하지 않음) */
        const mg = document.createElement('div'); mg.className = 'mobile-nav__group';
        const a = document.createElement('a');
        a.className = 'mobile-nav__head mobile-nav__head--link' + (inGroup ? ' is-active' : '');
        a.innerHTML = '<span>' + esc(group.label) + '</span>';
        bindMenuLink(a, items[0]);
        mg.appendChild(a); mobileEl.appendChild(mg);
      }
    });

    const reg = SITE_DATA.site.register || {};
    const tel = SITE_DATA.site.tel || '';
    const util = document.createElement('div');
    util.className = 'mobile-nav__util';
    util.innerHTML =
      '<a class="mobile-nav__tel" href="' + esc(TEL_HREF) + '" aria-label="' + esc(TEL_ARIA) + '">' + esc(tel) + '</a>' +
      '<a class="btn" href="' + esc(normalizeUrl(reg.url)) + '" target="' + esc(reg.target || '_self') + '">' + esc(reg.label || '방문예약') + '</a>';
    mobileEl.appendChild(util);
  }

  /* --- 메가메뉴 / 모바일 메뉴 --- */
  /* 메가메뉴 열 위치를 메인 메뉴 좌표에 맞춰 계산 (열이 서로 겹치지 않게 정렬) */
  /* 메가메뉴 열을 메인 메뉴 열과 정확히 같은 위치·너비로 맞춥니다.
     (둘 다 같은 개수의 동일 너비 그리드를 쓰고, 좌우 여백만 메뉴 영역에 맞춥니다) */
  function layoutMega() {
    const mega = $('#megaInner');
    const gnb = $('#gnb');
    const megaWrap = $('#headerMega');
    if (!mega || !gnb || !megaWrap || mqTablet.matches) return;
    /* 소메뉴 열을 1차 메뉴 열과 정확히 같은 위치 · 너비로 맞춥니다. (좌우 여백만 메뉴 영역에 맞춤) */
    const gRect = gnb.getBoundingClientRect();
    const wRect = megaWrap.getBoundingClientRect();
    mega.style.paddingLeft = Math.max(0, Math.round(gRect.left - wRect.left)) + 'px';
    mega.style.paddingRight = Math.max(0, Math.round(wRect.right - gRect.right)) + 'px';
    /* 패널 높이 = 소메뉴 목록의 실제 높이 (빈 제목 공간 · 불필요한 상단 여백 없음) */
    document.documentElement.style.setProperty('--mega-height', mega.offsetHeight + 'px');
  }
  let megaTimer = null;
  /* 본문 오버레이(.mega-dim) : 헤더(z 300) 바로 아래(z 295) · 화면 전체를 덮는 별도 요소 → 흰 헤더 + 서브메뉴는 그대로 밝고, 그 아래 본문 · 퀵메뉴 · TOP 만 어두워짐
     (본문에 filter 를 걸지 않으므로 레이아웃 · 스크롤 위치 변화 없음 · 팝업 오버레이 z 899 는 항상 그 위) */
  function setMegaDim(on) { const d = document.getElementById('megaDim'); if (d) d.classList.toggle('is-on', !!on); }
  function openMega() {
    if (mqTablet.matches) return;
    clearTimeout(megaTimer);
    document.getElementById('header').classList.add('is-mega-open');
    setMegaDim(true);
    layoutMega();
  }
  function closeMega(now) {
    const h = document.getElementById('header');
    if (!h) return;
    /* 편집 화면에서 소메뉴를 고르고 있는 동안에는 마우스가 헤더를 벗어나도 닫지 않음 (Esc · 오버레이 클릭 처럼 즉시 닫기 요청은 그대로 처리) */
    if (now !== true && h.classList.contains('is-mega-pinned') && document.documentElement.getAttribute('data-editor-mode') === 'true') return;
    if (now === true) h.classList.remove('is-mega-pinned');
    clearTimeout(megaTimer);
    const done = function () {
      h.classList.remove('is-mega-open');
      setMegaDim(false);
      $$('.mega__col').forEach(function (c) { c.classList.remove('is-focus'); });
      $$('.gnb__item').forEach(function (i) { i.classList.remove('is-hover'); });   /* 드롭다운을 완전히 벗어났을 때만 원래 굵기로 */
    };
    /* 메인 메뉴에서 소메뉴로 마우스를 옮기는 동안 닫히지 않도록 약간의 여유를 둡니다. (오버레이 클릭 · Esc 는 즉시) */
    if (now === true) done(); else megaTimer = setTimeout(done, 140);
  }
  function openMobileNav() {
    const h = $('#header'), nav = $('#mobileNav'), btn = $('#navToggle');
    h.classList.add('is-menu-open'); nav.classList.add('is-open');
    nav.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', '전체 메뉴 닫기');
    lockScroll(true);
  }
  function closeMobileNav() {
    const nav = $('#mobileNav');
    if (!nav || !nav.classList.contains('is-open')) return;
    $('#header').classList.remove('is-menu-open');
    nav.classList.remove('is-open'); nav.setAttribute('aria-hidden', 'true');
    const btn = $('#navToggle');
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', '전체 메뉴 열기');
    lockScroll(false);
  }
  function bindHeaderEvents() {
    const header = $('#header');
    header.addEventListener('mouseleave', closeMega);
    header.addEventListener('mouseenter', function () { clearTimeout(megaTimer); });
    if (!document.getElementById('megaDim')) {
      const dim = document.createElement('div'); dim.className = 'mega-dim'; dim.id = 'megaDim'; dim.setAttribute('aria-hidden', 'true');
      header.insertAdjacentElement('afterend', dim);
      dim.addEventListener('click', function () { closeMega(true); });   /* 어두운 본문을 누르면 서브메뉴 · 오버레이 함께 닫힘 */
    }
    window.addEventListener('resize', function () { if (mqTablet.matches) closeMega(true); else layoutMega(); });
    document.addEventListener('focusin', function (e) { if (!header.contains(e.target)) closeMega(); });
    $('#navToggle').addEventListener('click', function () {
      $('#mobileNav').classList.contains('is-open') ? closeMobileNav() : openMobileNav();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMega(true); closeMobileNav(); } });
    window.addEventListener('resize', function () { if (!mqTablet.matches) closeMobileNav(); });
  }

  /* =======================================================================
     이미지 모달
     ======================================================================= */
  let lastFocused = null;
  function openModal(cfg, caption) {
    const modal = $('#modal');
    lastFocused = document.activeElement;
    setMedia($('#modalMedia'), cfg && cfg.enabled !== false ? cfg : defaultMedia(caption), caption, '크게 보기 이미지');
    $('#modalCaption').textContent = caption || '';
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
    lockScroll(true); $('#modalClose').focus();
  }
  function closeModal() {
    const modal = $('#modal');
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function bindModal() {
    $('#modalClose').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', function (e) { if (e.target === $('#modal')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  /* =======================================================================
     좌측 팝업 : 모든 배너를 가로 한 줄로 한 번에 펼침
     ======================================================================= */
  /* =======================================================================
     좌측 팝업
     · 배너는 가로 3열(기본) · 각 배너 3:2 비율
     · 우측 퀵메뉴에 닿지 않도록 너비를 자동 계산
     · 닫기 상태는 모든 페이지(메인 · 소메뉴)에서 공통으로 유지
     ======================================================================= */
  /* 팝업 접힘 상태는 저장하지 않습니다 (localStorage · sessionStorage · 쿠키 사용 안 함).
     · 메인(index) 첫 접속 · 새로고침 : 항상 펼쳐진 상태로 시작 (초기 마크업부터 is-open)
     · 사용자가 접기/닫기 → popupManuallyCollapsed = true → 스크롤 · 섹션 이동으로는 다시 펼치지 않음
     · 접힌 측면 탭을 사용자가 직접 클릭한 경우에만 다시 펼침
     · 소메뉴 페이지 : 자동으로 열지 않음 (접힌 탭만 표시) */
  /* 팝업 상태 (저장하지 않음 · 이 페이지가 열려 있는 동안만) : closed → opening → open → closing → closed
     · 자동 열림은 메인 첫 진입 때 단 한 번(renderPopup 끝) — 스크롤 · 섹션 이동 · 슬라이드 · 화면 크기/방향 변경 · 메뉴 · 이미지 로딩으로는 다시 열리지 않음
     · 사용자가 닫으면 popupManuallyCollapsed = true → 왼쪽 POPUP 탭을 직접 누를 때만 다시 열림
     · 게시 중 여부(사용 · 표시 페이지 · 기간 · PC/모바일)는 cms.js 가 렌더 전에 거르고(닫은 기록으로는 거르지 않음 → 새로고침 · 재방문 때 다시 표시), 닫힘은 'wbnote:closed' 이벤트 한 곳으로 기록 */
  let popupManuallyCollapsed = false, popupState = 'closed', popupTimer = null, popupAutoDone = false;
  /* 방문예약 화면 판별 : 해시(#visit-reservation · #reservation) · 쿼리(?page=register) · 소메뉴 페이지 id — 단일 파일 · 분리 파일 모두 같은 기준 */
  const RESERVE_VIEW_RE = /(visit-?reservation|reservation|reserve|register|방문예약)/i;
  function isReservationView() {
    const h = String(window.location.hash || '').replace(/^#/, '');
    if (h && RESERVE_VIEW_RE.test(decodeURIComponent(h))) return true;
    const q = params.get('page') || '';
    if (q && RESERVE_VIEW_RE.test(q)) return true;
    return !isIndex && RESERVE_VIEW_RE.test(bodyPage || '');
  }
  /* 자동 열기는 '메인 페이지( / · index.html · 해시 없음 )' 에서만 — 방문예약 화면에서는 직접 접속 · 새로고침 · 해시 변경 · 뒤로/앞으로 어느 경우에도 열지 않음 */
  function isMainView() { return isIndex && !isReservationView(); }
  /* 팝업 숨김 기억 : (1) 닫기 → sessionStorage · 브라우저를 완전히 닫으면 사라짐  (2) 오늘 다시 보지 않기 → localStorage · 현지 시간 다음 날 00시 만료
     값이 없거나 깨져 있으면 조용히 지우고 기본 동작(표시)으로 돌아갑니다. 편집 화면에서는 기록하지도 읽지도 않습니다. */
  const POPUP_SESSION_KEY = 'wbnote_closed', POPUP_TODAY_KEY = 'wbnote_hide_until';
  function popupEditing() { return document.documentElement.getAttribute('data-editor-mode') === 'true'; }
  function popupClosedInSession() { if (popupEditing()) return false; try { return sessionStorage.getItem(POPUP_SESSION_KEY) === '1'; } catch (e) { return false; } }
  function markPopupClosedInSession() { if (popupEditing()) return; try { sessionStorage.setItem(POPUP_SESSION_KEY, '1'); } catch (e) {} }
  function popupHiddenToday() {
    if (popupEditing()) return false;
    let raw = null; try { raw = localStorage.getItem(POPUP_TODAY_KEY); } catch (e) { return false; }
    if (!raw) return false;
    const until = Number(raw);
    if (!isFinite(until) || until <= 0 || until > Date.now() + 86400000 * 2) { try { localStorage.removeItem(POPUP_TODAY_KEY); } catch (e) {} return false; }   /* 손상된 값 : 지우고 기본 동작 */
    if (Date.now() >= until) { try { localStorage.removeItem(POPUP_TODAY_KEY); } catch (e) {} return false; }   /* 다음 날 : 자동으로 다시 표시 */
    return true;
  }
  function markPopupHiddenToday() {
    if (popupEditing()) return;
    const d = new Date(); d.setHours(24, 0, 0, 0);   /* 24시간 더하기가 아니라 '보는 사람 시간 기준 다음 날 00시' */
    try { localStorage.setItem(POPUP_TODAY_KEY, String(d.getTime())); } catch (e) {}
  }
  /* 메인에 들어올 때마다 무조건 열지 않고, 세션 닫힘 · 오늘 숨김을 먼저 확인합니다 */
  function shouldAutoOpenPopup() { return isMainView() && !popupManuallyCollapsed && !popupClosedInSession() && !popupHiddenToday(); }
  /* PC : 보이는 동안 배경 오버레이 · 닫힘 애니메이션이 끝날 때까지 배경 스크롤 잠금 — 모바일은 .wbnote 자체가 배경을 덮으므로 잠금 없음 */
  let popupDimLocked = false;
  function syncPopupDim() {
    const dim = $('#wbnoteDim'); const pc = !mqMobile.matches;
    const shown = popupState === 'open' || popupState === 'opening';
    if (dim) { dim.hidden = !shown && popupState === 'closed'; dim.classList.toggle('is-on', shown && pc); }   /* 팝업이 완전히 닫힌 화면(방문예약 등)에서는 오버레이를 hidden 으로 비활성 */
    const needLock = pc && popupState !== 'closed';
    if (needLock !== popupDimLocked) { popupDimLocked = needLock; lockScroll(needLock); }
  }

  let popupSlider = null;   /* 모바일 슬라이더 (한 번만 생성) */
  function renderPopup() {
    const wrap = $('#wbnote');
    /* 배너 데이터는 SITE_DATA.popupBanners 한 곳 : PC 3열과 모바일 슬라이드가 같은 배열을 그대로 사용합니다.
       (예전 popups[] 형식도 같은 형태로 변환해 사용) */
    let list = onlyOn(SITE_DATA.popupBanners && SITE_DATA.popupBanners.length ? SITE_DATA.popupBanners :
      (SITE_DATA.popups || []).map(function (d) { const m = d.media || d.image || {}; return { enabled: d.enabled, src: m.src, alt: m.alt || d.title, href: d.link || m.href || '', target: d.target || m.target }; }));
    if (!wrap) return;
    if (!list.length) { wrap.remove(); return; }
    wrap.hidden = false;
    wrap.removeAttribute('hidden');

    const opts = SITE_DATA.popupOptions || {};
    const root = document.documentElement;
    root.style.setProperty('--popup-item-gap', opts.itemGap || '14px');
    root.style.setProperty('--popup-quick-gap', opts.quickGap || '24px');
    root.style.setProperty('--popup-screen-gap', opts.screenGap || '20px');
    root.style.setProperty('--popup-max-width', opts.maxWidth || '880px');
    root.style.setProperty('--popup-ratio', opts.aspectRatio || '350 / 470');
    root.style.setProperty('--popup-banner-w', opts.bannerWidth || '350px');
    root.style.setProperty('--popup-count', list.length);   /* 배너 개수 : PC 열 수 · 패널 너비 자동 계산 (4장이면 4열) */
    root.style.setProperty('--popup-fit', opts.objectFit || 'cover');
    root.style.setProperty('--popup-mobile-width', opts.mobileWidth || 'min(76vw, 300px)');
    root.style.setProperty('--popup-slide-duration', (opts.slideDuration || 650) + 'ms');

    /* 배너 : 제목 · 설명 없이 실제 <img> 만 (PC 3장 가로 정렬 / 모바일 1장씩 슬라이드) */
    const listEl = $('#wbnoteList');
    listEl.innerHTML = '';
    function makeItem(d, i, clone) {
      const hasLink = !!(d.href && String(d.href).trim());
      const item = document.createElement(hasLink ? 'a' : 'div');
      item.className = 'wbnote-gallery__item';
      if (!clone) item.style.setProperty('--pi', i);   /* 등장 시차(카드마다 0.1s) */
      if (clone) { item.setAttribute('data-clone', 'true'); item.setAttribute('aria-hidden', 'true'); item.tabIndex = -1; }
      if (hasLink) {
        item.href = normalizeUrl(d.href);
        item.target = d.target || '_self';
        if (item.target === '_blank') item.rel = 'noopener noreferrer';
      }
      item.style.setProperty('--popup-fit', d.objectFit || opts.objectFit || 'cover');
      /* 팝업 배너 이미지 : SITE_DATA.popupBanners[].src 하나만 바꾸면 PC · 모바일에 동시에 반영됩니다 */
      const pm = { enabled: true, src: d.src, alt: d.alt || ('팝업 배너 ' + (i + 1)), objectFit: d.objectFit || opts.objectFit || 'cover', objectPosition: d.objectPosition || opts.objectPosition || 'center center' };
      setMedia(item, pm, pm.alt, '팝업 배너 ' + (i + 1) + ' 이미지', { eager: true });
      /* 이미지가 없거나 주소가 틀린 배너는 회색 빈칸으로 두지 않고 목록에서 뺌 (모든 배너가 실패하면 팝업 자체를 숨김) */
      const img = item.querySelector('img');
      if (img && !clone) { const bad = function () { if (d.__failed) return; d.__failed = true; rebuildBanners(); }; img.addEventListener('error', bad); if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) setTimeout(function () { if (img.complete && img.naturalWidth === 0) bad(); }, 0); }
      return item;
    }
    function fillList(items) {
      listEl.innerHTML = '';
      if (!items.length) return;
      /* 모바일 무한 루프용 앞뒤 복제 1장씩 (PC 에서는 CSS 로 숨김) */
      listEl.appendChild(makeItem(items[items.length - 1], items.length - 1, true));
      items.forEach(function (d, i) { listEl.appendChild(makeItem(d, i, false)); });
      listEl.appendChild(makeItem(items[0], 0, true));
    }
    function rebuildBanners() {
      const valid = list.filter(function (d) { return !d.__failed; });
      if (!valid.length) {   /* 유효한 배너 없음(이미지가 모두 실패) : 팝업을 처음 상태(완전히 화면 밖)로 되돌려 정리 — 열리다 만 빈 패널이나 탭 화살표만 남는 상태 금지(오버레이·화살표도 열지 않음) */
        clearTimeout(popupTimer); popupState = 'closed'; popupAutoDone = true;
        wrap.classList.add('is-collapsed', 'is-offscreen', 'is-hidden'); wrap.classList.remove('is-open', 'is-entering', 'is-entering--first');
        syncPopupDim(); return;
      }
      root.style.setProperty('--popup-count', valid.length);
      fillList(valid);
      if (popupSlider) popupSlider.stop();
      $('#wbnoteDots').innerHTML = ''; popupSlider = createPopupSlider(wrap, valid.length, opts); if (shown()) popupSlider.start();
    }
    fillList(list);
    SITE.rerenderPopup = function (items) { list = (items || []).slice(); list.forEach(function (d) { delete d.__failed; }); rebuildBanners(); };   /* 관리자 › 팝업 관리 › [미리보기] : 특정 배너만 표시 */

    const tab = $('#wbnoteTab');
    let firstEntrance = true;   /* 첫 자동 노출에만 긴 등장(화면 밖 → 제자리) · 이후 POPUP 탭으로 다시 열 때는 짧게 */
    const popupMs = function (first) { return prefersReduced ? 220 : (mqMobile.matches ? 360 : (first ? 800 : 560)); };   /* CSS 전환이 끝나는 시간 : PC 첫 등장 .75s(+.05s) · 다시 열기 .5s · 모바일 .3s · 동작 줄이기 .2s */
    const shown = function () { return popupState === 'open' || popupState === 'opening'; };
    function setPopupOpen(open, byUser) {
      open = !!open;
      if (open === shown()) return;                           /* 같은 요청 반복(연타 · 중복 이벤트) 무시 */
      if (popupState === 'closing' && open) return;           /* 닫히는 중에는 열기 요청 무시 (애니메이션 겹침 방지) */
      if (!open && byUser) { popupManuallyCollapsed = true; markPopupClosedInSession(); }     /* 사용자가 닫음 : 이 세션에서는 자동으로 다시 열지 않음(메뉴 이동 후 메인 복귀 포함) */
      clearTimeout(popupTimer);
      tab.setAttribute('aria-expanded', String(open));
      if (open) {
        const first = firstEntrance; firstEntrance = false;
        popupState = 'opening';
        wrap.classList.remove('is-hidden');
        syncPopupDim();                                       /* 오버레이 페이드인 + 스크롤 잠금(처음 1회) */
        /* 시작 위치(화면 밖 · 접힘)를 한 프레임 그린 뒤 이동 시작 → 제자리에서 번쩍이거나 튀지 않음 */
        void wrap.offsetWidth;
        const go = function () { if (!list.some(function (d) { return !d.__failed; })) return;   /* 이중 rAF · 자동 열림 지연 동안 배너 이미지가 모두 실패했다면 열지 않음(빈 팝업 방지) */ wrap.classList.add('is-entering', 'is-open'); if (first) wrap.classList.add('is-entering--first'); wrap.classList.remove('is-collapsed', 'is-offscreen'); };
        if (first && !prefersReduced && window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(go); }); else go();
        if (popupSlider) popupSlider.start();
        popupTimer = setTimeout(function () { popupState = 'open'; wrap.classList.remove('is-entering', 'is-entering--first'); }, popupMs(first) + (prefersReduced || mqMobile.matches ? 0 : list.length * 100));
      } else {
        popupState = 'closing';
        wrap.classList.remove('is-open', 'is-entering', 'is-entering--first', 'is-offscreen'); wrap.classList.add('is-collapsed');   /* 왼쪽으로 접힘(세로 탭은 남음) + 오버레이 페이드아웃 */
        if (popupSlider) popupSlider.stop();
        syncPopupDim();
        popupTimer = setTimeout(function () {
          popupState = 'closed'; wrap.classList.add('is-hidden');   /* 애니메이션이 끝난 뒤에 숨김 */
          syncPopupDim();                                     /* 그다음 스크롤 잠금 해제 */
        }, popupMs());
        try { document.dispatchEvent(new CustomEvent('wbnote:closed', { detail: { byUser: !!byUser } })); } catch (err) {}
      }
    }
    function openPopup() { setPopupOpen(true, true); }
    function closePopup() { setPopupOpen(false, true); }
    /* 방문예약으로 이동하기 직전 : 열려 있으면 정상 닫힘 애니메이션으로 닫되, 배경 오버레이와 스크롤 잠금은 즉시 풀어 예약 화면으로 바로 이동하게 함 */
    function closePopupForLeave() {
      popupManuallyCollapsed = true; popupAutoDone = true;          /* 이후 자동으로 다시 열리지 않음 */
      if (popupState === 'closed') { syncPopupDim(); return; }
      setPopupOpen(false, true);
      if (popupDimLocked) { popupDimLocked = false; lockScroll(false); }   /* 잠금 해제를 닫힘 애니메이션이 끝날 때까지 기다리지 않음 */
      const d = $('#wbnoteDim'); if (d) d.classList.remove('is-on');
    }
    SITE.openPopup = openPopup; SITE.closePopup = closePopup;   /* 열기 · 닫기 창구 하나 (관리자 · 명시적 팝업 버튼에서만 사용) */
    SITE.setPopupOpen = function (open) { setPopupOpen(open, true); };   /* 관리자 '팝업 열기' 버튼 · 동작 연결용 (cms.js) */
    /* 방문예약 링크 · 버튼에만 연결 (모든 링크에 거는 공통 핸들러 아님) : 헤더 메뉴 · 메가메뉴 · 퀵메뉴 · 본문 버튼 · 푸터 · #visit-reservation 앵커
       캡처 단계에서 먼저 팝업만 닫고 링크 기본 동작(예약 섹션으로 이동)은 그대로 둡니다 — preventDefault 하지 않음 */
    function reserveTrigger(t) {
      const el = t && t.closest ? t.closest('a[href],button,[data-action],[data-scroll-to]') : null;
      if (!el || el.closest('.wbnote')) return false;   /* 팝업 배너 안의 링크는 제외 */
      const v = (el.getAttribute('href') || '') + ' ' + (el.getAttribute('data-action') || '') + ' ' + (el.getAttribute('data-scroll-to') || '') + ' ' + (el.getAttribute('data-page') || '');
      return RESERVE_VIEW_RE.test(v);
    }
    document.addEventListener('click', function (e) { if (reserveTrigger(e.target)) closePopupForLeave(); }, true);
    /* 해시 변경 · 뒤로/앞으로 · 상태 변경 : 방문예약 화면이면 팝업을 열지 않고, 열려 있으면 닫음 */
    function onViewChange() { if (isReservationView()) closePopupForLeave(); }
    window.addEventListener('hashchange', onViewChange);
    window.addEventListener('popstate', onViewChange);
    document.addEventListener('submit', function (e) { if (e.target && e.target.closest && e.target.closest('#visit-reservation')) { popupManuallyCollapsed = true; popupAutoDone = true; } }, true);   /* 예약 폼 제출 후에도 다시 열리지 않음 */
    const dimEl = $('#wbnoteDim');
    if (dimEl) dimEl.addEventListener('click', closePopup);    /* PC : 오버레이 클릭 → 닫힘 */
    window.addEventListener('resize', syncPopupDim);           /* 화면 폭 · 방향이 바뀌면 오버레이/잠금만 다시 계산 (팝업을 다시 열지 않음) */
    tab.addEventListener('click', function () { setPopupOpen(!shown(), true); });   /* POPUP 탭 : 같은 등장 애니메이션으로 다시 열림 */
    $('#wbnoteX').addEventListener('click', closePopup);
    /* [오늘 다시 보지 않기] : 이미지 위(모바일) · 아래(PC) 어느 쪽을 눌러도 같은 동작 — 즉시 닫고 현지 시간 다음 날 00시까지 숨김.
       X 는 이 기록을 남기지 않고 이번 세션에서만 닫습니다. */
    $$('.wbnote__today', wrap).forEach(function (b) { b.addEventListener('click', function () { markPopupHiddenToday(); closePopup(); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && shown()) closePopup(); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap && mqMobile.matches) closePopup(); });   /* 모바일 : 어두운 배경을 누르면 닫힘 */

    popupSlider = createPopupSlider(wrap, list.length, opts);
    tab.setAttribute('aria-expanded', 'false'); syncPopupDim();
    /* 자동 열림 : 메인 첫 진입 때 한 번만 — 화면(조감도)이 먼저 그려진 뒤 시작 (load 이후 0.4초 · 이미지가 느려도 최대 3초 뒤) */
    if (isReservationView()) { popupAutoDone = true; syncPopupDim(); }   /* 방문예약 주소로 직접 접속 · 새로고침 : 자동 열기 자체를 건너뜀 */
    if (opts.autoOpen !== false && shouldAutoOpenPopup()) {
      const auto = function () { if (popupAutoDone) return; popupAutoDone = true; setTimeout(function () { if (shouldAutoOpenPopup() && popupState === 'closed' && list.some(function (d) { return !d.__failed; })) setPopupOpen(true, false); }, opts.openDelay || 400); };   /* 지연 시간 동안 배너가 모두 실패로 판정됐다면(느린 실제 서버에서도) 자동으로 열지 않음 */
      const autoAfterIntro = function () { introReady(auto); };   /* 인트로가 끝난 뒤에 열립니다 (인트로 중에는 열지 않음) */
      if (document.readyState === 'complete') autoAfterIntro(); else { window.addEventListener('load', autoAfterIntro, { once: true }); setTimeout(autoAfterIntro, 3000); }
    }
  }

  /* 모바일 팝업 슬라이더 : 자동 넘김(4.2초) · 0.65초 전환 · 무한 반복 · 좌우 버튼 · 1/3 · 점 · 스와이프
     타이머는 이 함수 안의 변수 하나만 사용해 열 때마다 중복 생성되지 않습니다. */
  function createPopupSlider(wrap, count, opts) {
    const track = $('#wbnoteList'), viewport = $('#wbnoteViewport');
    const countEl = $('#wbnoteCount'), dotsEl = $('#wbnoteDots');
    const navs = $$('.wbnote__nav', wrap);
    const INTERVAL = opts.autoplayInterval || 4200;
    const RESUME = opts.resumeDelay || 5000;
    let index = 1;                 /* 1 ~ count (0 과 count+1 은 복제) */
    let timer = null, resumeTimer = null, animating = false, active = false;
    let dots = [];

    for (let i = 0; i < count; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'wbnote__dot'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', (i + 1) + '번째 배너');
      b.addEventListener('click', function () { userGo(i + 1); });
      dotsEl.appendChild(b); dots.push(b);
    }
    function paint() {
      const real = ((index - 1) % count + count) % count;
      countEl.textContent = (real + 1) + ' / ' + count;
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === real); d.setAttribute('aria-selected', i === real ? 'true' : 'false'); });
    }
    function move(to, instant) {
      index = to;
      track.classList.toggle('is-instant', !!instant);
      track.style.transform = 'translate3d(' + (-index * 100) + '%,0,0)';
      if (!instant) animating = true;
      paint();
    }
    track.addEventListener('transitionend', function (e) {
      if (e.target !== track) return;
      animating = false;
      /* 복제 슬라이드에 도착하면 실제 슬라이드로 즉시(전환 없이) 이동 → 끊김 없는 무한 반복 */
      if (index === count + 1) move(1, true);
      else if (index === 0) move(count, true);
    });
    function next(dir) { if (animating) return; move(index + dir, false); }
    function stop() { clearInterval(timer); timer = null; clearTimeout(resumeTimer); }
    function start() {
      stop();
      if (!mqMobile.matches || prefersReduced || count < 2 || !wrap.classList.contains('is-open')) return;
      active = true;
      move(index || 1, true);
      timer = setInterval(function () { if (!document.hidden) next(1); }, INTERVAL);
    }
    /* 사용자가 조작하면 자동 넘김을 잠시 멈춘 뒤 다시 시작 */
    function pause() { clearInterval(timer); timer = null; clearTimeout(resumeTimer); resumeTimer = setTimeout(start, RESUME); }
    function userGo(to) { pause(); if (animating) return; move(to, false); }
    navs.forEach(function (b) { b.addEventListener('click', function () { pause(); next(Number(b.getAttribute('data-dir'))); }); });

    /* 스와이프 */
    let sx = 0, sy = 0, dragging = false;
    viewport.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; dragging = true; pause(); }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      if (!dragging) return; dragging = false;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
      next(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () { if (document.hidden) { clearInterval(timer); timer = null; } else if (active && wrap.classList.contains('is-open')) start(); });
    /* PC ↔ 모바일 전환 시 슬라이더 시작 · 정지 */
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', function () { if (mqMobile.matches) start(); else { stop(); track.style.transform = ''; } });
    paint();
    return { start: start, stop: function () { active = false; stop(); } };
  }

  /* =======================================================================
     ===== 우측 QUICK MENU (다른 페이지 복사용 구역) =====
     복사 대상 : style.css 의 [11] 블록 + 이 함수 + SITE_DATA.quickMenu
     ======================================================================= */
  const QUICK_ICONS = {
    home:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-6h4v6"/></svg>',
    unit:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17"/><path d="M3.5 11h17M11 3.5v17"/></svg>',
    mail:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13"/><path d="m3 6.5 9 6.5 9-6.5"/></svg>',
    phone:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h3l1.5 4.5-2 1.5a12 12 0 0 0 6 6l1.5-2 4.5 1.5v3c0 1-.8 1.8-1.8 1.7C10.6 19.2 4.8 13.4 4.3 5.3 4.2 4.3 5 3.5 6 3.5Z"/></svg>',
    map:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    premium:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8Z"/></svg>',
    top:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V5M5 12l7-7 7 7"/></svg>'
  };

  function renderQuickMenu(rootSelector) {
    const root = document.querySelector(rootSelector || '#quickMenu');
    if (!root) return;
    const items = (SITE_DATA.quickMenu || []).filter(function (i) { return i && i.enabled !== false; });
    if (!items.length) { root.hidden = true; return; }
    root.hidden = false;
    root.setAttribute('data-mobile', (SITE_DATA.settings && SITE_DATA.settings.quickMobile) || 'bottom');
    root.innerHTML = '';
    if (SITE_DATA.quickMenuTitle) {
      const t = document.createElement('p');
      t.className = 'quick__title'; t.textContent = SITE_DATA.quickMenuTitle;
      root.appendChild(t);
    }
    const list = document.createElement('div');
    list.className = 'quick__list';
    items.forEach(function (d) {
      const a = document.createElement('a');
      a.className = 'quick__item';
      a.innerHTML = '<span class="quick__icon" aria-hidden="true">' + (QUICK_ICONS[d.icon] || QUICK_ICONS.home) + '</span>' +
                    '<span class="quick__label">' + esc(d.label || '') + '</span>';
      if (d.type === 'section') {
        const target = document.getElementById(d.targetId);
        if (target) {
          a.href = '#' + d.targetId;
          a.addEventListener('click', function (e) { e.preventDefault(); scrollToSection(d.targetId); });
        } else {
          a.href = (singleFile ? '#' : './index.html#') + d.targetId;   /* 섹션이 없는 페이지에서는 메인으로 이동 */
        }
      } else if (d.type === 'tel') {
        if (!SITE_TEL) return;                       /* 대표번호가 비어 있으면 항목을 만들지 않음 */
        a.href = TEL_HREF; a.setAttribute('aria-label', TEL_ARIA); a.setAttribute('data-site-tel', '1');
      } else if (d.type === 'sms') {
        if (!SITE_SMS) return;
        a.href = SMS_HREF; a.setAttribute('data-site-sms', '1');
      } else if (d.type === 'kakao') {
        if (!KAKAO_URL) return;
        a.href = KAKAO_URL; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('data-site-kakao', '1');
      } else if (d.type === 'page' && d.page) {
        bindMenuLink(a, d.page);   /* 상단 메뉴와 동일한 실제 페이지 주소(SITE_DATA.pageUrl) · 예 : 타입 → 세대안내 > 평면정보 */
        if (d.page === currentPage) a.classList.add('is-current');
      } else {
        a.href = normalizeUrl(d.url);
        a.target = d.target || '_self';
        if (a.target === '_blank') a.rel = 'noopener';
        /* 현재 보고 있는 서브페이지면 선택 표시 */
        if (d.url && currentPage && d.url.indexOf('page=' + currentPage) > -1) a.classList.add('is-current');
      }
      list.appendChild(a);
    });
    root.appendChild(list);
  }
  /* ===== 우측 QUICK MENU 구역 끝 ===== */

  /* =======================================================================
     방문예약 / 관심고객등록 폼 생성기 (메인 · 서브페이지 공용)
     ======================================================================= */
  function termsHtml(text) {
    return String(text || '').split(/\n/).map(function (raw) {
      const line = raw.trim();
      if (!line) return '';
      if (line.charAt(0) === '■') return '<h4 class="agree__h">' + esc(line) + '</h4>';
      if (/^\d+\.\s/.test(line)) return '<h5 class="agree__h5">' + esc(line) + '</h5>';
      if (/^[*·]\s?/.test(line)) return '<p class="agree__li">' + esc(line.replace(/^[*·]\s?/, '')) + '</p>';
      return '<p>' + esc(line) + '</p>';
    }).join('');
  }
  /* 방문 유입 정보 (방문예약과 함께 저장) : 이 탭에서 처음 들어온 페이지 · 들어오기 직전 주소 · UTM — 탭을 닫으면 사라지는 sessionStorage 1건 (개인정보 없음) */
  function visitInfo() {
    const q = new URLSearchParams(location.search); const utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) { const v = q.get(k); if (v) utm[k] = v.slice(0, 100); });
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem('visitInfo') || 'null'); } catch (err) {}
    if (!saved || typeof saved !== 'object') saved = { landing: location.pathname + location.search, referrer: document.referrer || '', utm: utm };
    else if (Object.keys(utm).length) saved.utm = utm;
    try { sessionStorage.setItem('visitInfo', JSON.stringify(saved)); } catch (err) {}
    return saved;
  }
  visitInfo();   /* 페이지가 열릴 때마다 호출 : 처음 들어온 페이지 · UTM 을 이 탭에 1회 기록 (이후 페이지에서는 기존 기록 유지) */
  /* 필드 너비 : full = 한 줄 전체 · half = 2열 중 한 칸 · auto(또는 미지정) = 긴 입력(문의사항 · 선택 목록 · 동의)은 전체, 짧은 입력은 절반 */
  function fieldIsFull(f) {
    if (f.width === 'half') return false;
    if (f.width === 'full') return true;
    return !!f.full || ['textarea', 'checkbox', 'radio', 'consent', 'custom'].indexOf(f.type) >= 0;
  }
  /* 연락처 3칸 동작 : 숫자만 · 자릿수 제한 · 4자리를 채우면 다음 칸으로 자동 이동(커서는 다음 칸 끝) · 빈 칸에서 Backspace → 앞 칸 ·
     붙여넣기(01012345678 · 010-1234-5678 · 010 1234 5678)는 어느 칸에서든 자동 분리 · 빠른 연속 입력 "11112222" → 1111 / 2222 (넘친 숫자는 다음 칸으로) */
  const PHONE_MAX = [3, 4, 4];
  function digitsOnly(s) { return String(s || '').replace(/[^0-9]/g, ''); }
  function splitPhone(d) {
    d = digitsOnly(d);
    const p1 = d.indexOf('02') === 0 ? 2 : 3;
    if (d.length < 9) return null;
    return [d.slice(0, p1), d.slice(p1, d.length - 4), d.slice(-4)];
  }
  function phoneParts(group) {   /* [앞자리 select, 가운데 4자리, 마지막 4자리] */
    return [group.querySelector('.field__control--p1'), group.querySelector('.field__control--p2'), group.querySelector('.field__control--p3')].filter(Boolean);
  }
  function syncPhone(group) {
    const ins = phoneParts(group); const hid = group.querySelector('input[type="hidden"]');
    const parts = ins.map(function (i) { return digitsOnly(i.value); });
    const full = parts.every(Boolean) ? parts.join('-') : '';
    if (hid) hid.value = full;
    return full;
  }
  /* 앞자리 드롭다운 : PC 에서는 입력칸 너비에 맞춘 목록을 직접 그립니다 (왼쪽 정렬 · 항목 높이 동일 · 선택 항목은 포인트 컬러 배경 + 흰 글자).
     모바일 · 터치 기기는 기기 기본 선택창을 그대로 사용하고, 닫힌 상태 모양(여백 · 화살표)만 PC 와 같게 맞춥니다.
     값 · 전송 · 키보드 동작은 실제 <select> 가 그대로 담당합니다. */
  function wirePrefixDropdown(sel) {
    if (!sel || sel.tagName !== 'SELECT' || sel.__wbPrefix) return; sel.__wbPrefix = true;
    const group = sel.closest('.field__phone'); if (!group) return;
    let list = null, active = -1, inList = false, openedAt = 0;

    function close() {
      if (!list) return;
      if (list.parentNode) list.parentNode.removeChild(list);
      list = null; active = -1; inList = false;
      sel.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', onOutside, true);
      window.removeEventListener('resize', close);
    }
    /* 바깥을 '명확하게' 눌렀을 때만 닫습니다 — 목록 안쪽(항목 · 여백 · 스크롤바)과 입력칸은 제외.
       페이지 스크롤로는 닫지 않습니다. 목록이 입력칸에 붙어 함께 움직이기 때문입니다. */
    function onOutside(e) {
      if (!list) return;
      const t = e.target;
      if (t === sel || (sel.contains && sel.contains(t))) return;
      if (t === list || list.contains(t)) return;
      close();
    }
    function mark() {
      if (!list) return;
      [].forEach.call(list.children, function (it, i) { it.classList.toggle('is-active', i === active); });
      const it = list.children[active]; if (!it) return;
      if (it.offsetTop < list.scrollTop) list.scrollTop = it.offsetTop;
      else if (it.offsetTop + it.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = it.offsetTop + it.offsetHeight - list.clientHeight;
    }
    function pick(i) {
      const o = sel.options[i]; if (!o) return;
      sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); close(); sel.focus();
    }
    function open() {
      if (list) return;
      list = document.createElement('div');
      list.className = 'field__prefix-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', sel.getAttribute('aria-label') || '앞자리 선택');
      [].forEach.call(sel.options, function (o, i) {
        const it = document.createElement('div');
        it.className = 'field__prefix-item' + (i === sel.selectedIndex ? ' is-on' : '');
        it.setAttribute('role', 'option'); it.setAttribute('aria-selected', String(i === sel.selectedIndex));
        it.textContent = o.textContent;
        /* 선택은 click 에서만 — 스크롤(휠 · 드래그 · 스와이프) 중에는 click 이 발생하지 않으므로 값이 바뀌지 않습니다 */
        it.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); pick(i); });
        it.addEventListener('mousemove', function () { active = i; mark(); });
        list.appendChild(it);
      });
      /* 목록 안에서 일어나는 입력은 바깥 클릭으로 취급하지 않습니다 (스크롤바 드래그 · 터치 스크롤 포함) */
      list.addEventListener('pointerdown', function (e) {
        inList = true; e.stopPropagation();
        const item = e.target && e.target.closest ? e.target.closest('.field__prefix-item') : null;
        if (item && e.pointerType === 'mouse') e.preventDefault();     /* 마우스로 항목을 누를 때만 기본 동작 차단(포커스 유지) · 스크롤바 드래그와 손가락 스크롤은 그대로 둡니다 (터치에서 preventDefault 하면 스크롤 제스처가 취소됨) */
      }, true);
      list.addEventListener('mousedown', function (e) { e.stopPropagation(); }, true);
      list.addEventListener('pointerup', function () { setTimeout(function () { inList = false; }, 0); });
      list.addEventListener('pointerenter', function () { inList = true; });
      list.addEventListener('pointerleave', function () { inList = false; });
      list.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true });        /* preventDefault 없음 → 목록이 그대로 스크롤 */
      list.addEventListener('touchstart', function () { inList = true; }, { passive: true });
      list.addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });    /* 손가락 스크롤 차단하지 않음 */
      list.addEventListener('touchend', function () { setTimeout(function () { inList = false; }, 0); }, { passive: true });
      list.addEventListener('scroll', function (e) { e.stopPropagation(); });
      group.appendChild(list);
      list.style.width = sel.offsetWidth + 'px';       /* 입력칸과 같은 너비 · 같은 왼쪽 위치 */
      list.style.left = sel.offsetLeft + 'px';
      list.style.top = (sel.offsetTop + sel.offsetHeight + 4) + 'px';
      sel.setAttribute('aria-expanded', 'true');
      active = sel.selectedIndex; mark();
      openedAt = Date.now();
      document.addEventListener('pointerdown', onOutside, true);
      window.addEventListener('resize', close);
    }
    function toggle() { if (list) close(); else open(); }
    /* PC · 모바일 모두 같은 목록을 사용합니다 (기기 기본 선택창은 열지 않음) */
    sel.addEventListener('pointerdown', function (e) { e.preventDefault(); sel.focus(); toggle(); });
    sel.addEventListener('mousedown', function (e) { e.preventDefault(); });
    sel.addEventListener('click', function (e) { e.preventDefault(); if (!list && Date.now() - openedAt > 400) toggle(); });
    sel.addEventListener('keydown', function (e) {
      if (list) {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, Math.min(sel.options.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1))); mark(); return; }
        if (e.key === 'Tab') close();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); open(); }
    });
    /* 초점이 완전히 빠져나갔을 때만 닫습니다 (목록을 만지는 중이면 유지) */
    sel.addEventListener('focusout', function () {
      setTimeout(function () {
        if (!list || inList) return;
        const a2 = document.activeElement;
        if (a2 === sel || list.contains(a2)) return;
        close();
      }, 0);
    });
  }
  function wirePhoneGroup(group) {
    const ins = phoneParts(group); if (ins.length < 3) return;
    const focusEnd = function (el) { if (!el) return; el.focus(); try { if (el.setSelectionRange) { const n = el.value.length; el.setSelectionRange(n, n); } } catch (err) {} };
    const setAll = function (all) {   /* 전체 번호(붙여넣기 · 자동완성) 를 세 칸에 나눠 담기 — 앞자리는 목록에 있는 값일 때만 바꿉니다 */
      const sel = ins[0];
      if (sel && sel.tagName === 'SELECT') { const has = [].some.call(sel.options, function (o) { return o.value === all[0]; }); if (has) sel.value = all[0]; }
      else if (sel) sel.value = all[0];
      ins[1].value = all[1]; ins[2].value = all[2]; syncPhone(group); focusEnd(ins[2]);
    };
    if (ins[0] && ins[0].tagName === 'SELECT') {
      ins[0].addEventListener('change', function () { syncPhone(group); ins[0].classList.remove('is-error'); if (ins[1] && !ins[1].value) ins[1].focus(); });   /* 고른 앞자리가 바로 전송값에 반영 */
      wirePrefixDropdown(ins[0]);
    }
    ins.forEach(function (inp, i) {
      if (i === 0 && inp.tagName === 'SELECT') return;   /* 앞자리 드롭다운은 숫자 입력 · 자동 이동 대상이 아님 */
      inp.addEventListener('input', function () {
        let v = digitsOnly(inp.value); const max = PHONE_MAX[i];
        if (v.length > max) {   /* 붙여넣기 · 자동완성 · 빠른 입력으로 넘친 숫자 */
          const all = splitPhone(v) ||   /* 이 칸에 넣은 값만으로 완전한 번호면 그대로 사용 (앞자리 중복 방지) */
            splitPhone((i === 0 ? '' : ins.slice(0, i).map(function (x) { return digitsOnly(x.value); }).join('')) + v);
          if (all && all[0]) { setAll(all); return; }
          const rest = v.slice(max); v = v.slice(0, max); inp.value = v;
          if (ins[i + 1]) { ins[i + 1].value = digitsOnly(ins[i + 1].value + rest).slice(0, PHONE_MAX[i + 1]); syncPhone(group); focusEnd(ins[i + 1]); ins[i + 1].dispatchEvent(new Event('input', { bubbles: true })); return; }
        }
        if (inp.value !== v) inp.value = v;
        syncPhone(group);
        if (v.length === max && ins[i + 1]) focusEnd(ins[i + 1]);   /* 가운데 4자리를 다 채우면 마지막 칸으로 이동 (중복 · 누락 없이 정확히 4자리) */
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !inp.value && i > 0) { e.preventDefault(); focusEnd(ins[i - 1]); }
        else if (e.key === 'ArrowLeft' && i > 0 && inp.selectionStart === 0 && inp.selectionEnd === 0) { e.preventDefault(); focusEnd(ins[i - 1]); }
        else if (e.key === 'ArrowRight' && ins[i + 1] && inp.selectionStart === inp.value.length) { e.preventDefault(); ins[i + 1].focus(); try { ins[i + 1].setSelectionRange(0, 0); } catch (err) {} }
      });
      inp.addEventListener('paste', function (e) {
        const txt = (e.clipboardData || window.clipboardData || {}).getData ? (e.clipboardData || window.clipboardData).getData('text') : '';
        const all = splitPhone(txt); if (!all) return;   /* 전체 번호가 아니면 기본 붙여넣기(숫자만 남김은 input 에서) */
        e.preventDefault(); setAll(all);
        ins.forEach(function (x) { x.classList.remove('is-error'); });
      });
      inp.addEventListener('blur', function () { syncPhone(group); });
    });
    syncPhone(group);
  }
  function createReserveForm(cfg) {
    const fields = onlyOn(cfg.fields);
    const agrees = onlyOn(cfg.agreements);
    const prefix = cfg.phonePrefix || '010';
    let fieldsHtml = '';

    fields.forEach(function (f, idx) {
      const id = 'rf-' + f.name;
      const req = f.required ? ' <em>*</em>' : '';
      let control = '';
      if (f.type === 'phone') {
        /* 연락처 : 010 - 입력 - 입력 */
        /* 연락처 3칸 : 앞자리(통신번호 선택 · 직접 입력 가능) - 가운데 4자리 - 마지막 4자리 → 전송값은 phone 하나("010-1234-5678")
           · 가운데 칸에 4자리를 치면 마지막 칸으로 자동 이동 · 전체 번호를 어느 칸에 붙여넣어도 자동 분리 · 숫자만 · 모바일 숫자 키패드 */
        /* 앞자리는 실제 드롭다운(select) : 목록이 눌러서 열리고, 키보드 · 모바일 터치에서도 그대로 동작합니다 */
        const PREFIXES = ['010', '02', '031', '032', '033', '041', '042', '043', '044', '051', '052', '053', '054', '055', '061', '062', '063', '064', '070'];
        const pre0 = PREFIXES.indexOf(prefix) >= 0 ? prefix : '010';
        control =
          '<div class="field__phone" role="group" aria-label="' + esc(f.label) + '">' +
            '<select class="field__control field__control--p1" id="' + id + '" name="' + esc(f.name) + '_p1" aria-label="' + esc(f.label) + ' 앞자리 (통신번호)"' + (f.required ? ' required' : '') + '>' +
              PREFIXES.map(function (x) { return '<option value="' + x + '"' + (x === pre0 ? ' selected' : '') + '>' + x + '</option>'; }).join('') +
            '</select>' +
            '<span class="field__dash" aria-hidden="true">-</span>' +
            '<input class="field__control field__control--p2" type="tel" inputmode="numeric" autocomplete="tel-local-prefix" maxlength="4" name="' + esc(f.name) + '_p2" aria-label="' + esc(f.label) + ' 가운데 4자리"' + (f.required ? ' required' : '') + '>' +
            '<span class="field__dash" aria-hidden="true">-</span>' +
            '<input class="field__control field__control--p3" type="tel" inputmode="numeric" autocomplete="tel-local-suffix" maxlength="4" name="' + esc(f.name) + '_p3" aria-label="' + esc(f.label) + ' 마지막 4자리"' + (f.required ? ' required' : '') + '>' +
            '<input type="hidden" name="' + esc(f.name) + '" value="">' +
          '</div>';
      } else if (f.type === 'time') {
        /* 방문 시간 : SITE_DATA.reserve.visitTimes 배열에서 생성 */
        /* 방문 시간 : 기본 화살표를 없애고 래퍼의 ::after 로 직접 그린 화살표를 오른쪽 24px 에 고정합니다 */
        control = '<div class="visit-time-wrap">' +
          '<select class="field__control" id="' + id + '" name="' + esc(f.name) + '"' + (f.required ? ' required' : '') + '>' +
            '<option value="" selected disabled hidden>시간을 선택해 주세요</option>' +   /* 안내 문구 : 닫힌 상태에만 보이고 펼친 목록에는 넣지 않음 */
            (cfg.visitTimes || []).map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('') +
          '</select>' +
        '</div>';
      } else if (f.type === 'select') {
        control = '<select class="field__control" id="' + id + '" name="' + esc(f.name) + '"' + (f.required ? ' required' : '') + '>' +
          '<option value="">선택해 주세요</option>' +
          (f.options || []).map(o => '<option value="' + esc(o) + '">' + esc(o) + '</option>').join('') + '</select>';
      } else if (f.type === 'textarea') {
        control = '<textarea class="field__control" id="' + id + '" name="' + esc(f.name) + '" placeholder="' + esc(f.placeholder || '') + '"' + (f.required ? ' required' : '') + '></textarea>';
      } else {
        control = '<input class="field__control" type="' + esc(f.type || 'text') + '" id="' + id + '" name="' + esc(f.name) + '" placeholder="' + esc(f.placeholder || '') + '"' + (f.required ? ' required' : '') + '>';
      }
      fieldsHtml +=
        '<div class="field anim' + (fieldIsFull(f) ? ' field--full' : '') + '" data-field="' + esc(f.name) + '" style="--anim-delay:' + (idx * (ANIM.stagger || 130)) + 'ms">' +
          '<label class="field__label" for="' + id + '">' + esc(f.label) + req + '</label>' + control +
          '<span class="field__error" data-error-for="' + esc(f.name) + '"></span>' +
        '</div>';
    });

    const form = document.createElement('form');
    form.className = 'reserve__form';
    form.setAttribute('novalidate', '');
    form.innerHTML =
      '<div class="reserve__fields">' + fieldsHtml + '</div>' +
      '<div class="reserve__agree anim" style="--anim-delay:' + (fields.length * (ANIM.stagger || 130)) + 'ms">' +
        agrees.map(function (a, ai) {
          const pid = 'agree-terms-' + ai + '-' + Math.random().toString(36).slice(2, 7);
          return '<div class="agree">' +
            '<div class="agree__row">' +
              '<label class="check"><input type="checkbox" name="' + esc(a.name) + '"' + (a.required ? ' data-required="1"' : '') + '><span>' + esc(a.label) + '</span></label>' +
              (a.terms ? '<button class="agree__toggle" type="button" aria-expanded="false" aria-controls="' + pid + '">' + esc(a.toggleLabel || '내용보기') + '<i class="agree__chev" aria-hidden="true"></i></button>' : '') +
            '</div>' +
            (a.terms ? '<div class="agree__panel" id="' + pid + '" aria-hidden="true"><div class="agree__panel-inner"><div class="agree__terms" data-inner-scroll>' + termsHtml(a.terms) + '</div></div></div>' : '') +
          '</div>';
        }).join('') +
        '<span class="field__error" data-error-for="__agree" role="alert"></span>' +
      '</div>' +
      '<div class="reserve__hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +   /* 스팸 방지용 숨김 입력 (사람은 채우지 않음) */
      '<div class="reserve__alert" role="alert" hidden></div>' +
      '<button class="btn reserve__submit anim" style="--anim-delay:' + ((fields.length + 1) * (ANIM.stagger || 130)) + 'ms" type="submit"><span class="reserve__submit-label">' + esc(cfg.submitLabel || '방문예약하기') + '</span><i class="reserve__spinner" aria-hidden="true"></i></button>' +
      '<div class="reserve__done" role="status" aria-live="polite" tabindex="-1"></div>';
    form.__validators = [];   /* cms.js 가 폼 빌더(스키마) 항목의 추가 검사를 등록 : function () { return 잘못된 요소 | null } */
    $$('.field__phone', form).forEach(wirePhoneGroup);

    /* 약관 박스 안의 휠 · 트랙패드 · 터치는 박스만 스크롤 — 페이지 원스크롤(섹션 이동)로 넘기지 않음
       · 스크롤할 여지가 있으면 브라우저 기본 스크롤 그대로 (preventDefault 없음)
       · 맨 위에서 더 위로 / 맨 아래에서 더 아래로 굴리면 preventDefault → 페이지로 이어지지 않음 (CSS overscroll-behavior:contain 과 함께)
       · 박스 밖으로 포인터가 나가면 기존 페이지 스크롤 그대로 */
    function wireInnerScroll(box) {
      box.addEventListener('wheel', function (e) {
        e.stopPropagation();
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        const max = box.scrollHeight - box.clientHeight;
        if (max <= 1 || (e.deltaY < 0 && box.scrollTop <= 0) || (e.deltaY > 0 && box.scrollTop >= max - 1)) e.preventDefault();
      }, { passive: false });
      box.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
      box.addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });   /* 손가락 스크롤은 막지 않음 */
    }
    function setError(name, msg) {
      const el = form.querySelector('[data-error-for="' + name + '"]');
      if (el) el.textContent = msg || '';
    }
    /* 약관 '내용보기' 토글 : aria-expanded · 키보드(버튼) · 부드러운 펼침 · 페이지 스크롤 위치 유지 */
    $$('.agree__toggle', form).forEach(function (btn) {
      const panel = form.querySelector('#' + btn.getAttribute('aria-controls'));
      if (!panel) return;
      btn.addEventListener('click', function () {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.classList.toggle('is-open', open);
        panel.classList.toggle('is-open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      });
      const box = panel.querySelector('.agree__terms'); if (box) wireInnerScroll(box);
    });
    /* ---------- 실제 접수 : 통합웹빌더 서버 API (cms-config.js 의 api · siteKey) 로 전송 → 통합웹빌더관리자 › 방문예약 관리에 저장 ----------
       · 전송 중 : 버튼 비활성 + "전송 중…" · 잠금(sending) + 1회용 접수 토큰(_token · 서버가 같은 토큰은 한 번만 저장) → 연타 · 재시도에도 중복 저장 없음
       · 성공 : 입력값 초기화 → 폼 자리에 접수 완료 안내(접수번호) · 실패 : 입력 내용 유지 + 버튼 위 오류 안내 (브라우저 기본 알림창 · 페이지 이동 없음) */
    const submitBtn = form.querySelector('.reserve__submit'), submitLabel = form.querySelector('.reserve__submit-label');
    const alertBox = form.querySelector('.reserve__alert'), doneBox = form.querySelector('.reserve__done');
    const telText = (SITE_DATA.site && SITE_DATA.site.tel) || '';
    const M = cfg.messages || {};
    /* 안내 문구 : 통신 오류는 입력 내용이 유지됨을 알리고 [다시 시도]를 제공 — "온라인 접수 불가" 같은 고정 안내는 없음 (접수 주소는 항상 존재) */
    const MSG = {
      network: M.network || ('예약 접수 중 문제가 발생했습니다. 입력하신 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.' + (telText ? ' (전화 문의 ' + telText + ')' : '')),
      fail: M.fail || '접수하지 못했습니다. 입력 내용을 확인한 뒤 다시 신청해 주세요.',
      busy: M.busy || '요청이 많아 접수가 지연되고 있습니다. 잠시 후 다시 신청해 주세요.',
      server: M.server || ('예약 접수 중 문제가 발생했습니다. 입력하신 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.' + (telText ? ' (전화 문의 ' + telText + ')' : ''))
    };
    const CHECK_SVG = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function newToken() {
      try { const a = new Uint8Array(16); window.crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
      catch (err) { return Date.now().toString(16) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2); }
    }
    let sending = false, startedAt = Date.now(), token = newToken();
    /* 접수 주소 : ① cms-config 의 reserve(홈페이지와 같은 서버의 wb-api/reserve.php) ② 통합웹빌더 서버 API ③ 기본값 = 같은 서버의 ./wb-api/reserve.php
       — 방문자 브라우저에서 관리자 PC 로 보내는 주소는 사용하지 않음 · 데모 응답 · 화면 표시용 가짜 성공 없음 */
    function endpoint() {
      const c = window.CMS_CONFIG || {};
      const formKey = form.getAttribute('data-form-key') || 'reserve';
      if (c.reserve && formKey === 'reserve') return String(c.reserve);
      const api = String(c.api || '').replace(/\/+$/, '');
      if (api && c.siteKey && c.enabled !== false && !/^https?:\/\/(l[o]calh[o]st|12[7]\.0\.0\.1|\[::1\])(:\d+)?$/i.test(api)) { const p = '/api/public/' + encodeURIComponent(c.siteKey) + '/forms/' + encodeURIComponent(formKey); return /\?r=$/.test(api) ? api + p.replace(/^\/api/, '') : api + p; }   /* 운영(PHP) 서버는 api/index.php?r=/public/… 형식 */
      return './wb-api/reserve.php';
    }
    const ALERT_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5v5.5M12 16.2v.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    function showAlert(msg, kind, retry) {
      if (!alertBox) return;
      alertBox.innerHTML = ''; alertBox.hidden = !msg;
      alertBox.classList.toggle('reserve__alert--info', kind === 'info');
      if (!msg) return;
      const ic = document.createElement('span'); ic.className = 'reserve__alert-icon'; ic.innerHTML = ALERT_ICON; alertBox.appendChild(ic);
      const tx = document.createElement('span'); tx.className = 'reserve__alert-text'; tx.textContent = msg; alertBox.appendChild(tx);
      if (retry) { const b = document.createElement('button'); b.type = 'button'; b.className = 'reserve__retry'; b.textContent = '다시 시도'; b.addEventListener('click', function () { showAlert(''); send(); }); alertBox.appendChild(b); }
      alertBox.scrollIntoView({ block: 'nearest', behavior: prefersReduced ? 'auto' : 'smooth' });
    }
    /* 접수 완료 안내 : 두 문장을 줄바꿈으로 나눠 표시 (CSS white-space:pre-line) — 예전 기본 문구가 DB 에 남아 있어도 이 문구로 표시 */
    const DONE_TEXT = '고객님의 방문예약이 정상적으로 접수되었습니다.\n본 모델하우스 담당직원이 예약안내차 곧 전화를 드리겠습니다. 감사합니다.';
    const LEGACY_MSG = { '전송 중…': '접수 중...', '전송 중...': '접수 중...', '방문예약이 접수되었습니다': '방문예약이 정상적으로 접수되었습니다.', '방문예약이 접수되었습니다.': '방문예약이 정상적으로 접수되었습니다.', '담당자가 확인 후 순차적으로 연락드리겠습니다.': DONE_TEXT, '담당자가 확인 후 연락드리겠습니다.': DONE_TEXT, '담당자가 확인 후 안내 연락을 드리겠습니다.': DONE_TEXT };
    function msgOf(v, def) { v = String(v || '').trim(); if (!v) return def; if (v.replace(/\s+/g, ' ') === DONE_TEXT.replace(/\s+/g, ' ')) return DONE_TEXT; return LEGACY_MSG[v] || v; }   /* 한 줄로 저장된 같은 안내문도 두 줄로 */
    function setSending(on) {
      sending = !!on;
      form.classList.toggle('is-sending', sending); form.setAttribute('aria-busy', sending ? 'true' : 'false');
      if (submitBtn) submitBtn.disabled = sending;
      if (submitLabel) submitLabel.textContent = sending ? msgOf(cfg.sendingLabel, '접수 중...') : (cfg.submitLabel || '방문예약 신청');
    }
    function succeed(j) {
      form.reset();                                                /* 성공 후 입력값 초기화 */
      $$('.field__control', form).forEach(function (c) { c.classList.remove('is-error'); });
      $$('.field__error', form).forEach(function (el) { el.textContent = ''; });
      token = newToken(); startedAt = Date.now();                  /* 다음 접수는 새 토큰 */
      doneBox.innerHTML =
        '<span class="reserve__done-icon" aria-hidden="true">' + CHECK_SVG + '</span>' +
        '<p class="reserve__done-title">' + esc(msgOf(j.title || cfg.doneTitle, '방문예약이 정상적으로 접수되었습니다.')) + '</p>' +
        '<p class="reserve__done-text">' + esc(msgOf(j.text || cfg.doneText, DONE_TEXT)) + '</p>' +
        '<button class="btn btn--line btn--sm reserve__again" type="button">확인</button>';
      doneBox.classList.add('is-on'); form.classList.add('is-done');
      doneBox.querySelector('.reserve__again').addEventListener('click', function () {
        form.classList.remove('is-done'); doneBox.classList.remove('is-on'); doneBox.innerHTML = ''; startedAt = Date.now();
      });
      try { doneBox.focus({ preventScroll: true }); } catch (err) {}
      doneBox.scrollIntoView({ block: 'center', behavior: prefersReduced ? 'auto' : 'smooth' });
      try { document.dispatchEvent(new CustomEvent('reserve:submitted', { detail: { formKey: form.getAttribute('data-form-key') || 'reserve', receipt: j.receipt || '' } })); } catch (err) {}
    }
    function fail(res) {
      const errs = res.j.errors || {}; let first = null;
      Object.keys(errs).forEach(function (k) {
        if (!/^[\w-]+$/.test(k)) return;
        const isAgree = !!form.querySelector('.agree input[name="' + k + '"]');
        const el = form.querySelector('[data-error-for="' + (isAgree ? '__agree' : k) + '"]');
        if (el) { el.textContent = errs[k]; first = first || el; }
      });
      const server = res.status >= 500 || res.status === 503;
      showAlert(server ? MSG.server : (res.j.error || (res.status === 429 ? MSG.busy : MSG.fail)), '', server || res.status === 429);
    }
    function send() {
      if (sending) return;                                         /* 중복 클릭 · Enter 연타 방지 */
      showAlert('');
      if (form.__noSubmit) { showAlert(form.__noSubmit, 'info'); return; }   /* 편집 · 미리보기 화면 (cms.js 가 지정) */
      const url = endpoint();
      const payload = {};
      new FormData(form).forEach(function (v, k) { if (/_p[123]$/.test(k)) return; if (/\[\]$/.test(k)) { const kk = k.slice(0, -2); (payload[kk] = payload[kk] || []).push(v); } else payload[k] = v; });
      const vi = visitInfo();
      payload.site_key = (window.CMS_CONFIG || {}).siteKey;
      payload._token = token; payload._ts = Math.floor(startedAt / 1000);
      payload._page = location.pathname + location.search;          /* 신청한 페이지 */
      payload._landing = vi.landing || '';                         /* 유입 페이지 (이 탭에서 처음 들어온 페이지) */
      payload._referrer = vi.referrer || '';                       /* 이전 페이지 (들어오기 직전 주소) */
      payload._utm = vi.utm || {};
      setSending(true);
      const ctrl = ('AbortController' in window) ? new AbortController() : null;
      const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      fetch(url, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j = j || {}; return { status: r.status, ok: r.ok && j.ok === true, j: j }; }); })
        .then(function (res) {
          clearTimeout(timer); setSending(false);
          if (!res.ok) { fail(res); return; }
          if (res.j.redirect) { location.href = res.j.redirect; return; }
          succeed(res.j);
        })
        .catch(function () { clearTimeout(timer); setSending(false); showAlert(MSG.network, '', true); });   /* 통신 실패 · 시간 초과(15초) : 입력 유지 + [다시 시도] */
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();                                          /* 페이지 이동 없이 현재 화면에서 접수 */
      if (sending) return;
      let ok = true, firstBad = null;
      $$('.field__control', form).forEach(function (c) {
        c.classList.remove('is-error');
        setError(c.name.replace(/_p[123]$/, ''), '');
      });
      /* 필수 입력 검사 */
      $$('.field', form).forEach(function (box) {
        const controls = $$('.field__control', box);
        const required = controls.some(function (c) { return c.hasAttribute('required'); });
        if (!required) return;
        const empty = controls.some(function (c) { return !(c.value || '').trim(); });
        const name = (controls[0].name || '').replace(/_p[123]$/, '');
        if (empty) {
          ok = false;
          controls.forEach(function (c) { if (!(c.value || '').trim()) c.classList.add('is-error'); });
          setError(name, '필수 입력 항목입니다.');
          firstBad = firstBad || controls[0];
        } else if (box.querySelector('.field__phone')) {
          const full = syncPhone(box.querySelector('.field__phone'));
          if (!/^0\d{1,2}-\d{3,4}-\d{4}$/.test(full)) {
            ok = false;
            controls.forEach(function (c) { c.classList.add('is-error'); });
            setError(name, '연락처를 정확히 입력해 주세요. (예 010-1234-5678)');
            firstBad = firstBad || controls[0];
          }
        }
      });
      const needAgree = $$('input[data-required="1"]', form);
      const agreeOk = needAgree.every(function (i) { return i.checked; });
      setError('__agree', agreeOk ? '' : '필수 동의 항목에 체크해 주세요.');
      if (!agreeOk) {
        ok = false;
        const bad = needAgree.filter(function (i) { return !i.checked; })[0];
        bad.closest('.agree').classList.add('is-error');
        if (!firstBad) firstBad = bad;     /* 신청 버튼을 누르면 동의 항목으로 포커스 이동 + 안내 문구 표시 */
      } else { $$('.agree', form).forEach(function (a) { a.classList.remove('is-error'); }); }
      (form.__validators || []).forEach(function (fn) { const bad = fn(); if (bad) { ok = false; firstBad = firstBad || bad; } });   /* 폼 빌더 항목 추가 검사 (cms.js) */
      if (!ok) { if (firstBad && firstBad.focus) firstBad.focus(); return; }
      send();
    });
    return form;
  }

  /* =======================================================================
     스크롤 등장 애니메이션
     ======================================================================= */
  function initAnimations() {
    /* 메인페이지의 .home-section 내부 요소는 initHomeScroll 의 revealSection 이 담당합니다. (IntersectionObserver 중복 제거) */
    const targets = $$('.anim').filter(function (el) { return !(isIndex && el.closest && el.closest('.home-section')); });
    if (ANIM.enabled === false || prefersReduced || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    const step = ANIM.stagger || 120;
    $$('[data-anim-group]').forEach(function (group) {
      $$('.anim', group).forEach(function (el, i) { el.style.setProperty('--anim-delay', (i * step) + 'ms'); });
    });
    targets.forEach(function (el) {
      if (el.style.getPropertyValue('--anim-delay')) return;
      const sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, c => c.classList.contains('anim')) : [];
      el.style.setProperty('--anim-delay', (Math.max(sibs.indexOf(el), 0) * step) + 'ms');
    });
    function show(el) {
      const img = (el.classList.contains('anim--image') || el.classList.contains('anim--env')) ? el.querySelector('img') : null;
      if (img && !img.complete) {
        let done = false;
        const go = function () { if (done) return; done = true; el.classList.add('is-in'); };
        img.addEventListener('load', go, { once: true });
        img.addEventListener('error', go, { once: true });
        setTimeout(go, 700);
        return;
      }
      el.classList.add('is-in');
    }
    /* 뷰포트에 들어오기 조금 전(아래 10%)부터 시작하고, 한 번 나타난 요소는 다시 관찰하지 않습니다. */
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 10% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* =======================================================================
     헤더 컬러 자동 전환 : 헤더 바로 아래 지점의 섹션을 기준으로 판단
     ======================================================================= */
  function updateHeaderTheme() {
    const header = document.getElementById('header');
    if (!header) return;
    if (header.classList.contains('is-mega-open') || header.classList.contains('is-menu-open')) return;
    const x = Math.round(window.innerWidth / 2);
    const y = header.offsetHeight + 8;
    let theme = null;
    const el = document.elementFromPoint ? document.elementFromPoint(x, y) : null;
    const zone = el && el.closest ? el.closest('[data-header-theme]') : null;
    if (zone) theme = zone.getAttribute('data-header-theme');
    if (!theme) {
      /* elementFromPoint 로 찾지 못한 경우(화면 밖 등) 좌표 계산으로 보완 */
      const line = window.pageYOffset + y;
      $$('[data-header-theme]').forEach(function (z) {
        const top = z.getBoundingClientRect().top + window.pageYOffset;
        if (top <= line && line < top + z.offsetHeight) theme = z.getAttribute('data-header-theme');
      });
    }
    if (!theme && window.pageYOffset < 10) {
      const first = $('[data-header-theme]');
      if (first) theme = first.getAttribute('data-header-theme');
    }
    theme = theme || 'solid';
    if (!headerTransparent()) theme = 'solid';   /* 투명 헤더를 끈 사이트 · 페이지 */
    if (header.classList.contains('is-solid') === (theme === 'solid') && header.classList.contains('is-overlay') === (theme === 'overlay')) return;   /* 같은 테마면 아무것도 바꾸지 않음 */
    /* 전환 순간 색 전환 애니메이션을 끄고(is-switching) 즉시 바꿉니다 → 전화 아이콘 · 대표번호 · 메뉴가 배경과 동시에 바뀌어 흰 배경 위 흰 글자로 잠깐 사라지는 깜빡임이 없습니다 (같은 SVG 요소 · 색만 변경) */
    header.classList.add('is-switching');
    header.classList.toggle('is-overlay', theme === 'overlay');
    header.classList.toggle('is-solid', theme === 'solid');
    void header.offsetWidth;
    requestAnimationFrame(function () { requestAnimationFrame(function () { header.classList.remove('is-switching'); }); });
  }

  /* 배경의 아주 느린 패럴랙스 ([data-parallax] 요소) */
  function initParallax() {
    if (prefersReduced || (ANIM && ANIM.parallax === false)) return;
    const items = $$('[data-parallax]');
    if (!items.length) return;
    let ticking = false;
    function update() {
      if (document.documentElement.classList.contains('is-scrolling')) { ticking = false; return; }
      items.forEach(function (el) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
        const speed = parseFloat(el.getAttribute('data-parallax')) || 0.08;
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true; requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* -----------------------------------------------------------------
     [메인페이지 전용] 원스크롤 : 휠 한 번에 한 섹션씩 이동
     · 소메뉴 페이지에는 적용되지 않습니다.
     · 입력창 · 셀렉트 · 팝업 · 메가메뉴 · 내부 스크롤 영역 위에서는 동작하지 않습니다.
     ----------------------------------------------------------------- */
  function initHomeScroll() {
    if (window.__homeScrollInitialized) return;    /* 중복 초기화 방지 */
    const sections = $$('.home-section');
    if (!sections.length) return;
    /* 푸터도 이동 대상 : 방문예약(마지막 섹션)에서 한 번 더 내리면 푸터(실제 높이) · 푸터에서 올리면 방문예약 */
    const footerEl = document.getElementById('footer');
    if (footerEl) sections.push(footerEl);
    const FP = SITE_DATA.fullPageScroll || {};
    if (FP.enabled === false) return;
    window.__homeScrollInitialized = true;
    document.documentElement.classList.add('is-home');

    const DURATION   = FP.duration || 1500;                 /* 섹션 이동 시간 */
    const THRESHOLD  = FP.wheelThreshold || 40;             /* 이 값 이상 누적되어야 이동 */
    const COOLDOWN   = FP.wheelCooldown != null ? FP.wheelCooldown : 90;   /* 이동 종료 직후 관성 휠 무시 */
    const REVEAL_GAP = FP.revealDelay != null ? FP.revealDelay : 100;
    const REVEAL_AT  = 0.55;                                /* 이동 55% 지점부터 콘텐츠 등장 */

    /* 등장 속도 · 순차 지연을 CSS 변수로 반영 (텍스트 0.8초 · 이미지 1초 · 항목 간 120ms) */
    const root = document.documentElement;
    root.style.setProperty('--reveal-duration', (FP.revealDuration || 800) + 'ms');
    root.style.setProperty('--image-reveal-duration', (FP.imageRevealDuration || 1000) + 'ms');
    root.style.setProperty('--animation-delay-step', (FP.staggerDelay || 120) + 'ms');

    let current = 0, pendingIndex = 0, moving = false, accumulator = 0, rafId = 0, endedAt = 0;
    /* 새로고침 · 주소창 이동 후 브라우저가 이전 위치로 되돌리며 화면이 튀지 않도록 직접 관리합니다. */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    /* 섹션 콘텐츠 등장 (제목 → 설명 → 이미지 순) */
    function revealSection(sec) {
      if (sec.classList.contains('is-active')) return;
      sec.classList.add('is-active');
      const items = $$('.anim', sec);
      const step = FP.staggerDelay || 120;
      items.forEach(function (el, i) {
        if (!el.style.getPropertyValue('--anim-delay')) el.style.setProperty('--anim-delay', (i * step) + 'ms');
        el.classList.add('is-in');
      });
    }
    /* prefers-reduced-motion : 휠 가로채기 · 이동 애니메이션 없이 모든 섹션을 바로 표시 */
    if (prefersReduced) { sections.forEach(revealSection); return; }

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const visible = entry.intersectionRect ? entry.intersectionRect.height : 0;
          if (entry.intersectionRatio >= 0.5 || visible >= window.innerHeight * 0.35) {
            setTimeout(function () { revealSection(entry.target); }, REVEAL_GAP);
          }
          if (entry.intersectionRatio < 0.5 || moving) return;
          const idx = sections.indexOf(entry.target);
          if (idx > -1) current = idx;
        });
      }, { threshold: [0.1, 0.25, 0.5] });
      sections.forEach(function (sec) { sec.__fpObserved = true; io.observe(sec); });
    } else {
      sections.forEach(revealSection);
    }
    /* 관리자에서 추가한 섹션(.cms-block)을 이동 대상에 포함 : cms.js 가 블록을 넣은 뒤 호출 → 문서 순서대로 목록을 다시 만듦 (푸터는 항상 마지막) */
    window.__homeScrollRefresh = function () {
      const cur = sections[current];
      const list = $$('.home-section, .cms-block').filter(function (el) { return getComputedStyle(el).display !== 'none' && el.offsetHeight > 0; });
      if (footerEl) list.push(footerEl);
      sections.length = 0;
      list.forEach(function (sec) { sections.push(sec); if (io && !sec.__fpObserved) { sec.__fpObserved = true; io.observe(sec); } if (!io) revealSection(sec); });
      const i = sections.indexOf(cur); if (i >= 0) current = i; else syncCurrent();
    };

    /* cubic-bezier(.22, 1, .36, 1) 과 동일한 easing */
    const ease = cubicBezier(0.22, 1, 0.36, 1);

    /* requestAnimationFrame 기반 이동 : 목적지를 고정하고, 끝난 뒤 위치를 다시 보정하지 않습니다. */
    function animateScrollTo(targetTop, onReveal, onEnd) {
      cancelAnimationFrame(rafId);
      const startTop = window.pageYOffset;
      const distance = targetTop - startTop;
      if (Math.abs(distance) < 2) { window.scrollTo(0, targetTop); if (onReveal) onReveal(); if (onEnd) onEnd(); return; }
      const startTime = performance.now();
      let revealed = false;
      (function frame(now) {
        const t = Math.min(1, (now - startTime) / DURATION);
        window.scrollTo(0, startTop + distance * ease(t));
        if (!revealed && t >= REVEAL_AT) { revealed = true; if (onReveal) onReveal(); }
        if (t < 1) rafId = requestAnimationFrame(frame);
        else if (onEnd) onEnd();
      })(startTime);
    }
    function finishMove() {
      current = pendingIndex;        /* 현재 섹션 번호는 이동이 끝난 뒤 한 번만 갱신 */
      moving = false; accumulator = 0; endedAt = performance.now();
      document.documentElement.classList.remove('is-scrolling');
    }
    /* 첫 섹션 안의 단계(heroState 0 슬라이드 ↔ 1 써머리 오버레이) 전환 — 페이지는 움직이지 않고 레이어만 바뀝니다 · 전환 + 쿨다운 동안 입력 잠금 */
    function stepStage(sec, to) {
      moving = true; accumulator = 0;
      document.documentElement.classList.add('is-scrolling');
      sec.__stage.set(to).then(function () {
        moving = false; accumulator = 0;
        endedAt = performance.now() + 120;   /* 전환 종료 후 짧은 쿨다운 : 트랙패드 관성 입력으로 다음 단계까지 넘어가지 않음 (잠금 합계 약 1.1s) */
        document.documentElement.classList.remove('is-scrolling');
      });
    }
    /* 휠 · 키 한 번 = 한 단계 : 단계가 있는 첫 섹션은 단계부터(슬라이드 → 써머리 → 다음 섹션), 그 다음은 섹션 한 칸 이동 */
    function step(dir) {
      if (moving) return;
      const sec = sections[current];
      const st = sec && sec.__stage;
      if (st && st.count > 1) {
        const to = st.index + dir;
        if (to >= 0 && to < st.count) { stepStage(sec, to); return; }
      }
      /* 화면보다 긴 추가 섹션 : 다음 섹션으로 넘어가기 전에 그 섹션 안을 먼저 스크롤 (내용이 건너뛰어지지 않게) */
      if (sec && sec.classList.contains('cms-block')) {
        const r = sec.getBoundingClientRect(); const vh = window.innerHeight; const head = headerHeight();
        if (r.height > vh - head + 24) {
          if (dir > 0 && r.bottom > vh + 8) { moving = true; pendingIndex = current; animateScrollTo(window.pageYOffset + Math.min(r.bottom - vh, (vh - head) * 0.85), null, finishMove); return; }
          if (dir < 0 && r.top < head - 8) { moving = true; pendingIndex = current; animateScrollTo(window.pageYOffset - Math.min(head - r.top, (vh - head) * 0.85), null, finishMove); return; }
        }
      }
      /* 마지막(푸터)에서 아래로 : 문서 끝까지 남은 만큼 이동 (푸터가 잘린 채 멈추지 않음) */
      if (dir > 0 && current >= sections.length - 1) {
        const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (window.pageYOffset < maxTop - 1) { moving = true; pendingIndex = current; animateScrollTo(maxTop, null, finishMove); }
        return;
      }
      moveToSection(current + dir);
    }
    function moveToSection(index) {
      if (moving) return;
      const next = Math.max(0, Math.min(index, sections.length - 1));
      if (next === current) { accumulator = 0; return; }
      const target = sections[next];
      /* 단계가 있는 첫 섹션으로 들어갈 때 : 아래에서 올라오면 써머리 상태(마지막 단계)로 복귀 */
      if (target.__stage && target.__stage.count > 1 && next < current) target.__stage.set(target.__stage.count - 1);
      const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;   /* 방문예약 : 헤더 아래에서 시작 */
      let top = target.getBoundingClientRect().top + window.pageYOffset - margin;
      top = Math.min(Math.max(top, 0), maxTop);   /* 목적지 고정 (푸터는 문서 끝까지) */
      moving = true;
      document.documentElement.classList.add('is-scrolling');   /* 이동 중 패럴랙스 일시 중지 */
      pendingIndex = next;
      animateScrollTo(top,
        function () { setTimeout(function () { revealSection(target); }, REVEAL_GAP); },
        finishMove);                                          /* 잠금은 실제 애니메이션 종료 시 해제 */
    }
    /* 탭이 숨겨지면 rAF 가 멈추므로 이동을 즉시 마무리합니다. */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden || !moving) return;
      cancelAnimationFrame(rafId);
      const target = sections[pendingIndex];
      window.scrollTo(0, Math.max(target.getBoundingClientRect().top + window.pageYOffset, 0));
      revealSection(target); finishMove();
    });
    /* 메뉴 · 퀵메뉴 · 해시 링크도 같은 이동 함수를 사용합니다. */
    window.__homeScrollTo = function (id) {
      let el = document.getElementById(id);
      /* 메뉴 · 버튼 클릭은 진행 중인 이동을 끊고 바로 새 목적지로 */
      if (moving) { cancelAnimationFrame(rafId); moving = false; accumulator = 0; document.documentElement.classList.remove('is-scrolling'); syncCurrent(); }
      let stageIndex = 0;
      /* 섹션 안의 요소 id(summary) 는 그 요소가 속한 섹션으로 이동 — 써머리 레이어면 써머리 단계로 */
      if (el && !el.classList.contains('home-section')) {
        const host = el.closest('.home-section');
        if (host && host.__stage) { stageIndex = el.getAttribute('data-stage') === 'summary' ? 1 : 0; el = host; }
        else if (host) el = host;
      }
      const idx = sections.indexOf(el);
      if (idx < 0) return false;
      if (idx === current) {
        if (el.__stage && el.__stage.index !== stageIndex && !moving) { stepStage(el, stageIndex); return true; }
        const startTop = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0));
        if (Math.abs(startTop - window.pageYOffset) > 2) { moving = true; pendingIndex = idx; document.documentElement.classList.add('is-scrolling'); animateScrollTo(startTop, null, finishMove); }
        return true;
      }
      moveToSection(idx);
      if (el.__stage) el.__stage.set(stageIndex);   /* 퀵메뉴 홈(hero) → 슬라이드 상태 · summary → 써머리 상태 */
      return true;
    };
    function syncCurrent() {
      let best = current, bestVisible = -1;
      sections.forEach(function (sec, i) {
        const r = sec.getBoundingClientRect();
        const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        if (visible > bestVisible) { bestVisible = visible; best = i; }
      });
      current = best;
    }
    function blocked(target) {
      if (document.body.classList.contains('is-locked')) return true;   /* PC 팝업 펼침(오버레이) · 모바일 메뉴 열림 : 배경 페이지 이동 없음 */
      if (!target || !target.closest) return false;
      return !!target.closest('input, textarea, select, .wbnote, .header__mega, .mobile-nav, .modal, .agree__terms, [data-inner-scroll]');   /* 개인정보 약관 등 내부 스크롤 영역 위에서는 섹션 이동 없음 */
    }
    /* 휠 : 데스크톱에서만 · 한 번의 입력(누적 임계값)당 한 섹션 · 이동 중과 종료 직후 관성은 무시
       (터치 스크롤에는 적용하지 않고, wheel 만 preventDefault 가 필요해 non-passive 입니다) */
    function onWheel(e) {
      if (mqTablet.matches) return;
      if (blocked(e.target)) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;        /* 가로 입력(트랙패드 좌우 · Shift+휠)은 섹션 이동에 쓰지 않음 — 메인 슬라이드(main.js)가 처리 */
      const sec = sections[current];
      if (sec) {
        const r = sec.getBoundingClientRect();
        const tall = sec.scrollHeight > window.innerHeight + 4;
        if (tall && ((e.deltaY > 0 && r.bottom > window.innerHeight + 4) || (e.deltaY < 0 && r.top < -4))) return;
      }
      e.preventDefault();
      if (moving) return;
      if (performance.now() - endedAt < COOLDOWN) return;
      if ((accumulator > 0 && e.deltaY < 0) || (accumulator < 0 && e.deltaY > 0)) accumulator = 0;   /* 방향이 바뀌면 누적 초기화 */
      accumulator += e.deltaY;
      if (Math.abs(accumulator) < THRESHOLD) return;
      step(accumulator > 0 ? 1 : -1);
    }
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (mqTablet.matches || blocked(e.target)) return;
      if (e.key === 'PageDown' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      if (e.key === 'PageUp' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    });
    /* 일반 스크롤(태블릿 · 모바일 · 스크롤바) : passive 로 받고 계산은 rAF 로 한 번만 */
    let scrollRaf = 0, revealTimer = null;
    function revealVisible() {
      sections.forEach(function (sec) {
        const r = sec.getBoundingClientRect();
        const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        if (visible >= Math.min(window.innerHeight, sec.offsetHeight) * 0.35) revealSection(sec);
      });
    }
    window.addEventListener('scroll', function () {
      if (moving) return;
      if (!scrollRaf) scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; syncCurrent(); });
      clearTimeout(revealTimer); revealTimer = setTimeout(revealVisible, 200);
    }, { passive: true });
    window.addEventListener('resize', syncCurrent);
    syncCurrent();
    setTimeout(function () { if (sections[current]) revealSection(sections[current]); }, 200);
    setTimeout(revealVisible, 1200);
  }

  /* CSS cubic-bezier 와 동일한 곡선을 JS 에서 계산 */
  function cubicBezier(x1, y1, x2, y2) {
    function A(a1, a2) { return 1 - 3 * a2 + 3 * a1; }
    function B(a1, a2) { return 3 * a2 - 6 * a1; }
    function C(a1) { return 3 * a1; }
    function calc(t, a1, a2) { return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t; }
    function slope(t, a1, a2) { return 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const s = slope(t, x1, x2); if (s === 0) break; t -= (calc(t, x1, x2) - x) / s; }
      return calc(t, y1, y2);
    };
  }

  function initPageEffects() {
    bindSiteValues(document.body);   /* 문구 토큰 · "사이트 대표번호 사용" 링크 연결 */
    initAnimations();
    initParallax();
    if (isIndex) initHomeScroll();
    updateHeaderTheme();
    const topBtn = $('#topBtn');
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateHeaderTheme();
        if (topBtn) topBtn.classList.toggle('is-visible', window.pageYOffset > 320);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { updateHeaderTheme(); });
    window.addEventListener('load', function () { setTimeout(updateHeaderTheme, 120); });
    onScroll();

    if (topBtn) topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });

    /* 페이지 내부 앵커 링크 */
    document.addEventListener('click', function (e) {
      const a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || a.hasAttribute('data-section')) return;
      const id = a.getAttribute('href').slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault(); closeMobileNav(); scrollToSection(id);
    });
    window.addEventListener('load', function () {
      const id = window.location.hash.slice(1);
      if (id && document.getElementById(id)) setTimeout(function () { scrollToSection(id); }, 260);
    });

    let resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refreshMedia, 250);
    });
  }

  /* =======================================================================
     공통 부트 : 헤더 · 메뉴 · 팝업 · 퀵메뉴 · 모달 생성
     ======================================================================= */
  /* =======================================================================
     최초 진입 인트로 : 브랜드명을 잠깐 보여준 뒤 메인 첫 화면(조감도)으로 이어집니다.
     ----------------------------------------------------------------------
     · 문구는 사이트 설정(site.intro) — 없으면 현장명(site.name) 한 줄만 보여줍니다.
     · 실행 조건 : 메인 화면 · 이 브라우저 세션에서 처음 · 에디터(관리자 편집 · 미리보기) 아님
     · 주소에 ?intro=1 을 붙이면 다시 볼 수 있고, ?intro=0 이면 건너뜁니다. (관리자 [인트로 보기] 가 사용)
     · 화면을 누르거나 ESC 를 누르면 즉시 넘어갑니다.
     · 안전장치 : 어떤 경우에도 5초 안에 인트로를 걷어내고 홈페이지를 보여줍니다. (타이머를 가장 먼저 등록)
     ======================================================================= */
  const INTRO_SEEN_KEY = 'wb_intro_seen';
  let introDone = true;                 /* 인트로를 쓰지 않을 때는 처음부터 '끝난 상태' */
  const introWaiters = [];
  function introReady(fn) { if (introDone) { fn(); return; } introWaiters.push(fn); }
  function introEditing() {
    if (document.documentElement.getAttribute('data-editor-mode') === 'true') return true;   /* 에디터 편집 캔버스 */
    if (window.__EDITOR_PREVIEW__) return true;
    if (params.get('cms_preview')) return true;                                              /* 관리자 미리보기 */
    try { if (window.top !== window.self) return true; } catch (e) { return true; }          /* iframe (에디터 안) */
    return false;
  }
  function introWanted() {
    const q = params.get('intro');
    if (q === '0' || q === 'off') return false;
    if (introEditing()) return false;
    const cfg = (SITE_DATA.site && SITE_DATA.site.intro) || {};
    if (cfg.enabled === false) return false;
    if (!isIndex || hashPage || isReservationView()) return false;       /* 메인 화면에서만 */
    if (q === '1' || q === 'on') return true;                           /* 다시 보기 */
    try { if (sessionStorage.getItem(INTRO_SEEN_KEY) === '1') return false; } catch (e) {}
    return true;
  }
  /* 인트로 화면 만들기 → 단계별로 보여주기 → 패널이 위로 열리며 메인 첫 화면 노출 */
  function startIntro() {
    if (!introWanted()) return;
    const cfg = (SITE_DATA.site && SITE_DATA.site.intro) || {};
    const title = String(cfg.title || (SITE_DATA.site && SITE_DATA.site.name) || '').trim();
    if (!title) return;
    const sup = String(cfg.sup == null ? '' : cfg.sup).trim();
    const sub = String(cfg.sub == null ? '' : cfg.sub).trim();
    const root = document.documentElement;
    const box = document.createElement('div');
    box.className = 'site-intro'; box.id = 'siteIntro';
    box.setAttribute('role', 'presentation'); box.setAttribute('aria-hidden', 'true');
    if (cfg.bg) root.style.setProperty('--intro-bg', cfg.bg);   /* 스크롤바 자리까지 같은 색으로 (html 에 지정 · 인트로 박스는 상속) */
    if (cfg.color) box.style.setProperty('--intro-text', cfg.color);
    box.innerHTML = '<div class="site-intro__inner">' +
      (sup ? '<p class="site-intro__sup">' + esc(sup) + '</p>' : '') +
      '<span class="site-intro__mask"><span class="site-intro__title">' + esc(title) + '</span></span>' +
      (sub ? '<p class="site-intro__sub">' + esc(sub) + '</p>' : '') +
      '<span class="site-intro__line" aria-hidden="true"></span>' +
      '</div>';
    introDone = false;
    root.classList.add('is-intro', 'is-intro-ui');
    document.body.appendChild(box);
    lockScroll(true);
    try { sessionStorage.setItem(INTRO_SEEN_KEY, '1'); } catch (e) {}

    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      timers.forEach(clearTimeout);
      root.classList.remove('is-intro', 'is-intro-reveal');
      if (box.parentNode) box.parentNode.removeChild(box);
      lockScroll(false);
      root.style.removeProperty('--intro-bg');
      window.scrollTo(0, 0);                              /* 인트로가 끝나면 항상 첫 화면(hero) 에서 시작 */
      root.classList.add('is-intro-ui-in');               /* 헤더 → 메인 카피 → 퀵메뉴 순서로 나타남 */
      setTimeout(function () { root.classList.remove('is-intro-ui', 'is-intro-ui-in'); }, 1400);
      introDone = true;
      const list = introWaiters.splice(0, introWaiters.length);
      list.forEach(function (fn) { try { fn(); } catch (e) {} });
      document.removeEventListener('keydown', onKey, true);
      box.removeEventListener('click', finishNow);
    }
    const finishNow = function () { reveal(0); };
    const onKey = function (e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finishNow(); };
    /* 안전장치를 가장 먼저 : 아래 코드에서 오류가 나도 홈페이지는 반드시 보입니다 */
    timers.push(setTimeout(finish, 5000));
    document.addEventListener('keydown', onKey, true);
    box.addEventListener('click', finishNow, { once: true });

    /* 패널 열기 : 조감도가 준비되면(최대 0.8초 대기) 위로 열면서 미세하게 제자리로 */
    let revealed = false;
    function reveal(outMs) {
      if (revealed || finished) return; revealed = true;
      root.classList.add('is-intro-reveal');
      box.classList.add('is-fade');
      setTimeout(function () { box.classList.add('is-out'); }, prefersReduced ? 0 : 160);
      timers.push(setTimeout(finish, outMs == null ? (prefersReduced ? 520 : 1120) : outMs));
    }
    function heroReady(cb) {
      const img = $('#hero .main-slide.is-active img') || $('#hero .main-slide img');
      if (!img || img.complete) { cb(); return; }
      let called = false; const once = function () { if (called) return; called = true; cb(); };
      img.addEventListener('load', once, { once: true });
      img.addEventListener('error', once, { once: true });
      timers.push(setTimeout(once, 800));
    }
    if (prefersReduced) { at(900, function () { box.classList.add('is-s1', 'is-s2', 'is-s3'); }); at(1700, function () { heroReady(function () { reveal(); }); }); }
    else {
      requestAnimationFrame(function () { box.classList.add('is-s1'); });
      at(400, function () { box.classList.add('is-s2'); });
      at(1000, function () { box.classList.add('is-s3'); });
      at(2000, function () { heroReady(function () { reveal(); }); });   /* 1.3~2초 : 그대로 머무는 구간(호흡) */
    }
  }
  function bootCommon() {
    startIntro();                /* 최초 진입 인트로 (조건이 아니면 아무 것도 하지 않음) */
    buildShell();
    renderMenu();
    bindHeaderEvents();
    bindModal();
    renderPopup();
    renderQuickMenu('#quickMenu');
  }

  return {
    $: $, $$: $$, esc: esc, isOn: isOn, onlyOn: onlyOn, clamp: clamp,
    prefersReduced: prefersReduced, mqMobile: mqMobile, mqTablet: mqTablet, ANIM: ANIM,
    isIndex: isIndex, currentPage: currentPage,
    resolveImage: resolveImage, normalizeImage: normalizeImage, createImage: createImage,
    createLinkedImage: createLinkedImage, pickMedia: pickMedia, defaultMedia: defaultMedia, FALLBACK_IMAGE: FALLBACK_IMAGE,
    setMedia: setMedia, refreshMedia: refreshMedia,
    headerHeight: headerHeight, scrollToSection: scrollToSection, store: store, lockScroll: lockScroll,
    normalizeUrl: normalizeUrl, menuHref: menuHref, bindMenuLink: bindMenuLink,
    openModal: openModal, closeModal: closeModal,
    createReserveForm: createReserveForm,
    telHref: TEL_HREF, telAria: TEL_ARIA,   /* 대표번호 단일 소스 (subpage.js · main.js 에서 사용) */
    tel: SITE_TEL, smsHref: SMS_HREF, kakaoUrl: KAKAO_URL, fillTokens: fillTokens, bindSiteValues: bindSiteValues,
    initAnimations: initAnimations, updateHeaderTheme: updateHeaderTheme,
    initPageEffects: initPageEffects, renderQuickMenu: renderQuickMenu,
    bootCommon: bootCommon, singleFile: singleFile, HOME: HOME
  };
})();
