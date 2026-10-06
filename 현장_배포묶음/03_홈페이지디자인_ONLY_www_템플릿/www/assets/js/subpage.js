/* =========================================================================
   subpage.js : 공통 서브페이지 (subpage.html?page=페이지ID)
   ------------------------------------------------------------------------
   · 헤더 · 메가메뉴 · 퀵메뉴 · 팝업 · 푸터만 공통이고,
     본문은 SITE_DATA.pages[pageId].layoutType 에 따라 완전히 다르게 구성됩니다.
   · [이미지 규칙] 모든 페이지 본문에는 최소 한 장의 대표 이미지(pages[ID].media)가,
     항목이 여러 개인 페이지에는 항목마다 개별 이미지(items[].media)가 실제 <img> 로 출력됩니다.
     - 이미지는 전부 SITE.createLinkedImage(media, alt) 한 함수로만 만듭니다.
     - 이미지가 없으면 임시 이미지 없이 영역만 유지됩니다. (alt = 파일명)
     - media.enabled:false 로 명시한 경우에만 영역과 여백이 함께 사라집니다.
   · 이전 · 다음 페이지 이동 영역은 사용하지 않습니다.
   ========================================================================= */
(function () {
  'use strict';

  SITE.bootCommon();

  const $ = SITE.$, $$ = SITE.$$, esc = SITE.esc;
  const isOn = SITE.isOn, onlyOn = SITE.onlyOn, openModal = SITE.openModal;
  const createLinkedImage = SITE.createLinkedImage, pickMedia = SITE.pickMedia;
  const ANIM = SITE.ANIM || {};
  const STG = ANIM.stagger || 130;

  const CONTENT = SITE_DATA.content || {};          /* siteContent : 메인 · 소메뉴 공통 데이터 */
  const sub = SITE_DATA.subpage || {};
  const pageId = SITE.currentPage;
  const pages = SITE_DATA.pages || {};
  const data = pages[pageId];
  const valid = !!data && isOn(data);
  const root = $('#subpage');
  const pageTitle = valid ? (data.title || '') : '';

  /* 같은 카테고리 메뉴 (상단 서브메뉴 바) */
  let group = null;
  onlyOn(SITE_DATA.menu).forEach(function (g) {
    if (onlyOn(g.items).some(function (it) { return it.page === pageId; })) group = g;
  });

  document.title = (valid ? data.title : (sub.notFound && sub.notFound.title) || '페이지를 찾을 수 없습니다') + ' | ' + SITE_DATA.site.name;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && valid) metaDesc.setAttribute('content', SITE_DATA.site.name + ' ' + data.title + (data.description ? ' - ' + data.description : ''));

  /* =======================================================================
     공통 조각
     ======================================================================= */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function anim(node, delay, kind) {
    node.classList.add('anim');
    if (kind) node.classList.add(kind);
    if (delay) node.style.setProperty('--anim-delay', delay + 'ms');
    return node;
  }
  const MEDIA_KEYS = ['media', 'image', 'thumbnail', 'thumb', 'img'];

  /* 이미지 한 장 (모든 이미지는 이 함수 → SITE.createLinkedImage 를 거칩니다)
       cfg     : pickMedia 로 얻은 설정 (null 이면 enabled:false → 아무것도 만들지 않음)
       opts    : { className, ratio, delay, zoom(기본 true), label, caption }
     링크(href)가 없으면 클릭 시 크게 보기 모달이 열립니다. */
  function image(cfg, alt, opts) {
    opts = opts || {};
    if (cfg === null || !String((cfg && (cfg.src || cfg.image)) || '').trim()) return null;   /* 이미지 주소가 없으면 만들지 않음 (임시 이미지 없음) */
    const box = createLinkedImage(cfg, alt, { className: opts.className, ratio: opts.ratio, label: opts.label });
    if (!box) return null;
    anim(box, opts.delay || 0, 'anim--image');
    if (opts.zoom !== false && box.tagName !== 'A') {
      box.style.cursor = 'zoom-in';
      box.setAttribute('role', 'button');
      box.setAttribute('tabindex', '0');
      box.setAttribute('aria-label', (alt || '이미지') + ' 크게 보기');
      const open = function () { openModal(box.__mediaCfg, opts.caption || alt || ''); };
      box.addEventListener('click', open);
      box.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
    return box;
  }
  /* 페이지 머리 : 영문 → 큰 제목 → 설명 (중앙 정렬 · HTML 텍스트) */
  function pageHead(latin, title, description) {
    const box = el('div', 'page-head');
    if (latin) box.appendChild(anim(el('p', 'page-head__latin', esc(latin)), 0, 'anim--fade'));
    if (title) box.appendChild(anim(el('h2', 'page-head__title', esc(title)), 80, 'anim--fade'));
    if (description) box.appendChild(anim(el('p', 'page-head__desc', esc(description)), 160, 'anim--fade'));
    return box;
  }
  /* 주소의 파라미터 (subpage.html?page=floorplan&type=115A · 단일 파일 #page=floorplan&type=115A 모두 지원) */
  function pageParam(name) {
    const q = new URLSearchParams(window.location.search).get(name);
    if (q) return q;
    const m = window.location.hash.replace(/^#/, '').match(new RegExp('(?:^|[&?])' + name + '=([^&]+)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  /* 상세 안내 이미지 (지도 · 배치도 · 평면도 · 시스템 · 문서 등 정보형 이미지)
       · 원본 비율 유지 · width:100% · height:auto · object-fit:contain · 고정 높이 없음 · 잘림 없음
       · PC 최대 1200px(원본이 더 작으면 원본 폭까지만 · 흐려지지 않음) · 모바일은 화면 폭에 맞춰 축소
       · PC · 모바일 같은 src 한 개 · 로딩 실패 시 placeholder 를 16:9 로 표시(과도한 높이 없음)
     cfg : { src, alt, width, height, zoom, caption, href } */
  function detailFigure(cfg, altFallback, delay) {
    if (!cfg || cfg.enabled === false || !cfg.src) return null;
    const alt = cfg.alt || altFallback || '';
    const box = createLinkedImage({ enabled: true, src: cfg.src, mobileSrc: cfg.mobileSrc || '', alt: alt, objectFit: 'contain', objectPosition: 'center top', href: cfg.href || '', target: cfg.target || '_self' },
      alt, { className: 'detail-content-image-wrap', ratio: 'auto', label: (alt || '상세 안내') + ' 이미지' });
    if (!box) return null;
    const pic = box.querySelector('picture'); if (pic) pic.classList.add('responsive-detail-image');   /* 모바일 : -mobile 이미지만 요청 · PC : -pc 만 요청 */
    box.style.aspectRatio = 'auto';
    const nat = Number(cfg.width) || 0;
    box.style.maxWidth = nat ? 'min(100%, ' + Math.min(nat, 1200) + 'px)' : '1200px';
    const img = box.querySelector('img');
    if (img) {
      img.classList.add('detail-content-image');
      if (cfg.width) img.setAttribute('width', cfg.width);
      if (cfg.height) img.setAttribute('height', cfg.height);
      img.style.objectFit = 'contain';
      img.addEventListener('error', function () { box.classList.add('is-broken'); img.removeAttribute('width'); img.removeAttribute('height'); });
    }
    const fig = el('figure', 'detail-figure' + (cfg.zoom ? ' detail-figure--zoom' : ''));
    fig.appendChild(anim(box, delay || 0, 'anim--image'));
    if (cfg.caption) fig.appendChild(el('figcaption', 'sub-figure__caption', esc(cfg.caption)));
    if (cfg.zoom && box.tagName !== 'A') {
      box.setAttribute('role', 'button'); box.tabIndex = 0; box.setAttribute('aria-label', alt + ' 확대 보기');
      const open = function () { openZoom(cfg.src, alt); };
      box.addEventListener('click', open);
      box.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      fig.appendChild(el('p', 'detail-figure__hint', '이미지를 누르면 크게 보실 수 있습니다. (확대 · 축소 · 스크롤)'));
    }
    return fig;
  }
  /* 확대 보기 : 전체 화면 레이어 · 확대(+) / 축소(−) / 이미지 탭 · 스크롤 · ESC · 모바일 전체 화면 */
  let zoomBox = null, zoomLast = null;
  function openZoom(src, alt) {
    if (!zoomBox) {
      zoomBox = el('div', 'zoombox');
      zoomBox.setAttribute('role', 'dialog'); zoomBox.setAttribute('aria-modal', 'true'); zoomBox.setAttribute('aria-label', '이미지 확대 보기');
      zoomBox.innerHTML =
        '<div class="zoombox__bar"><span class="zoombox__title"></span>' +
          '<span class="zoombox__tools">' +
            '<button type="button" class="zoombox__btn" data-zoom-out aria-label="축소">−</button>' +
            '<span class="zoombox__scale" aria-live="polite">100%</span>' +
            '<button type="button" class="zoombox__btn" data-zoom-in aria-label="확대">+</button>' +
            '<button type="button" class="zoombox__btn zoombox__close" data-zoom-close aria-label="닫기">✕</button>' +
          '</span></div>' +
        '<div class="zoombox__scroll"><img class="zoombox__img" alt=""></div>';
      document.body.appendChild(zoomBox);
      const img = zoomBox.querySelector('img');
      let scale = 1;
      const apply = function () {
        img.style.width = Math.round(scale * 100) + '%';
        zoomBox.querySelector('.zoombox__scale').textContent = Math.round(scale * 100) + '%';
        zoomBox.querySelector('[data-zoom-out]').disabled = scale <= 1;
        zoomBox.querySelector('[data-zoom-in]').disabled = scale >= 4;
        img.style.cursor = scale >= 2 ? 'zoom-out' : 'zoom-in';
      };
      zoomBox.querySelector('[data-zoom-in]').addEventListener('click', function () { scale = Math.min(4, scale + 0.5); apply(); });
      zoomBox.querySelector('[data-zoom-out]').addEventListener('click', function () { scale = Math.max(1, scale - 0.5); apply(); });
      img.addEventListener('click', function () { scale = scale >= 2 ? 1 : 2; apply(); });
      zoomBox.querySelector('[data-zoom-close]').addEventListener('click', closeZoom);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && zoomBox.classList.contains('is-open')) closeZoom(); });
      zoomBox.__reset = function () { scale = 1; apply(); };
    }
    zoomLast = document.activeElement;
    const img = zoomBox.querySelector('img');
    img.src = src; img.alt = alt || '';
    zoomBox.querySelector('.zoombox__title').textContent = alt || '';
    zoomBox.querySelector('.zoombox__scroll').scrollTop = 0;
    zoomBox.__reset();
    zoomBox.classList.add('is-open'); zoomBox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    zoomBox.querySelector('[data-zoom-close]').focus();
  }
  function closeZoom() {
    if (!zoomBox || !zoomBox.classList.contains('is-open')) return;
    zoomBox.classList.remove('is-open'); zoomBox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (zoomLast && zoomLast.focus) zoomLast.focus();
  }
  /* 주의 문구 목록 (※ 줄 단위) */
  function noteList(notes, delay) {
    const box = anim(el('div', 'sub-notes'), delay || 0, 'anim--fade');
    (notes || []).forEach(function (t) { if (t && String(t).trim()) box.appendChild(el('p', 'sub-note', esc(t))); });
    return box;
  }
  /* 큰 이미지 한 장 + 캡션 */
  function figure(cfg, alt, ratio, caption, delay, className) {
    const fig = el('figure', 'sub-figure');
    const box = image(cfg, alt, { className: 'sub-figure__media' + (className ? ' ' + className : ''), ratio: ratio, delay: delay, caption: caption });
    if (!box) return null;
    fig.appendChild(box);
    if (caption) fig.appendChild(el('figcaption', 'sub-figure__caption', esc(caption)));
    return fig;
  }
  function textBlock(content, delay) {
    const box = anim(el('div', 'sub-text'), delay, 'anim--fade');
    String(content || '').split(/\n+/).forEach(function (line) {
      if (!line.trim()) return;
      const p = document.createElement('p');
      p.innerHTML = esc(line.trim()).replace(/\[\[(.+?)\]\]/g, '<strong>$1</strong>');
      box.appendChild(p);
    });
    return box;
  }
  function blockTitle(text, delay) {
    return anim(el('h2', 'sub-block__title', esc(text)), delay, 'anim--fade');
  }
  function noteBlock(text) {
    return anim(el('p', 'sub-note', esc(text)), 0, 'anim--fade');
  }
  /* '페이지를 찾을 수 없습니다' 안내에만 사용합니다. */
  function messageBox(title, text) {
    return anim(el('div', 'sub-message',
      '<p class="sub-message__title">' + esc(title) + '</p>' +
      (text ? '<p class="sub-message__text">' + esc(text) + '</p>' : '')), 0, 'anim--fade');
  }
  function specTable(rows, delay) {
    const box = anim(el('dl', 'spec'), delay, 'anim--fade');
    rows.forEach(function (r) {
      box.appendChild(el('div', 'spec__row',
        '<dt class="spec__label">' + esc(r.label) + '</dt><dd class="spec__value">' + esc(r.value) + '</dd>'));
    });
    return box;
  }
  function statsBlock(stats) {
    const box = el('div', 'sub-stats');
    stats.forEach(function (st, i) {
      box.appendChild(anim(el('div', '',
        '<p class="sub-stat__value">' + esc(st.value) + (st.unit ? '<em>' + esc(st.unit) + '</em>' : '') + '</p>' +
        '<p class="sub-stat__label">' + esc(st.label) + '</p>'), i * STG, 'anim--fade'));
    });
    return box;
  }
  /* 탭 : 클릭하면 아래 내용이 바뀝니다 */
  function tabsView(tabs, render, initial, opts) {
    opts = opts || {};
    const wrap = el('div', 'sub-tabs-view');
    const bar = el('div', 'sub-tabbar' + (opts.className ? ' ' + opts.className : ''));
    /* opts.rows = [6, 5] : PC 에서 행 컨테이너(.floor-tab-row)를 명시적으로 나눔 (자동 줄바꿈 아님) · 모바일은 한 줄 가로 스크롤 */
    let rowEls = null;
    if (opts.rows && opts.rows.length) {
      rowEls = opts.rows.map(function (n, ri) { const row = el('div', 'floor-tab-row ' + (ri === 0 ? 'floor-tab-row--top' : 'floor-tab-row--bottom')); row.style.setProperty('--tab-cols', n); bar.appendChild(row); return row; });
    }
    const body = el('div', 'sub-tabbody');
    function paint(i) {
      $$('.sub-tabbtn', bar).forEach(function (b, n) {
        b.classList.toggle('is-current', n === i);
        b.setAttribute('aria-selected', n === i ? 'true' : 'false');
      });
      body.innerHTML = '';
      body.appendChild(render(tabs[i], i));
      if (window.SITE && SITE.initAnimations) SITE.initAnimations();
    }
    tabs.forEach(function (t, i) {
      const b = el('button', 'sub-tabbtn', esc(t.label));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { paint(i); });
      if (rowEls) { let acc = 0, target = rowEls[rowEls.length - 1]; for (let r = 0; r < opts.rows.length; r++) { acc += opts.rows[r]; if (i < acc) { target = rowEls[r]; break; } } target.appendChild(b); }
      else bar.appendChild(b);
    });
    bar.setAttribute('role', 'tablist');
    wrap.appendChild(anim(bar, 0, 'anim--fade'));
    wrap.appendChild(body);
    paint(Math.max(0, Math.min(tabs.length - 1, Number(initial) || 0)));
    return wrap;
  }
  /* YouTube 주소(youtu.be · watch?v= · embed · shorts)에서 영상 ID 만 추출 */
  function youtubeId(url) {
    const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{6,})/);
    return m ? m[1] : '';
  }
  /* 영상 주소를 재생용 주소로 변환 (YouTube · Vimeo · mp4 모두 지원) */
  function toEmbedUrl(url, type) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (type === 'file' || /\.(mp4|webm|ogg)$/i.test(u)) return u;
    let m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1';
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1] + '?autoplay=1';
    return u;
  }

  /* -----------------------------------------------------------------
     콘텐츠 카드 : 이미지(위) + 텍스트(아래)
     item : { number|tag, title, description|desc, media }
     ----------------------------------------------------------------- */
  function contentCard(item, i, opts) {
    opts = opts || {};
    const card = el('article', 'content-card' + (opts.className ? ' ' + opts.className : ''));
    const title = item.title || item.label || '';
    const cfg = pickMedia(item, MEDIA_KEYS, title, opts.ratio || '3 / 2');
    const media = image(cfg, title, { className: 'content-card__media', ratio: opts.ratio || '3 / 2', delay: i * STG, zoom: opts.zoom });
    if (media) card.appendChild(media);
    const text = anim(el('div', 'content-card__text',
      (item.number ? '<span class="content-card__number">' + esc(item.number) + '</span>' : '') +
      (item.tag ? '<p class="content-card__tag">' + esc(item.tag) + '</p>' : '') +
      (item.date ? '<p class="content-card__tag">' + esc(item.date) + '</p>' : '') +
      (title ? '<h3 class="content-card__title">' + esc(title) + '</h3>' : '') +
      ((item.description || item.desc) ? '<p class="content-card__desc">' + esc(item.description || item.desc) + '</p>' : '')), i * STG + 100, 'anim--fade');
    card.appendChild(text);
    return card;
  }
  function cardGrid(items, opts) {
    opts = opts || {};
    const n = items.length;
    const grid = el('div', 'content-grid' +
      (opts.cols ? ' content-grid--' + opts.cols : (n === 3 || n === 6 ? ' content-grid--3' : (n === 2 || n === 4 ? ' content-grid--2' : ''))));
    items.forEach(function (it, i) { grid.appendChild(contentCard(it, i, opts)); });
    return grid;
  }

  /* -----------------------------------------------------------------
     이미지 + 텍스트 가로 행 (입지환경 항목 · 분양일정 · SYSTEM · 범례 · 교통 안내 등)
     item : { tag|date|no, title, description|desc, media }
     ----------------------------------------------------------------- */
  function mediaRow(item, i, opts) {
    opts = opts || {};
    const row = el('div', 'media-row' + (opts.className ? ' ' + opts.className : ''));
    const title = item.title || item.label || '';
    const cfg = pickMedia(item, MEDIA_KEYS, title, opts.ratio || '4 / 3');
    const media = image(cfg, title, { className: 'media-row__media', ratio: opts.ratio || '4 / 3', delay: i * STG });
    if (media) row.appendChild(media);
    row.appendChild(anim(el('div', 'media-row__text',
      (opts.number ? '<span class="media-row__no">' + ('0' + (i + 1)).slice(-2) + '</span>' : '') +
      (item.tag ? '<p class="media-row__tag">' + esc(item.tag) + '</p>' : '') +
      (item.date ? '<p class="media-row__tag">' + esc(item.date) + '</p>' : '') +
      (title ? '<h3 class="media-row__title">' + esc(title) + '</h3>' : '') +
      ((item.description || item.desc) ? '<p class="media-row__desc">' + esc(item.description || item.desc) + '</p>' : '')), i * STG + 100, 'anim--fade'));
    return row;
  }
  function mediaList(items, opts) {
    const list = el('div', 'media-list');
    items.forEach(function (it, i) { list.appendChild(mediaRow(it, i, opts)); });
    return list;
  }

  /* 문서 목록 : 문서마다 썸네일 이미지 + 이름 + 보기 버튼 */
  function docList(docs) {
    const list = el('div', 'sub-docs');
    docs.forEach(function (doc, i) {
      const has = !!(doc.url && String(doc.url).trim());
      const row = el(has ? 'a' : 'div', 'sub-doc');
      const cfg = pickMedia(doc, MEDIA_KEYS, doc.label, '3 / 4');
      const thumb = image(Object.assign({}, cfg, { href: '' }), doc.label, { className: 'sub-doc__thumb', ratio: '3 / 4', zoom: false });
      if (thumb) row.appendChild(thumb);
      row.insertAdjacentHTML('beforeend',
        '<span class="sub-doc__info"><span class="sub-doc__name">' + esc(doc.label) + '</span>' +
        '<span class="sub-doc__meta">' + esc(doc.meta || '') + '</span></span>' +
        '<span class="btn btn--sm btn--line">' + (has ? '문서 보기' : '원본 확인') + '</span>');
      if (has) { row.href = doc.url; row.target = doc.target || '_blank'; row.rel = 'noopener'; }
      anim(row, i * STG, 'anim--fade');
      list.appendChild(row);
    });
    return list;
  }
  function dataTable(columns, rows) {
    const box = anim(el('div', 'sub-table'), 0, 'anim--fade');
    let html = '<table><thead><tr>' + columns.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) { html += '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>'; });
    box.innerHTML = html + '</tbody></table>';
    return box;
  }
  function frameBlock(url, emptyText, links) {
    const frame = anim(el('div', 'sub-frame'), 0, 'anim--fade');
    if (url && String(url).trim()) {
      frame.innerHTML = '<iframe src="' + esc(url) + '" title="' + esc(pageTitle) + '" allowfullscreen loading="lazy"></iframe>';
    } else {
      frame.innerHTML = '<div class="sub-frame__empty"><p>' + esc(emptyText || '주소를 입력하면 이 영역에 표시됩니다.') + '</p></div>';
    }
    const box = el('div', '');
    box.appendChild(frame);
    const usable = (links || []).filter(function (l) { return l.url && String(l.url).trim(); });
    if (usable.length) {
      const row = anim(el('div', 'sub-actions'), 120, 'anim--fade');
      usable.forEach(function (l) {
        const a = el('a', 'btn btn--line', esc(l.label));
        a.href = l.url; a.target = l.target || '_blank'; a.rel = 'noopener';
        row.appendChild(a);
      });
      box.appendChild(row);
    }
    return box;
  }
  /* 페이지 대표 이미지 블록 (position : top | bottom | left | right)
     left / right 는 이미지 옆에 media.title · media.description 텍스트가 함께 나옵니다. */
  function pageMediaBlock(cfg, d, forcePos) {
    if (!cfg || !String(cfg.src || '').trim()) return null;   /* 이미지 주소가 없으면 빈 영역을 만들지 않습니다 (임시 이미지 없음) */
    const pos = forcePos || cfg.position || 'top';
    const wide = (pos === 'top' || pos === 'bottom');
    const box = image(cfg, d.title, { className: 'sub-hero__media', ratio: cfg.ratio || (wide ? '21 / 9' : '4 / 3'), label: (d.title || '페이지') + ' 대표 이미지' });
    if (!box) return null;
    const block = el('div', 'sub-hero sub-hero--' + pos);
    block.appendChild(box);
    if (!wide) {
      block.appendChild(anim(el('div', 'sub-hero__text',
        '<h2 class="sub-hero__title">' + esc(cfg.title || d.title || '') + '</h2>' +
        '<p class="sub-hero__desc">' + esc(cfg.description || d.description || '') + '</p>'), 140, 'anim--fade'));
    }
    return block;
  }

  /* =======================================================================
     레이아웃별 본문
     render(d, wrap, ctx)
       ctx.pageMedia(extraKeys, ratio) : 페이지 대표 이미지 설정을 가져가서 레이아웃 안에 직접 배치할 때 호출
       (호출하지 않으면 공통 렌더러가 media.position 위치에 대표 이미지를 자동으로 넣습니다)
     ※ 어떤 레이아웃도 텍스트만 출력하지 않습니다. 항목마다 items[].media 이미지가 함께 나옵니다.
     ======================================================================= */
  const LAYOUTS = {

    /* 사업개요 : 왼쪽 대표 이미지(pages.overview.media) + 오른쪽 사업개요 표 (2열) */
    overview: function (d, wrap, ctx) {
      const bo = CONTENT.businessOverview || {};
      /* 표 내용은 siteContent.businessOverview (메인 사업개요 오버레이와 동일) */
      const rows = (d.details && d.details.length) ? d.details : (bo.rows || d.rows || []);
      if (!d.notice && bo.note) d = Object.assign({}, d, { notice: bo.note });
      const box = el('div', 'overview');
      box.style.setProperty('--overview-ratio', d.layoutRatio || '1.2fr 1fr');
      const cfg = ctx.pageMedia(['image'], '22 / 15');
      /* 왼쪽 : 공식 조감도 (같은 grid 행에서 stretch → 표 위·아래 라인과 일치, JS 높이 계산 없음) */
      const left = image(cfg, d.title, { className: 'overview__visual', ratio: (cfg && cfg.ratio) || '22 / 15', label: '사업개요 조감도' });
      if (left) box.appendChild(left); else box.classList.add('overview--noimage');
      /* 오른쪽 : 대지위치 ~ 타입 표 (안내 문구는 높이 계산에서 제외) */
      const right = el('div', 'overview__info');
      if (rows.length) {
        const table = anim(el('dl', 'overview__table'), 120, 'anim--fade');
        rows.forEach(function (r) {
          table.appendChild(el('div', 'overview__row',
            '<dt class="overview__label">' + esc(r.label) + '</dt>' +
            '<dd class="overview__value">' + esc(r.value) + '</dd>'));
        });
        right.appendChild(table);
      }
      box.appendChild(right);
      wrap.appendChild(box);
      if (d.notice) {   /* ※ 안내문 : 메인 써머리와 같은 기준으로 문단 분리 (한 문단으로 붙지 않음) */
        const nbox = el('div', 'overview__notice summary-notice');
        String(d.notice).split(/\n+|\s*(?=※)/).map(function (t) { return t.trim(); }).filter(Boolean).forEach(function (t) { nbox.appendChild(el('p', '', esc(t))); });
        wrap.appendChild(anim(nbox, 220, 'anim--fade'));
      }
      if ((d.stats || []).length) wrap.appendChild(statsBlock(d.stats));
      const items = onlyOn(d.items);
      if (items.length) wrap.appendChild(cardGrid(items, { ratio: '3 / 2' }));
    },

    /* 특화상품 : 특화상품마다 이미지 + 번호 + 제목 + 설명 카드 */
    featureGrid: function (d, wrap) {
      const items = onlyOn(d.items);
      if (!items.length) return;
      wrap.appendChild(cardGrid(items, { ratio: d.itemRatio || '3 / 2', cols: d.columns }));
    },
    feature: function (d, wrap, ctx) { return LAYOUTS.featureGrid(d, wrap, ctx); },

    /* 입지환경 : 큰 입지도(pages.location.media) + 생활권마다 이미지 + 설명 */
    locationMap: function (d, wrap, ctx) {
      const cfg = ctx.pageMedia(['mapImage'], d.imageRatio || '16 / 10');
      const fig = figure(cfg, d.title + ' 입지도', d.imageRatio || '16 / 10', d.mapCaption || '', 0);
      if (fig) wrap.appendChild(fig);
      const items = onlyOn(d.items);
      if (items.length) wrap.appendChild(mediaList(items, { ratio: '4 / 3' }));
    },
    location: function (d, wrap, ctx) { return LAYOUTS.locationMap(d, wrap, ctx); },
    map: function (d, wrap, ctx) { return LAYOUTS.locationMap(d, wrap, ctx); },

    /* 항공 VR · e모델하우스 : 대표 썸네일 이미지 + 실행 버튼 (iframe 주소가 있으면 iframe) */
    vr: function (d, wrap, ctx) {
      ctx.noMedia();
      const url = String(d.vrUrl || d.officialUrl || '').trim();
      const box = el('div', 'vr-block vr-block--link');
      if (d.intro) box.appendChild(anim(el('p', 'vr-block__text', esc(d.intro)), 0, 'anim--fade'));
      const actions = anim(el('div', 'sub-actions sub-actions--center'), 80, 'anim--fade');
      const btn = el('a', 'btn', esc(d.buttonLabel || '바로 보기 (새 창)'));
      btn.href = url; btn.target = '_blank'; btn.rel = 'noopener noreferrer';
      actions.appendChild(btn);
      box.appendChild(actions);
      if (d.note) box.appendChild(noteBlock(d.note));
      wrap.appendChild(box);
    },
    aerial: function (d, wrap, ctx) { return LAYOUTS.vr(d, wrap, ctx); },
    modelHouse: function (d, wrap, ctx) { return LAYOUTS.vr(d, wrap, ctx); },

    /* 오시는 길 : 약도 이미지(pages.directions.media) + 주소 표 + 교통수단별 이미지 안내 */
    directions: function (d, wrap, ctx) {
      ctx.noMedia();
      const box = el('div', 'dir');
      const fig = detailFigure(d.media, d.title + ' 약도', 0);
      if (fig) { fig.classList.add('dir__map'); box.appendChild(fig); }
      const info = el('div', 'dir__info');
      const places = onlyOn(d.places);
      places.forEach(function (pl, i) {
        info.appendChild(anim(el('div', 'dir__place',
          '<p class="dir__label">' + esc(pl.label || '') + '</p>' +
          '<p class="dir__addr">' + esc(pl.address || '') + '</p>' +
          (pl.mapUrl ? '<a class="btn btn--sm btn--line dir__btn" href="' + esc(pl.mapUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(pl.mapLabel || '네이버지도 보기') + '</a>' : '')), 80 + i * STG, 'anim--fade'));
      });
      const tel = SITE_DATA.site.tel || '';
      if (tel) {
        info.appendChild(anim(el('div', 'dir__place dir__place--tel',
          '<p class="dir__label">' + esc(d.contactLabel || '분양문의') + '</p>' +
          '<a class="dir__tel" href="' + esc(SITE.telHref) + '" aria-label="' + esc(SITE.telAria) + '">' + esc(tel) + '</a>'), 80 + places.length * STG, 'anim--fade'));
      }
      box.appendChild(info);
      wrap.appendChild(box);
      if (d.note) wrap.appendChild(noteBlock(d.note));
    },

    /* 브랜드 소개 : 로고 이미지 + 슬로건 → 브랜드 비주얼 → 스토리 → VALUE 마다 이미지
       (대표 이미지는 media.position 위치에 공통 렌더러가 배치) */
    brandStory: function (d, wrap, ctx) {
      ctx.noMedia();
      const stack = el('div', 'brand');
      const vis = detailFigure(d.visual, '브랜드 비주얼', 0);
      if (vis) { vis.classList.add('brand__visual'); stack.appendChild(vis); }
      const id = d.identity || {};
      if (id.title) {
        const sec = el('section', 'brand__sec');
        sec.appendChild(pageHead(id.latin, id.title, id.lead));
        if (id.headline) sec.appendChild(anim(el('p', 'brand__headline', esc(id.headline)), 100, 'anim--fade'));
        if (id.body) { const t = textBlock(id.body, 160); t.classList.add('brand__body'); sec.appendChild(t); }
        const imgs = onlyOn(id.images);
        if (imgs.length) {
          const row = el('div', 'brand__pair');
          imgs.forEach(function (im, i) { const f = detailFigure(im, id.title, i * STG); if (f) row.appendChild(f); });
          sec.appendChild(row);
        }
        stack.appendChild(sec);
      }
      const cv = d.coreValue || {};
      const vals = onlyOn(cv.items);
      if (vals.length) {
        const sec = el('section', 'brand__sec');
        sec.appendChild(pageHead(cv.latin, cv.title, cv.lead));
        const grid = el('div', 'brand__values');
        vals.forEach(function (v, i) {
          const card = el('article', 'brand__value');
          const f = detailFigure(v.image, v.ko, i * STG); if (f) card.appendChild(f);
          card.appendChild(anim(el('div', 'brand__value-text',
            '<p class="brand__value-en">' + esc(v.en || '') + '</p>' +
            '<h3 class="brand__value-ko">' + esc(v.ko || '') + '</h3>' +
            '<p class="brand__value-desc">' + esc(v.description || '') + '</p>'), i * STG + 80, 'anim--fade'));
          grid.appendChild(card);
        });
        sec.appendChild(grid);
        stack.appendChild(sec);
      }
      const col = d.colors || {};
      const cols = onlyOn(col.items);
      if (cols.length) {
        const sec = el('section', 'brand__sec');
        sec.appendChild(pageHead(col.latin, col.title, col.lead));
        const grid = el('div', 'brand__colors');
        cols.forEach(function (c, i) {
          const hex = String(c.hex || '').replace(/[^#0-9a-fA-F]/g, '');
          grid.appendChild(anim(el('div', 'brand__color',
            '<span class="brand__swatch" style="background:' + hex + '"></span>' +
            '<p class="brand__color-name">' + esc(c.name || '') + '</p>' +
            '<p class="brand__color-spec">' + esc(c.pantone || '') + '<br>' + esc(c.cmyk || '') + '<br>' + esc(c.rgb || '') + '<br>HEX ' + esc(hex.replace('#', '')) + '</p>'), i * STG, 'anim--fade'));
        });
        sec.appendChild(grid);
        stack.appendChild(sec);
      }
      wrap.appendChild(stack);
      if (d.officialUrl) {
        const acts = anim(el('div', 'sub-actions sub-actions--center'), 0, 'anim--fade');
        const a = el('a', 'btn btn--line', '자이 브랜드 공식 페이지 보기');
        a.href = d.officialUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
        acts.appendChild(a); wrap.appendChild(acts);
      }
    },
    brand: function (d, wrap, ctx) { return LAYOUTS.brandStory(d, wrap, ctx); },

    /* 프리미엄 : 프리미엄 텍스트 옆에 개별 이미지 (좌우 교차) */
    premium: function (d, wrap) {
      /* 항목은 siteContent.premiumItems (메인 프리미엄과 동일) */
      const items = onlyOn((d.items && d.items.length) ? d.items : CONTENT.premiumItems);
      if (!items.length) return;
      const list = el('div', 'sub-alt');
      items.forEach(function (it, i) {
        const row = el('div', 'sub-alt__row' + (i % 2 ? ' sub-alt__row--rev' : ''));
        const fig = figure(pickMedia(it, MEDIA_KEYS, it.title, '4 / 3'), it.title, '4 / 3', '', 0, 'sub-alt__media');
        if (fig) row.appendChild(fig);
        row.appendChild(anim(el('div', 'sub-alt__text',
          '<p class="sub-alt__num">' + ('0' + (i + 1)).slice(-2) + '</p>' +
          '<h3 class="sub-alt__title">' + esc(it.title || '') + '</h3>' +
          '<p class="sub-alt__desc">' + esc(it.description || it.desc || '') + '</p>'), 120, 'anim--fade'));
        list.appendChild(row);
      });
      wrap.appendChild(list);
    },

    /* 단지배치도 : 단지 선택 탭 + 선택된 탭의 큰 이미지 + 범례마다 이미지 */
    sitePlan: function (d, wrap) {
      const tabs = onlyOn(d.tabs);
      if (tabs.length) {
        wrap.appendChild(tabsView(tabs, function (t) {
          const box = el('div', '');
          const fig = figure(pickMedia(t, MEDIA_KEYS, t.label, d.imageRatio || '16 / 10'), t.label, d.imageRatio || '16 / 10', t.caption || '', 0);
          if (fig) box.appendChild(fig);
          return box;
        }));
      }
      const legend = onlyOn(d.legend || d.items);
      if (legend.length) wrap.appendChild(cardGrid(legend, { ratio: '4 / 3', cols: legend.length <= 4 ? legend.length : undefined }));
    },

    /* 동·호수배치도 : 동 선택 탭 + 선택된 동의 큰 이미지 */
    unitMap: function (d, wrap) {
      const tabs = onlyOn(d.tabs);
      if (tabs.length) {
        wrap.appendChild(tabsView(tabs, function (t) {
          const box = el('div', '');
          const fig = figure(pickMedia(t, MEDIA_KEYS, t.label, d.imageRatio || '16 / 10'), t.label + ' 배치도', d.imageRatio || '16 / 10', t.caption || '', 0);
          if (fig) box.appendChild(fig);
          return box;
        }));
      }
      const items = onlyOn(d.items);
      if (items.length) wrap.appendChild(cardGrid(items, { ratio: '4 / 3' }));
    },

    /* 단지설계 : 설계 항목마다 큰 이미지 + 설명 */
    imageStory: function (d, wrap) {
      const items = onlyOn(d.items);
      if (!items.length) return;
      const list = el('div', 'sub-story');
      items.forEach(function (it, i) {
        const row = el('div', 'sub-story__row');
        const fig = figure(pickMedia(it, MEDIA_KEYS, it.title, '16 / 9'), it.title, '16 / 9', '', 0);
        if (fig) row.appendChild(fig);
        row.appendChild(anim(el('div', 'sub-story__text',
          '<h3 class="sub-story__title">' + esc(it.title || '') + '</h3>' +
          '<p class="sub-story__desc">' + esc(it.description || it.desc || '') + '</p>'), 140, 'anim--fade'));
        list.appendChild(row);
      });
      wrap.appendChild(list);
    },

    /* 디자인 특화 : 타입 선택 탭 + 디자인 설명마다 이미지 카드
       tabs[].items : [{ title, description, media }]  (예전 tabs[].images 문자열 배열도 지원) */
    tabsGallery: function (d, wrap) {
      const tabs = onlyOn(d.tabs);
      if (!tabs.length) return;
      wrap.appendChild(tabsView(tabs, function (t) {
        let items = onlyOn(t.items);
        if (!items.length) {
          items = (t.images || []).map(function (im, k) {
            return typeof im === 'string' ? { title: t.label + ' ' + (k + 1), media: { src: im, alt: t.label } } : Object.assign({ title: t.label + ' ' + (k + 1) }, im, { media: im.media || im });
          });
        }
        return cardGrid(items, { ratio: d.itemRatio || '4 / 3' });
      }));
    },

    /* 시설별 이미지 카드 (루프탑 · 스카이클럽 · 호텔클럽 · SYSTEM 등)
       항목이 3개면 3열, 2·4개면 2열, 그 외에는 자동 그리드 */
    gallery: function (d, wrap) {
      const items = onlyOn(d.items);
      if (!items.length) return;
      wrap.appendChild(cardGrid(items, { ratio: d.itemRatio || '3 / 2', cols: d.columns }));
    },

    /* SYSTEM : 시스템 항목마다 이미지 + 번호 + 제목 + 설명 */
    system: function (d, wrap) {
      const items = onlyOn(d.items);
      if (!items.length) return;
      wrap.appendChild(mediaList(items, { ratio: '4 / 3', number: true, className: 'media-row--system' }));
    },

    /* 평면정보 : 타입 탭 + 왼쪽 평면 이미지 + 오른쪽 면적 정보 */
    floorPlan: function (d, wrap, ctx) {
      ctx.noMedia();
      /* 탭 · 이미지는 siteContent.unitTypes 한 곳 (메인 타입안내 3장도 같은 이미지) */
      const list = onlyOn((d.tabs && d.tabs.length) ? d.tabs : (CONTENT.unitTypes || []).map(function (u) {
        return { enabled: u.enabled, id: u.id, label: u.title, image: { src: u.image, alt: u.alt || (u.title + ' 평면도'), width: u.width, height: u.height }, note: u.note, modelHouseUrl: u.modelHouseUrl || '' };
      }));
      if (!list.length) return;
      const want = pageParam('type');
      let start = 0;
      list.forEach(function (t, i) { if (want && (t.id === want || t.label === want)) start = i; });
      const ROWS = [6, 5];
      const view = el('div', 'sub-tabs-view floorplan-view');
      /* 탭 : PC 두 줄(6 + 5) · 모바일 두 줄 grid 가로 스크롤 (뷰포트 안에서만 스크롤 · 페이지 scrollIntoView 없음) */
      const viewport = el('div', 'floorplan-tabs-viewport');
      const bar = el('div', 'sub-tabbar floor-tabs floorplan-tabs'); bar.setAttribute('role', 'tablist');
      const rowEls = ROWS.map(function (n, ri) { const row = el('div', 'floor-tab-row ' + (ri === 0 ? 'floor-tab-row--top' : 'floor-tab-row--bottom')); row.style.setProperty('--tab-cols', n); bar.appendChild(row); return row; });
      viewport.appendChild(bar); view.appendChild(anim(viewport, 0, 'anim--fade'));
      /* 패널 : 11개를 미리 만들어 두고 is-active 만 바꿉니다 (이미지에 width/height 로 공간 확보) */
      const panels = el('div', 'floorplan-panels sub-tabbody');
      const btns = [], panelEls = [];
      list.forEach(function (t, i) {
        const b = el('button', 'sub-tabbtn floorplan-tab', esc(t.label)); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-type', t.id || '');
        let acc = 0, target = rowEls[rowEls.length - 1]; for (let r = 0; r < ROWS.length; r++) { acc += ROWS[r]; if (i < acc) { target = rowEls[r]; break; } }
        target.appendChild(b); btns.push(b);
        const panel = el('div', 'floorplan-panel floor-plan'); panel.setAttribute('data-type', t.id || ''); panel.setAttribute('role', 'tabpanel');
        const f = detailFigure(t.image || t.media, t.label + ' 평면도', 0);
        if (f) { f.classList.add('floor-plan__figure'); panel.appendChild(f); }
        if (t.modelHouseUrl) {
          const acts = el('div', 'sub-actions sub-actions--center floor-plan__actions');
          const a = el('a', 'btn', esc((SITE_DATA.unitSection && SITE_DATA.unitSection.modelHouseLabel) || 'e모델하우스 보기 (새 창)'));
          a.href = t.modelHouseUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('data-type', t.id || '');
          acts.appendChild(a); panel.appendChild(acts);
        }
        if (t.note) panel.appendChild(noteBlock(t.note));
        $$('.anim', panel).forEach(function (n) { n.classList.remove('anim', 'anim--image', 'anim--fade'); n.classList.add('is-in'); });
        panels.appendChild(panel); panelEls.push(panel);
      });
      view.appendChild(panels);
      let changing = false;
      function centerTab(button) {
        const left = button.offsetLeft - viewport.clientWidth / 2 + button.offsetWidth / 2;
        if (viewport.scrollWidth > viewport.clientWidth + 1) viewport.scrollTo({ left: Math.max(0, left), behavior: SITE.prefersReduced ? 'auto' : 'smooth' });
      }
      function paintTabs(i) {
        btns.forEach(function (b, n) { b.classList.toggle('is-current', n === i); b.classList.toggle('is-active', n === i); b.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
        centerTab(btns[i]);
      }
      async function change(i) {
        if (changing) return;
        const current = panels.querySelector('.floorplan-panel.is-active');
        const next = panelEls[i];
        if (!next || next === current) { paintTabs(i); return; }
        changing = true; paintTabs(i);
        /* 기존 패널은 그대로 두고, 다음 이미지의 로딩 · decode 가 끝난 뒤 한 프레임에 교체 (높이 붕괴 · 흰 화면 없음) */
        const img = next.querySelector('img');
        if (img) {
          if (img.loading === 'lazy') img.loading = 'eager';
          if (!img.complete) await new Promise(function (res) { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); setTimeout(res, 8000); });
          if (img.decode) await img.decode().catch(function () {});
        }
        requestAnimationFrame(function () {
          if (current) { current.classList.remove('is-active'); current.setAttribute('aria-hidden', 'true'); }
          next.classList.add('is-active'); next.setAttribute('aria-hidden', 'false');
          changing = false;
        });
      }
      btns.forEach(function (b, i) { b.addEventListener('click', function () { change(i); }); });
      /* 첫 패널 : 즉시 표시 */
      panelEls.forEach(function (p, i) { p.classList.toggle('is-active', i === start); p.setAttribute('aria-hidden', i === start ? 'false' : 'true'); });
      const firstImg = panelEls[start] && panelEls[start].querySelector('img'); if (firstImg) firstImg.loading = 'eager';
      paintTabs(start);
      wrap.appendChild(view);
      setTimeout(function () { centerTab(btns[start]); }, 60);
      const notes = (d.notes || []).filter(Boolean);
      if (notes.length) wrap.appendChild(noteList(notes));
    },

    /* 표 (기본제공품목 · 공급안내) : 대표 이미지(공통 렌더러) + 품목별 이미지 카드 + 표 + 문서 */
    table: function (d, wrap) {
      const items = onlyOn(d.items);
      if (items.length) {
        wrap.appendChild(cardGrid(items, { ratio: d.itemRatio || '3 / 2', cols: d.columnsCount || (items.length <= 4 ? items.length : undefined) }));
      } else {
        /* 예전 표기 : gallery.images */
        const g = d.gallery;
        if (g && g.enabled !== false) {
          const imgs = onlyOn(g.images).map(function (x, k) { return { title: x.alt || ('이미지 ' + (k + 1)), media: x }; });
          if (imgs.length) wrap.appendChild(cardGrid(imgs, { ratio: '3 / 2', cols: g.columns }));
        }
      }
      if ((d.columns || []).length) wrap.appendChild(dataTable(d.columns, d.rows || []));
      const docs = (d.documents || []).filter(Boolean);
      if (docs.length) wrap.appendChild(docList(docs));
    },
    basicItems: function (d, wrap, ctx) { return LAYOUTS.table(d, wrap, ctx); },
    supply: function (d, wrap, ctx) { return LAYOUTS.table(d, wrap, ctx); },

    /* 문서 : 문서 대표(스캔) 이미지 = pages[ID].media + 설명 + 문서마다 썸네일 목록 + 추가 스캔 이미지 */
    document: function (d, wrap, ctx) {
      const ratio = d.imageRatio || '16 / 9';
      const cfg = ctx.pageMedia(['documentThumbnail'], ratio);
      const docs = (d.documents || []).filter(Boolean);
      const stack = el('div', 'doc-stack');
      /* 문서 대표(스캔) 이미지 : 콘텐츠 폭 전체 · 같은 비율 */
      const preview = image(cfg, d.title, { className: 'doc-preview', ratio: ratio, label: d.title + ' 문서 이미지' });
      if (preview) stack.appendChild(preview);
      if (d.content) stack.appendChild(textBlock(d.content, 120));
      /* 문서마다 : 같은 폭 · 같은 비율의 미리보기 이미지 + 정돈된 정보 행 (실제 <a href> 다운로드) */
      docs.forEach(function (doc, i) {
        const card = el('article', 'doc-card');
        const dm = pickMedia(doc, MEDIA_KEYS, doc.label, ratio);
        const media = image(dm ? Object.assign({}, dm, { href: '' }) : dm, doc.label, { className: 'doc-card__media', ratio: ratio, delay: i * STG + 80, label: (doc.label || '문서') + ' 미리보기 이미지' });
        if (media) card.appendChild(media);
        const has = !!(doc.url && String(doc.url).trim());
        const row = anim(el('div', 'doc-card__row'), i * STG + 140, 'anim--fade');
        row.innerHTML =
          '<span class="doc-card__info"><span class="doc-card__name">' + esc(doc.label) + '</span>' +
          '<span class="doc-card__meta">' + esc(doc.meta || '') + '</span></span>';
        if (has) {
          const a = el('a', 'btn btn--sm', esc(doc.buttonLabel || '문서 보기'));
          a.href = doc.url; a.target = doc.target || '_blank'; a.rel = 'noopener noreferrer';
          if (/\.pdf(\?|$)/i.test(doc.url) && doc.download) a.setAttribute('download', '');
          row.appendChild(a);
        } else {
          row.appendChild(el('span', 'btn btn--sm btn--line is-disabled', '원본 확인'));
        }
        card.appendChild(row);
        stack.appendChild(card);
      });
      wrap.appendChild(stack);
      /* 추가 스캔 이미지 (images : 문자열 또는 media 객체) — 같은 비율 */
      const extra = (d.images || []).filter(Boolean);
      if (extra.length) {
        const grid = el('div', 'doc-stack');
        extra.forEach(function (im, i) {
          const c = typeof im === 'string' ? { src: im, alt: d.title + ' ' + (i + 1) } : im;
          const fig = figure(pickMedia({ media: c }, ['media'], d.title, ratio), d.title + ' ' + (i + 1), ratio, c.caption || '', i * STG);
          if (fig) grid.appendChild(fig);
        });
        wrap.appendChild(grid);
      }
    },
    advertisement: function (d, wrap, ctx) { return LAYOUTS.document(d, wrap, ctx); },

    /* 분양일정 : 일정 안내 이미지(공통 렌더러) + 일정마다 이미지 + 날짜 + 제목 + 설명 */
    schedule: function (d, wrap) {
      const items = onlyOn(d.items);
      if (!items.length) return;
      wrap.appendChild(mediaList(items, { ratio: '4 / 3', className: 'media-row--schedule' }));
    },

    /* 언론보도 : 기사마다 썸네일 이미지 카드 */
    news: function (d, wrap) {
      const items = onlyOn(d.items).slice().sort(function (a, b) { return (Number(b.number) || 0) - (Number(a.number) || 0); });
      if (!items.length) return;
      const per = Number(d.perPage) || 10;
      const total = Math.ceil(items.length / per);
      let page = 0;
      const box = el('div', 'press');
      const tableWrap = anim(el('div', 'press__table'), 0, 'anim--fade');
      const pager = el('nav', 'press__pager');
      pager.setAttribute('aria-label', '언론보도 페이지');
      box.appendChild(tableWrap); box.appendChild(pager);

      function paint(scroll) {
        const slice = items.slice(page * per, page * per + per);
        let html = '<table class="press-table"><thead><tr><th scope="col" class="press-table__num">번호</th><th scope="col" class="press-table__title">제목</th><th scope="col" class="press-table__pub">언론사</th><th scope="col" class="press-table__date">등록일</th></tr></thead><tbody>';
        slice.forEach(function (it, i) {
          const num = it.number != null ? it.number : (items.length - (page * per + i));
          const url = (it.url || '').trim();
          const isReal = /^https?:\/\//i.test(url);
          html += '<tr>' +
            '<td class="press-table__num" data-label="번호">' + esc(num) + '</td>' +
            '<td class="press-table__title" data-label="제목">' +
              (isReal
                ? '<a class="press-table__link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(it.title || '') + '</a>'
                : '<span class="press-table__text">' + esc(it.title || '') + '</span><span class="press-table__nolink">원문 링크 확인 중</span>') +
            '</td>' +
            '<td class="press-table__pub" data-label="언론사">' + esc(it.publisher || it.source || '') + '</td>' +
            '<td class="press-table__date" data-label="등록일">' + esc(it.date || '') + '</td>' +
          '</tr>';
        });
        tableWrap.innerHTML = html + '</tbody></table>';

        pager.innerHTML = '';
        if (total > 1) {
          const prev = el('button', 'press__pagebtn press__pagebtn--prev', '이전');
          prev.type = 'button'; prev.disabled = page === 0;
          prev.addEventListener('click', function () { if (page > 0) { page--; paint(true); } });
          pager.appendChild(prev);
          const nums = el('span', 'press__pages');
          /* 현재 페이지를 중심으로 최대 10개 번호 */
          const win = window.innerWidth < 768 ? 8 : 10, start = Math.max(0, Math.min(page - Math.floor(win / 2), total - win));   /* 모바일 : 이전 · 번호 · 다음이 한 줄에 들어가도록 최대 8개 */
          for (let n = start; n < Math.min(total, start + win); n++) {
            const b = el('button', 'press__pagenum' + (n === page ? ' is-current' : ''), String(n + 1));
            b.type = 'button';
            if (n === page) b.setAttribute('aria-current', 'page');
            b.addEventListener('click', (function (target) { return function () { page = target; paint(true); }; })(n));
            nums.appendChild(b);
          }
          pager.appendChild(nums);
          const next = el('button', 'press__pagebtn press__pagebtn--next', '다음');
          next.type = 'button'; next.disabled = page >= total - 1;
          next.addEventListener('click', function () { if (page < total - 1) { page++; paint(true); } });
          pager.appendChild(next);
        }
        tableWrap.classList.add('is-in');
        if (scroll) {
          const top = box.getBoundingClientRect().top + window.pageYOffset - SITE.headerHeight() - 24;
          window.scrollTo({ top: Math.max(0, top), behavior: SITE.prefersReduced ? 'auto' : 'smooth' });
        }
      }
      paint(false);
      wrap.appendChild(box);
    },

    /* 자이TV : 카드 = YouTube 썸네일(16:9) + 재생 버튼 + 제목. 페이지 로드 시 iframe 을 만들지 않고,
       썸네일 · 제목을 클릭했을 때만 모달에 iframe(youtube-nocookie · autoplay=1&rel=0)을 생성해 재생합니다. */
    video: function (d, wrap, ctx) {
      ctx.noMedia();
      const items = onlyOn(d.items);
      if (!items.length) return;
      const grid = el('div', 'video-grid');
      items.forEach(function (it, i) {
        const url = (it.videoUrl || it.url || '').trim();
        const id = youtubeId(url) || String(it.youtubeId || '').trim();
        const title = String(it.title || '').replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim();
        const card = el('article', 'video-card');
        const thumb = el('button', 'video-card__thumb');
        thumb.type = 'button'; thumb.setAttribute('aria-label', title + ' 재생');
        const thumbUrl = id ? 'https://img.youtube.com/vi/' + id + '/maxresdefault.jpg' : '';
        thumb.innerHTML = (thumbUrl ? '<img src="' + esc(thumbUrl) + '" alt="' + esc(title) + '" loading="lazy" decoding="async">' : '') +
          '<span class="video-card__play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span>';
        const im = thumb.querySelector('img');
        if (im && id) im.addEventListener('load', function () { if (im.naturalWidth < 200) im.src = 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg'; });   /* maxres 가 없는 영상은 hq 로 */
        anim(thumb, i * STG, 'anim--fade');
        card.appendChild(thumb);
        const cap = anim(el('div', 'video-card__caption'), i * STG + 80, 'anim--fade');
        const t = el('button', 'video-card__title', esc(title));
        t.type = 'button';
        cap.appendChild(t);
        card.appendChild(cap);
        const play = function () { openVideoModal(id, title, url); };
        thumb.addEventListener('click', play);
        t.addEventListener('click', play);
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    },

    /* 관심고객등록 · 방문예약 폼 : 폼 옆 대표 이미지(pages[ID].media) + 연락처 + 폼 */
    form: function (d, wrap, ctx) {
      /* 관심고객등록 · 방문예약 폼 : 이미지 슬롯이 없습니다. 왼쪽 상담 정보 + 오른쪽 폼 (모바일 1열) */
      ctx.noMedia();
      const cfg = SITE_DATA.reserve || {};
      const tel = SITE_DATA.site.tel || '';
      const box = el('div', 'reserve reserve--page');
      box.innerHTML =
        '<div class="reserve__layout">' +
          '<div class="reserve__aside anim anim--fade">' +
            '<p class="reserve__tel-label">' + esc(d.telLabel || cfg.telLabel || '분양문의') + '</p>' +
            '<a class="reserve__tel" href="' + esc(SITE.telHref) + '" aria-label="' + esc(SITE.telAria) + '">' + esc(tel) + '</a>' +
            '<p class="reserve__info">' + (d.info || cfg.info || '') + '</p>' +
          '</div>' +
          '<div class="reserve__slot"></div>' +
        '</div>';
      box.querySelector('.reserve__slot').appendChild(SITE.createReserveForm(Object.assign({}, cfg, d.form || {})));
      wrap.appendChild(box);
    },
    register: function (d, wrap, ctx) { return LAYOUTS.form(d, wrap, ctx); },

    /* 입지환경 : THE PRESTIGIOUS LOCATION — 제목 · 문구(HTML 텍스트) + 입지 지도 <img> + 생활환경 안내 + 광역 위치도 <img> */
    locationPage: function (d, wrap, ctx) {
      ctx.noMedia();
      const c = CONTENT.location || {};
      const head = pageHead(c.latin, '', ''); head.classList.add('page-head--latin-only'); wrap.appendChild(head);
      const fig = detailFigure(c.image, '입지환경 안내', 60);
      if (fig) { fig.classList.add('loc-figure'); wrap.appendChild(fig); }
      if (c.note) wrap.appendChild(noteList(String(c.note).split('\n')));
    },

    /* 단지설계 : 찬란히 빛나는 위용 / ICON OF MOKDONG — 외관 · 설계 설명 · 조감도 · 배치도 · 조경 (중앙 정렬) */
    complexDesign: function (d, wrap, ctx) {
      ctx.noMedia();
      const c = CONTENT.complexDesign || {};
      /* 이미지 위 HTML 텍스트(제목 · 설명)는 출력하지 않습니다 : ICON OF MOKDONG 바로 아래에 원본 이미지 */
      const head = pageHead(c.latin, '', ''); head.classList.add('page-head--latin-only'); wrap.appendChild(head);
      const detail = detailFigure(c.detail, '단지설계 상세 안내', 60);
      if (detail) { detail.classList.add('design-figure'); wrap.appendChild(detail); }
      const points = onlyOn(c.points);
      if (points.length) {
        const grid = el('div', 'design-points');
        points.forEach(function (pt, i) {
          grid.appendChild(anim(el('div', 'design-point', '<h3 class="design-point__title">' + esc(pt.title) + '</h3><p class="design-point__desc">' + esc(pt.description || '') + '</p>'), i * STG, 'anim--fade'));
        });
        wrap.appendChild(grid);
      }
      const land = onlyOn(c.landscape);
      if (land.length) {
        const box = el('div', 'design-landscape');
        box.appendChild(anim(el('h3', 'design-landscape__title', esc(c.landscapeTitle || '조경')), 0, 'anim--fade'));
        const row = el('div', 'design-landscape__list');
        land.forEach(function (it, i) { row.appendChild(anim(el('span', 'design-landscape__item', esc(it.title || it)), 80 + i * STG, 'anim--fade')); });
        box.appendChild(row);
        wrap.appendChild(box);
      }
      if (c.note) wrap.appendChild(noteList(String(c.note).split('\n')));
    },

    /* 하이퍼트 : NEW LIFESTYLE TRENDS — 제목 · 비주얼 <img> · HYPERT Core Value 4개(이미지 + 영문 · 한글 · 설명) · 하단 설명 */
    hypertPage: function (d, wrap, ctx) {
      ctx.noMedia();
      const c = CONTENT.hypert || {};
      const head = pageHead(c.latin, '', ''); head.classList.add('page-head--latin-only'); wrap.appendChild(head);
      const fig = detailFigure(c.image, '하이퍼트 안내', 60);
      if (fig) { fig.classList.add('hypert-figure'); wrap.appendChild(fig); }
    },

    /* 상세 안내 이미지 페이지 : 안내 문구 → 공식 상세 이미지(원본 비율 · 잘림 없음 · zoom:true 면 확대 보기) → 주의 문구 */
    detailImages: function (d, wrap, ctx) {
      ctx.noMedia();
      if (d.intro) wrap.appendChild(textBlock(d.intro, 0));
      const imgs = (d.images || []).filter(Boolean);
      const stack = el('div', 'detail-stack');
      imgs.forEach(function (im, i) {
        const f = detailFigure(typeof im === 'string' ? { src: im } : im, d.title + (imgs.length > 1 ? ' ' + (i + 1) : ''), i * STG);
        if (f) stack.appendChild(f);
      });
      wrap.appendChild(stack);
      const notes = (d.notes || []).filter(Boolean);
      if (notes.length) wrap.appendChild(noteList(notes));
    },

    /* 탭 이미지 페이지 : 탭(B1F · B2F · B3F / 시스템 3종) → 탭마다 공식 상세 이미지 */
    tabImages: function (d, wrap, ctx) {
      ctx.noMedia();
      const tabs = onlyOn(d.tabs);
      if (!tabs.length) return;
      if (d.intro) wrap.appendChild(textBlock(d.intro, 0));
      wrap.appendChild(tabsView(tabs, function (t) {
        const box = el('div', 'detail-stack');
        const f = detailFigure(t.image || t.media, t.label, 0);
        if (f) box.appendChild(f);
        if (t.note) box.appendChild(noteBlock(t.note));
        return box;
      }, 0));
      const notes = (d.notes || []).filter(Boolean);
      if (notes.length) wrap.appendChild(noteList(notes));
    },

    /* 문서 페이지 : 제목(공통 머리) → 간단한 안내 → 미리보기 이미지 또는 PDF 뷰어 → 문서 보기 · 다운로드
       파일이 없으면 공식 페이지로 이동하는 버튼만 표시 ('준비 중' 버튼 없음) */
    documentPage: function (d, wrap, ctx) {
      ctx.noMedia();
      const doc = d.document || {};
      const box = el('div', 'docpage');
      if (d.intro) box.appendChild(textBlock(d.intro, 0));
      const src = String(doc.src || '').trim();
      const isPdf = doc.type === 'pdf' || /\.pdf(\?|$)/i.test(src);
      if (src) {
        if (isPdf) {
          const frame = anim(el('div', 'docpage__pdf'), 80, 'anim--fade');
          frame.innerHTML = '<iframe src="' + esc(src) + '#view=FitH" title="' + esc(d.title) + ' PDF 미리보기" loading="lazy"></iframe>';
          box.appendChild(frame);
        } else {
          const f = detailFigure(doc, d.title, 80);
          if (f) { f.classList.add('docpage__preview'); box.appendChild(f); }
        }
        const acts = anim(el('div', 'sub-actions sub-actions--center docpage__actions'), 140, 'anim--fade');
        const view = el('a', 'btn', esc(d.viewLabel || '문서 보기'));
        view.href = src; view.target = '_blank'; view.rel = 'noopener noreferrer';
        acts.appendChild(view);
        const dl = el('a', 'btn btn--line', esc(d.downloadLabel || '다운로드'));
        dl.href = src; dl.setAttribute('download', doc.fileName || '');
        acts.appendChild(dl);
        box.appendChild(acts);
      } else if (d.officialUrl) {
        const acts = anim(el('div', 'sub-actions sub-actions--center'), 80, 'anim--fade');
        const a = el('a', 'btn', esc(d.officialLabel || '공식 홈페이지에서 보기'));
        a.href = d.officialUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
        acts.appendChild(a); box.appendChild(acts);
      }
      wrap.appendChild(box);
      const notes = (d.notes || []).filter(Boolean);
      if (notes.length) wrap.appendChild(noteList(notes));
    },

    /* 약관 등 텍스트 (대표 이미지는 공통 렌더러가 media.position 위치에 배치) */
    text: function (d, wrap) {
      wrap.appendChild(textBlock(d.content || '', 0));
      const links = (d.links || []).filter(function (l) { return l && l.url; });
      if (links.length) {
        const acts = anim(el('div', 'sub-actions'), 80, 'anim--fade');
        links.forEach(function (l) { const a = el('a', 'btn btn--line', esc(l.label)); a.href = l.url; a.target = l.target || '_blank'; if (a.target === '_blank') a.rel = 'noopener noreferrer'; acts.appendChild(a); });
        wrap.appendChild(acts);
      }
      const items = onlyOn(d.items);
      if (items.length) wrap.appendChild(cardGrid(items, { ratio: '3 / 2' }));
    }
  };

  /* -----------------------------------------------------------------
     페이지별 자유 섹션 (모든 소메뉴 페이지 공통)
     type : image / imageText / gallery / text · enabled:false 면 여백 없이 제거
     ----------------------------------------------------------------- */
  function renderSections(list, wrap) {
    onlyOn(list).forEach(function (sec, i) {
      const secMedia = pickMedia(sec, ['media', 'image', 'src'], sec.alt || sec.title || pageTitle, sec.ratio || '');
      if (sec.type === 'image') {
        const box = el('div', 'sec-image');
        if (sec.maxWidth) box.style.maxWidth = sec.maxWidth;
        const fig = figure(secMedia, sec.alt || pageTitle, sec.ratio || '16 / 9', sec.caption || '', i * STG);
        if (fig) box.appendChild(fig);
        wrap.appendChild(box);

      } else if (sec.type === 'imageText') {
        /* layout : image-left · image-right · image-top · full-width */
        const row = el('div', 'sec-imagetext' +
          (sec.layout === 'image-right' ? ' sec-imagetext--right' : '') +
          (sec.layout === 'image-top' ? ' sec-imagetext--top' : '') +
          (sec.layout === 'full-width' ? ' sec-imagetext--full' : ''));
        const fig = figure(secMedia, sec.alt || sec.title || pageTitle, sec.ratio || '4 / 3', '', i * STG);
        if (fig) row.appendChild(fig);
        row.appendChild(anim(el('div', 'sec-imagetext__text',
          (sec.title ? '<h3 class="sec-imagetext__title">' + esc(sec.title) + '</h3>' : '') +
          (sec.description ? '<p class="sec-imagetext__desc">' + esc(sec.description) + '</p>' : '')), i * STG + 120, 'anim--fade'));
        wrap.appendChild(row);

      } else if (sec.type === 'gallery') {
        const items = onlyOn(sec.items).length ? onlyOn(sec.items) :
          (sec.images || []).map(function (im, k) {
            return typeof im === 'string' ? { title: (sec.title || pageTitle) + ' ' + (k + 1), media: { src: im } } : { title: im.title || im.alt || ((sec.title || pageTitle) + ' ' + (k + 1)), description: im.description || '', media: im };
          });
        const grid = cardGrid(items, { ratio: sec.ratio || '4 / 3', cols: sec.columns });
        wrap.appendChild(grid);

      } else if (sec.type === 'text') {
        if (sec.media) {
          const row = el('div', 'sec-imagetext' + (sec.layout === 'image-right' ? ' sec-imagetext--right' : ''));
          const fig = figure(secMedia, sec.title || pageTitle, sec.ratio || '4 / 3', '', i * STG);
          if (fig) row.appendChild(fig);
          const t = el('div', 'sec-imagetext__text');
          if (sec.title) t.appendChild(el('h3', 'sec-imagetext__title', esc(sec.title)));
          t.appendChild(textBlock(sec.description || sec.content || '', i * STG + 120));
          row.appendChild(t);
          wrap.appendChild(row);
        } else {
          wrap.appendChild(textBlock(sec.description || sec.content || '', i * STG));
        }
      }
    });
  }

  let videoModal = null, videoLast = null;
  function openVideoModal(id, title, url) {
    if (!videoModal) {
      videoModal = el('div', 'video-modal');
      videoModal.setAttribute('role', 'dialog'); videoModal.setAttribute('aria-modal', 'true'); videoModal.setAttribute('aria-label', '영상 재생');
      videoModal.innerHTML =
        '<div class="video-modal__box">' +
          '<button type="button" class="video-modal__close" aria-label="닫기">✕</button>' +
          '<div class="video-modal__frame"></div>' +
          '<p class="video-modal__title"></p>' +
        '</div>';
      document.body.appendChild(videoModal);
      videoModal.addEventListener('click', function (e) { if (e.target === videoModal) closeVideoModal(); });
      videoModal.querySelector('.video-modal__close').addEventListener('click', closeVideoModal);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && videoModal.classList.contains('is-open')) closeVideoModal(); });
    }
    videoLast = document.activeElement;
    const src = id ? 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0' : toEmbedUrl(url);
    videoModal.querySelector('.video-modal__frame').innerHTML =
      '<iframe src="' + esc(src) + '" title="' + esc(title || '영상') + '" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    videoModal.querySelector('.video-modal__title').textContent = title || '';
    videoModal.classList.add('is-open'); videoModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    videoModal.querySelector('.video-modal__close').focus();
  }
  function closeVideoModal() {
    if (!videoModal || !videoModal.classList.contains('is-open')) return;
    videoModal.querySelector('.video-modal__frame').innerHTML = '';     /* iframe 제거 → 재생 즉시 중지 */
    videoModal.classList.remove('is-open'); videoModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (videoLast && videoLast.focus) videoLast.focus();
  }
  /* (예전) 영상 재생 모달 */
  function openVideo(item) {
    const modal = $('#modal');
    const media = $('#modalMedia');
    media.innerHTML = '';
    media.classList.remove('is-loaded');
    const src = toEmbedUrl(item.videoUrl || item.url, item.videoType);
    if (src && /\.(mp4|webm|ogg)$/i.test(src)) {
      media.innerHTML = '<video src="' + esc(src) + '" controls autoplay playsinline ' +
        'style="position:absolute;inset:0;width:100%;height:100%;background:#000;"></video>';
    } else if (src) {
      media.innerHTML = '<iframe src="' + esc(src) + '" title="' + esc(item.title || '') + '" allowfullscreen allow="autoplay; encrypted-media" ' +
        'style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe>';
    } else {
      media.innerHTML = '<p class="sub-frame__empty">영상 주소(SITE_DATA.pages.tv.items[].videoUrl)를 입력하면 이 영역에서 재생됩니다.</p>';
    }
    $('#modalCaption').textContent = item.title || '';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    $('#modalClose').focus();
  }

  /* =======================================================================
     화면 조립
     ======================================================================= */
  function buildSubNav() {
    if (!group || sub.showTabs === false) return null;
    const items = onlyOn(group.items).filter(function (it) { const p = pages[it.page]; return p && isOn(p); });
    if (items.length < 2) return null;
    const nav = el('nav', 'sub-nav');
    nav.setAttribute('aria-label', group.label + ' 하위 메뉴');
    const inner = el('div', 'sub-nav__inner');
    items.forEach(function (it) {
      const a = el('a', 'sub-nav__link' + (it.page === pageId ? ' is-current' : ''), esc(it.label));
      if (it.url && String(it.url).trim()) { a.href = it.url; a.target = it.target || '_blank'; if (a.target === '_blank') a.rel = 'noopener noreferrer'; }
      else a.href = SITE_DATA.pageUrl(it.page);
      if (it.page === pageId) a.setAttribute('aria-current', 'page');
      inner.appendChild(a);
    });
    nav.appendChild(inner);
    return nav;
  }

  function buildHead(hasNav) {
    const nf = sub.notFound || {};
    const category = valid ? (data.category || (group ? group.label : '')) : '';
    const title = valid ? data.title : (nf.title || '페이지를 찾을 수 없습니다');
    const desc = valid ? (data.description || '') : (nf.description || '');
    const head = el('section', 'sub-head' + (hasNav ? '' : ' sub-head--top'));
    head.setAttribute('data-header-theme', 'solid');
    head.innerHTML =
      '<div class="sub-head__inner">' +
        /* 큰 한글 제목 위의 작은 영문은 표시하지 않습니다. */
        '<h1 class="sub-head__title anim">' + esc(title) + '</h1>' +
        (desc ? '<p class="sub-head__desc anim anim--fade" style="--anim-delay:130ms">' + esc(desc) + '</p>' : '') +
        '<nav class="breadcrumb anim anim--fade" style="--anim-delay:220ms" aria-label="현재 위치">' +
          '<a href="' + SITE.HOME + '">' + esc(sub.homeLabel || 'HOME') + '</a>' +
          (category ? '<i aria-hidden="true">›</i><span>' + esc(category) + '</span>' : '') +
          '<i aria-hidden="true">›</i><span aria-current="page">' + esc(title) + '</span>' +
        '</nav>' +
      '</div>';
    return head;
  }

  /* -----------------------------------------------------------------
     공통 페이지 렌더러
     · 페이지 대표 이미지(pages[ID].media)가 없어도 placeholder 로 기본값을 만들어
       항상 실제 <img> 가 출력됩니다. (새로 추가되는 페이지에도 자동 적용)
     · 레이아웃이 ctx.pageMedia() 로 직접 가져가지 않으면 media.position(top/left/right/bottom)
       위치에 자동으로 배치합니다.
     ----------------------------------------------------------------- */
  function buildBody() {
    const wrap = el('div', 'sub-content');
    if (!valid) {
      const nf = sub.notFound || {};
      const nfMedia = pickMedia(nf, ['media'], nf.title || '페이지를 찾을 수 없습니다', '21 / 9');
      const nfBlock = pageMediaBlock(nfMedia, { title: nf.title || '' }, 'top');
      if (nfBlock) wrap.appendChild(nfBlock);
      wrap.appendChild(messageBox(nf.title || '페이지를 찾을 수 없습니다', nf.description || ''));
      const links = el('div', 'sub-links');
      onlyOn(SITE_DATA.menu).forEach(function (g) {
        onlyOn(g.items).forEach(function (it) {
          const p = pages[it.page];
          if (!p || !isOn(p)) return;
          const a = el('a', '', esc(it.label));
          a.href = SITE_DATA.pageUrl(it.page);
          links.appendChild(a);
        });
      });
      wrap.appendChild(links);
      return wrap;
    }

    /* 대표 이미지 설정 : media 가 없으면 기본값(placeholder) 생성 */
    const PAGE_KEYS = ['media', 'heroImage'];
    const ctx = {
      used: false,
      pageMedia: function (extraKeys, ratio) {
        ctx.used = true;
        return pickMedia(data, PAGE_KEYS.concat(extraKeys || []), data.title || '페이지 이미지', ratio);
      },
      /* 이미지 슬롯이 아예 없는 레이아웃(폼)이 호출 : 대표 이미지를 만들지 않습니다 */
      noMedia: function () { ctx.used = true; ctx.noImage = true; }
    };
    const render = LAYOUTS[data.layoutType] || LAYOUTS.text;
    const body = el('div', 'sub-layout sub-layout--' + (data.layoutType || 'text'));
    render(data, body, ctx);

    if (!ctx.used) {
      const cfg = pickMedia(data, PAGE_KEYS, data.title || '페이지 이미지', '');
      const pos = (cfg && cfg.position) || 'top';
      const block = pageMediaBlock(cfg, data, pos);
      if (block && pos === 'bottom') { Array.prototype.slice.call(body.childNodes).forEach(function (n) { wrap.appendChild(n); }); wrap.appendChild(block); }
      else {
        if (block) wrap.appendChild(block);
        Array.prototype.slice.call(body.childNodes).forEach(function (n) { wrap.appendChild(n); });
      }
    } else {
      Array.prototype.slice.call(body.childNodes).forEach(function (n) { wrap.appendChild(n); });
    }

    renderSections(data.sections, wrap);          /* 페이지별 추가 이미지 · 갤러리 */
    if (data.note) wrap.appendChild(noteBlock(data.note));

    /* (임시 이미지를 강제로 넣는 안전장치는 사용하지 않습니다 : 이미지가 없는 페이지는 텍스트 · 영상 · 표 · 폼만 표시) */    return wrap;
  }

  function buildCta() {
    const tel = SITE_DATA.site.tel || '';
    const cta = el('section', 'sub-cta');
    cta.setAttribute('data-header-theme', 'overlay');
    cta.innerHTML =
      '<div class="sub-cta__inner">' +
        '<div class="anim anim--fade">' +
          '<p class="sub-cta__title">' + esc(sub.ctaTitle || '견본주택 방문을 예약하세요') + '</p>' +
          '<p class="sub-cta__text">' + esc(sub.ctaText || '') + '</p>' +
        '</div>' +
        '<div class="sub-cta__actions anim anim--fade" style="--anim-delay:130ms">' +
          '<a class="sub-cta__tel" href="' + esc(SITE.telHref) + '" aria-label="' + esc(SITE.telAria) + '">' + esc(tel) + '</a>' +
          '<a class="btn" href="' + esc(SITE.normalizeUrl(sub.ctaUrl || '#visit-reservation')) + '">' + esc(sub.ctaButton || '방문예약 하기') + '</a>' +
        '</div>' +
      '</div>';
    return cta;
  }

  const nav = buildSubNav();
  if (nav) root.appendChild(nav);
  root.appendChild(buildHead(!!nav));

  const body = el('div', 'sub-body' + (valid && data.wide ? ' sub-body--wide' : ''));
  body.setAttribute('data-header-theme', 'solid');
  const inner = el('div', 'sub-body__inner');
  inner.appendChild(buildBody());
  body.appendChild(inner);
  root.appendChild(body);
  /* 이전 · 다음 페이지 영역 없음 : 본문이 끝나면 바로 방문예약 연결 */
  root.appendChild(buildCta());

  SITE.renderQuickMenu('#quickMenu');
  SITE.initPageEffects();

})();
