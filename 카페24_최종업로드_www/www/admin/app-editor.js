/* 통합웹빌더 에디터 — 전체 화면 · 왼쪽 패널 · 중앙 실제 페이지(iframe) · 오른쪽 설정 (editor.js 를 SPA 용으로 변환) */
window.WBEditor = (function () {
  let ctrl = null, cfg = null, inst = null, openSeq = 0;
  const esc = WB.esc;
  function pageLabel(p) { return (p && p.title ? p.title : '페이지') + (p && p.type === 'main' ? ' (메인)' : ''); }
  function template(C) {
    const sites = WB.S.sites || [];
    const ic = (d, fill) => '<svg class="ed-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"' + (fill ? ' data-fill="1"' : '') + '>' + d + '</svg>';
    const IC = { back: ic('<path d="M15 5l-7 7 7 7"/>'), pages: ic('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>'), sections: ic('<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/>'), elements: ic('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>'), layers: ic('<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>'), media: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>'), common: ic('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M4 15h16"/>'), header: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6 6.5h3"/>'), footer: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18"/><path d="M6 17.5h6"/>'), history: ic('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 5v4h4"/><path d="M12 8v4l3 2"/>'), pc: ic('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>'), tablet: ic('<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/>'), mobile: ic('<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/>'), undo: ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-4"/>'), redo: ic('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h4"/>'), more: ic('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>', true), fold: ic('<path d="M14 6l-6 6 6 6"/>'), panel: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>') };
    const rail = [['pages', '페이지', '페이지 목록 · 추가 · 복제 · 삭제 · 순서'], ['sections', '섹션', '섹션 추가 · 저장한 블록'], ['elements', '요소', '글 · 이미지 · 버튼 등 요소 추가'], ['layers', '레이어', '현재 페이지 구조 · 순서'], ['media', '미디어', '이미지 · 영상 선택 · 업로드'], ['header', '헤더', '헤더 전용 편집 — 로고 · 메뉴 · 대표번호 (모든 페이지 공통)'], ['footer', '푸터', '푸터 · 퀵메뉴 전용 편집 (모든 페이지 공통)'], ['common', '공통 요소', '공통 요소 모아보기 · 이 페이지만 다르게'], ['history', '변경 이력', '버전 · 최근 삭제 항목']];
    return '<header class="ed-top"><div class="ed-top__left"><a class="ed-iconbtn ed-top__back" href="#/dashboard" id="edExit" aria-label="관리자로 돌아가기" data-tip="관리자로 돌아가기">' + IC.back + '</a>' +
      '<span class="ed-top__site" id="edSiteName" title="관리 현장">' + esc(C.siteName) + '</span><select id="edSiteSel" hidden aria-hidden="true"><option value="' + C.siteId + '" selected>' + esc(C.siteName) + '</option></select>' +
      '<span class="ed-top__sep" aria-hidden="true">/</span>' +
      '<div class="ed-pp" id="edPagePick"><button type="button" class="ed-top__sel ed-pp__btn" id="edPageBtn" aria-haspopup="listbox" aria-expanded="false" title="편집할 페이지 선택 (검색 가능)"><b id="edPageBtnName">' + esc(pageLabel({ title: C.pageTitle, type: C.pageType })) + '</b><small>페이지 ' + C.pages.length + '</small><i aria-hidden="true"></i></button>' +
      '<div class="ed-pp__pop" id="edPagePop" hidden><input type="search" id="edPageSearch" class="ed-pp__q" placeholder="페이지 검색 (' + C.pages.length + '개)" aria-label="페이지 검색" autocomplete="off">' +
      '<ul class="ed-pp__list" id="edPageOpts" role="listbox" aria-label="페이지 목록">' + C.pages.map((p) => '<li><button type="button" role="option" aria-selected="' + (p.id === C.pageId ? 'true' : 'false') + '" data-pagepick="' + p.id + '" class="ed-pp__item' + (p.id === C.pageId ? ' is-on' : '') + '" data-q="' + esc((p.title + ' ' + p.key).toLowerCase()) + '"><span>' + esc(pageLabel(p)) + '</span><small>' + esc(p.type === 'main' ? 'index.html' : '#page=' + p.key) + '</small></button></li>').join('') + '</ul>' +
      '<p class="ed-pp__none" id="edPageNone" hidden>찾는 페이지가 없습니다.</p></div></div>' +
      '<select id="edPageSel" hidden aria-hidden="true">' + C.pages.map((p) => '<option value="' + p.id + '"' + (p.id === C.pageId ? ' selected' : '') + '>' + esc(pageLabel(p)) + '</option>').join('') + '</select>' +
      '<span class="ed-save" id="edSaveInfo" data-state="saved" role="status"><i></i><span>불러오는 중…</span></span><span class="badge" id="edStatus">' + esc(C.statuses[C.status] || C.status) + '</span></div>' +
      '<div class="ed-top__mid"><div class="ed-modes" role="group" aria-label="편집 대상">' +
      '<button type="button" data-emode="page" class="is-on" data-tip="이 페이지 내용 편집">페이지</button>' +
      '<button type="button" data-emode="header" data-tip="헤더만 크게 펼쳐서 편집 (모든 페이지 공통)">헤더</button>' +
      '<button type="button" data-emode="footer" data-tip="푸터만 크게 펼쳐서 편집 (모든 페이지 공통)">푸터</button>' +
      '<button type="button" data-emode="common" data-tip="헤더 · 푸터 · 퀵메뉴 · 페이지별 예외">공통요소</button></div>' +
      '<div class="ed-dev" role="group" aria-label="미리보기 화면 크기"><button type="button" data-dev="pc" class="is-on" aria-pressed="true" data-tip="PC (1024px 이상)">' + IC.pc + '<span>PC</span></button><button type="button" data-dev="tablet" aria-pressed="false" data-tip="태블릿 (768px)">' + IC.tablet + '<span>태블릿</span></button><button type="button" data-dev="mobile" aria-pressed="false" data-tip="모바일 (390px)">' + IC.mobile + '<span>모바일</span></button></div><div class="ed-zoom" role="group" aria-label="확대 · 축소"><button type="button" data-zoom="out" aria-label="축소" data-tip="축소">−</button><button type="button" class="ed-zoom__val" id="edZoomVal" data-zoom="fit" data-tip="누르면 화면에 맞춤 · 길게 누르면 직접 입력">100%</button><button type="button" data-zoom="in" aria-label="확대" data-tip="확대">＋</button></div></div>' +
      '<div class="ed-top__actions"><div class="ed-hist"><button type="button" class="ed-iconbtn" id="edUndo" aria-label="실행 취소" data-tip="실행 취소 (Ctrl+Z)" disabled>' + IC.undo + '</button><button type="button" class="ed-iconbtn" id="edRedo" aria-label="다시 실행" data-tip="다시 실행 (Ctrl+Y)" disabled>' + IC.redo + '</button></div><button class="btn btn--ghost btn--sm" type="button" id="edPreview" title="저장된 초안을 실제 화면(새 창)으로 확인">미리보기</button><button class="btn btn--line btn--sm" type="button" id="edSave" title="변경 이력에 남는 저장 (Ctrl+S)">임시저장</button>' + (C.canPublish ? '<button class="btn btn--sm" type="button" id="edPublish" title="변경 요약을 확인한 뒤 공개 홈페이지에 반영">게시</button>' : '<button class="btn btn--line btn--sm" type="button" id="edReview" title="게시 권한자에게 검토 요청">검토 요청</button>') + '<button class="ed-iconbtn" type="button" id="edMore" aria-label="더보기" data-tip="더보기 (버전 · 예약 게시 · SEO · 단축키)">' + IC.more + '</button></div></header>' +
      '<div class="ed-wrap" id="edWrap"><nav class="ed-rail" aria-label="편집 도구">' + rail.map((r, n) => '<button type="button" class="ed-rail__btn' + (n === 0 ? ' is-on' : '') + '" data-ltab="' + r[0] + '" aria-label="' + r[1] + '" data-tip="' + r[1] + ' — ' + r[2] + '">' + IC[r[0]] + '<span>' + r[1] + '</span></button>').join('') + '</nav>' +
      '<aside class="ed-left" id="edLeft" aria-label="왼쪽 패널"><div class="ed-left__head"><b id="edLeftTitle">페이지</b><button type="button" class="ed-iconbtn ed-iconbtn--sm" id="edLeftClose" aria-label="패널 접기" data-tip="패널 접기 (가운데 화면 넓게)">' + IC.fold + '</button></div><div class="ed-panel__body" id="edLeftBody"></div></aside>' +
      '<main class="ed-stage" id="edStage"><div class="ed-hiddenbar" id="edHiddenBar" hidden><span>현재 <b>숨김 페이지</b>입니다. 공개 홈페이지에는 표시되지 않고, 에디터에서는 계속 수정할 수 있습니다.</span><button type="button" class="btn btn--sm" data-show-page>페이지 공개하기</button></div><div class="ed-canvasinfo" id="edCanvasInfo" aria-live="polite"></div><div class="ed-frame-wrap" id="edFrameWrap"><div class="ed-frame-scale" id="edFrameScale"><iframe id="edFrame" title="페이지 편집 화면" src="about:blank"></iframe></div><div class="ed-frame-loading" id="edLoading">불러오는 중…</div><div class="ed-overlay" id="edOverlay"></div></div></main>' +
      '<button type="button" class="ed-right-toggle" id="edRightToggle" aria-label="설정 패널 접기" aria-expanded="true" data-tip="설정 패널 접기">' + IC.panel + '</button>' +
      '<aside class="ed-right" id="edRight" aria-label="설정 패널"><div class="ed-right__head"><span id="edSelTitle">요소를 선택하세요</span><button type="button" class="ed-right__x" id="edDeselect" title="선택 해제 (Esc)" aria-label="선택 해제">×</button></div><div class="ed-tabs" role="tablist"><button type="button" class="is-on" data-rtab="content" title="글 · 이미지 · 링크 내용 (페이지를 고르면 기본 설정)">내용</button><button type="button" data-rtab="style" title="글자 · 크기 · 정렬 · 여백 · 배경 · 테두리 · 기기별 표시 — 상단에서 고른 화면(PC · 태블릿 · 모바일)의 값">디자인</button><button type="button" data-rtab="advanced" title="세부 단위 · 사용자 클래스 · CSS · 동작 (개발자용)">고급</button></div><div class="ed-panel__body" id="edRightBody"><div class="ed-empty">중앙 화면에서 <b>텍스트 · 이미지 · 버튼 · 섹션</b>을 클릭하면 여기에서 편집할 수 있습니다.</div></div></aside></div>';
  }
  function notFound(site, pages, wanted) {   /* 없는 페이지 번호 : JSON 이 아니라 관리자 화면 안에서 안내 */
    if (ctrl) close(true); const el = document.getElementById('content'); if (!el) return;
    const tt = document.getElementById('tbTitle'); if (tt) tt.textContent = '에디터 · ' + site.name;
    el.innerHTML = '<div class="card" id="edNotFound"><div class="alert alert--error">편집할 페이지를 찾을 수 없습니다. (페이지 번호 ' + esc(String(wanted)) + ')</div><p class="help">삭제되었거나 다른 사이트의 페이지입니다. 아래에서 편집할 페이지를 선택해 주세요.</p><ul class="ef__list">' + pages.map((p) => '<li><span>' + esc(p.title) + (p.type === 'main' ? ' <small class="muted">메인</small>' : '') + '</span><a class="btn btn--xs btn--line" href="#/editor?pageId=' + p.id + '">편집</a></li>').join('') + '</ul></div>';
  }
  function contentBox(site, title) { if (ctrl) close(true); const el = document.getElementById('content'); if (!el) return null; const tt = document.getElementById('tbTitle'); if (tt) tt.textContent = title + (site ? ' · ' + site.name : ''); return el; }
  function loadingState(site) { const el = contentBox(site, '에디터'); if (el) el.innerHTML = '<div class="card ed-entry" id="edEntryLoading"><div class="ed-entry__spin" aria-hidden="true"></div><b>에디터 불러오는 중…</b><p class="help">' + esc(site.name) + ' 의 페이지 목록을 불러오고 있습니다.</p></div>'; }
  function loadFailed(site, err) { const el = contentBox(site, '에디터'); if (!el) return; el.innerHTML = '<div class="card ed-entry" id="edLoadFail"><div class="alert alert--error"><span><b>페이지 목록을 불러오지 못했습니다.</b><br>' + esc((err && err.message) || '서버 응답이 없습니다.') + '</span></div><button class="btn btn--sm" type="button" id="edRetry">다시 시도</button></div>'; const b = document.getElementById('edRetry'); if (b) b.addEventListener('click', () => open({})); }
  function emptyState(site, errMsg) {
    const el = contentBox(site, '에디터'); if (!el) return; const others = (WB.S.sites || []).filter((x) => site && x.id !== site.id && x.stats && x.stats.pages > 0);
    const canEdit = !!site && (WB.S.user.role === 'super' || site.role === 'admin' || site.role === 'editor');
    el.innerHTML = '<div class="card ed-entry" id="edEmpty"><h3 style="margin:0 0 6px">' + (site ? '이 사이트에 편집할 페이지가 없습니다.' : '관리할 사이트가 없습니다.') + '</h3>' + (site ? '<p class="help">현재 선택한 사이트 : <b>' + esc(site.name) + '</b> (식별값 ' + esc(site.key) + ' · 번호 ' + site.id + ')</p>' : '') +
      (others.length ? '<p style="margin:14px 0 6px">페이지가 있는 다른 사이트로 바꿔서 편집할 수 있습니다.</p><ul class="ef__list">' + others.map((x) => '<li><span><b>' + esc(x.name) + '</b> <small class="muted">' + esc(x.key) + ' · 페이지 ' + x.stats.pages + '개</small></span><button class="btn btn--xs" type="button" data-ed-site="' + x.id + '">이 사이트 편집</button></li>').join('') + '</ul>' : '') +
      (errMsg ? '<div class="alert alert--error" style="margin-top:10px"><span>' + esc(errMsg) + '</span></div>' : '') + (canEdit ? '<div class="row" style="margin-top:14px"><button class="btn btn--sm" type="button" id="edImport">공개 홈페이지에서 페이지 가져오기</button><span class="help">지금 공개 중인 홈페이지의 페이지 구조를 그대로 등록합니다 (홈페이지 파일은 바뀌지 않음).</span></div>' : '') + (canEdit ? '<div class="row" style="margin-top:8px"><button class="btn btn--sm btn--line" type="button" id="edMakeMain">메인 페이지 생성</button><span class="help">빈 메인 페이지를 만든 뒤 에디터를 엽니다.</span></div>' : '') + '</div>';
    el.addEventListener('click', async (e) => { const b = e.target.closest('[data-ed-site]'); if (b) { const x = (WB.S.sites || []).find((y) => y.id === +b.dataset.edSite); if (!x) return; WB.S.site = x; try { localStorage.setItem('wb_site', String(x.id)); } catch (er) {} if (window.App && App.selectSite) { await App.selectSite(x.id); } App.go('editor', {}); return; }
      if (e.target.closest('#edImport')) { const ib = e.target.closest('#edImport'); ib.disabled = true; try { const r = await WB.api('POST', 'api/sites/' + site.id + '/pages/import', {}); WB.toast('페이지 ' + r.pages + '개를 가져왔습니다.', r.pages ? 'success' : 'info'); open({ imported: true }); } catch (er) { ib.disabled = false; } return; }
      if (e.target.closest('#edMakeMain')) { const mb = e.target.closest('#edMakeMain'); mb.disabled = true; try { await WB.api('POST', 'api/sites/' + site.id + '/pages/main', {}); WB.toast('메인 페이지를 만들었습니다.', 'success'); open({}); } catch (er) { mb.disabled = false; } } });
  }
  async function open(opts) {
    opts = opts || {}; let site = WB.S.site;
    if (!site && WB.S.sites && WB.S.sites.length) { site = WB.S.sites[0]; WB.S.site = site; }
    if (!site) { emptyState(null); return; }
    const seq = ++openSeq;
    if (inst && inst.flush) { try { await inst.flush(); } catch (e) {} }   /* 다른 페이지로 넘어가기 전에 바뀐 내용 저장 */
    if (!ctrl) loadingState(site);   /* 목록 응답 전에는 '없음'으로 판단하지 않고 로딩만 표시 */
    let info; try { info = await WB.api('GET', 'api/sites/' + site.id + '/pages', undefined, { silent: true }); } catch (err) { if (seq !== openSeq) return; loadFailed(site, err); return; }
    if (seq !== openSeq) return;
    const pages = (info && Array.isArray(info.pages)) ? info.pages : []; const lastKey = 'wb_last_page_' + site.id; const byId = (id) => pages.find((p) => String(p.id) === String(id));
    let page = null, dropped = '';
    if (opts.pageId != null && opts.pageId !== '') { page = /^[0-9]+$/.test(String(opts.pageId)) ? byId(opts.pageId) : null; if (!page) dropped = String(opts.pageId); }
    if (!page && !dropped) { let last = null; try { last = localStorage.getItem(lastKey); } catch (e) {} if (last) { page = byId(last) || null; if (!page) { try { localStorage.removeItem(lastKey); } catch (e) {} } } }   /* 1순위 : 이 사이트에서 마지막으로 편집한 페이지 */
    if (!page) page = pages.find((p) => p.type === 'main' || p.key === 'main') || pages.find((p) => p.status === 'published') || pages[0] || null;   /* 2순위 메인 · 3순위 첫 공개 페이지 */
    const canEditSite = WB.S.user.role === 'super' || site.role === 'admin' || site.role === 'editor';
    const needImport = pages.length <= 1 || !!(info && info.needsImport);   /* 메인처럼 "있지만 내용이 빈 페이지" 도 공개 홈페이지에서 채움 */
    if (needImport && canEditSite && !opts.imported) {   /* 페이지가 없거나 메인 하나뿐이거나 빈 페이지가 있으면 : 지금 공개 중인 홈페이지(index.html)에 있는 나머지 페이지를 관리자 DB 로 가져옴 (이미 있는 페이지 · 홈페이지 파일은 그대로) */
      const el0 = contentBox(site, '에디터'); if (el0) el0.innerHTML = '<div class="card ed-entry" id="edImporting"><div class="ed-entry__spin" aria-hidden="true"></div><b>공개 홈페이지에서 페이지를 불러오는 중…</b><p class="help">' + esc(site.name) + ' 의 현재 홈페이지 페이지 구조를 관리자에 등록합니다. 공개 홈페이지 파일은 바뀌지 않습니다.</p></div>';
      let imp = null; try { imp = await WB.api('POST', 'api/sites/' + site.id + '/pages/import', {}, { silent: true }); } catch (err) { imp = { error: (err && err.message) || '' }; }
      if (seq !== openSeq) return;
      if (imp && imp.pages > 0) { WB.toast((imp.source === 'published' ? '지금 공개 중인 홈페이지' : '사이트 기본 템플릿') + '에서 페이지 ' + imp.pages + '개를 가져왔습니다.', 'success'); if (window.App && App.refreshSites) { try { await App.refreshSites(); } catch (er) {} } return open(Object.assign({}, opts, { imported: true })); }
      if (!pages.length) return emptyState(site, imp && imp.error ? '페이지를 가져오지 못했습니다 : ' + imp.error : '');
      if (imp && imp.error) WB.toast('공개 홈페이지에서 페이지를 더 가져오지 못했습니다 : ' + imp.error, 'error');   /* 메인 1개는 있으므로 편집은 계속 */
    }
    /* 메인 페이지가 비어 있으면(게시가 막히는 원인) 지금 공개 중인 홈페이지 내용으로 바로 되살립니다 */
    if (info && (info.needsRepairMain || info.mainEmpty || info.mainPublishedEmpty)) {
      try { const rm = await WB.api('POST', 'api/sites/' + site.id + '/pages/repair-main', {}, { silent: true }); if (rm && rm.sections) { WB.toast('메인 페이지가 비어 있어 공개 홈페이지 내용(구성 ' + rm.sections + '개)으로 되살렸습니다.', 'success'); } } catch (er2) {}
    }
    if (!page) { emptyState(site); return; }
    if (dropped) WB.toast('요청한 페이지를 이 사이트에서 찾을 수 없어 ' + page.title + ' 페이지를 열었습니다.', 'info');
    try { localStorage.setItem(lastKey, String(page.id)); } catch (e) {}
    const base = (site.editor_base || site.preview_url || site.public_url || '').replace(/\/$/, '');
    if (!/^https?:\/\//.test(base)) { WB.toast('사이트 관리에서 공개 홈페이지(또는 미리보기) 주소를 먼저 입력해 주세요. 에디터는 실제 홈페이지 화면을 불러와 편집합니다.', 'error'); return; }
    const C = { pageId: page.id, pageKey: page.key, pageType: page.type, pageTitle: page.title, siteId: site.id, siteKey: site.key, siteName: site.name, frameUrl: site.single ? base + '/index.html?cms_edit=1' + (page.type === 'main' ? '' : '#page=' + encodeURIComponent(page.key)) : (page.type === 'main' ? base + '/index.html?cms_edit=1' : base + '/subpage.html?page=' + encodeURIComponent(page.key) + '&cms_edit=1'), previewBase: base, single: !!site.single, canPublish: site.role === 'admin' || site.role === 'editor', status: page.status, publishAt: page.publish_at, types: info.types, forms: info.forms, popups: info.popups, builtinUrl: site.builtin_url || '', pages: info.pages, statuses: info.statuses, layouts: info.layouts, appName: '통합웹빌더', apiBase: WB.apiBase(), select: opts.select || '', pageCount: info.pages.length, maxMb: 50 };
    if (ctrl) close(true);
    const view = document.getElementById('editorView'); view.innerHTML = template(C); view.hidden = false; document.getElementById('appView').hidden = true; document.body.classList.add('is-editor');
    ctrl = new AbortController(); cfg = C; const hash = '#/editor?pageId=' + page.id;
    if (location.hash !== hash) { if (opts.push) history.pushState(null, '', hash); else history.replaceState(null, '', hash); }   /* 페이지 이동 = 방문 기록에 추가(뒤로 · 앞으로 가기) · 새로고침해도 같은 페이지 */
    if (window.App && App.setCurrent) App.setCurrent('editor', { pageId: String(page.id) });
    document.title = page.title + ' · 에디터 · 통합웹빌더';
    try { inst = startEditor(C, ctrl.signal) || null; } catch (e) { inst = null; WB.toast('에디터를 시작하지 못했습니다: ' + e.message, 'error'); close(true); }
  }
  function close(silent) { try { if (window.__wbEditorCleanup) window.__wbEditorCleanup(); } catch (e) {} window.__wbEditorCleanup = null; window.__wbEditorGuard = null; if (ctrl) ctrl.abort(); ctrl = null; cfg = null; inst = null; document.title = '통합웹빌더 관리자'; const view = document.getElementById('editorView'); view.hidden = true; view.innerHTML = ''; document.getElementById('appView').hidden = false; document.body.classList.remove('is-editor'); if (!silent && window.App) App.go('dashboard'); }
  function isOpen() { return !!ctrl; }
function startEditor(C, signal) {
  const addL = (t, type, fn, opts) => t.addEventListener(type, fn, Object.assign({}, typeof opts === 'object' && opts ? opts : {}, { signal }));
  const $ = WB.$, $$ = WB.$$, esc = WB.esc;
  const SECTION_KEYS = { mainVisual: ['mainSlider', 'summaryScene', 'summary', 'content.businessOverview'], summaryMobile: [], premium: ['premiumSection', 'premium', 'content.premiumItems'], environment: ['environmentSection', 'environment', 'content.location', 'content.complexDesign', 'content.hypert', 'content.mainFeatureCards'], type: ['unitSection', 'content.unitTypes'], reserve: ['reserve'] };
  const CONTENT_KEYS = ['businessOverview', 'premiumItems', 'mainFeatureCards', 'location', 'complexDesign', 'hypert', 'unitTypes'];
  const SEC_NAMES = { mainVisual: '메인 슬라이드 + 써머리', summaryMobile: '써머리 (모바일)', premium: '프리미엄', environment: '입지환경 · 설계', type: '타입', reserve: '방문예약', header: '헤더', footer: '푸터' };
  const SEC_SEL = { mainVisual: '#hero', summaryMobile: '#summary-mobile', premium: '#premium', environment: '#environment', type: '#type', reserve: '#visit-reservation', header: '#header', footer: '#footer' };
  const KEY_LABELS = { title: '제목', titleLines: '제목(줄)', subtitle: '부제', desc: '설명', description: '설명', text: '내용', html: '내용(HTML)', label: '라벨', name: '이름', latin: '영문', eyebrow: '상단 소제목', note: '주석', notice: '유의사항', caption: '캡션', src: '이미지', webp: 'WebP 이미지', webp1280: 'WebP (1280)', mobileSrc: '모바일 이미지', mobileWebp: '모바일 WebP', image: '이미지', cardImage: '카드 이미지', backgroundImage: '배경 이미지', alt: '대체 텍스트(alt)', cardAlt: '카드 대체 텍스트', href: '링크', url: '주소', link: '링크', target: '링크 열기', page: '페이지', enabled: '사용', items: '항목', slides: '슬라이드', rows: '행', tabs: '탭', notes: '참고', lines: '줄', media: '미디어', ratio: '비율', imageRatio: '이미지 비율', objectFit: '이미지 맞춤', objectPosition: '이미지 위치', imageFit: '이미지 맞춤', layoutType: '레이아웃', layoutRatio: '레이아웃 비율', category: '분류', interval: '전환 간격(ms)', duration: '전환 시간(ms)', overlayColor: '오버레이 색', overlayColorMobile: '모바일 오버레이 색', submitLabel: '버튼 문구', doneTitle: '완료 제목', doneText: '완료 안내', demoTitle: '데모 제목', demoText: '데모 안내', phonePrefix: '전화 앞자리', visitTimes: '방문 시간 목록', fields: '필드', agreements: '동의 항목', modelHouseUrl: 'VR 링크', videoUrl: '동영상 주소', videoType: '동영상 종류', columns: '열 수', height: '높이', width: '너비', style: '스타일', align: '정렬', formKey: '폼', popupId: '팝업', header: '머리글', id: 'ID', key: '키', tab: '탭 이름', value: '값', mobileSlogan: '모바일 슬로건', backgroundOpacity: '배경 투명도', action: '전송 주소', method: '전송 방식', full: '전체 너비', required: '필수', placeholder: '안내 문구', type: '종류', options: '선택지', tel: '전화', wide: '와이드', details: '상세', sections: '섹션', cardAlt2: '' };
  const BLOCKS = [['block:section', '빈 섹션', '▢', '요소를 직접 담는 섹션'], ['block:richtext', '텍스트', '¶', '제목 + 문단'], ['block:image', '이미지', '🖼', '한 장 · 캡션 · 링크'], ['block:imageText', '이미지 + 텍스트', '▣', '좌우 배치'], ['block:button', '버튼', '▭', '링크 · 전화 · 팝업'], ['block:video', '동영상', '▶', '유튜브 · 파일'], ['block:gallery', '갤러리', '▦', '여러 장 격자'], ['block:slide', '슬라이드', '◫', '자동 넘김'], ['block:table', '표', '▤', '행 · 열'], ['block:divider', '구분선', '—', ''], ['block:spacer', '여백', '↕', '높이'], ['block:embed', '지도 · 임베드', '◎', 'iframe 코드'], ['block:form', '폼(방문예약)', '✎', '예약 폼 배치']];
  const BLOCK_DEFAULTS = { 'block:section': { items: [] }, 'block:richtext': { title: '', html: '<p>내용을 입력하세요.</p>' }, 'block:image': { src: '', alt: '', caption: '', href: '' }, 'block:imageText': { src: '', alt: '', title: '제목', html: '<p>설명을 입력하세요.</p>', align: 'left' }, 'block:button': { label: '버튼', href: '#visit-reservation', style: 'primary', target: '_self' }, 'block:video': { url: '', title: '' }, 'block:gallery': { items: [], columns: 3 }, 'block:slide': { items: [], interval: 4000 }, 'block:table': { header: ['항목', '내용'], rows: [['', '']] }, 'block:divider': {}, 'block:spacer': { height: 60 }, 'block:embed': { html: '' }, 'block:form': { formKey: 'reserve', title: '' } };
  const FONTS = [['', '사이트 기본'], ['Pretendard', 'Pretendard(본문)'], ['"Cormorant Garamond", serif', 'Cormorant Garamond(영문 제목)'], ['"Noto Sans KR", sans-serif', 'Noto Sans KR'], ['Cinzel, serif', 'Cinzel'], ['serif', '명조 계열'], ['sans-serif', '고딕 계열']];
  const ANIMS = [['', '없음'], ['fadeUp', '아래에서 올라오기'], ['fadeIn', '서서히 나타나기'], ['fadeLeft', '왼쪽에서'], ['fadeRight', '오른쪽에서'], ['zoomIn', '확대되며'], ['none', '애니메이션 끄기']];
  const EL_TYPES = ['block:richtext', 'block:image', 'block:imageText', 'block:button', 'block:video', 'block:gallery', 'block:slide', 'block:table', 'block:divider', 'block:spacer', 'block:embed', 'block:form'];   /* 빈 섹션 안에 넣을 수 있는 요소 */
  const DEV_LABEL = { pc: 'PC', tablet: '태블릿', mobile: '모바일' };
  const styleMode = () => (S.device === 'tablet' || S.device === 'mobile' ? S.device : 'pc');   /* 지금 보고 있는 화면(기기)의 값을 편집 — 태블릿 · 모바일은 PC 값을 상속하고 바꾼 항목만 따로 저장 */
  const LINK_TYPES = [['page', '내부 페이지'], ['url', '외부 주소'], ['tel', '전화 걸기'], ['mail', '이메일 보내기'], ['section', '페이지 내 위치로 이동'], ['form', '방문예약 폼으로 이동'], ['sms', '문자 보내기 (사이트 설정의 문자 번호)'], ['kakao', '카카오톡 상담 (사이트 설정의 링크)'], ['file', '파일 다운로드'], ['none', '링크 없음']];

  const S = { content: null, compiled: null, history: [], future: [], dirty: false, saving: false, sel: null, selPath: null, device: 'pc', zoom: 1, ltab: 'pages', rtab: 'content', frameReady: false, lastSaved: null, subPath: [], rects: { sections: [], sel: null }, forms: {}, formDirty: {}, formPanel: null, formPanelKey: '', settings: {}, saveErr: false };
  /* 로딩 안내는 반드시 캔버스 안(#edStage)의 것을 잡습니다 — 준비 단계 카드(#edEntryLoading)를 잘못 잡으면 "불러오는 중" 이 화면에 남습니다 */
  const frame = $('#edFrame'), frameWrap = $('#edFrameWrap'), frameScale = $('#edFrameScale'), loading = $('#edStage #edLoading') || $('.ed-frame-loading') || $('#edLoading'), overlay = $('#edOverlay');
  /* 패널 접기 상태 : 사용자별로 이 브라우저에 기억 (화면 편의 설정 — 사이트 데이터 아님) */
  const UI_KEY = 'wb_ed_ui:' + ((WB.S && WB.S.user && WB.S.user.id) || 0);
  const UI = (() => { const d = { left: true, right: true, mode: 'simple', open: {}, zoom: {} }; try { return Object.assign(d, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (e) { return d; } })();
  function saveUi() { try { localStorage.setItem(UI_KEY, JSON.stringify({ left: UI.left, right: UI.right, mode: UI.mode, open: UI.open || {}, zoom: UI.zoom || {} })); } catch (e) {} }
  function setMode(m) { UI.mode = m === 'advanced' ? 'advanced' : 'simple'; saveUi(); renderRight(); }
  /* 설정 그룹 : 첫 그룹과 마지막에 열어 둔 그룹만 펼침 (사용자별 기억) */
  function grpAdv(key, title, inner, defOpen) { return '<div data-adv>' + grp(key, title, inner, defOpen) + '</div>'; }   /* [간단] 모드에서는 숨김 */
  function grp(key, title, inner, defOpen, adv) { const o = UI.open || {}; const open = o[key] === undefined ? !!defOpen : !!o[key]; return '<details class="ef__group" data-g="' + esc(key) + '"' + (open ? ' open' : '') + (adv ? ' data-adv' : '') + '><summary>' + title + '</summary><div>' + inner + '</div></details>'; }
  addL(document, 'toggle', (e) => { const d = e.target; if (!d || !d.dataset || !d.dataset.g || !d.closest('#edRightBody')) return; UI.open = UI.open || {}; UI.open[d.dataset.g] = d.open; saveUi(); }, true);
  function applyUi() { const w = $('#edWrap'); if (!w) return; w.classList.toggle('is-left-closed', !UI.left); w.classList.toggle('is-right-closed', !UI.right); $$('[data-ltab]').forEach((x) => x.classList.toggle('is-on', UI.left && x.dataset.ltab === S.ltab)); const rb = $('#edRightToggle'); if (rb) { rb.setAttribute('aria-expanded', UI.right ? 'true' : 'false'); rb.setAttribute('aria-label', UI.right ? '설정 패널 접기' : '설정 패널 펼치기'); rb.dataset.tip = UI.right ? '설정 패널 접기' : '설정 패널 펼치기'; } setTimeout(() => { try { fitDevice(); } catch (e) {} }, 230); }
  function setLeftOpen(on) { UI.left = !!on; saveUi(); applyUi(); }
  function setRightOpen(on) { UI.right = !!on; saveUi(); applyUi(); }

  /* ---------- 유틸 ---------- */
  const get = (o, p) => { if (p === '' || p == null) return o; return String(p).split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); };
  const set = (o, p, v) => { const ks = String(p).split('.'); let cur = o; ks.slice(0, -1).forEach((k, i) => { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; }); cur[ks[ks.length - 1]] = v; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const label = (k) => KEY_LABELS[k] || (/^\d+$/.test(k) ? '#' + (+k + 1) : k);
  const isImgKey = (k, v) => /^(src|webp|webp1280|mobileSrc|mobileWebp|image|cardImage|backgroundImage|thumbnail|icon|imageLight|imageDark|favicon|ogImage)$/i.test(k) || (typeof v === 'string' && /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(v));
  const isLong = (k, v) => /^(html|text|desc|description|notice|note|terms|caption|content)$/i.test(k) || (typeof v === 'string' && (v.length > 90 || v.includes('\n')));
  const typeName = (t) => SEC_NAMES[t] || (C.types.find((x) => x.key === t) || {}).name || ((BLOCKS.find((b) => b[0] === t) || [])[1]) || t.replace('block:', '');
  const shortKey = (full) => full.startsWith('content.') ? full.slice(8) : full;
  const fullKey = (type, k) => { const hit = (SECTION_KEYS[type] || []).find((f) => shortKey(f) === k); return hit || (CONTENT_KEYS.includes(k) ? 'content.' + k : k); };
  const resolveUrl = (v) => { if (!v) return ''; if (/^(https?:)?\/\//.test(v) || v.startsWith('data:')) return v; return C.previewBase + '/' + v.replace(/^\.?\//, ''); };
  const helpIcon = (t) => '<span class="ed-help" title="' + esc(t) + '">?</span>';

  /* ---------- 클라이언트 컴파일 (미리보기) ---------- */
  function compileForPreview() {
    const out = clone(S.compiled || {}); const ct = S.content;
    if (C.pageType === 'main') {
      out.sections = []; out.blocks = out.blocks || {}; out.blocks.main = [];
      (ct.sections || []).forEach((s) => {
        if (s.type.startsWith('block:')) { out.blocks.main.push(blockPreview(s)); return; }
        out.sections.push({ id: s.type, enabled: s.enabled !== false, locked: !!s.locked });
        Object.keys(s.data || {}).forEach((k) => { const f = fullKey(s.type, k); if (f.startsWith('content.')) { out.content = out.content || {}; out.content[f.slice(8)] = s.data[k]; } else out[f] = s.data[k]; });
      });
    } else {
      out.pages = out.pages || {}; out.pages[C.pageKey] = Object.assign({}, ct.page || {}, { enabled: true });
      Object.keys(ct.content || {}).forEach((k) => { out.content = out.content || {}; out.content[k] = ct.content[k]; });
      out.blocks = out.blocks || {}; out.blocks[C.pageKey] = (ct.sections || []).filter((s) => s.type.startsWith('block:')).map(blockPreview);
    }
    out.styles = out.styles || {}; out.styles.css = (out.styles.baseCss || '') + buildCss(C.pageKey, ct);
    out.attrs = out.attrs || {}; out.attrs[C.pageKey] = ct.attrs || {};
    out.pageCommon = out.pageCommon || {}; out.pageCommon[C.pageKey] = ct.common || {};
    out.cms = Object.assign({}, out.cms || {}, { preview: true, edit: true });
    out.popupBanners = [];
    overlayForms(out);
    return out;
  }
  function blockPreview(s) { return { uid: s.uid, type: s.type.slice(6), enabled: s.enabled !== false, data: s.data || {}, style: s.style || {}, after: s.after || '', name: s.name || typeName(s.type), anchor: s.anchor || '', locked: !!s.locked }; }
  /* 방문예약 폼 : 필드 · 동의 · 방문 시간 · 버튼 문구는 폼 스키마 하나를 기준으로 (오른쪽 필드 목록 = 가운데 미리보기 = 서버 저장) */
  function overlayForms(out) {
    out.forms = out.forms || {};
    Object.keys(S.forms).forEach((k) => { if (S.forms[k]) out.forms[k] = clone(S.forms[k]); });
    const sc = out.forms.reserve; if (!sc) return;
    const r = out.reserve = (out.reserve && typeof out.reserve === 'object') ? out.reserve : {}; const st = sc.settings || {};
    r.fields = clone(sc.fields || []); r.agreements = clone(st.agreements || []); if ((st.visitTimes || []).length) r.visitTimes = st.visitTimes.slice(); r.phonePrefix = st.phonePrefix || '010';
    if (st.submitLabel) r.submitLabel = st.submitLabel; if (st.doneTitle) r.doneTitle = st.doneTitle; if (st.doneText) r.doneText = st.doneText;
  }
  let formPostTimer = null;
  function pushForm(key, focus, flash) { const out = {}; overlayForms(out); if (!out.forms[key]) return; if (!S.frameReady) { if (focus && flash) S.pendingFocus = { key, name: focus }; return; } post({ type: 'cms:form', key, schema: out.forms[key], focus: focus || '', flash: !!flash }); }
  function onFormChange(key, schema, meta) {
    S.forms[key] = schema; S.formDirty[key] = true; markDirty(); clearTimeout(formPostTimer);
    const focus = meta && meta.focus || '';
    if (meta && meta.kind === 'edit') formPostTimer = setTimeout(() => pushForm(key, focus, false), 140); else pushForm(key, focus, true);   /* 글자 입력은 0.14초 묶어서 · 추가/삭제/복제/순서는 즉시 */
  }
/* 기기별 스타일 : pc = 기본(모든 화면) · tablet = 768~1023px · mobile = 767px 이하 — 태블릿 · 모바일은 PC 값을 상속하고 바꾼 항목만 덮어씀
   · 섹션의 높이(min-height · height)는 PC 값을 768px 이상에만 적용 → 모바일은 기본이 "내용에 맞춤" (모바일에서 직접 지정하면 그 값)
   · 숨김 : pc = 1024px 이상 · tablet · mobile 각각 (예전 데이터처럼 tablet 항목이 없으면 pc 숨김을 768px 이상으로 해석) */
  S.bp = { tablet: 768, pc: 1200 };
  /* 사이트 설정 › 반응형 기준 (게시 데이터 breakpoints) → 에디터의 기기 구간. 잘못된 값이면 기본값 */
  function syncBp() { const b = (S.compiled && S.compiled.breakpoints) || {}; const tb = +b.tablet || 768, pc = +b.pc || 1200; S.bp = (tb >= 480 && tb < pc && pc <= 2000) ? { tablet: tb, pc } : { tablet: 768, pc: 1200 }; }
  const CSS_MQ = { pc: '', get tablet() { return '@media (min-width: ' + S.bp.tablet + 'px) and (max-width: ' + (S.bp.pc - 1) + 'px)'; }, get mobile() { return '@media (max-width: ' + (S.bp.tablet - 1) + 'px)'; } };
  const CSS_SECTION = /^#(cms-[\w-]+|hero|summary-mobile|premium|environment|location|type|visit-reservation)$/;
  const cssProp = (k) => (k.indexOf('--') === 0 ? k : k.replace(/([A-Z])/g, '-$1').toLowerCase());
  const cssVal = (x) => String(x == null ? '' : x).replace(/[{};]/g, '');
  const cssSel = (s) => String(s).replace(/[^a-zA-Z0-9_\-\.#:\[\]="'\s>+~(),\*]/g, '');
  function pageCss(pageKey, st, hidden, editing) {
    st = st || {}; hidden = hidden || {}; let css = ''; const scope = 'body[data-cms-page="' + pageKey + '"] ';
    const HIDE = editing ? '{opacity:.28 !important;outline:1px dashed #d9822b !important;outline-offset:-1px;}' : '{display:none !important;}';   /* 편집 화면 : 숨긴 요소를 없애지 않고 흐리게 (선택해서 다시 표시 가능) */
    ['pc', 'tablet', 'mobile'].forEach((mode) => {
      let rules = '', wide = '';
      Object.keys(st[mode] || {}).forEach((sel) => { const d = st[mode][sel]; if (!d || typeof d !== 'object') return; let body = '', tall = ''; Object.keys(d).forEach((k) => { const v = d[k]; if (v === '' || v == null) return; const decl = cssProp(k) + ':' + cssVal(v) + ' !important;'; if (mode === 'pc' && (k === 'minHeight' || k === 'height') && CSS_SECTION.test(sel)) tall += decl; else body += decl; }); if (body) rules += scope + cssSel(sel) + '{' + body + '}'; if (tall) wide += scope + cssSel(sel) + '{' + tall + '}'; });
      if (rules) css += CSS_MQ[mode] ? CSS_MQ[mode] + '{' + rules + '}' : rules;
      if (wide) css += '@media (min-width: ' + S.bp.tablet + 'px){' + wide + '}';
      let hide = ''; (hidden[mode] || []).forEach((sel) => { hide += scope + cssSel(sel) + HIDE; });
      if (hide) css += (mode === 'pc' ? ('tablet' in hidden ? '@media (min-width: ' + S.bp.pc + 'px)' : '@media (min-width: ' + S.bp.tablet + 'px)') : CSS_MQ[mode]) + '{' + hide + '}';
    });
    if (st.custom) css += '\n' + String(st.custom).replace(/<\/style/gi, '') + '\n';
    return css;
  }
  function buildCss(pageKey, ct) { return pageCss(pageKey, ct.styles || {}, ct.hidden || {}, true); }

  /* ---------- iframe 통신 ---------- */
  let reloadTimer = null, pendingScroll = null;
  function post(msg) { try { frame.contentWindow.postMessage(msg, '*'); } catch (e) {} }
  function sendInit() { post({ type: 'cms:init', data: compileForPreview(), pageKey: C.pageKey, scrollY: pendingScroll, selectPath: S.selPath }); pendingScroll = null; }
  function rerender(delay) { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => { showLoading(); S.frameReady = false; post({ type: 'cms:reload' }); watchReady(); }, delay == null ? 350 : delay); }
  let readyTimer = null, contentTimer = null, loadStart = 0;
  /* 로딩 안내는 반드시 끝납니다 : 화면이 그려지면 바로 내리고(0.2초 간격 확인) · 10초를 넘기면 [다시 시도] 안내로 바뀝니다. */
  function showLoading() { loading.classList.remove('hidden', 'is-error'); loading.textContent = '불러오는 중…'; loadStart = Date.now(); watchReady(); watchContent(); }
  function stopWatch() { clearTimeout(readyTimer); clearInterval(contentTimer); contentTimer = null; }
  function watchContent() {
    clearInterval(contentTimer);
    contentTimer = setInterval(() => {
      if (S.frameReady) { clearInterval(contentTimer); contentTimer = null; return; }
      const age = Date.now() - loadStart, has = frameHasContent();
      if (has && age > 700) { loading.classList.remove('is-error'); loading.classList.add('hidden'); }   /* 페이지가 이미 보이면 "불러오는 중" 을 남겨 두지 않음 */
      if (age > 10000) { clearInterval(contentTimer); contentTimer = null; if (has) frameSlow(); else frameError('10초 안에 페이지를 불러오지 못했습니다.'); }
    }, 250);
  }
  function frameHasContent() {   /* 캔버스에 홈페이지가 이미 그려져 있는지 (같은 도메인일 때만 확인 가능) */
    try { const d = frame.contentDocument; if (!d || !d.body) return false; return d.body.children.length > 2 && d.body.innerText.trim().length > 40; } catch (e) { return false; }
  }
  function frameSlow() {   /* 편집 연결이 늦음 : 화면은 보이므로 로딩만 걷어내고 안내만 표시 */
    loading.classList.add('hidden');
    let tip = $('#edSlowTip');
    if (!tip) {
      tip = document.createElement('div'); tip.id = 'edSlowTip'; tip.className = 'ed-slowtip';
      tip.innerHTML = '<span>편집 연결이 늦어지고 있습니다 (' + (S.sawHello ? '화면 응답 O' : '화면 응답 X') + ' · 편집 준비 X). 화면은 보이지만 클릭 편집이 안 되면 [다시 시도]를 눌러 주세요.</span><button type="button" class="btn btn--xs" data-frame-retry>다시 시도</button><button type="button" class="ed-slowtip__x" aria-label="닫기">×</button>';
      (frameWrap || loading.parentNode).appendChild(tip);
      tip.addEventListener('click', (e) => { if (e.target.closest('.ed-slowtip__x')) tip.remove(); if (e.target.closest('[data-frame-retry]')) { tip.remove(); showLoading(); S.frameReady = false; frame.src = 'about:blank'; setTimeout(() => { frame.src = C.frameUrl; }, 30); } });
    }
  }
  function watchReady() { clearTimeout(readyTimer); readyTimer = setTimeout(() => { if (S.frameReady) return; if (frameHasContent()) { frameSlow(); return; } frameError('편집 화면이 10초 안에 응답하지 않았습니다. (' + (S.sawHello ? '화면 응답은 왔지만 편집 준비 신호가 오지 않음' : '화면에서 아무 응답 없음') + ')'); }, 10000); }
  function frameError(msg) {
    clearTimeout(readyTimer); loading.classList.remove('hidden'); loading.classList.add('is-error');
    const builtin = C.builtinUrl && C.frameUrl.indexOf(C.builtinUrl.replace(/\/$/, '')) !== 0;
    loading.innerHTML = '<div class="ed-frame-error"><b>편집 화면을 불러오지 못했습니다</b><p>' + esc(msg) + '</p><p class="muted">불러온 주소 : ' + esc(C.frameUrl.split('?')[0]) + '<br>이 주소의 홈페이지 파일이 통합웹빌더용(assets/js/cms.js)이 아니거나 서버에 연결할 수 없는 경우입니다.</p><div class="ef__btns" style="justify-content:center"><button class="btn btn--sm" type="button" data-frame-retry>다시 시도</button><button class="btn btn--sm btn--line" type="button" data-frame-publish title="공개 홈페이지 파일을 지금 내용으로 다시 만들어 편집 화면을 되살립니다">지금 게시해서 고치기</button>' + (builtin ? '<button class="btn btn--sm btn--line" type="button" data-frame-builtin title="이 서버가 직접 보여주는 홈페이지 파일로 편집합니다">내장 미리보기로 열기</button>' : '') + '</div></div>';
  }
  loading.addEventListener('click', (e) => {
    if (e.target.closest('[data-frame-retry]')) { showLoading(); S.frameReady = false; if (!S.content) { boot(); return; } frame.src = 'about:blank'; setTimeout(() => { frame.src = C.frameUrl; watchReady(); }, 30); }
    if (e.target.closest('[data-frame-publish]')) { WB.toast('공개 홈페이지 파일을 다시 만듭니다. 잠시만 기다려 주세요…', 'info'); publishFlow().then(() => { showLoading(); S.frameReady = false; frame.src = 'about:blank'; setTimeout(() => { frame.src = C.frameUrl; }, 400); }); return; }
    if (e.target.closest('[data-frame-builtin]')) { const b = C.builtinUrl.replace(/\/$/, ''); C.previewBase = b; C.frameUrl = C.pageType === 'main' ? b + '/index.html?cms_edit=1' : b + '/subpage.html?page=' + encodeURIComponent(C.pageKey) + '&cms_edit=1'; showLoading(); S.frameReady = false; frame.src = C.frameUrl; watchReady(); }
  });
  addL(window, 'message', (e) => {
    if (e.source !== frame.contentWindow) return;
    const m = e.data || {};
    if (m.type === 'cms:hello') { S.sawHello = true; sendInit(); }
    else if (m.type === 'cms:ready') { if (m.error) { WB.toast('편집 화면 준비 중 오류 : ' + m.error, 'error'); } if (S.pendingSelectEl) { const ps = S.pendingSelectEl; S.pendingSelectEl = null; setTimeout(() => post({ type: 'cms:selectEl', blockUid: ps.blockUid, elUid: ps.elUid }), 150); } S.frameReady = true; stopWatch(); loading.classList.remove('is-error'); loading.classList.add('hidden'); if (S.commonMode) { post({ type: 'cms:commonMode', which: S.commonMode }); if (S.megaOpen) post({ type: 'cms:megaOpen', group: S.megaOpen }); } { const t0 = $('#edSlowTip'); if (t0) t0.remove(); } if (S.pendingFocus) { const pf = S.pendingFocus; S.pendingFocus = null; setTimeout(() => post({ type: 'cms:focusField', key: pf.key, name: pf.name }), 120); } if (m.sections) S.rects.sections = m.sections; drawOverlay(); if (C.select && !S.__selectedOnce) { S.__selectedOnce = true; post({ type: 'cms:scrollTo', section: C.select === 'hero' ? 'mainVisual' : C.select }); } }
    else if (m.type === 'cms:rects') { S.rects = m; drawOverlay(); }
    else if (m.type === 'cms:reloading') pendingScroll = m.scrollY;
    else if (m.type === 'cms:select') onSelect(m);
    else if (m.type === 'cms:deselect') deselect(true);
    else if (m.type === 'cms:commonRect') { if (S.commonMode && m.which === S.commonMode) commonFrameSize(m.height); }
    else if (m.type === 'cms:commonBlocked') onCommonBlocked(m);
    else if (m.type === 'cms:menuPick') { const gs = menuList(); const gi = gs.findIndex((g) => String(g.id) === String(m.group)); if (gi >= 0) selectMenu({ group: gs[gi].id, item: -1 }); }
    else if (m.type === 'cms:inline') onInline(m);
    else if (m.type === 'cms:menuReorder') onMenuReorder(m);
    else if (m.type === 'cms:openElements') { if (m.section) { const i = sectionIndexById(m.section); if (i != null && i >= 0) selectSection(i); } S.ltab = 'elements'; setLeftOpen(true); renderLeft(); }   /* 빈 섹션의 [+ 요소 추가] : 왼쪽 요소 패널 열기 */   /* 메뉴 · 소메뉴를 끌어다 놓아 순서 변경 */
    else if (m.type === 'cms:addAfter') openSectionChooser({ section: m.section, pos: 'after' });
    else if (m.type === 'cms:addAt') openSectionChooser(m);
    else if (m.type === 'cms:sectionStyle' || m.type === 'cms:elementStyle') applyCanvasStyle(m);
    else if (m.type === 'cms:blockField') onBlockField(m);
    else if (m.type === 'cms:moveElement') moveElement(m);
    else if (m.type === 'cms:dropElement') dropElement(m);
    else if (m.type === 'cms:key') onCanvasKey(m.key);
    else if (m.type === 'cms:fieldEditing') { S.fieldEditing = !!m.on; drawOverlay(); }
    else if (m.type === 'cms:reorder') reorderByIds(m.order);
  });
  frame.addEventListener('load', () => { setTimeout(() => { if (!S.frameReady) sendInit(); }, 400); });

  /* ---------- 오버레이 : 선택 도구 · 섹션 + 버튼 ---------- */
  function drawOverlay() {
    overlay.innerHTML = '';
    const z = S.zoom; const sel = S.rects.sel;
    if (S.sel && sel && sel.rect && !S.fieldEditing) {
      const r = sel.rect; const sec = S.sel.secIndex != null ? S.content.sections[S.sel.secIndex] : null; const isSec = S.sel.kind === 'section' || S.sel.elKind === 'section';
      const kind = isSec ? ((sec && (sec.type === 'reserve' || sec.type === 'block:form')) ? 'form' : 'section') : S.sel.elKind; const inEl = S.sel.elIndex != null && S.sel.elIndex >= 0; const locked = !!(sec && sec.locked);
      const tools = document.createElement('div'); tools.className = 'ed-tools';
      const B = (t, label, title, cls) => '<button type="button" data-t="' + t + '" title="' + esc(title || label) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + label + '</button>';
      /* 요소 종류만 작은 배지로 (이름은 오른쪽 패널 위에 이미 표시됩니다) */
      const KIND_BADGE = { text: 'TEXT', image: 'IMAGE', link: 'BUTTON', section: 'SECTION', form: 'FORM', element: 'ELEMENT' };
      let html = '<span class="ed-tools__kind">' + esc(KIND_BADGE[kind] || (S.sel.kind === 'menu' ? 'MENU' : 'ELEMENT')) + '</span>';
      if (locked) html += B('lock', '🔓 잠금 해제', '섹션 잠금을 풉니다');
      else {
        if (kind === 'image' || kind === 'text' || kind === 'link') html += B('float', '✎ 편집', '이 요소 전용 편집창을 요소 옆에 띄웁니다');
        if (kind === 'image') html += B('replace', '교체', '이미지 교체') + B('crop', '자르기', '자르기 · 회전') + B('tab-content', '링크', '링크 · 대체 텍스트');
        if (kind === 'text') html += B('inline', '편집', '화면에서 바로 수정 (더블클릭)') + B('align', '정렬', '왼쪽 → 가운데 → 오른쪽');
        if (kind === 'link') html += B('inline', '편집', '버튼 문구 바로 수정') + B('tab-content', '링크', '문구 · 링크');
        if (kind === 'form') html += B('tab-content', '필드 구성', '입력 필드 추가 · 수정') + B('form-settings', '제출 설정', '버튼 · 완료 문구 · 동의') + B('tab-style', '디자인');
        if (inEl && !isSec) html += B('el-up', '▲', '요소를 위로') + B('el-down', '▼', '요소를 아래로') + B('el-dup', '복제') + B('el-del', '삭제', '요소 삭제 (실행 취소 가능)', 'is-danger');
        else if (isSec && sec) html += B('up', '▲', '섹션을 위로') + B('down', '▼', '섹션을 아래로') + B('dup', '복제') + B('hide', sec.enabled === false ? '표시' : '숨김') + B('del', '삭제', '삭제 (실행 취소 가능)', 'is-danger');
        else if (!isSec) html += B('hide-el', '숨김', '이 요소를 화면에서 숨김 (디자인 › 기기별 표시에서 되돌리기)');
        html += B('settings', '⚙ 설정', '오른쪽 설정 패널 열기') + (isSec && sec ? B('more', '⋯', '이름 변경 · 잠금 · 복사 · 블록으로 저장 · 여백 초기화') : '');
      }
      tools.innerHTML = html; overlay.appendChild(tools);
      const ow = overlay.clientWidth, oh = overlay.clientHeight, tw = tools.offsetWidth, th = tools.offsetHeight || 30;
      let top = r.top * z - th - 8; if (top < 4) top = Math.min(oh - th - 4, (r.top + r.height) * z + 8); if (top > oh - th - 4 || (isSec && r.top * z < 4)) top = Math.max(4, Math.min(oh - th - 4, Math.max(r.top * z, 0) + 44));
      tools.style.top = Math.max(4, top) + 'px'; tools.style.left = Math.max(4, Math.min(ow - tw - 4, r.left * z)) + 'px';
      tools.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) toolAction(b.dataset.t, b); });
    }
    const hint = document.createElement('div'); hint.className = 'ed-hint'; hint.textContent = S.fieldEditing ? '글 편집 중 · 바깥을 클릭하면 저장 · Esc 취소' : (S.sel ? '더블클릭 : 글 바로 수정 · 핸들을 끌어 높이 · 여백 · 크기 조절(Shift = 1px) · Esc : 선택 해제' : '요소를 클릭해 편집 · 섹션 경계의 [+ 섹션 추가]로 원하는 위치에 추가'); overlay.appendChild(hint);
  }
  /* ---------- 요소 바로 옆 플로팅 편집창 ----------
     고른 요소(이미지 · 글 · 버튼) 옆에 작은 창을 띄워 거기서 바로 고칩니다.
     내용은 오른쪽 패널의 [내용] 과 같은 것이라 기능 차이가 없고, 창은 끌어서 옮기고 Esc · × 로 닫습니다. (한 번에 하나만) */
  function closeFloat() { const f = $('#edFloat'); if (f) f.remove(); S.floatOn = false; }
  function floatTitle(sel) {
    const K = { image: '이미지', text: '텍스트', link: '버튼 · 링크', section: '섹션', form: '방문예약 폼' };
    return K[sel.elKind] || (sel.kind === 'section' ? '섹션' : (sel.label || '요소'));
  }
  function openFloat(sel) {
    sel = sel || S.sel; if (!sel) return;
    closeFloat();
    const f = document.createElement('div'); f.id = 'edFloat'; f.className = 'ed-float';
    f.innerHTML = '<div class="ed-float__head" id="edFloatHead"><b id="edFloatTitle">' + esc(floatTitle(sel)) + '</b>' +
      '<span class="ed-float__act"><button type="button" data-float="side" title="오른쪽 패널에서 자세히 (디자인 · 고급)">⤢</button>' +
      '<button type="button" data-float="x" aria-label="닫기" title="닫기 (Esc)">×</button></span></div>' +
      '<div class="ed-float__body" id="edFloatBody"></div>';
    document.body.appendChild(f); S.floatOn = true;
    renderFloatBody(sel);
    placeFloat(f);
    f.addEventListener('click', (e) => {
      const b = e.target.closest('[data-float]'); if (!b) return;
      if (b.dataset.float === 'x') { closeFloat(); return; }
      if (b.dataset.float === 'side') { setRightOpen(true); S.rtab = 'style'; renderRight(); closeFloat(); }
    });
    /* 제목 줄을 끌어서 창 이동 */
    const head = $('#edFloatHead', f); let drag = null;
    head.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = { x: e.clientX, y: e.clientY, l: f.offsetLeft, t: f.offsetTop }; head.setPointerCapture(e.pointerId); });
    head.addEventListener('pointermove', (e) => { if (!drag) return; f.style.left = Math.max(4, Math.min(window.innerWidth - f.offsetWidth - 4, drag.l + e.clientX - drag.x)) + 'px'; f.style.top = Math.max(4, Math.min(window.innerHeight - 60, drag.t + e.clientY - drag.y)) + 'px'; });
    head.addEventListener('pointerup', () => { drag = null; });
  }
  function renderFloatBody(sel) {
    const box = $('#edFloatBody'); if (!box) return;
    const t = $('#edFloatTitle'); if (t) t.textContent = floatTitle(sel);
    const fresh = box.cloneNode(false); box.replaceWith(fresh);
    if (sel.kind === 'menu') renderMenuPanel(fresh, sel);
    else if (sel.kind === 'common' || sel.kind === 'commonHint') renderContent(fresh, sel);
    else renderContent(fresh, sel);
  }
  function placeFloat(f) {
    const r = (S.rects.sel && S.rects.sel.rect) ? S.rects.sel.rect : null;
    const fr = frame.getBoundingClientRect(); const z = S.zoom;
    const w = f.offsetWidth || 320, h = f.offsetHeight || 360;
    let left = fr.left + 24, top = fr.top + 80;
    if (r) {
      const ex = fr.left + (r.left + r.width) * z + 16;   /* 요소 오른쪽 */
      const ey = fr.top + r.top * z;
      left = ex + w < window.innerWidth - 8 ? ex : Math.max(8, fr.left + r.left * z - w - 16);
      top = Math.max(8, Math.min(window.innerHeight - h - 8, ey));
    }
    f.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, left)) + 'px';
    f.style.top = Math.max(8, top) + 'px';
  }
  /* ---------- 에디터를 나갈 때 정리 : 관리자 화면에 편집용 UI 가 남지 않게 ---------- */
  function cleanupEditorUI() {
    try { closeFloat(); } catch (x) {}
    ["edFloat", "edCommonBar", "edPresence", "edSlowTip"].forEach((id) => { const el = document.getElementById(id); if (el) el.remove(); });
    document.querySelectorAll(".ed-float, .ed-more, .ed-tools, .ed-hint").forEach((el) => { if (!el.closest("#editorView")) el.remove(); });
    try { clearTimeout(readyTimer); clearInterval(contentTimer); clearTimeout(saveTimer); clearTimeout(reloadTimer); } catch (x) {}
    S.sel = null; S.selPath = null; S.rects = {}; S.floatOn = false; S.commonMode = "";
    try { WB.presence.onChange = null; WB.presence.set({ route: "관리자", page_id: null, page_title: "" }); } catch (x) {}
  }
  window.__wbEditorCleanup = cleanupEditorUI;

  function toolAction(t, btn) {
    const sel = S.sel; if (!sel) return;
    if (t === 'float') { openFloat(sel); return; }
    if (t === 'settings') { setRightOpen(true); return; }
    if (t === 'tab-style') { S.rtab = 'style'; setRightOpen(true); renderRight(); return; }
    if (t === 'form-settings') { S.rtab = 'content'; setRightOpen(true); renderRight(); setTimeout(() => { const b = $('#edRightBody [data-view="settings"]'); if (b) b.click(); }, 300); return; }
    if (t === 'align') { const cur = styleOf(sel.selector, styleMode()).textAlign || ''; const next = { '': 'center', left: 'center', center: 'right', right: 'left' }[cur] || 'center'; snapshotBefore(); setStyle(sel.selector, styleMode(), 'textAlign', next); renderRight(); return; }
    if (t === 'lock') return toggleLock(sel.secIndex);
    if (t === 'more') return sectionMoreMenu(btn, sel.secIndex);
    if (t === 'el-up' || t === 'el-down' || t === 'el-dup' || t === 'el-del') return elementAction(t.slice(3), sel.secIndex, sel.elIndex);
    if (t === 'replace') return pickImageFor(sel);
    if (t === 'upload') return uploadImageFor(sel);
    if (t === 'crop') return cropImage(sel);
    if (t === 'focal') { S.rtab = 'content'; renderRight(); setTimeout(() => { const f = $('[data-focal-open]'); if (f) f.click(); }, 50); return; }
    if (t === 'inline') return post({ type: 'cms:inlineStart' });
    if (t === 'tab-content') { S.rtab = 'content'; setRightOpen(true); renderRight(); return; }
    if (t === 'hide-el') { hideSelector(sel.selector); return; }
    if (sel.secIndex == null) return;
    const i = sel.secIndex, secs = S.content.sections, s = secs[i];
    if (s.locked && t !== 'hide') { WB.toast('잠긴 섹션입니다. 잠금을 풀고 다시 시도하세요.', 'info'); return; }
    if (t === 'up' && i > 0) { snapshotBefore(); [secs[i - 1], secs[i]] = [secs[i], secs[i - 1]]; S.sel.secIndex = i - 1; syncAfter(); commitNoHist(); }
    else if (t === 'down' && i < secs.length - 1) { snapshotBefore(); [secs[i + 1], secs[i]] = [secs[i], secs[i + 1]]; S.sel.secIndex = i + 1; syncAfter(); commitNoHist(); }
    else if (t === 'dup') { duplicateSection(i); }
    else if (t === 'hide') { snapshotBefore(); s.enabled = s.enabled === false; commitNoHist(); }
    else if (t === 'del') deleteSection(i);
  }
  async function deleteSection(i) {
    const s = S.content.sections[i]; if (!s) return;
    if (s.locked) { WB.toast('잠긴 섹션은 삭제할 수 없습니다. 잠금을 먼저 풀어 주세요.', 'info'); return; }
    if (!(await WB.confirm('"' + sectionLabel(s) + '" 섹션을 삭제할까요?\n삭제해도 [변경 이력 › 최근 삭제 항목]에서 복구하거나 실행 취소(Ctrl+Z)할 수 있습니다.', { danger: true, ok: '삭제' }))) return;
    snapshotBefore(); S.content.trash = S.content.trash || []; S.content.trash.unshift({ at: new Date().toISOString(), index: i, section: clone(s) }); S.content.trash = S.content.trash.slice(0, 20);
    S.content.sections.splice(i, 1); deselect(true); commitNoHist(); WB.toast('섹션을 삭제했습니다. 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.', 'success');
  }
  /* 예전 데이터(pc · mobile 2단계)의 "PC에서 숨김"은 768px 이상 전체였음 → 3단계로 바꿀 때 태블릿 목록에 그대로 옮겨 화면이 달라지지 않게 함 */
  function normalizeHidden() { const h = S.content.hidden = S.content.hidden || {}; if (!('tablet' in h)) h.tablet = (h.pc || []).slice(); ['pc', 'tablet', 'mobile'].forEach((m) => { h[m] = h[m] || []; }); return h; }
  function setHidden(sel, mode, on) { const arr = normalizeHidden()[mode]; const i = arr.indexOf(sel); if (on && i < 0) arr.push(sel); if (!on && i >= 0) arr.splice(i, 1); }
  function hideSelector(sel) { if (!sel) return; snapshotBefore(); ['pc', 'tablet', 'mobile'].forEach((m) => setHidden(sel, m, true)); commitNoHist(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); WB.toast('요소를 숨겼습니다. [디자인 › 기기별 표시]에서 다시 표시할 수 있습니다.', 'success'); }

  /* ---------- 이력 · 저장 상태 ---------- */
  let saveTimer = null;
  /* 자동저장 상태 : 저장 중… / ✓ 저장됨 (시각) / ⚠ 저장 실패 — 상태가 한눈에 보이도록 기호를 붙입니다 */
  function setSave(state, text) {
    const el = $('#edSaveInfo'); el.dataset.state = state;
    const mark = state === 'saved' ? '✓ ' : state === 'error' ? '⚠ ' : '';
    const t = String(text == null ? '' : text);
    el.querySelector('span').textContent = /^[✓⚠●]/.test(t) ? t : mark + t;
    el.title = state === 'saved' ? '자동저장 완료' : state === 'saving' ? '저장 중' : state === 'error' ? '저장 실패 — 다시 시도해 주세요' : '';
  }
  let lastSnapKind = '', lastSnapAt = 0;
  const snapState = () => ({ c: clone(S.content), f: clone(S.forms) });
  function snapshotBefore(kind) {   /* kind 가 같은 연속 입력(한 입력칸에 글자를 계속 치는 경우)은 1.5초 안에서는 한 번만 기록 */
    const t = Date.now(); if (kind && kind === lastSnapKind && t - lastSnapAt < 1500) { lastSnapAt = t; return; } lastSnapKind = kind || ''; lastSnapAt = t;
    S.history.push(snapState()); if (S.history.length > 60) S.history.shift(); S.future = []; updateHistBtns();
  }
  function restoreState(st) {
    const before = JSON.stringify(S.forms); const beforeC = JSON.stringify(S.content); S.content = st.c; S.forms = st.f || {};
    S.lastRestore = { forms: JSON.stringify(S.forms) !== before, content: JSON.stringify(S.content) !== beforeC };
    if (JSON.stringify(S.forms) !== before) { Object.keys(S.forms).forEach((k) => { S.formDirty[k] = true; }); if (S.formPanel && S.forms[S.formPanelKey]) S.formPanel = null; }
    lastSnapKind = '';
  }
  function markDirty() { S.dirty = true; setSave('dirty', '변경됨 · 저장 안 됨 (임시저장을 눌러 주세요)'); clearTimeout(saveTimer); paintStatus(); }   /* 자동으로 서버에 저장하지 않습니다 */
  function commitNoHist() { markDirty(); rerender(100); renderLeft(); renderRight(); }
  function undo() { if (!S.history.length) return; S.future.push(snapState()); restoreState(S.history.pop()); afterHistory(); }
  function redo() { if (!S.future.length) return; S.history.push(snapState()); restoreState(S.future.pop()); afterHistory(); }
  function afterHistory() { updateHistBtns(); markDirty(); const lr = S.lastRestore || {}; if (lr.forms && !lr.content) Object.keys(S.forms).forEach((k) => pushForm(k, '', false)); else rerender(100); renderLeft(); renderRight(); }   /* 폼만 바뀐 경우 : 새로고침 없이 폼만 다시 그림 */
  function updateHistBtns() { $('#edUndo').disabled = !S.history.length; $('#edRedo').disabled = !S.future.length; }
  async function saveDraft(snapshot, note) {
    if (S.saving) { if (snapshot) setTimeout(() => saveDraft(true, note), 800); return; }
    S.saving = true; setSave('saving', '저장 중…'); paintStatus('saving');
    try {
      const sentContent = JSON.stringify(S.content);
      const r = await WB.api('PUT', 'api/pages/' + C.pageId + '/draft', { content: S.content, snapshot: !!snapshot, note: note || '', base_rev: S.baseRev || '', overwrite: !!S.forceOverwrite }, { silent: true });
      S.baseRev = r.saved_at || S.baseRev; S.forceOverwrite = false;
      for (const k of Object.keys(S.formDirty)) { if (!S.formDirty[k] || !S.forms[k]) continue; const fm = C.forms.find((x) => x.key === k); if (!fm) continue; const sent = JSON.stringify(S.forms[k]); await WB.api('PUT', 'api/forms/' + fm.id, { settings: S.forms[k].settings, fields: S.forms[k].fields, quiet: !snapshot }, { silent: true }); if (JSON.stringify(S.forms[k]) === sent) S.formDirty[k] = false; }
      S.dirty = JSON.stringify(S.content) !== sentContent || Object.keys(S.formDirty).some((k) => S.formDirty[k]);   /* 저장하는 동안 더 바뀐 내용이 있으면 계속 '변경됨' */
      S.saveErr = false; S.lastSaved = new Date(); setSave('saved', '저장 완료 ' + S.lastSaved.toTimeString().slice(0, 5)); C.status = r.status || C.status; setPubState(r.pub_state || 'waiting');   /* 고친 내용은 아직 공개 전 → 게시 대기 */
      if (snapshot) WB.toast('임시저장되었습니다. [변경 이력]에 기록되었습니다.', 'success');
    } catch (e) {
      if (e && e.status === 409 && e.data && e.data.code === "REVISION") {   /* 다른 사용자가 먼저 저장 */
        S.saving = false; S.saveErr = true; paintStatus(); setSave("error", "저장 안 됨 · 다른 사용자가 먼저 수정했습니다");
        const m = WB.modal("<p style=\"margin:0 0 10px\"><b>" + esc((e.data && e.data.by) || "다른 사용자") + "</b>님이 이 페이지를 먼저 수정했습니다.</p>" +
          "<p class=\"ef__hint\" style=\"margin:0\">[최신 내용 불러오기] 를 누르면 지금 화면의 수정은 사라지고 최신 내용이 열립니다.<br>[내 변경사항으로 덮어쓰기] 를 누르면 내 수정으로 저장합니다.</p>",
          { title: "저장 충돌", footer: "<button class=\"btn btn--ghost\" id=\"cfKeep\">내 변경사항으로 덮어쓰기</button><button class=\"btn\" id=\"cfReload\">최신 내용 불러오기</button>" });
        $("#cfReload", m).addEventListener("click", async () => { m.remove(); await WBEditor.open({ pageId: C.pageId }); });
        $("#cfKeep", m).addEventListener("click", () => { m.remove(); S.forceOverwrite = true; saveDraft(false); });
        return;
      }
      if (e && e.status === 422) { S.saveErr = true; S.saving = false; paintStatus(); setSave('error', '저장 안 됨 · ' + (e.message || '입력값을 확인해 주세요')); WB.toast('저장하지 못했습니다 : ' + (e.message || ''), 'error'); return; }   /* 입력 오류(필드 이름 중복 등)는 자동 재시도하지 않음 — 고치면 다시 저장됨 */
      S.saveErr = true; paintStatus(); setSave('error', '저장 실패 · 네트워크를 확인한 뒤 다시 시도합니다'); WB.toast('저장하지 못했습니다: ' + (e.message || '') + ' — 잠시 후 자동으로 다시 시도합니다.', 'error'); clearTimeout(saveTimer); saveTimer = setTimeout(() => saveDraft(snapshot, note), 6000); }
    S.saving = false;
  }
  async function refreshPageStates() {   /* 게시 뒤 : 서버의 게시 상태(초안=게시본 여부)를 다시 읽어 배지에 반영 */
    try {
      const info = await WB.api('GET', 'api/sites/' + C.siteId + '/pages', undefined, { silent: true });
      if (!info || !Array.isArray(info.pages)) return;
      C.pages = info.pages;
      const cur = info.pages.find((p) => +p.id === +C.pageId);
      if (cur) { const st2 = PAGE_STATE(cur); const b = $('#edStatus'); if (b) { b.textContent = st2[1]; b.className = 'badge badge--' + (st2[0] === 'public' ? 'published' : st2[0]); } }
      if (S.ltab === 'pages') renderLeft();
      const sel = $('#edPageSel'); if (sel) { /* 숨은 목록도 최신으로 */ }
    } catch (e) {}
  }
  /* 상태 배지 : 게시됨 · 게시 대기 · 숨김 · 저장 중 · 게시 실패 (초안 버전 = 게시 버전 이면 게시됨)
     내용을 고쳐 저장하면 '게시 대기' · 게시하면 바로 '게시됨' · 새로고침해도 서버 값으로 같게 나옵니다. */
  function paintStatus(temp) {
    const b = $('#edStatus'); if (!b) return;
    if (temp === 'saving') { b.textContent = '저장 중'; b.className = 'badge badge--draft'; return; }
    if (temp === 'failed') { b.textContent = '게시 실패'; b.className = 'badge badge--stopped'; return; }
    const st = C.status === 'stopped' ? 'hidden' : (C.pubState === 'published' && !S.dirty) ? 'published' : 'waiting';
    b.textContent = st === 'hidden' ? '숨김' : st === 'published' ? '게시됨' : '게시 대기';
    b.className = 'badge badge--' + (st === 'hidden' ? 'stopped' : st === 'published' ? 'published' : 'draft');
  }
  /* 왼쪽 페이지 목록 배지도 같은 값으로 (새로 불러오지 않고 바로) */
  function setPubState(st) {
    C.pubState = st; const row = C.pages.find((x) => +x.id === +C.pageId); if (row) row.pub_state = C.status === 'stopped' ? 'hidden' : st;
    paintStatus(); if (S.ltab === 'pages' && UI.left) renderLeft();
  }
  function setStatus(st, pubState) { C.status = st || C.status; if (pubState) C.pubState = pubState; paintStatus(); }

  /* ---------- 왼쪽 패널 ---------- */
  const LTAB_NAMES = { pages: '페이지', sections: '섹션 추가', elements: '요소 추가', layers: '레이어', header: '헤더 편집', footer: '푸터 편집', common: '공통 요소', history: '변경 이력' };
  $$('[data-ltab]').forEach((b) => b.addEventListener('click', () => {
    const tab = b.dataset.ltab; if (tab === 'media') { openMediaLibrary(); return; }
    if (UI.left && S.ltab === tab) { setLeftOpen(false); return; }   /* 같은 아이콘을 다시 누르면 패널 접기 → 가운데 화면이 넓어짐 */
    S.ltab = tab; if (!UI.left) setLeftOpen(true);
    if (tab === 'header' || tab === 'footer') selectCommon(tab); else exitCommonMode();   /* 헤더 · 푸터는 전용 편집 모드로 · 그 밖의 탭으로 가면 모드 해제 */
    renderLeft();
  }));
  $('#edLeftClose').addEventListener('click', () => setLeftOpen(false));
  const hb = $('#edHiddenBar'); if (hb) hb.addEventListener('click', (e) => { if (e.target.closest('[data-show-page]')) setPageVisible(true); });
  $('#edRightToggle').addEventListener('click', () => setRightOpen(!UI.right));
  $('#edSaveInfo').addEventListener('click', () => { if (S.saveErr && !S.saving) { S.saveErr = false; saveDraft(false); } });   /* 저장 실패 표시를 누르면 바로 다시 시도 */
  function renderLeft() {
    $$('[data-ltab]').forEach((x) => x.classList.toggle('is-on', UI.left && x.dataset.ltab === S.ltab));
    const tt = $('#edLeftTitle'); if (tt) tt.textContent = LTAB_NAMES[S.ltab] || '';
    const old = $('#edLeftBody'); const box = old.cloneNode(false); old.replaceWith(box);
    ({ pages: renderPages, sections: renderSectionAdd, elements: renderElementAdd, layers: renderLayers, header: renderHeaderTab, footer: renderFooterTab, common: renderCommon, history: renderHistoryTab }[S.ltab] || renderPages)(box);
  }
  /* 페이지 배지 : 서버가 계산한 게시 상태 (초안 버전 = 게시 버전 → 게시됨 · 다르면 게시 대기) */
  const PAGE_STATE = (p) => {
    const st = p.pub_state || (p.status === 'stopped' ? 'hidden' : p.status === 'published' ? 'published' : 'waiting');
    if (st === 'hidden') return ['hidden', '숨김'];
    if (st === 'published') return ['public', '게시됨'];
    return ['draft', '게시 대기'];
  };
  const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.3A10 10 0 0 1 12 5.2c6 0 9.5 6.8 9.5 6.8a16 16 0 0 1-3 3.6M6.4 6.5A15.6 15.6 0 0 0 2.5 12s3.5 6.8 9.5 6.8a9.6 9.6 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function renderPages(box) {
    const filter = S.pageFilter || 'all'; const hiddenN = C.pages.filter((p) => p.status === 'stopped').length;
    const list = C.pages.filter((p) => filter === 'all' || (filter === 'hidden' ? p.status === 'stopped' : p.status !== 'stopped'));
    box.innerHTML = '<div class="ed-pagefilter" role="group" aria-label="페이지 필터">' + [['all', '전체'], ['public', '공개'], ['hidden', '숨김' + (hiddenN ? ' ' + hiddenN : '')]].map(([k, l]) => '<button type="button" data-pf="' + k + '"' + (filter === k ? ' class="is-on"' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<ul class="ed-pages" id="edPageList">' + list.map((p) => { const st = PAGE_STATE(p); return '<li class="sort-item' + (+p.id === C.pageId ? ' is-cur' : '') + (st[0] === 'hidden' ? ' is-hidden' : '') + '" draggable="true" data-id="' + p.id + '"><span class="handle" data-tip="순서 변경 — 끌어서 이동" aria-label="순서 변경">⋮⋮</span><a href="#/editor?pageId=' + p.id + '" data-page-go="' + p.id + '" title="' + esc(p.key) + '">' + esc(p.title) + (p.type === 'main' ? ' <small>메인</small>' : '') + '</a><span class="ed-pages__state ed-pages__state--' + st[0] + '">' + (st[0] === 'hidden' ? EYE_OFF : st[0] === 'public' ? EYE : '') + '<b>' + esc(st[1]) + '</b></span></li>'; }).join('') + (list.length ? '' : '<li class="ed-pages__empty">' + (filter === 'hidden' ? '숨긴 페이지가 없습니다.' : '페이지가 없습니다.') + '</li>') + '</ul>' +
      (hiddenN && filter === 'all' ? '<div class="ef__hint" style="margin:6px 0">숨긴 페이지 ' + hiddenN + '개는 흐리게 표시됩니다. 클릭하면 계속 수정할 수 있고, 오른쪽 [기본]의 공개 스위치로 다시 공개합니다.</div>' : '') +
      '<button class="btn btn--line btn--sm" type="button" id="edPageNew" style="width:100%">+ 새 페이지</button>' +
      '<button class="btn btn--ghost btn--sm" type="button" id="edPageImport" style="width:100%;margin-top:6px" data-tip="지금 공개 중인 홈페이지(index.html)에 있는데 이 목록에 없는 페이지를 찾아 등록합니다">공개 홈페이지에서 페이지 가져오기</button><p class="ef__hint" style="margin:6px 0 0">홈페이지 파일은 바뀌지 않고, 이미 있는 페이지도 그대로 둡니다.</p>';
    WB.sortable($('#edPageList', box), { handle: '.handle', onEnd: (els) => { const ids = els.map((e) => +e.dataset.id); const rest = C.pages.filter((p) => !ids.includes(+p.id)).map((p) => +p.id); WB.api('POST', 'api/pages/reorder', { ids: ids.concat(rest) }).then(() => { C.pages.sort((a, b) => ids.concat(rest).indexOf(+a.id) - ids.concat(rest).indexOf(+b.id)); WB.toast('페이지 순서를 저장했습니다.', 'success'); }); } });
    box.onclick = async (e) => {
      const pf = e.target.closest('[data-pf]'); if (pf) { S.pageFilter = pf.dataset.pf; renderLeft(); return; }
      const im = e.target.closest('#edPageImport');
      if (im) { im.disabled = true; try { let r = await WB.api('POST', 'api/sites/' + C.siteId + '/pages/import', {}); if (!r.pages) { r = await WB.api('POST', 'api/sites/' + C.siteId + '/pages/import', { force: true }); } WB.toast(r.pages ? '공개 홈페이지에서 페이지 ' + r.pages + '개를 가져왔습니다.' : '새로 가져올 페이지가 없습니다. (모두 등록되어 있습니다)', r.pages ? 'success' : 'info'); if (r.pages) { await flush(); WBEditor.open({ pageId: C.pageId, imported: true }); return; } } catch (er) {} im.disabled = false; return; }
      const pg = e.target.closest('[data-page-go]'); if (pg) { if (e.ctrlKey || e.metaKey || e.shiftKey) return; e.preventDefault(); if (+pg.dataset.pageGo === C.pageId) { selectPage(); return; } goPage(+pg.dataset.pageGo); return; }
      if (e.target.id === 'edPageNew') { const m = WB.modal('<div class="field"><label>페이지 제목</label><input class="inp" id="npTitle" placeholder="예: 이벤트"></div><div class="field"><label>페이지 키 <span class="help">(영문 · 주소에 사용 · 예: event)</span></label><input class="inp" id="npKey" placeholder="event"></div><div class="field"><label>분류(대메뉴명)</label><input class="inp" id="npCat" placeholder="예: 홍보센터"></div><div class="field"><label>레이아웃</label><select id="npLayout">' + Object.keys(C.layouts).map((k) => '<option value="' + k + '">' + esc(C.layouts[k]) + '</option>').join('') + '</select></div>', { title: '새 페이지', guard: true, footer: '<button class="btn btn--ghost" data-close>취소</button><button class="btn" id="npOk">만들고 편집</button>' }); $('#npOk', m).addEventListener('click', async () => { const title = $('#npTitle', m).value.trim(), key = $('#npKey', m).value.trim().toLowerCase(); if (!title || !/^[a-z0-9][a-z0-9\-_]{1,39}$/.test(key)) { WB.toast('제목과 영문 키를 입력해 주세요.', 'error'); return; } $('#npOk', m).disabled = true; try { const r = await WB.api('POST', 'api/pages', { title, key, category: $('#npCat', m).value.trim(), layout_type: $('#npLayout', m).value }); m.clean(); m.remove(); await flush(); WBEditor.open({ pageId: r.id, push: true }); } catch (x) { $('#npOk', m).disabled = false; } }); return; }
    };
  }
  /* 페이지 자체를 편집 대상으로 : 오른쪽에 기본(공개 · 복제 · 이름) · 디자인 · 고급 */
  function pageRow() { return C.pages.find((x) => +x.id === +C.pageId) || { id: C.pageId, title: C.pageTitle, status: C.status, type: C.pageType, key: C.pageKey }; }
  function selectPage() { S.sel = { kind: 'page', label: '페이지 · ' + C.pageTitle }; S.selPath = null; S.subPath = []; if (!['content', 'style', 'advanced'].includes(S.rtab)) S.rtab = 'content'; post({ type: 'cms:clearSelection' }); renderRight(); renderLeft(); drawOverlay(); }
  let visTimer = null, visBusy = false, visWant = null;
  /* 공개 스위치 : 빠르게 여러 번 눌러도 마지막 상태만 한 번 저장 (이력 1건) */
  function setPageVisible(on) {
    const pg = pageRow(); if (pg.type === 'main') { WB.toast('메인 페이지는 항상 공개됩니다.', 'info'); return; }
    visWant = !!on; pg.status = on ? (pg.hadPublished || pg.status === 'published' ? 'published' : 'draft') : 'stopped'; renderRight(); renderLeft(); hiddenBar();
    clearTimeout(visTimer); visTimer = setTimeout(async () => { if (visBusy) { visTimer = setTimeout(() => setPageVisible(visWant), 300); return; } visBusy = true; try { const r = await WB.api('PATCH', 'api/pages/' + C.pageId + '/meta', { visible: visWant }); pg.status = r.status || pg.status; setStatus(pg.status); renderRight(); renderLeft(); hiddenBar(); WB.toast(visWant ? '페이지를 공개 상태로 바꿨습니다. 저장됨 · 게시 후 홈페이지에 반영됩니다.' : '페이지를 숨겼습니다. 저장됨 · 게시 후 홈페이지에서 숨겨집니다.', 'success'); } catch (e) {} visBusy = false; }, 350);
  }
  function hiddenBar() { const bar = $('#edHiddenBar'); if (!bar) return; const pg = pageRow(); bar.hidden = pg.status !== 'stopped'; }
  let dupBusy = false;
  async function duplicatePage() {
    const pg = pageRow(); if (pg.type === 'main') { WB.toast('메인 페이지는 복제할 수 없습니다.', 'info'); return; } if (dupBusy) return; dupBusy = true;
    try { await flush(); const r = await WB.api('POST', 'api/pages/' + C.pageId + '/duplicate', {}); WB.toast('페이지가 복제되었습니다.', 'success'); await WBEditor.open({ pageId: r.id, push: true }); } catch (e) {} dupBusy = false;
  }
  async function deletePage() {
    const pg = pageRow(); if (pg.type === 'main') { WB.toast('메인 페이지는 삭제할 수 없습니다. (홈페이지의 첫 화면)', 'info'); return; }
    if (!(await WB.confirm(pg.title + ' 페이지를 삭제하시겠습니까?\n삭제 직후 [실행 취소]로 되돌릴 수 있고, 이후에도 [변경 이력 › 최근 삭제한 페이지]에서 복구할 수 있습니다.', { danger: true, ok: '삭제' }))) return;
    try { await WB.api('DELETE', 'api/pages/' + C.pageId, {}); } catch (e) { return; }
    const id = C.pageId; const main = C.pages.find((x) => x.type === 'main');
    WB.toast(pg.title + ' 페이지를 삭제했습니다.', 'success', { action: { label: '실행 취소', run: async () => { await WB.api('POST', 'api/pages/' + id + '/restore', {}); WB.toast('페이지를 복구했습니다.', 'success'); WBEditor.open({ pageId: id, push: true }); } } });
    if (main) WBEditor.open({ pageId: main.id, push: true }); else WBEditor.close();
  }
  let renameTimer = null;
  function renamePage(title) { const pg = pageRow(); title = String(title || '').trim(); if (!title || title === pg.title) return; pg.title = title; C.pageTitle = title; const opt = $('#edPageSel option[value="' + C.pageId + '"]'); if (opt) opt.textContent = title + (pg.type === 'main' ? ' (메인)' : ''); renderLeft(); clearTimeout(renameTimer); renameTimer = setTimeout(async () => { try { await WB.api('PATCH', 'api/pages/' + C.pageId + '/meta', { title }); document.title = title + ' · 에디터 · 통합웹빌더'; setSave('saved', '페이지 이름 저장됨 · 게시 후 홈페이지에 반영'); } catch (e) {} }, 500); }
  function renderSectionAdd(box) {
    box.innerHTML = '<div class="ef__hint">클릭하면 ' + (S.sel && S.sel.secIndex != null ? '선택한 섹션 다음' : '페이지 끝(푸터 위)') + '에 추가됩니다. 중앙 화면의 섹션 사이 <b>+</b> 버튼으로도 추가할 수 있습니다.</div><div class="ed-grid">' + BLOCKS.map((b) => '<div class="ed-tile" data-add="' + b[0] + '"><i>' + b[2] + '</i>' + esc(b[1]) + (b[3] ? '<small>' + esc(b[3]) + '</small>' : '') + '</div>').join('') + '</div>' +
      (C.pageType === 'main' ? '<h4 style="margin:14px 0 6px;font-size:12px">기본 섹션 (숨긴 섹션 다시 표시)</h4>' + (S.content.sections || []).filter((s) => !s.type.startsWith('block:') && s.enabled === false).map((s, i) => '<div class="ed-sec" data-show="' + esc(s.uid || s.type) + '"><span class="ed-sec__name">' + esc(typeName(s.type)) + '</span><button type="button">표시</button></div>').join('') : '') +
      '<h4 style="margin:14px 0 6px;font-size:12px">저장한 블록 <span class="muted" style="font-weight:400">(다른 페이지에서 재사용)</span></h4><div id="edSavedBlocks" class="muted" style="font-size:12px">불러오는 중…</div>';
    WB.api('GET', 'api/blocks').then((r) => { const el = $('#edSavedBlocks', box); if (!el) return; el.innerHTML = r.blocks.length ? r.blocks.map((b) => '<div class="ed-sec" data-saved="' + b.id + '"><span class="ed-sec__name">' + esc(b.name) + '</span><span class="ed-sec__type">' + esc(typeName(b.section.type || '')) + '</span><button type="button" data-sdel="' + b.id + '" title="삭제">✕</button></div>').join('') : '저장한 블록이 없습니다. 섹션 선택 › [구성] › "블록으로 저장"'; el.__blocks = r.blocks; }).catch(() => {});
    box.onclick = async (e) => {
      const t = e.target.closest('[data-add]'); if (t) { const ref = S.__afterId || (S.sel && S.sel.secIndex != null ? S.content.sections[S.sel.secIndex].uid || S.content.sections[S.sel.secIndex].type : ''); S.__afterId = ''; addSectionAt(ref, 'after', t.dataset.add); return; }
      const sh = e.target.closest('[data-show]'); if (sh) { const s = (S.content.sections || []).find((x) => (x.uid || x.type) === sh.dataset.show); if (s) { snapshotBefore(); s.enabled = true; commitNoHist(); } return; }
      const sdel = e.target.closest('[data-sdel]'); if (sdel) { e.stopPropagation(); if (await WB.confirm('저장한 블록을 삭제할까요?', { danger: true, ok: '삭제' })) { await WB.api('DELETE', 'api/blocks/' + sdel.dataset.sdel, {}); renderLeft(); } return; }
      const sv = e.target.closest('[data-saved]'); if (sv) { const b = ($('#edSavedBlocks', box).__blocks || []).find((x) => x.id === +sv.dataset.saved); if (b) { snapshotBefore(); const sec = clone(b.section); sec.uid = uid(); delete sec.locked; if (sec.data && Array.isArray(sec.data.items)) sec.data.items.forEach((it) => { it.uid = uid(); }); const ri = refIndex(S.__afterId || (S.sel && S.sel.secIndex != null ? S.content.sections[S.sel.secIndex].uid || S.content.sections[S.sel.secIndex].type : '')); S.__afterId = ''; const at = ri >= 0 ? ri + 1 : S.content.sections.length; S.content.sections.splice(at, 0, sec); syncAfter(); commitNoHist(); selectSection(at); WB.toast('블록을 추가했습니다.', 'success'); } }
    };
  }
  function renderElementAdd(box) {
    const els = BLOCKS.filter((b) => ['block:richtext', 'block:image', 'block:button', 'block:video', 'block:divider', 'block:spacer', 'block:table', 'block:gallery', 'block:embed', 'block:form', 'block:slide'].includes(b[0]));
    const host = S.sel && S.sel.secIndex != null && S.content.sections[S.sel.secIndex] && S.content.sections[S.sel.secIndex].type === 'block:section' ? S.content.sections[S.sel.secIndex] : null;
    box.innerHTML = '<div class="ef__hint">' + (host ? '<b>' + esc(sectionLabel(host)) + '</b> 안에 추가됩니다.' : '<b>빈 섹션</b>을 선택한 상태에서는 그 섹션 안에, 아니면 독립된 섹션으로 추가됩니다.') + ' 가운데 화면의 섹션으로 <b>끌어다 놓아도</b> 됩니다.</div><div class="ed-grid">' + els.map((b) => '<div class="ed-tile" data-add="' + b[0] + '" draggable="true" title="클릭하거나 섹션으로 끌어다 놓기"><i>' + b[2] + '</i>' + esc(b[1]) + '</div>').join('') + '</div>';
    box.onclick = async (e) => { const t = e.target.closest('[data-add]'); if (!t) return; if (host && await addElementTo(S.sel.secIndex, t.dataset.add, S.sel.elIndex != null && S.sel.elIndex >= 0 ? S.sel.elIndex + 1 : null)) return; addSectionAt(S.sel && S.sel.secIndex != null ? S.content.sections[S.sel.secIndex].uid || S.content.sections[S.sel.secIndex].type : '', 'after', t.dataset.add); };
    box.ondragstart = (e) => { const t = e.target.closest('[data-add]'); if (!t) return; e.dataTransfer.effectAllowed = 'copy'; try { e.dataTransfer.setData('text/plain', 'wb-el:' + t.dataset.add); } catch (x) {} };
  }
  function reorderByIds(order) { const secs = S.content.sections; const map = {}; secs.forEach((s) => { map[s.uid || s.type] = s; map['cms-' + s.uid] = s; }); const seen = []; order.forEach((id) => { const s = map[id]; if (s && !seen.includes(s)) seen.push(s); }); secs.forEach((s) => { if (!seen.includes(s)) seen.push(s); });   /* 화면에 없는 섹션(숨김 · 다른 기기 전용)은 뒤에 그대로 */ if (seen.length !== secs.length || seen.every((s, n) => s === secs[n])) return; snapshotBefore(); S.content.sections = seen; syncAfter(); commitNoHist(); }
  function sectionLabel(s) { if (s.name) return s.name; const d = s.data || {}; const t = d.title || (d.premiumSection && d.premiumSection.title) || (d.environmentSection && d.environmentSection.title) || (d.unitSection && d.unitSection.title) || (d.reserve && d.reserve.title) || (d.summaryScene && d.summaryScene.title) || d.label || ''; return typeName(s.type) + (t ? ' · ' + String(t).replace(/\n/g, ' ').slice(0, 18) : ''); }
  function renderLayers(box) {
    const secs = S.content.sections || [];
    box.innerHTML = '<div class="ef__hint">현재 페이지 구조입니다. 클릭하면 해당 위치로 이동하고, 드래그로 순서를 바꿉니다.</div>' +
      '<div class="ed-sec ed-sec--common" data-common="header"><span class="ed-sec__name">헤더 (공통)</span><span class="ed-sec__type">공통</span></div>' +
      (C.pageType !== 'main' ? '<div class="ed-sec" data-sec="page"><span class="ed-sec__name">기본 레이아웃 · ' + esc(C.layouts[(S.content.page || {}).layoutType] || '') + '</span><span class="ed-sec__type">page</span></div>' : '') +
      '<div id="edLayerList">' + secs.map((s, i) => '<div class="ed-sec sort-item' + (S.sel && S.sel.secIndex === i ? ' is-on' : '') + (s.enabled === false ? ' is-off' : '') + '" data-sec="' + i + '" draggable="true"><span class="handle">⋮⋮</span><span class="ed-sec__name" title="더블클릭 : 이름 바꾸기">' + (s.locked ? '🔒 ' : '') + esc(sectionLabel(s)) + '</span><span class="ed-sec__type">' + esc(s.type === 'block:section' ? '빈 섹션' : s.type.startsWith('block:') ? '블록' : '기본') + '</span><button type="button" data-act="toggle" title="' + (s.enabled === false ? '표시' : '숨김') + '">' + (s.enabled === false ? '◻' : '◼') + '</button><button type="button" data-act="dup" title="복제">⧉</button><button type="button" data-act="del" title="삭제">✕</button></div>' + (s.type === 'block:section' && ((s.data || {}).items || []).length ? '<div class="ed-sec__kids" data-sec-kids="' + i + '">' + s.data.items.map((it, j) => '<div class="ed-sec ed-sec--kid' + (S.sel && S.sel.secIndex === i && S.sel.elIndex === j ? ' is-on' : '') + (it.enabled === false ? ' is-off' : '') + '" data-el="' + esc(it.uid) + '"><span class="ed-sec__name">' + esc(typeName('block:' + it.type)) + (it.data && (it.data.title || it.data.label) ? ' · ' + esc(String(it.data.title || it.data.label).slice(0, 14)) : '') + '</span></div>').join('') + '</div>' : '')).join('') + '</div>' +
      '<div class="ed-sec ed-sec--common" data-common="footer"><span class="ed-sec__name">푸터 (공통)</span><span class="ed-sec__type">공통</span></div>';
    WB.sortable($('#edLayerList', box), { handle: '.handle', onEnd: (els) => { const order = els.map((el) => +el.dataset.sec); snapshotBefore(); S.content.sections = order.map((i) => secs[i]); syncAfter(); commitNoHist(); } });
    box.onclick = (e) => {
      const cm = e.target.closest('[data-common]'); if (cm) { selectCommon(cm.dataset.common); return; }
      const kid = e.target.closest('[data-el]'); if (kid) { const host = S.content.sections[+kid.closest('[data-sec-kids]').dataset.secKids]; if (host) post({ type: 'cms:selectEl', blockUid: host.uid, elUid: kid.dataset.el }); return; }
      const row = e.target.closest('[data-sec]'); if (!row) return;
      if (row.dataset.sec === 'page') { selectPage(); return; }
      const i = +row.dataset.sec; const s = S.content.sections[i]; const act = e.target.closest('[data-act]');
      if (act) { const a = act.dataset.act; if (a === 'toggle') { snapshotBefore(); s.enabled = s.enabled === false; commitNoHist(); } else if (a === 'dup') duplicateSection(i); else if (a === 'del') deleteSection(i); return; }
      selectSection(i);
    };
    box.ondblclick = async (e) => { const row = e.target.closest('[data-sec]'); if (!row || row.dataset.sec === 'page' || e.target.closest('button')) return; const s = S.content.sections[+row.dataset.sec]; if (!s) return; const name = await WB.prompt('섹션 이름 (레이어 목록에 표시)', s.name || sectionLabel(s)); if (name === null) return; snapshotBefore(); if (name) s.name = name; else delete s.name; commitNoHist(); };
  }
  function selectCommon(which) { S.sel = { kind: 'common', which, label: which === 'header' ? '헤더 (공통 요소)' : which === 'quick' ? '퀵메뉴 (공통 요소)' : '푸터 (공통 요소)', selector: which === 'header' ? '#header' : '#footer' }; S.selPath = null; S.rtab = 'content'; setCommonMode(which); renderRight(); post({ type: 'cms:scrollTo', section: which }); }
  /* ---------- 공통 요소(헤더 · 푸터 · 퀵메뉴) 편집 모드 ----------
     일반 페이지 편집에서는 가운데 화면의 헤더 · 푸터 · 퀵메뉴를 클릭해도 선택되지 않고 안내만 나옵니다.
     [헤더 편집]을 눌러 이 모드로 들어와야 헤더 안쪽 요소 · 메뉴를 고칠 수 있습니다. (이동 · 소메뉴 자동 펼침은 계속 차단) */
  const COMMON_NAME = { header: '헤더', footer: '푸터', quick: '퀵메뉴' };
  function setCommonMode(which) {
    which = which || '';
    if (S.commonMode === which) { commonBar(); return; }
    S.commonMode = which; S.megaAll = which === 'header' ? (S.megaAll !== false) : false;
    post({ type: 'cms:commonMode', which: which });
    if (which === 'header') post({ type: 'cms:megaAll', on: S.megaAll });
    commonBar(); commonFrameSize(); setModeButtons();
  }
  function exitCommonMode() {
    if (!S.commonMode) { setModeButtons(); return; }
    S.commonMode = ''; post({ type: 'cms:commonMode', which: '' }); post({ type: 'cms:megaOpen', group: '' });
    commonBar(); commonFrameSize(); setModeButtons();
    if (S.sel && (S.sel.kind === 'common' || S.sel.kind === 'menu' || S.sel.kind === 'commonHint')) selectPage();
  }
  /* 상단 [페이지] [헤더] [푸터] [공통요소] */
  function setModeButtons() {
    const cur = S.commonMode === 'header' ? 'header' : S.commonMode === 'footer' ? 'footer' : (S.ltab === 'common' ? 'common' : 'page');
    $$('[data-emode]').forEach((b) => b.classList.toggle('is-on', b.dataset.emode === cur));
  }
  function setEditMode(mode) {
    if (mode === 'header' || mode === 'footer') { S.ltab = mode; setLeftOpen(true); selectCommon(mode); renderLeft(); }
    else if (mode === 'common') { exitCommonMode(); S.ltab = 'common'; setLeftOpen(true); renderLeft(); }
    else { exitCommonMode(); if (S.ltab === 'header' || S.ltab === 'footer' || S.ltab === 'common') { S.ltab = 'pages'; renderLeft(); } }
    setModeButtons();
  }
  /* 헤더 · 푸터 전용 화면 : 캔버스를 그 영역 높이에 맞추고 폭에 맞춰 크게 (편집 화면에서 알려 준 높이 사용) */
  function commonFrameSize(h) {
    const stage = $('#edStage');
    if (!S.commonMode) { frameWrap.classList.remove('is-common'); frameWrap.style.height = ''; frame.style.height = ''; if (stage) stage.classList.remove('is-common'); return; }
    if (h) S.commonH = h;
    const hh = Math.max(240, Math.min(900, S.commonH || 420));
    frameWrap.classList.add('is-common'); if (stage) stage.classList.add('is-common');
    frame.style.height = hh + 'px';
    frameWrap.style.height = Math.round(hh * S.zoom) + 'px';
    frameScale.style.height = hh + 'px';
  }
  /* ---------- 동시 접속 : 같은 페이지를 함께 편집하면 위쪽에 알림 ---------- */
  function presenceReport() { try { WB.presence.set({ route: "에디터", page_id: C.pageId, page_title: C.pageTitle }); } catch (e) {} }
  function presenceBar(st) {
    let bar = $("#edPresence");
    const same = (st && st.samePage) || [];
    if (!same.length) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement("div"); bar.id = "edPresence"; bar.className = "ed-commonbar ed-commonbar--warn";
      (frameWrap.parentNode || document.body).insertBefore(bar, frameWrap);
      bar.addEventListener("click", async (e) => {
        if (e.target.closest("[data-pr-reload]")) { await WBEditor.open({ pageId: C.pageId }); return; }
        if (e.target.closest("[data-pr-x]")) bar.remove();
      });
    }
    bar.innerHTML = "<b>⚠ " + esc(same.join(", ")) + "님이 이 페이지를 함께 편집 중입니다</b><span>동시에 저장하면 나중에 저장한 내용으로 덮어써질 수 있습니다</span>" +
      "<button type=\"button\" class=\"btn btn--xs\" data-pr-reload>최신 내용 불러오기</button><button type=\"button\" class=\"btn btn--xs btn--ghost\" data-pr-x>계속 편집</button>";
  }
  function presencePages(st) {
    const busy = {}; ((st && st.others) || []).forEach((o) => { if (o.page_id) { (busy[o.page_id] = busy[o.page_id] || []).push(o.name); } });
    S.prBusy = busy;
    $$("#edPageList [data-id]").forEach((li) => {
      const names = busy[li.dataset.id];
      let tag = li.querySelector(".ed-pages__busy");
      if (!names) { if (tag) tag.remove(); return; }
      if (!tag) { tag = document.createElement("span"); tag.className = "ed-pages__busy"; li.appendChild(tag); }
      tag.textContent = "● " + names[0] + " 편집중";
    });
  }
  try { WB.presence.onChange = (st) => { presenceBar(st); presencePages(st); }; } catch (e) {}
  function commonBar() {
    let bar = $('#edCommonBar');
    if (!S.commonMode) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'edCommonBar'; bar.className = 'ed-commonbar';
      (frameWrap.parentNode || $('#edCanvas') || document.body).insertBefore(bar, frameWrap);
      bar.addEventListener('click', (e) => {
        if (e.target.closest('[data-common-exit]')) { setEditMode('page'); return; }
        if (e.target.closest('[data-mega-all]')) { S.megaAll = !S.megaAll; post({ type: 'cms:megaAll', on: S.megaAll }); commonBar(); renderLeft(); }
      });
    }
    bar.innerHTML = '<b>' + esc(COMMON_NAME[S.commonMode] || '공통 요소') + ' 편집 중</b><span>' + C.pageCount + '개 페이지에 함께 적용 · 이 영역만 선택할 수 있습니다</span>' +
      (S.commonMode === 'header' ? '<button type="button" class="btn btn--xs btn--line" data-mega-all>' + (S.megaAll ? '전체 메뉴 접기' : '전체 메뉴 펼치기') + '</button>' : '') +
      '<button type="button" class="btn btn--xs" data-common-exit>페이지 편집으로 돌아가기</button>';
  }
  /* ================= 헤더 메뉴 편집 (공통 요소 · 이 사이트 전체 페이지에 적용) =================
     가운데 화면에서 1차 메뉴 · 메가메뉴 소메뉴를 클릭하면 페이지 이동 대신 이 패널이 열립니다.
     내용(이름 · 링크 · 표시 · 순서 · 추가 · 삭제)은 사이트 메뉴 데이터에, 디자인은 사이트 디자인 설정에 저장됩니다. */
  let menuSaveTimer = null, designBag = null;
  const MENU_DESIGN = {
    main: [['menuFontSize', '글자 크기', 'px'], ['menuFontWeight', '굵기', 'weight'], ['menuColor', '글자색', 'color'], ['menuHoverColor', '마우스 올렸을 때 색', 'color'], ['menuLetterSpacing', '자간', 'text'], ['menuAlign', '정렬', 'align']],
    sub: [['subFontSize', '글자 크기', 'px'], ['subFontWeight', '굵기', 'weight'], ['subColor', '글자색', 'color'], ['subHoverColor', '마우스 올렸을 때 색', 'color'], ['subLetterSpacing', '자간', 'text'], ['subAlign', '정렬', 'align']],
  };
  function menuList() { S.compiled = S.compiled || {}; if (!Array.isArray(S.compiled.menu)) S.compiled.menu = []; return S.compiled.menu; }
  /* 화면에는 표시 중인 메뉴만 나오므로, 화면 순서 → 데이터 순서로 바꿔서 찾습니다 */
  function menuLocate(ref) {
    if (!ref) return null; const gs = menuList();
    const gi = gs.findIndex((x) => String(x.id) === String(ref.group)); if (gi < 0) return null;
    const g = gs[gi]; let item = null, iIndex = -1;
    if (ref.sub && ref.rawItem != null && (g.items || [])[ref.rawItem]) { item = g.items[ref.rawItem]; iIndex = +ref.rawItem; }   /* 왼쪽 메뉴 트리 : 숨긴 메뉴도 고를 수 있게 실제 순번으로 */
    else if (ref.sub && ref.item >= 0) { const en = (g.items || []).map((it, i) => ({ it, i })).filter((x) => x.it.enabled !== false); const h = en[ref.item]; if (h) { item = h.it; iIndex = h.i; } }
    return { gs, g, gi, item, iIndex };
  }
  /* 가운데 화면에서 헤더 · 푸터 · 퀵메뉴를 클릭했을 때 (일반 페이지 편집) : 바로 고치지 않고 안내 + [편집 열기] */
  let blockedTip = 0;
  function onCommonBlocked(m) {
    if (m.outside) { if (!blockedTip || Date.now() - blockedTip > 2500) { blockedTip = Date.now(); WB.toast(COMMON_NAME[S.commonMode] + ' 편집 중입니다. 다른 곳을 고치려면 위의 [페이지 편집으로 돌아가기]를 누르세요.', 'info'); } return; }
    S.sel = { kind: 'commonHint', which: m.which, label: (COMMON_NAME[m.which] || '공통 요소') + ' (공통)' };
    S.selPath = null; S.rtab = 'content'; renderRight(); drawOverlay();
  }
  function selectMenu(ref) {
    const loc = menuLocate(ref); if (!loc) return false;
    S.sel = { kind: 'menu', menuRef: ref, label: '메뉴 · ' + ((loc.item ? loc.item.label : loc.g.label) || ''), tag: ref.sub ? '소메뉴' : '1차 메뉴' };
    S.selPath = null; S.subPath = [];
    if (!['content', 'style'].includes(S.rtab)) S.rtab = 'content';
    renderRight(); renderLeft(); drawOverlay(); return true;
  }
  async function saveMenuNow() {
    try { await WB.api('PUT', 'api/sites/' + C.siteId + '/menus/main', { menu: menuList() }); setSave('saved', '메뉴 저장됨 · 게시 후 홈페이지에 반영'); }
    catch (e) { setSave('error', '메뉴 저장 실패 · ' + ((e && e.message) || '')); }
  }
  function saveMenuSoon(redraw) { clearTimeout(menuSaveTimer); menuSaveTimer = setTimeout(saveMenuNow, 600); if (redraw !== false) rerender(150); }
  async function designLoad() { if (designBag) return designBag; try { const r = await WB.api('GET', 'api/sites/' + C.siteId + '/settings/design'); designBag = (r && r.data) || {}; } catch (e) { designBag = {}; } return designBag; }
  /* 저장 전에 가운데 화면에 바로 반영 (게시된 홈페이지에는 게시할 때 반영) */
  function designLive(d) {
    const t = S.compiled.theme = S.compiled.theme || {}; t.colors = t.colors || {}; t.typography = t.typography || {}; t.layout = t.layout || {};
    const px = (v) => (v === undefined || v === '' ? '' : parseInt(v, 10) + 'px');
    const put = (bag, k, v) => { if (v === '' || v == null) delete bag[k]; else bag[k] = String(v); };
    put(t.typography, '--fs-gnb', px(d.menuFontSize)); put(t.typography, '--fw-gnb', d.menuFontWeight);
    put(t.typography, '--menu-letter-spacing', d.menuLetterSpacing); put(t.layout, '--menu-align', d.menuAlign);
    put(t.colors, '--menu-color', d.menuColor); put(t.colors, '--header-active-color', d.menuHoverColor);
    put(t.typography, '--fs-mega', px(d.subFontSize)); put(t.typography, '--fw-mega', d.subFontWeight);
    put(t.typography, '--menu-sub-letter-spacing', d.subLetterSpacing); put(t.layout, '--menu-sub-align', d.subAlign);
    put(t.colors, '--menu-sub-color', d.subColor); put(t.colors, '--menu-sub-hover-color', d.subHoverColor);
    rerender(150);
  }
  async function designSet(k, v) {
    const d = await designLoad(); if (v === '' || v == null) delete d[k]; else d[k] = v;
    designLive(d);
    try { await WB.api('PUT', 'api/sites/' + C.siteId + '/settings/design', { data: d }); setSave('saved', '메뉴 디자인 저장됨 · 게시 후 홈페이지에 반영'); }
    catch (e) { setSave('error', '메뉴 디자인 저장 실패 · ' + ((e && e.message) || '')); }
  }
  function menuLabelSet(ref, label, save) {
    const loc = menuLocate(ref); if (!loc) return false;
    const t = loc.item || loc.g; if (t.label === label) return true; t.label = label;
    if (S.sel && S.sel.kind === 'menu') S.sel.label = '메뉴 · ' + label;
    if (save) saveMenuSoon(false);
    return true;
  }
  async function onMenuReorder(m) {
    const f = menuLocate(m.from), t = menuLocate(m.to); if (!f || !t) return;
    const sub = !!(m.from && m.from.sub);
    const arr = sub ? (f.g.items = f.g.items || []) : f.gs;
    const from = sub ? f.iIndex : f.gi, to = sub ? t.iIndex : t.gi;
    if (from < 0 || to < 0 || from === to) return;
    const [x] = arr.splice(from, 1); arr.splice(to, 0, x);
    await saveMenuNow(); rerender(120);
    if (S.sel && S.sel.kind === 'menu') { S.sel.menuRef = Object.assign({}, m.from, { item: sub ? arr.slice(0, to + 1).filter((it) => it.enabled !== false).length - 1 : -1 }); renderRight(); }
    WB.toast('메뉴 순서를 바꿨습니다.', 'success');
  }
  /* ================= 공통 요소 직접 편집 (헤더 · 푸터 · 대표번호 · 퀵메뉴) =================
     compiledPath(site.tel · footer.xxx · quickMenu[0].label …) → 사이트 설정의 같은 값 한 곳을 고칩니다.
     따라서 에디터에서 대표번호를 바꾸면 사이트 설정 · 다른 페이지 · 공개 홈페이지가 모두 같은 값이 됩니다. */
  const COMMON_GROUP = { site: 'site', theme: 'theme', footer: 'footer', quickMenu: 'quick', quickMenuTitle: 'quick', subpage: 'subpage' };
  const COMMON_LABEL = { site: '사이트 공통', theme: '디자인 공통', footer: '푸터', quick: '퀵메뉴', subpage: '소메뉴 공통' };
  const commonBags = {}; let commonTimer = null;
  function commonGroupOf(cp) { return COMMON_GROUP[String(cp || '').split(/[.[]/)[0]] || null; }
  function pathParts(p) { return String(p).replace(/\[(\d+)\]/g, '.$1').split('.'); }
  function pathGet(o, p) { const ps = pathParts(p); for (let i = 0; i < ps.length && o != null; i++) o = o[ps[i]]; return o; }
  function pathSet(o, p, v) { const ps = pathParts(p); for (let i = 0; i < ps.length - 1; i++) { const k = ps[i]; if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(ps[i + 1]) ? [] : {}; o = o[k]; } o[ps[ps.length - 1]] = v; }
  async function commonLoad(group) {
    if (commonBags[group]) return commonBags[group];
    try { const r = await WB.api('GET', 'api/sites/' + C.siteId + '/settings/' + group); commonBags[group] = (r && r.data) || {}; }
    catch (e) { commonBags[group] = {}; }
    return commonBags[group];
  }
  async function commonSaveNow(group) {
    try { await WB.api('PUT', 'api/sites/' + C.siteId + '/settings/' + group, { data: commonBags[group] || {} }); setSave('saved', '공통 요소 저장됨 · 게시 후 홈페이지에 반영'); return true; }
    catch (e) { setSave('error', '공통 요소 저장 실패 · ' + ((e && e.message) || '')); return false; }
  }
  /* 입력 중에는 화면만 바꾸고, 잠시 멈추거나 편집을 끝내면 저장합니다 */
  async function commonSet(cp, value, done) {
    const group = commonGroupOf(cp); if (!group) return false;
    const bag = await commonLoad(group);
    pathSet(bag, cp, value);
    if (S.compiled) pathSet(S.compiled, cp, value);   /* 가운데 화면 즉시 반영 */
    rerender(250);
    clearTimeout(commonTimer);
    if (done) await commonSaveNow(group); else commonTimer = setTimeout(() => commonSaveNow(group), 700);
    return true;
  }
  function commonHitOf(sel) {
    const list = (sel && sel.paths) || [];
    for (const p of list) { if (p && p.compiledPath && commonGroupOf(p.compiledPath)) return p; }
    return null;
  }
  /* 오른쪽 패널 : 공통 요소를 '여기서' 고칩니다 (다른 메뉴로 보내지 않음) */
  function renderCommonEdit(body, sel, hit) {
    const cp = hit.compiledPath; const group = commonGroupOf(cp);
    const cur = pathGet(S.compiled || {}, cp);
    const val = cur == null ? (sel.text || '') : String(cur);
    const long = val.length > 40 || /\n/.test(val);
    body.innerHTML =
      '<div class="ed-note"><b>공통 요소</b> · 이 내용을 바꾸면 이 사이트의 <b>모든 페이지</b>에 적용됩니다. (사이트 설정의 같은 값과 연결)</div>' +
      '<div class="ef"><label class="ef__l">' + esc(COMMON_LABEL[group] || '공통') + ' 내용</label>' +
      (long ? '<textarea data-common-edit="' + esc(cp) + '" rows="3">' + esc(val) + '</textarea>'
            : '<input data-common-edit="' + esc(cp) + '" value="' + esc(val) + '">') + '</div>' +
      (sel.href ? '<div class="ef"><label class="ef__l">링크</label><input value="' + esc(sel.href) + '" disabled><div class="ef__hint">전화 · 메일 링크는 위 번호(주소)에서 자동으로 만들어집니다.</div></div>' : '') +
      '<div class="ef__hint">가운데 화면에서 <b>더블클릭</b>해도 그 자리에서 고칠 수 있습니다. 저장 위치 : 사이트 설정 › ' + esc(COMMON_LABEL[group] || '공통') + ' (' + esc(cp) + ')</div>' +
      '<div class="ef__btns"><a class="btn btn--xs btn--ghost" href="#/siteinfo" target="_blank">사이트 설정에서 열기 ↗</a></div>';
    const onEdit = (e) => { const el = e.target.closest('[data-common-edit]'); if (!el) return; commonSet(el.dataset.commonEdit, el.value, false); };
    body.oninput = onEdit;
    body.onchange = (e) => { const el = e.target.closest('[data-common-edit]'); if (el) commonSet(el.dataset.commonEdit, el.value, true); };
  }
  function renderMenuPanel(body, sel) {
    const loc = menuLocate(sel.menuRef);
    if (!loc) { body.innerHTML = '<div class="ed-empty">메뉴를 찾을 수 없습니다. 왼쪽 [공통 요소]에서 메뉴를 확인해 주세요.</div>'; return; }
    const sub = !!sel.menuRef.sub, t = sub ? loc.item : loc.g;
    if (!t) { body.innerHTML = '<div class="ed-empty">메뉴를 찾을 수 없습니다.</div>'; return; }
    const note = '<div class="ed-note">공통 요소 · 이 사이트 <b>전체 페이지</b>에 적용됩니다.</div>';
    if (S.rtab === 'style') {
      const d = designBag || {};
      const W = [300, 400, 500, 600, 700, 800];
      const rows = MENU_DESIGN[sub ? 'sub' : 'main'].map(([k, label, type]) => {
        const v = d[k] == null ? '' : String(d[k]);
        if (type === 'px') return '<div class="ef"><label class="ef__l">' + label + '</label><div class="ef__px"><input type="number" min="10" max="40" step="1" data-mdesign="' + k + '" value="' + esc(v.replace(/px$/, '')) + '"><span>px</span></div></div>';
        if (type === 'weight') return '<div class="ef"><label class="ef__l">' + label + '</label><select data-mdesign="' + k + '"><option value="">기본</option>' + W.map((w) => '<option value="' + w + '"' + (v === String(w) ? ' selected' : '') + '>' + w + '</option>').join('') + '</select></div>';
        if (type === 'color') return '<div class="ef"><label class="ef__l">' + label + '</label><div class="ef__color"><input type="color" data-mdesign-color="' + k + '" value="' + esc(/^#[0-9a-f]{6}$/i.test(v) ? v : '#002f47') + '"><input type="text" data-mdesign="' + k + '" value="' + esc(v) + '" placeholder="예 #002F47 · 비우면 기본값"></div></div>';
        if (type === 'align') return '<div class="ef"><label class="ef__l">' + label + '</label><select data-mdesign="' + k + '"><option value="">기본</option><option value="left"' + (v === 'left' ? ' selected' : '') + '>왼쪽</option><option value="center"' + (v === 'center' ? ' selected' : '') + '>가운데</option><option value="right"' + (v === 'right' ? ' selected' : '') + '>오른쪽</option></select></div>';
        return '<div class="ef"><label class="ef__l">' + label + '</label><input data-mdesign="' + k + '" value="' + esc(v) + '" placeholder="예 -0.01em"></div>';
      }).join('');
      body.innerHTML = note + rows + '<div class="ef__hint">' + (sub ? '메가메뉴 소메뉴' : '헤더 1차 메뉴') + ' 전체에 함께 적용됩니다. 비우면 기본값으로 돌아갑니다.</div>';
      body.oninput = onMenuDesign; body.onchange = onMenuDesign;
      return;
    }
    const pages = (C.pages || []).filter((p) => p.type !== 'main');
    const linkBox = sub ? '<div class="ef"><label class="ef__l">연결할 페이지</label><select data-menu="page"><option value="">(직접 링크 사용)</option>' +
        pages.map((p) => '<option value="' + esc(p.key) + '"' + (t.page === p.key ? ' selected' : '') + '>' + esc(p.title) + '</option>').join('') + '</select></div>' +
      '<div class="ef"><label class="ef__l">직접 링크 (외부 주소)</label><input data-menu="url" value="' + esc(t.url || '') + '" placeholder="https://..."></div>' +
      '<label class="check" style="display:flex;margin:0 0 10px"><input type="checkbox" data-menu="blank"' + (t.target === '_blank' ? ' checked' : '') + '> 새 창으로 열기</label>' : '';
    body.innerHTML = note +
      '<div class="ef"><label class="ef__l">메뉴 이름</label><input data-menu="label" value="' + esc(t.label || '') + '"></div>' +
      (sub ? '' : '<div class="ef"><label class="ef__l">영문 표기</label><input data-menu="latin" value="' + esc(loc.g.latin || '') + '" placeholder="예 PROJECT"></div>') +
      linkBox +
      '<label class="check" style="display:flex;margin:0 0 10px"><input type="checkbox" data-menu="enabled"' + (t.enabled === false ? '' : ' checked') + '> 홈페이지 메뉴에 표시</label>' +
      '<div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-mact="up">▲ 위로</button><button class="btn btn--xs btn--line" type="button" data-mact="down">▼ 아래로</button>' +
      '<button class="btn btn--xs btn--line" type="button" data-mact="add">' + (sub ? '아래에 소메뉴 추가' : '소메뉴 추가') + '</button>' +
      '<button class="btn btn--xs btn--danger" type="button" data-mact="del">삭제</button></div>' +
      '<div class="ef__hint">메뉴 글자는 가운데 화면에서 <b>더블클릭</b>해 그 자리에서 고칠 수도 있습니다. 디자인(크기 · 색 · 굵기)은 [디자인] 탭에 있습니다.</div>';
    body.oninput = onMenuField; body.onchange = onMenuField; body.onclick = onMenuAction;
  }
  function onMenuDesign(e) {
    const c = e.target.closest('[data-mdesign-color]');
    if (c) { const k = c.dataset.mdesignColor; const box = c.parentNode.querySelector('[data-mdesign="' + k + '"]'); if (box) box.value = c.value; designSet(k, c.value); return; }
    const el = e.target.closest('[data-mdesign]'); if (!el) return;
    designSet(el.dataset.mdesign, String(el.value || '').trim());
  }
  function onMenuField(e) {
    const el = e.target.closest('[data-menu]'); if (!el || !S.sel || S.sel.kind !== 'menu') return;
    const loc = menuLocate(S.sel.menuRef); if (!loc) return;
    const sub = !!S.sel.menuRef.sub, t = sub ? loc.item : loc.g; if (!t) return;
    const k = el.dataset.menu;
    if (k === 'label') { menuLabelSet(S.sel.menuRef, el.value, false); $('#edSelTitle').innerHTML = esc(S.sel.label) + '<span class="ed-chip">' + esc(S.sel.tag) + '</span>'; }
    else if (k === 'latin') loc.g.latin = el.value;
    else if (k === 'page') { t.page = el.value; if (el.value) t.url = ''; }
    else if (k === 'url') { t.url = String(el.value || '').trim(); }
    else if (k === 'blank') t.target = el.checked ? '_blank' : '_self';
    else if (k === 'enabled') t.enabled = !!el.checked;
    saveMenuSoon(k !== 'label');
    if (k === 'label') { clearTimeout(menuSaveTimer); menuSaveTimer = setTimeout(() => { saveMenuNow(); rerender(150); }, 700); }
  }
  async function onMenuAction(e) {
    const b = e.target.closest('[data-mact]'); if (!b || !S.sel || S.sel.kind !== 'menu') return;
    const act = b.dataset.mact; const ref = S.sel.menuRef; const loc = menuLocate(ref); if (!loc) return;
    const sub = !!ref.sub; const arr = sub ? (loc.g.items = loc.g.items || []) : loc.gs; const idx = sub ? loc.iIndex : loc.gi;
    if (act === 'up' || act === 'down') {
      const to = idx + (act === 'up' ? -1 : 1); if (to < 0 || to >= arr.length) { WB.toast('더 이동할 수 없습니다.', 'info'); return; }
      const [x] = arr.splice(idx, 1); arr.splice(to, 0, x);
      if (sub) ref.item = arr.slice(0, to + 1).filter((it) => it.enabled !== false).length - 1;
      await saveMenuNow(); rerender(120); renderRight(); return;
    }
    if (act === 'add') {
      const item = { enabled: true, label: '새 메뉴', page: '', url: '' };
      if (sub) loc.g.items.splice(idx + 1, 0, item); else (loc.g.items = loc.g.items || []).push(item);
      await saveMenuNow(); rerender(120);
      S.sel.menuRef = { group: loc.g.id, item: (loc.g.items || []).filter((it) => it.enabled !== false).indexOf(item), sub: true, label: item.label };
      S.sel.label = '메뉴 · 새 메뉴'; S.sel.tag = '소메뉴'; renderRight();
      WB.toast('소메뉴를 추가했습니다. 이름과 링크를 지정해 주세요.', 'success'); return;
    }
    if (act === 'del') {
      const name = (sub ? loc.item.label : loc.g.label) || '';
      if (!(await WB.confirm('[' + name + '] 메뉴를 삭제합니다. 이 사이트 전체 페이지의 메뉴에서 사라집니다. 진행할까요?', { danger: true, ok: '삭제' }))) return;
      arr.splice(idx, 1); await saveMenuNow(); rerender(120); deselect(); WB.toast('메뉴를 삭제했습니다.', 'success');
    }
  }
  function selectSection(i) { const s = S.content.sections[i]; if (!s) return; S.sel = { kind: 'section', secIndex: i, type: s.type, contentPath: 'sections.' + i + '.data', objPath: 'sections.' + i + '.data', label: sectionLabel(s), selector: sectionSelector({ secIndex: i }) }; S.selPath = null; S.subPath = []; if (S.rtab === 'content' && s.type === 'reserve') S.rtab = 'content'; renderRight(); renderLeft(); post({ type: 'cms:scrollTo', section: s.type.startsWith('block:') ? 'cms-' + s.uid : s.type }); post({ type: 'cms:selectSection', section: s.type.startsWith('block:') ? 'cms-' + s.uid : s.type }); }
  function sectionSelector(sel) { const s = S.content.sections[sel.secIndex]; if (!s) return null; return s.type.startsWith('block:') ? '#cms-' + s.uid : (SEC_SEL[s.type] || null); }
  async function loadSettings(groups) { for (const g of groups) if (!S.settings[g]) { try { const r = await WB.api('GET', 'api/settings/' + g); S.settings[g] = r.data && !Array.isArray(r.data) ? r.data : {}; } catch (e) { S.settings[g] = {}; } } }
  /* ----- 헤더 편집 탭 : 헤더 설정 + 상단 메뉴(1차 · 소메뉴) 를 여기서만 고칩니다 ----- */
  function renderHeaderTab(box) {
    const gs = menuList();
    const cur = S.sel && S.sel.kind === 'menu' ? S.sel.menuRef : null;
    const isCur = (gid, i) => cur && String(cur.group) === String(gid) && ((i == null && !cur.sub) || (i != null && cur.sub && +(cur.rawItem != null ? cur.rawItem : cur.item) === i));
    box.innerHTML = '<div class="ed-note"><b>헤더 편집</b> — 가운데 화면에 헤더만 크게 펼쳐집니다. 고칠 곳(로고 · 메뉴 · 대표번호)을 바로 클릭하세요. 저장하면 <b>' + C.pageCount + '개 페이지 전체</b>에 적용됩니다.</div>' +
      '<div class="ef__btns" style="margin-bottom:8px"><button class="btn btn--xs" type="button" data-mega-toggle>' + (S.megaAll ? '전체 메뉴 접기' : '전체 메뉴 펼치기') + '</button>' +
      '<button class="btn btn--xs btn--line" type="button" data-common="header">헤더 설정 (로고 · 대표번호 · 디자인)</button></div>' +
      '<h4 style="margin:12px 0 6px;font-size:12px">상단 메뉴 <span class="muted" style="font-weight:400">(끌어서 순서 변경 · 클릭하면 오른쪽에서 수정)</span></h4>' +
      '<ul class="ed-menutree" id="edMenuList">' + (gs.length ? gs.map((g) => '<li class="ed-menutree__g sort-item" data-gid="' + esc(g.id) + '" draggable="true">' +
        '<div class="ed-menutree__row' + (isCur(g.id, null) ? ' is-on' : '') + '"><span class="handle" data-tip="끌어서 순서 변경">⋮⋮</span>' +
        '<button type="button" class="ed-menutree__name" data-menu-go="' + esc(g.id) + '">' + esc(g.label || g.id) + '</button>' +
        '<span class="ed-menutree__st' + (g.enabled === false ? ' is-off' : '') + '">' + (g.enabled === false ? '숨김' : '표시') + '</span></div>' +
        '<ul class="ed-menutree__subs" data-subs="' + esc(g.id) + '">' + (g.items || []).map((it, i) => '<li class="sort-item" data-i="' + i + '" draggable="true"><div class="ed-menutree__row' + (isCur(g.id, i) ? ' is-on' : '') + '">' +
          '<span class="handle">⋮⋮</span><button type="button" class="ed-menutree__name" data-menu-go="' + esc(g.id) + '" data-menu-sub="' + i + '">' + esc(it.label || '(이름 없음)') + '</button>' +
          '<span class="ed-menutree__st' + (it.enabled === false ? ' is-off' : '') + '">' + (it.enabled === false ? '숨김' : '표시') + '</span></div></li>').join('') + '</ul>' +
        '<button type="button" class="ed-menutree__add" data-add-sub="' + esc(g.id) + '">+ 서브메뉴 추가</button>' +
        '</li>').join('') : '<li class="ed-pages__empty">메뉴가 없습니다.</li>') + '</ul>' +
      '<button class="btn btn--line btn--sm" type="button" id="edMenuAdd" style="width:100%;margin-top:8px">+ 메뉴 추가</button>' +
      '<p class="ef__hint" style="margin:8px 0 0">메뉴 · 소메뉴는 이 사이트 <b>모든 페이지</b>에 함께 적용됩니다. 공개 홈페이지 반영은 [게시하기] 후입니다.</p>';
    /* 1차 메뉴 순서 변경 */
    WB.sortable($('#edMenuList', box), { handle: '.handle', onEnd: async (els) => {
      const ids = els.map((e) => e.dataset.gid).filter(Boolean); const cur2 = menuList();
      cur2.sort((x, y) => ids.indexOf(String(x.id)) - ids.indexOf(String(y.id)));
      await saveMenuNow(); rerender(120); renderLeft();
    } });
    /* 소메뉴 순서 변경 (그룹 안에서) */
    $$('[data-subs]', box).forEach((ul) => WB.sortable(ul, { handle: '.handle', onEnd: async (els) => {
      const gid = ul.dataset.subs; const g = menuList().find((x) => String(x.id) === String(gid)); if (!g) return;
      const order = els.map((e) => +e.dataset.i); const items = (g.items || []).slice();
      g.items = order.map((i) => items[i]).filter(Boolean);
      await saveMenuNow(); rerender(120); renderLeft();
    } }));
    box.onclick = async (e) => {
      if (e.target.closest('[data-mega-toggle]')) { S.megaAll = !S.megaAll; post({ type: 'cms:megaAll', on: S.megaAll }); commonBar(); renderLeft(); return; }
      const cm = e.target.closest('[data-common]'); if (cm) { selectCommon(cm.dataset.common); return; }
      const as = e.target.closest('[data-add-sub]');
      if (as) { const g = menuList().find((x) => String(x.id) === String(as.dataset.addSub)); if (!g) return; const item = { enabled: true, label: '새 메뉴', page: '', url: '' }; (g.items = g.items || []).push(item); await saveMenuNow(); rerender(120); renderLeft(); selectMenu({ group: g.id, item: (g.items || []).filter((x) => x.enabled !== false).indexOf(item), sub: true }); WB.toast('서브메뉴를 추가했습니다. 오른쪽에서 이름 · 연결 페이지를 지정해 주세요.', 'success'); return; }
      if (e.target.closest('#edMenuAdd')) {
        const name = await WB.prompt('새 대메뉴 이름', '새 메뉴'); if (name === null) return;
        const id = 'menu' + Date.now().toString(36); menuList().push({ id, label: String(name).trim() || '새 메뉴', latin: '', enabled: true, items: [] });
        await saveMenuNow(); rerender(120); renderLeft(); selectMenu({ group: id, item: -1 }); WB.toast('대메뉴를 추가했습니다.', 'success'); return;
      }
      const mg = e.target.closest('[data-menu-go]'); if (!mg) return; e.preventDefault();
      const sub = mg.dataset.menuSub;
      selectMenu(sub == null ? { group: mg.dataset.menuGo, item: -1 } : { group: mg.dataset.menuGo, item: +sub, rawItem: +sub, sub: true });
      renderLeft();
    };
  }
  function renderFooterTab(box) {
    box.innerHTML = '<div class="ed-note"><b>푸터 편집 모드</b>입니다. 가운데 화면의 푸터만 선택할 수 있습니다. 저장하면 <b>' + C.pageCount + '개 페이지 전체</b>에 적용됩니다.</div>' +
      '<div class="ed-sec ed-sec--common" data-common="footer"><span class="ed-sec__name">푸터 설정 <small class="muted">상담 문구 · 대표번호 · 회사 정보 · 주의 문구</small></span><button type="button">편집</button></div>' +
      '<div class="ed-sec ed-sec--common" data-common="quick"><span class="ed-sec__name">퀵메뉴 <small class="muted">화면 오른쪽 버튼</small></span><button type="button">편집</button></div>';
    box.onclick = (e) => { const cm = e.target.closest('[data-common]'); if (cm) selectCommon(cm.dataset.common); };
  }
  function renderCommon(box) {
    box.innerHTML = '<div class="ef__hint">헤더 · 푸터 · 퀵메뉴 · 로고 · 대표번호는 모든 페이지에 공통으로 적용됩니다. 저장 시 영향을 받는 페이지 수를 확인합니다.</div>' +
      '<div class="ed-sec ed-sec--common" data-common="header"><span class="ed-sec__name">헤더 <small class="muted">로고 · 대표번호 · 메뉴</small></span><button type="button">편집</button></div>' +
      '<div class="ed-sec ed-sec--common" data-common="footer"><span class="ed-sec__name">푸터 <small class="muted">상담 문구 · 대표번호 · 안내문</small></span><button type="button">편집</button></div>' +
      '<div class="ed-sec ed-sec--common" data-common="quick"><span class="ed-sec__name">퀵메뉴 <small class="muted">화면 오른쪽 홈 · 타입 · 방문예약</small></span><button type="button">편집</button></div>' +
      '<div class="ef__btns"><a class="btn btn--xs btn--line" href="#/menus">메뉴 구성 ↗</a><a class="btn btn--xs btn--line" href="#/siteinfo">퀵메뉴 ↗</a><a class="btn btn--xs btn--line" href="#/siteinfo">디자인 시스템 ↗</a><a class="btn btn--xs btn--line" href="#/popups">팝업 ↗</a></div>' +
      '<h4 style="margin:14px 0 6px;font-size:12px">이 페이지만 다르게 <span class="muted" style="font-weight:400">(페이지별 예외)</span></h4>' +
      '<label class="check" style="margin-bottom:6px"><input type="checkbox" data-common-page="header.transparent"' + (get(S.content, 'common.header.transparent') === false ? '' : ' checked') + '> 이 페이지에서 투명 헤더 사용</label><br><label class="check" style="margin-bottom:6px"><input type="checkbox" data-common-page="header.hidden"' + (get(S.content, 'common.header.hidden') ? ' checked' : '') + '> 이 페이지에서 헤더 숨김</label><br><label class="check" style="margin-bottom:6px"><input type="checkbox" data-common-page="footer.hidden"' + (get(S.content, 'common.footer.hidden') ? ' checked' : '') + '> 이 페이지에서 푸터 숨김</label><br><label class="check"><input type="checkbox" data-common-page="quick.hidden"' + (get(S.content, 'common.quick.hidden') ? ' checked' : '') + '> 이 페이지에서 퀵메뉴 숨김</label>';
    box.onclick = (e) => { const cm = e.target.closest('[data-common]'); if (cm) selectCommon(cm.dataset.common); };
    box.onchange = (e) => { const el = e.target; if (!el.dataset.commonPage) return; snapshotBefore(); S.content.common = S.content.common || {}; const [a, b] = el.dataset.commonPage.split('.'); S.content.common[a] = S.content.common[a] || {}; S.content.common[a][b] = el.checked; if (b === 'transparent' && el.checked) delete S.content.common[a][b]; markDirty(); post({ type: 'cms:pageCommon', common: S.content.common }); };   /* 체크 즉시 가운데 화면에 반영 (새로고침 없음) · 자동 임시저장 */
  }
  /* 미디어 : 관리자 · 팝업 관리와 같은 공통 미디어 창 하나만 사용 (에디터 전용 목록 · 업로드 화면은 두지 않음) */
  async function openMediaLibrary() {
    const onImg = S.sel && S.sel.elKind === 'image';
    const it = await WB.pickMedia({ type: 'all', title: '미디어', okLabel: onImg ? '선택한 이미지에 적용' : '페이지에 추가' }); if (!it) return;
    const ref = S.sel && S.sel.secIndex != null ? (S.content.sections[S.sel.secIndex].uid || S.content.sections[S.sel.secIndex].type) : '';
    if (!it.is_image) { addSectionAt(ref, 'after', 'block:video', undefined, { url: it.url, title: '' }); return; }
    if (onImg) applyImage(S.sel, it); else addSectionAt(ref, 'after', 'block:image', undefined, { src: chooseVariant(it), alt: it.alt || '' });
  }
  async function renderHistoryTab(box) {
    box.innerHTML = '<div class="muted" style="font-size:12px">불러오는 중…</div>';
    const [v, trash] = await Promise.all([WB.api('GET', 'api/pages/' + C.pageId + '/versions'), WB.api('GET', 'api/pages/trash').catch(() => ({ pages: [] }))]);
    const secTrash = S.content.trash || [];
    box.innerHTML = '<h4 style="margin:0 0 6px;font-size:12px">이 페이지 버전</h4><ul class="ef__list">' + v.versions.slice(0, 20).map((x) => '<li><span>v' + x.version_no + ' · ' + esc({ draft: '초안', saved: '임시저장', review: '검토', published: '게시', archived: '이전 게시', scheduled: '예약' }[x.status] || x.status) + ' · ' + esc((x.created_at || '').slice(5, 16)) + (x.note ? ' · ' + esc(x.note) : '') + '</span><button type="button" data-restore="' + x.id + '" title="이 버전으로 되돌리기">복원</button></li>').join('') + '</ul>' +
      '<h4 style="margin:14px 0 6px;font-size:12px">최근 삭제한 섹션</h4>' + (secTrash.length ? '<ul class="ef__list">' + secTrash.map((t, i) => '<li><span>' + esc(sectionLabel(t.section)) + ' <small class="muted">' + esc(t.at.slice(5, 16).replace('T', ' ')) + '</small></span><button type="button" data-untrash="' + i + '">복구</button></li>').join('') + '</ul>' : '<div class="muted" style="font-size:12px">없음</div>') +
      '<h4 style="margin:14px 0 6px;font-size:12px">최근 삭제한 페이지</h4>' + (trash.pages.length ? '<ul class="ef__list">' + trash.pages.map((p) => '<li><span>' + esc(p.title) + ' <small class="muted">' + esc((p.deleted_at || '').slice(5, 16)) + '</small></span><button type="button" data-prestore="' + p.id + '">복구</button></li>').join('') + '</ul>' : '<div class="muted" style="font-size:12px">없음</div>');
    box.onclick = async (e) => {
      const r = e.target.closest('[data-restore]'); if (r) { if (!(await WB.confirm('이 버전으로 초안을 되돌릴까요? 현재 편집 내용은 이력에 남습니다.', { ok: '복원' }))) return; await WB.api('POST', 'api/pages/' + C.pageId + '/versions/' + r.dataset.restore + '/restore', {}); await load(); WB.toast('복원되었습니다.', 'success'); return; }
      const u = e.target.closest('[data-untrash]'); if (u) { const t = S.content.trash.splice(+u.dataset.untrash, 1)[0]; snapshotBefore(); const sec = t.section; sec.uid = sec.uid || uid(); S.content.sections.splice(Math.min(t.index, S.content.sections.length), 0, sec); commitNoHist(); WB.toast('섹션을 복구했습니다.', 'success'); return; }
      const p = e.target.closest('[data-prestore]'); if (p) { await WB.api('POST', 'api/pages/' + p.dataset.prestore + '/restore', {}); WB.toast('페이지를 복구했습니다. 게시하면 공개 사이트에 다시 표시됩니다.', 'success'); renderLeft(); }
    };
  }

  /* ---------- 캔버스 조작 → 데이터 ---------- */
  /* 섹션 순서 = 게시 화면 순서 : 추가 섹션의 위치 값(after)을 배열 순서에서 다시 계산 (메인) */
  function syncAfter() { if (C.pageType !== 'main') return; let last = 'top'; (S.content.sections || []).forEach((s) => { if (s.type.startsWith('block:')) s.after = last; else if (s.type !== 'summaryMobile') last = s.type; }); }
  function setStyles(selector, mode, props, opts) { S.content.styles = S.content.styles || {}; S.content.styles[mode] = S.content.styles[mode] || {}; const st = S.content.styles[mode][selector] = S.content.styles[mode][selector] || {}; Object.keys(props).forEach((k) => { const v = props[k]; if (v === '' || v == null) delete st[k]; else st[k] = v; }); if (!Object.keys(st).length) delete S.content.styles[mode][selector]; if (!(opts && opts.silent)) markDirty(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); }   /* silent : 슬라이더를 끄는 동안 미리보기만 (저장 · 이력은 놓을 때 한 번) */
  /* 핸들을 놓았을 때 한 번 : 이력 1건 + 자동저장 예약(2.5초 디바운스) — 드래그 중에는 에디터로 아무 것도 오지 않음 */
  function applyCanvasStyle(m) { if (!m.selector || !m.props) return; snapshotBefore(m.nudge ? 'nudge:' + m.selector + ':' + Object.keys(m.props).join() : ''); setStyles(m.selector, styleMode(), m.props); renderRight(); const dev = styleMode(); if (dev !== 'pc') setSave('dirty', DEV_LABEL[dev] + ' 전용 값으로 저장됨 · 자동저장 대기'); }
  function blockTarget(m) { const i = (S.content.sections || []).findIndex((s) => s.uid === m.blockUid); if (i < 0) return null; const sec = S.content.sections[i]; if (m.elUid) { const items = (sec.data && sec.data.items) || []; const j = items.findIndex((x) => x.uid === m.elUid); if (j < 0) return null; items[j].data = items[j].data || {}; return { sec, i, j, data: items[j].data }; } sec.data = sec.data || {}; return { sec, i, j: -1, data: sec.data }; }
  function onBlockField(m) {
    const tg = blockTarget(m); if (!tg) return; const key = m.blockUid + ':' + (m.elUid || '') + ':' + m.field;
    if (m.cancel) { if (S.fieldSnap === key && S.history.length) { restoreState(S.history.pop()); updateHistBtns(); } S.fieldSnap = null; renderRight(); return; }
    if (S.fieldSnap !== key) { if (tg.data[m.field] === m.value) { if (m.done) S.fieldSnap = null; return; } snapshotBefore(); S.fieldSnap = key; }   /* 글 한 번 고치기 = 이력 1건 */
    tg.data[m.field] = m.field === 'html' ? String(m.value).replace(/<script[\s\S]*?<\/script>/gi, '') : m.value; markDirty();
    if (m.done) { S.fieldSnap = null; renderRight(); renderLeft(); }
  }
  function newItem(type, picked) { const it = { uid: uid(), type: type.slice(6), enabled: true, data: clone(BLOCK_DEFAULTS[type] || {}) }; return it; }
  async function addElementTo(secIndex, type, index) {
    const sec = S.content.sections[secIndex]; if (!sec || sec.type !== 'block:section') return false; if (sec.locked) { WB.toast('잠긴 섹션입니다.', 'info'); return true; }
    let picked;
    snapshotBefore(); sec.data = sec.data || {}; sec.data.items = sec.data.items || []; const it = newItem(type, picked); const at = index == null || index < 0 || index > sec.data.items.length ? sec.data.items.length : index; sec.data.items.splice(at, 0, it);
    commitNoHist(); S.pendingSelectEl = { blockUid: sec.uid, elUid: it.uid }; WB.toast(typeName(type) + ' 요소를 섹션에 추가했습니다.', 'success'); return true;
  }
  function moveElement(m) { const tg = blockTarget(m); if (!tg || tg.j < 0) return; const items = tg.sec.data.items; const to = Math.max(0, Math.min(items.length - 1, +m.to)); if (to === tg.j) return; snapshotBefore(); const [it] = items.splice(tg.j, 1); items.splice(to, 0, it); commitNoHist(); S.pendingSelectEl = { blockUid: tg.sec.uid, elUid: it.uid }; }
  async function dropElement(m) { const type = String(m.elType || ''); if (!EL_TYPES.includes(type) && type !== 'block:section') return; if (m.container && m.blockUid) { const i = S.content.sections.findIndex((s) => s.uid === m.blockUid); if (i >= 0 && type !== 'block:section') { await addElementTo(i, type, m.index); return; } } addSectionAt(m.section, 'after', type); }
  function elementAction(act, i, j) {
    const sec = S.content.sections[i]; const items = sec && sec.data && sec.data.items; if (!items || !items[j]) return; if (sec.locked) { WB.toast('잠긴 섹션입니다.', 'info'); return; }
    snapshotBefore(); let keep = items[j].uid;
    if (act === 'up' && j > 0) [items[j - 1], items[j]] = [items[j], items[j - 1]]; else if (act === 'down' && j < items.length - 1) [items[j + 1], items[j]] = [items[j], items[j + 1]];
    else if (act === 'dup') { const c = clone(items[j]); c.uid = uid(); items.splice(j + 1, 0, c); keep = c.uid; }
    else if (act === 'del') { items.splice(j, 1); keep = null; deselect(true); WB.toast('요소를 삭제했습니다. 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.', 'success'); }
    else if (act === 'hide') items[j].enabled = items[j].enabled === false;
    commitNoHist(); if (keep) S.pendingSelectEl = { blockUid: sec.uid, elUid: keep };
  }
  function duplicateSection(i) { const s = S.content.sections[i]; if (!s) return; snapshotBefore(); const c = clone(s); c.uid = uid(); if (c.data && Array.isArray(c.data.items)) c.data.items.forEach((it) => { it.uid = uid(); }); delete c.locked; if (s.type.startsWith('block:')) copyStyles('#cms-' + s.uid, '#cms-' + c.uid); S.content.sections.splice(i + 1, 0, c); syncAfter(); commitNoHist(); WB.toast('섹션을 복제했습니다.', 'success'); }
  function stylesOfSelector(prefix) { const out = {}; ['pc', 'tablet', 'mobile'].forEach((mode) => { const bag = (S.content.styles || {})[mode] || {}; Object.keys(bag).forEach((sel) => { if (sel === prefix || sel.indexOf(prefix + ' ') === 0) { out[mode] = out[mode] || {}; out[mode][sel] = clone(bag[sel]); } }); }); return out; }
  function putStyles(bags, from, to) { S.content.styles = S.content.styles || {}; Object.keys(bags || {}).forEach((mode) => { S.content.styles[mode] = S.content.styles[mode] || {}; Object.keys(bags[mode]).forEach((sel) => { S.content.styles[mode][to + sel.slice(from.length)] = clone(bags[mode][sel]); }); }); }
  function copyStyles(from, to) { putStyles(stylesOfSelector(from), from, to); }
  function toggleLock(i) { const s = S.content.sections[i]; if (!s) return; snapshotBefore(); s.locked = !s.locked; commitNoHist(); WB.toast(s.locked ? '섹션을 잠갔습니다. (선택만 가능 · 편집 · 이동 · 삭제 불가)' : '섹션 잠금을 풀었습니다.', 'success'); }
  /* 섹션 복사 → 다른 페이지에도 붙여넣기 (이 브라우저에 보관 · 디자인 값 포함) */
  function copySection(i) { const s = S.content.sections[i]; if (!s || !s.type.startsWith('block:')) { WB.toast('기본 섹션은 복사할 수 없습니다. (추가한 섹션만 가능)', 'info'); return; } try { localStorage.setItem('wb_sec_clip', JSON.stringify({ section: s, styles: stylesOfSelector('#cms-' + s.uid), from: '#cms-' + s.uid, at: Date.now() })); WB.toast('섹션을 복사했습니다. 다른 페이지에서도 [붙여넣기]할 수 있습니다.', 'success'); } catch (e) { WB.toast('복사하지 못했습니다.', 'error'); } }
  function pasteSection(afterIndex) { let clip = null; try { clip = JSON.parse(localStorage.getItem('wb_sec_clip') || 'null'); } catch (e) {} if (!clip || !clip.section) { WB.toast('복사한 섹션이 없습니다.', 'info'); return; } snapshotBefore(); const c = clone(clip.section); c.uid = uid(); delete c.locked; if (c.data && Array.isArray(c.data.items)) c.data.items.forEach((it) => { it.uid = uid(); }); putStyles(clip.styles, clip.from, '#cms-' + c.uid); const secs = S.content.sections; const at = afterIndex != null && afterIndex >= 0 ? afterIndex + 1 : secs.length; secs.splice(at, 0, c); if (C.pageType !== 'main') c.after = (secs[at - 1] && secs[at - 1].after) || ''; syncAfter(); commitNoHist(); selectSection(at); WB.toast('섹션을 붙여넣었습니다.', 'success'); }
  function copySectionStyle(i) { const sel = sectionSelector({ secIndex: i }); if (!sel) return; const bag = {}; ['pc', 'tablet', 'mobile'].forEach((mode) => { const v = ((S.content.styles || {})[mode] || {})[sel]; if (v) bag[mode] = clone(v); }); try { localStorage.setItem('wb_secstyle_clip', JSON.stringify(bag)); WB.toast('섹션 설정(높이 · 여백 · 배경)을 복사했습니다.', 'success'); } catch (e) {} }
  function pasteSectionStyle(i) { const sel = sectionSelector({ secIndex: i }); let bag = null; try { bag = JSON.parse(localStorage.getItem('wb_secstyle_clip') || 'null'); } catch (e) {} if (!sel || !bag) { WB.toast('복사한 섹션 설정이 없습니다.', 'info'); return; } snapshotBefore(); S.content.styles = S.content.styles || {}; ['pc', 'tablet', 'mobile'].forEach((mode) => { S.content.styles[mode] = S.content.styles[mode] || {}; if (bag[mode]) S.content.styles[mode][sel] = clone(bag[mode]); else delete S.content.styles[mode][sel]; }); markDirty(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); renderRight(); WB.toast('섹션 설정을 붙여넣었습니다.', 'success'); }
  function resetSectionSpacing(i) { const sel = sectionSelector({ secIndex: i }); if (!sel) return; snapshotBefore(); ['pc', 'tablet', 'mobile'].forEach((mode) => { const st = ((S.content.styles || {})[mode] || {})[sel]; if (!st) return; ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'padding', 'marginTop', 'marginBottom', 'margin', '--cms-sec-padx'].forEach((k) => delete st[k]); if (!Object.keys(st).length) delete S.content.styles[mode][sel]; }); markDirty(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); renderRight(); WB.toast('여백을 기본값으로 되돌렸습니다.', 'success'); }
  function sectionMoreMenu(btn, i) {
    const s = S.content.sections[i]; if (!s) return; const old = $('.ed-more'); if (old) old.remove();
    const m = document.createElement('div'); m.className = 'ed-more'; const blk = s.type.startsWith('block:');
    m.innerHTML = '<button type="button" data-m="rename">섹션 이름 변경</button><button type="button" data-m="lock">' + (s.locked ? '잠금 해제' : '섹션 잠금') + '</button><hr>' + (blk ? '<button type="button" data-m="copy">섹션 복사 (다른 페이지에 붙여넣기)</button>' : '') + '<button type="button" data-m="paste">이 섹션 아래에 붙여넣기</button><button type="button" data-m="copy-style">섹션 설정 복사</button><button type="button" data-m="paste-style">섹션 설정 붙여넣기</button><hr><button type="button" data-m="save-block">재사용 블록으로 저장</button><button type="button" data-m="reset-space">모든 여백 초기화</button>';
    document.body.appendChild(m); const r = btn.getBoundingClientRect(); m.style.left = Math.min(window.innerWidth - 250, r.left) + 'px'; m.style.top = (r.bottom + 6) + 'px'; m.style.right = 'auto';
    const close = () => m.remove(); setTimeout(() => addL(document, 'click', close, { once: true }), 0);
    m.addEventListener('click', async (e) => { const a = (e.target.closest('[data-m]') || {}).dataset; if (!a) return; if (a.m === 'rename') { const name = await WB.prompt('섹션 이름 (레이어 목록에 표시)', s.name || sectionLabel(s)); if (name === null) return; snapshotBefore(); if (name) s.name = name; else delete s.name; commitNoHist(); } else if (a.m === 'lock') toggleLock(i); else if (a.m === 'copy') copySection(i); else if (a.m === 'paste') pasteSection(i); else if (a.m === 'copy-style') copySectionStyle(i); else if (a.m === 'paste-style') pasteSectionStyle(i); else if (a.m === 'reset-space') resetSectionSpacing(i); else if (a.m === 'save-block') { const name = await WB.prompt('블록 이름', s.name || sectionLabel(s)); if (name === null) return; await WB.api('POST', 'api/blocks', { name, section: s }); WB.toast('재사용 블록으로 저장했습니다. [섹션 › 저장한 블록]에서 불러올 수 있습니다.', 'success'); } });
  }
  /* + 섹션 추가 : 누른 위치(위/아래)에 바로 추가 — 빈 섹션이 첫 번째 */
  function openSectionChooser(m) {
    const old = $('.ed-chooser'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'ed-chooser';
    box.innerHTML = '<div class="ed-chooser__head"><b>' + (m.pos === 'before' ? '이 위에' : '이 아래에') + ' 섹션 추가</b><button type="button" data-x aria-label="닫기">×</button></div><div class="ed-chooser__grid">' + BLOCKS.map((b, n) => '<button type="button" class="ed-chooser__item' + (n === 0 ? ' is-first' : '') + '" data-add="' + b[0] + '"><i>' + b[2] + '</i><span>' + esc(b[1]) + '</span>' + (b[3] ? '<small>' + esc(b[3]) + '</small>' : '') + '</button>').join('') + '</div><div class="ed-chooser__foot"><button type="button" data-paste>복사한 섹션 붙여넣기</button><button type="button" data-saved>저장한 블록에서 선택</button></div>';
    document.body.appendChild(box);
    const fr = frame.getBoundingClientRect(); const x = m.x != null ? fr.left + m.x * S.zoom : fr.left + fr.width / 2, y = m.y != null ? fr.top + m.y * S.zoom : fr.top + fr.height / 2;
    const bw = box.offsetWidth, bh = box.offsetHeight; box.style.left = Math.max(8, Math.min(window.innerWidth - bw - 8, x - bw / 2)) + 'px'; box.style.top = Math.max(8, Math.min(window.innerHeight - bh - 8, y + 16)) + 'px';
    const close = () => { box.remove(); document.removeEventListener('mousedown', out, true); document.removeEventListener('keydown', esc2, true); }; const out = (e) => { if (!box.contains(e.target)) close(); }; const esc2 = (e) => { if (e.key === 'Escape') close(); };
    setTimeout(() => { addL(document, 'mousedown', out, true); addL(document, 'keydown', esc2, true); }, 0);
    box.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) return close(); const a = e.target.closest('[data-add]'); if (a) { close(); addSectionAt(m.section, m.pos || 'after', a.dataset.add); return; } if (e.target.closest('[data-paste]')) { close(); const idx = refIndex(m.section); pasteSection(m.pos === 'before' ? idx - 1 : idx); return; } if (e.target.closest('[data-saved]')) { close(); S.__afterId = m.section; S.ltab = 'sections'; setLeftOpen(true); renderLeft(); } });
  }
  function refIndex(refId) { return (S.content.sections || []).findIndex((s) => (s.uid && s.uid === refId) || s.type === refId || ('cms-' + s.uid) === refId); }
  async function addSectionAt(refId, pos, type, picked, preset) {
    snapshotBefore();
    const sec = { uid: uid(), type, enabled: true, data: clone(BLOCK_DEFAULTS[type] || {}), style: {}, after: '' };
    if (preset) Object.assign(sec.data, preset);
    const secs = S.content.sections = S.content.sections || []; let idx = refIndex(refId); let at;
    if (idx >= 0) { at = pos === 'before' ? idx : idx + 1; if (C.pageType !== 'main') sec.after = secs[idx].after || ''; }
    else { at = pos === 'before' ? 0 : secs.length; if (C.pageType !== 'main') sec.after = pos === 'before' ? 'top' : ''; }   /* 서브페이지의 기본 레이아웃 위/아래 */
    secs.splice(at, 0, sec); syncAfter();
    commitNoHist(); selectSection(at); S.rtab = type === 'block:section' ? 'style' : 'content'; renderRight(); WB.toast(typeName(type) + (type === 'block:section' ? '을 추가했습니다. 왼쪽 [요소]에서 요소를 넣어 주세요.' : ' 섹션을 추가했습니다.'), 'success');
  }
  function onCanvasKey(key) {
    if (key === 'undo') return undo(); if (key === 'redo') return redo(); if (key === 'save') return saveDraft(true, '');
    const sel = S.sel; if (!sel) return; const inEl = sel.elIndex != null && sel.elIndex >= 0 && sel.kind !== 'section';
    if (key === 'delete') { if (inEl) elementAction('del', sel.secIndex, sel.elIndex); else if (sel.kind === 'section' && sel.secIndex != null) deleteSection(sel.secIndex); }
    else if (key === 'duplicate') { if (inEl) elementAction('dup', sel.secIndex, sel.elIndex); else if (sel.secIndex != null && sel.kind === 'section') duplicateSection(sel.secIndex); }
    else if (key === 'copy') { if (sel.kind === 'section' && sel.secIndex != null) copySection(sel.secIndex); }
    else if (key === 'paste') pasteSection(sel.secIndex != null ? sel.secIndex : -1);
  }

  /* ---------- 선택 ---------- */
  function onSelect(m) {
    /* 공통 영역(헤더 · 푸터 · 퀵메뉴)은 전용 편집 모드에서만 — 일반 페이지 편집에서는 안내만 (옛 홈페이지 파일에서도 같게 동작) */
    const cw = m.section === 'header' || /(^|[\s,>])#?header/i.test(m.selector || '') ? 'header'
      : (m.section === 'footer' || /(^|[\s,>])#?footer/i.test(m.selector || '') ? 'footer'
      : (/quickmenu|quick-menu|\.quick\b/i.test(m.selector || '') ? 'quick' : ''));
    if (cw && S.commonMode !== cw) { onCommonBlocked({ which: cw }); return; }
    if (m.menuRef && m.menuRef.group && selectMenu(m.menuRef)) return;   /* 헤더 메뉴 · 메가메뉴 소메뉴 : 페이지 이동이 아니라 메뉴 편집 */
    if (m.section === 'header' || m.section === 'footer') {
      const rr = (m.paths || []).map(mapCompiledPath).filter(Boolean);
      const editable = rr.some((p) => p.kind === 'content') || rr.some((p) => p.compiledPath && commonGroupOf(p.compiledPath));
      if (!editable) { selectCommon(m.section); return; }   /* 값이 없는 영역(헤더 · 푸터 틀 자체)만 공통 패널로 */
    }
    const resolved = (m.paths || []).map(mapCompiledPath).filter(Boolean);
    const hit = resolved.find((r) => r.kind === 'content') || resolved[0] || null;
    const blockIdx = m.blockUid ? (S.content.sections || []).findIndex((s) => s.uid === m.blockUid) : -1;
    const secIndex = blockIdx >= 0 ? blockIdx : (hit && hit.secIndex != null ? hit.secIndex : sectionIndexById(m.section));
    S.sel = { kind: 'element', selector: m.selector, tag: m.tag, elKind: m.kind, text: m.text, section: m.section, paths: resolved, hit, secIndex, contentPath: hit && hit.kind === 'content' ? hit.contentPath : (blockIdx >= 0 ? 'sections.' + blockIdx + '.data' : null), label: labelFor(m, hit), src: m.src || '', href: m.href || '' };
    S.selPath = m.paths && m.paths[0] || null; S.subPath = [];
    if (S.sel.contentPath && hit && hit.kind === 'content') { const parts = hit.contentPath.split('.'); S.sel.leafKey = parts.pop(); S.sel.objPath = parts.join('.'); }
    else if (blockIdx >= 0) { S.sel.objPath = 'sections.' + blockIdx + '.data'; S.sel.leafKey = null; }
    if (m.kind === 'section') { S.sel.kind = 'section'; if (secIndex != null) { S.sel.contentPath = 'sections.' + secIndex + '.data'; S.sel.objPath = S.sel.contentPath; S.sel.type = S.content.sections[secIndex].type; S.sel.label = sectionLabel(S.content.sections[secIndex]); } }
    
    if (m.field) { S.sel.formField = m.field; S.sel.formKey = m.formKey || 'reserve'; S.rtab = 'content'; }
    if (m.elUid && blockIdx >= 0) { const items = ((S.content.sections[blockIdx].data || {}).items) || []; const j = items.findIndex((x) => x.uid === m.elUid); if (j >= 0) { S.sel.elIndex = j; S.sel.objPath = 'sections.' + blockIdx + '.data.items.' + j + '.data'; S.sel.contentPath = S.sel.objPath; S.sel.leafKey = null; S.sel.label = typeName('block:' + items[j].type) + ' 요소'; } }
    if (m.dataField && S.sel.objPath && S.sel.kind !== 'section') { const od = get(S.content, S.sel.objPath); if (od && typeof od[m.dataField] === 'string') { S.sel.leafKey = m.dataField; S.sel.contentPath = S.sel.objPath + '.' + m.dataField; S.sel.blockField = true; } }
    S.sel.locked = !!m.locked;
    renderRight(); renderLeft(); drawOverlay();
  }
  function sectionIndexById(id) { if (!id) return null; const i = (S.content.sections || []).findIndex((s) => s.type === id || (id.startsWith('cms-') && s.uid === id.slice(4))); return i >= 0 ? i : null; }
  function labelFor(m, hit) { const t = { text: '텍스트', image: '이미지', link: '버튼 · 링크', section: '섹션', element: (m.tag || '요소') }[m.kind] || '요소'; if (!(hit && hit.kind === 'content')) return t; const parts = hit.contentPath.split('.'); let k = parts.pop(); let lbl = label(k); while (/^d+$/.test(k) && parts.length) { k = parts.pop(); if (!/^d+$/.test(k)) { lbl = label(k) + ' ' + lbl; break; } } return t + ' · ' + lbl; }
  function mapCompiledPath(cp) {
    if (!cp) return null;
    if (C.pageType === 'main') { const secs = S.content.sections || []; for (let i = 0; i < secs.length; i++) { const s = secs[i]; if (s.type.startsWith('block:')) continue; for (const k of Object.keys(s.data || {})) { const f = fullKey(s.type, k); if (cp === f || cp.startsWith(f + '.')) return { kind: 'content', secIndex: i, contentPath: 'sections.' + i + '.data.' + k + cp.slice(f.length), compiledPath: cp }; } } }
    else { const pre = 'pages.' + C.pageKey; if (cp === pre || cp.startsWith(pre + '.')) return { kind: 'content', contentPath: 'page' + cp.slice(pre.length), compiledPath: cp }; if (cp.startsWith('content.')) { const k = cp.split('.')[1]; if (S.content.content && k in S.content.content) return { kind: 'content', contentPath: cp, compiledPath: cp }; return { kind: 'other', where: '메인 페이지', link: '#/editor?pageId=' + ((C.pages.find((p) => p.type === 'main') || {}).id || ''), compiledPath: cp }; } }
    if (cp.startsWith('blocks.')) return null;
    if (/^(site|footer|quickMenu|quickMenuTitle|subpage|theme)\b/.test(cp)) return { kind: 'other', where: '공통 요소', link: '#/siteinfo', compiledPath: cp, common: cp.startsWith('footer') ? 'footer' : (cp.startsWith('site') ? 'header' : null) };
    if (cp.startsWith('menu')) return { kind: 'other', where: '메뉴 관리', link: '#/menus', compiledPath: cp, common: 'header' };
    if (cp.startsWith('reserve.fields') || cp.startsWith('reserve.agreements') || cp.startsWith('forms.')) return { kind: 'form', compiledPath: cp };
    if (cp.startsWith('popupBanners')) return { kind: 'other', where: '팝업 관리', link: '#/popups', compiledPath: cp };
    if (cp.startsWith('pages.')) { const key = cp.split('.')[1]; const pg = C.pages.find((p) => p.key === key); return { kind: 'other', where: '다른 페이지(' + (pg ? pg.title : key) + ')', link: pg ? '#/editor?pageId=' + pg.id : '#/editor', compiledPath: cp }; }
    return { kind: 'unknown', compiledPath: cp };
  }
  function deselect(silent) { S.sel = { kind: 'page', label: '페이지 · ' + C.pageTitle }; S.selPath = null; S.subPath = []; if (!['content', 'style', 'advanced'].includes(S.rtab)) S.rtab = 'content'; renderRight(); renderLeft(); drawOverlay(); if (!silent) post({ type: 'cms:clearSelection' }); }
  $('#edDeselect').addEventListener('click', () => deselect());
  /* 인라인 편집 결과 */
  let inlineSnap = false;
  let inlineAttrSel = null, inlineAttrPrev;   /* 장식 텍스트 인라인 편집 : 취소했을 때 되돌릴 이전 값 */
  function onInline(m) {
    if (m.menuRef && m.menuRef.group) {   /* 메뉴 글자를 그 자리에서 고침 : 사이트 메뉴 데이터에 저장 → 전체 페이지에 반영 */
      if (m.cancel) { renderRight(); return; }
      if (menuLabelSet(m.menuRef, String(m.value == null ? '' : m.value).replace(/\s+/g, ' ').trim(), false)) {
        if (m.done) { saveMenuNow().then(() => rerender(150)); renderRight(); renderLeft(); }
      }
      return;
    }
    const resolvedAll = (m.paths || []).map(mapCompiledPath).filter(Boolean);
    const r = resolvedAll.find((x) => x && x.kind === 'content');
    if (!r) {
      const cHit = resolvedAll.find((x) => x.compiledPath && commonGroupOf(x.compiledPath));
      if (cHit) {   /* 헤더 대표번호 · 푸터 문구 같은 공통 요소 : 사이트 공통 데이터에 바로 저장 */
        if (m.cancel) { renderRight(); return; }
        commonSet(cHit.compiledPath, String(m.value == null ? '' : m.value).trim(), !!m.done);
        if (m.done) { renderRight(); renderLeft(); }
        return;
      }
      /* 데이터 항목에 연결되지 않은 텍스트(정적 · 장식 요소) : 요소 선택자 기준으로 저장해 임시저장 · 새로고침 · 게시까지 그대로 유지 */
      const selector = m.selector;
      if (!selector) { if (m.done) WB.toast('이 텍스트는 공통 요소(메뉴 · 푸터 등)라서 여기서는 수정할 수 없습니다. 왼쪽 [공통 요소]에서 편집하세요.', 'error'); return; }
      S.content.attrs = S.content.attrs || {};
      if (inlineAttrSel !== selector) { inlineAttrSel = selector; inlineAttrPrev = (S.content.attrs[selector] || {}).text; }
      if (!inlineSnap) { snapshotBefore(); inlineSnap = true; }
      const o = S.content.attrs[selector] = S.content.attrs[selector] || {};
      if (m.cancel) { if (inlineAttrPrev === undefined) { delete o.text; if (!Object.keys(o).length) delete S.content.attrs[selector]; } else o.text = inlineAttrPrev; }
      else o.text = m.value;
      markDirty();
      if (m.done) { inlineSnap = false; inlineAttrSel = null; renderRight(); renderLeft(); }
      return;
    }
    if (!inlineSnap) { snapshotBefore(); inlineSnap = true; }
    set(S.content, r.contentPath, m.value); markDirty();
    if (m.done) { inlineSnap = false; renderRight(); renderLeft(); }
  }

  /* ---------- 오른쪽 패널 ---------- */
  $$('[data-rtab]').forEach((b) => b.addEventListener('click', () => { S.rtab = b.dataset.rtab; renderRight(); }));
  function renderRight() {
    $$('[data-rtab]').forEach((x) => x.classList.toggle('is-on', x.dataset.rtab === S.rtab));
    if (!['content', 'style', 'advanced'].includes(S.rtab)) S.rtab = S.rtab === 'compose' || S.rtab === 'responsive' ? 'style' : (S.rtab === 'action' ? 'advanced' : 'content');
    $$('[data-rtab]').forEach((x) => x.classList.toggle('is-on', x.dataset.rtab === S.rtab));
    const old = $('#edRightBody'); const body = old.cloneNode(false); old.replaceWith(body); let sel = S.sel;
    if (!sel) { sel = S.sel = { kind: 'page', label: '페이지 · ' + C.pageTitle }; }   /* 아무것도 고르지 않았으면 페이지 자체가 편집 대상 */
    if (sel.kind !== 'page' && sel.secIndex != null) { const sec0 = (S.content.sections || [])[sel.secIndex]; const items0 = sec0 && sec0.data && Array.isArray(sec0.data.items) ? sec0.data.items : null; if (!sec0 || (sel.elIndex != null && sel.elIndex >= 0 && !(items0 && items0[sel.elIndex]))) { sel = S.sel = { kind: 'page', label: '페이지 · ' + C.pageTitle }; S.selPath = null; S.subPath = []; post({ type: 'cms:clearSelection' }); } }   /* 실행 취소 · 삭제로 사라진 섹션/요소를 가리키면 페이지 선택으로 */
    const first = $('[data-rtab="content"]'); if (first) first.textContent = sel.kind === 'page' ? '기본' : '내용';
    const selCommon = sel.kind === 'menu' || !!commonHitOf(sel);
    $('#edSelTitle').innerHTML = esc(sel.label || '선택') + (sel.tag ? '<span class="ed-chip">' + esc(sel.tag) + '</span>' : '') + (selCommon ? '<span class="ed-chip ed-chip--common">공통 요소</span>' : '');
    body.onclick = null; body.onchange = null; body.oninput = null;
    body.classList.toggle('is-simple', UI.mode !== 'advanced');
    if (sel.kind === 'menu') { renderMenuPanel(body, sel); return; }   /* 헤더 메뉴 편집 */
    if (sel.kind === 'page') { ({ content: renderPageBasic, style: renderPageDesign, advanced: renderPageAdvanced }[S.rtab] || renderPageBasic)(body, sel); return; }
    if (S.floatOn) renderFloatBody(sel);   /* 다른 요소를 고르면 플로팅 창도 그 요소로 바뀝니다 */
    const fn = { content: renderContent, style: renderStyle, advanced: renderAdvanced }[S.rtab] || renderContent;
    fn(body, sel);
  }
  /* ----- 페이지 : 기본 ----- */
  function renderPageBasic(body) {
    const pg = pageRow(); const isMain = pg.type === 'main'; const on = pg.status !== 'stopped'; const p = S.content.page || {};
    body.innerHTML = '<div class="ed-pagebox"><h4>페이지 관리</h4>' +
      '<div class="ed-switch' + (on ? ' is-on' : '') + '" role="switch" aria-checked="' + on + '" tabindex="0" data-vis' + (isMain ? ' data-disabled="1" title="메인 페이지는 항상 공개됩니다"' : '') + '><span class="ed-switch__icon">' + (on ? EYE : EYE_OFF) + '</span><span class="ed-switch__text"><b>' + (on ? '페이지 공개' : '페이지 숨김') + '</b><small>' + (isMain ? '메인 페이지는 항상 공개됩니다' : on ? '공개 중 · 게시하면 홈페이지에 표시' : '숨김 상태 · 홈페이지에서 숨겨짐') + '</small></span><span class="ed-switch__knob" aria-hidden="true"><i></i><em>' + (on ? '켜짐' : '꺼짐') + '</em></span></div>' +
      (!on ? '<div class="ed-note" style="margin-top:8px">이 페이지는 공개 홈페이지에서 숨겨집니다. 에디터에서는 계속 수정할 수 있습니다.</div>' : '') +
      '<div class="ef__btns" style="margin:12px 0 4px"><button class="btn btn--sm btn--line" type="button" data-dup' + (isMain ? ' disabled title="메인 페이지는 복제할 수 없습니다"' : '') + '>⧉ 이 페이지 복제</button></div><div class="ef__hint">복제하면 내용 전체를 복사한 새 페이지(예 "' + esc(pg.title) + ' 복사본")가 만들어지고 바로 이동합니다.</div></div>' +
      '<details class="ef__group" open><summary>이름과 주소</summary><div><div class="ef"><label class="ef__l">페이지명</label><input data-pgname value="' + esc(pg.title) + '"' + (isMain ? '' : '') + '></div><div class="ef"><label class="ef__l">주소 ' + helpIcon('페이지 주소(키)는 링크가 깨지지 않도록 바꾸지 않습니다') + '</label><input value="' + esc(isMain ? 'index.html' : (C.single ? 'index.html#page=' : 'subpage.html?page=') + pg.key) + '" readonly></div>' + (isMain ? '' : '<div class="ef"><label class="ef__l">분류(대메뉴명)</label><input data-page="category" value="' + esc(p.category || '') + '"></div><div class="ef"><label class="ef__l">레이아웃</label><select data-page="layoutType">' + Object.keys(C.layouts).map((k) => '<option value="' + k + '"' + (p.layoutType === k ? ' selected' : '') + '>' + esc(C.layouts[k]) + '</option>').join('') + '</select></div><div class="ef"><label class="ef__l">설명</label><textarea data-page="description" rows="2">' + esc(p.description || '') + '</textarea></div>') + '<div class="ef__hint">상단 메뉴 표시는 <a href="#/menus" data-go-menus>메뉴 · 헤더</a>에서 관리합니다.</div></div></details>' +
      (!isMain && p.media ? '<details class="ef__group"><summary>대표 이미지</summary><div>' + renderField('page.media', 'media', p.media, true) + '</div></details>' : '');
    bindForm(body); body.addEventListener('change', onPageField); body.addEventListener('input', onPageField);
    const sw = $('[data-vis]', body); const toggle = () => { if (sw.dataset.disabled) return; setPageVisible(!(pageRow().status !== 'stopped')); };
    sw.addEventListener('click', toggle); sw.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
    body.addEventListener('click', async (e) => { if (e.target.closest('[data-dup]')) { duplicatePage(); return; } const gm = e.target.closest('[data-go-menus]'); if (gm) { e.preventDefault(); await flush(); WBEditor.close(true); App.go('menus'); } });
    body.addEventListener('input', (e) => { if (e.target.hasAttribute('data-pgname')) renamePage(e.target.value); });
  }
  /* ----- 페이지 : 디자인 (배경 · 콘텐츠 너비 · 기본 여백 · 투명 헤더 · 헤더/푸터/퀵메뉴 표시) ----- */
  function renderPageDesign(body) {
    const selector = C.pageType === 'main' ? 'main#sections' : '#subpage'; const mode = styleMode(); const kit = fieldKit(selector, mode); const cm = S.content.common || {};
    body.innerHTML = deviceBar(mode) + '<details class="ef__group" open><summary>페이지 배경 · 폭 · 여백</summary><div>' + kit.color('backgroundColor', '페이지 배경색') + kit.size('--page-maxw', '콘텐츠 최대 너비', { units: ['px', '%'], presets: [['', '기본'], ['1200px', '1200'], ['1400px', '1400'], ['100%', '전체']] }) + kit.px('--page-pad', '기본 좌우 여백', [0, 16, 24, 40]) + '</div></details>' +
      '<details class="ef__group" open><summary>헤더 · 푸터 · 퀵메뉴</summary><div><label class="check" style="display:flex;margin-bottom:8px"><input type="checkbox" data-common-page="header.transparent"' + (get(S.content, 'common.header.transparent') === false ? '' : ' checked') + '> 이 페이지에서 투명 헤더 사용</label><label class="check" style="display:flex;margin-bottom:8px"><input type="checkbox" data-common-page="header.hidden"' + (cm.header && cm.header.hidden ? ' checked' : '') + '> 헤더 숨김</label><label class="check" style="display:flex;margin-bottom:8px"><input type="checkbox" data-common-page="footer.hidden"' + (cm.footer && cm.footer.hidden ? ' checked' : '') + '> 푸터 숨김</label><label class="check" style="display:flex"><input type="checkbox" data-common-page="quick.hidden"' + (cm.quick && cm.quick.hidden ? ' checked' : '') + '> 퀵메뉴 숨김</label><div class="ef__hint" style="margin-top:8px">공통 헤더 · 푸터의 내용은 왼쪽 [공통 요소]에서 편집합니다.</div></div></details>';
    kit.bind(body);
    body.addEventListener('change', (e) => { const el = e.target; if (!el.dataset.commonPage) return; snapshotBefore(); S.content.common = S.content.common || {}; const [a, b] = el.dataset.commonPage.split('.'); S.content.common[a] = S.content.common[a] || {}; S.content.common[a][b] = el.checked; if (b === 'transparent' && el.checked) delete S.content.common[a][b]; markDirty(); post({ type: 'cms:pageCommon', common: S.content.common }); });
  }
  /* ----- 페이지 : 고급 (SEO 덮어쓰기 · 사용자 클래스 · 사용자 코드 · 삭제) ----- */
  function renderPageAdvanced(body) {
    const pg = pageRow(); const isMain = pg.type === 'main'; const cm = S.content.common || {};
    body.innerHTML = '<details class="ef__group" open><summary>SEO 덮어쓰기</summary><div id="edPageSeo"><div class="muted" style="font-size:12px">불러오는 중…</div></div></details>' +
      '<details class="ef__group"><summary>사용자 클래스 · 코드</summary><div><div class="ef"><label class="ef__l">body 클래스 ' + helpIcon('이 페이지의 body 에 추가할 CSS 클래스 (개발자용)') + '</label><input data-common-str="bodyClass" value="' + esc(cm.bodyClass || '') + '" placeholder="예 page-event"></div><div class="ef"><label class="ef__l">페이지 사용자 CSS</label><textarea data-custom-css class="mono" rows="5">' + esc((S.content.styles || {}).custom || '') + '</textarea></div></div></details>' +
      '<div class="ed-danger"><h4>위험 작업</h4><p>페이지를 삭제하면 공개 홈페이지와 메뉴에서 사라집니다. 삭제 직후 [실행 취소]할 수 있습니다.</p><button class="btn btn--sm btn--danger" type="button" data-del' + (isMain ? ' disabled' : '') + '>페이지 삭제</button>' + (isMain ? '<div class="ef__hint" style="margin-top:6px">메인 페이지는 홈페이지의 첫 화면이라 삭제할 수 없습니다.</div>' : '') + '</div>';
    WB.api('GET', 'api/pages/' + C.pageId + '/seo', undefined, { silent: true }).then((r) => { const box = $('#edPageSeo', body); if (!box) return; const s = r.seo || {}; box.innerHTML = '<div class="ef__hint" style="margin:0 0 10px">비우면 사이트 기본 SEO 를 따릅니다. 자세한 설정은 <a data-go-seo>SEO 관리</a>에서.</div><div class="ef"><label class="ef__l">검색 제목</label><input data-seo="title" value="' + esc(s.title || '') + '" placeholder="비우면 사이트 기본값"></div><div class="ef"><label class="ef__l">검색 설명</label><textarea data-seo="description" rows="3" placeholder="비우면 사이트 기본값">' + esc(s.description || '') + '</textarea></div><div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-seo-save>SEO 저장</button></div>'; }).catch(() => { const box = $('#edPageSeo', body); if (box) box.innerHTML = '<div class="muted" style="font-size:12px">SEO 정보를 불러오지 못했습니다.</div>'; });
    body.addEventListener('change', (e) => { const el = e.target; if (el.hasAttribute('data-custom-css')) { snapshotBefore(); S.content.styles = S.content.styles || {}; S.content.styles.custom = el.value; commitNoHist(); } if (el.dataset.commonStr) { snapshotBefore(); S.content.common = S.content.common || {}; const v = el.value.trim().replace(/[^a-zA-Z0-9_\- ]/g, ''); if (v) S.content.common[el.dataset.commonStr] = v; else delete S.content.common[el.dataset.commonStr]; markDirty(); post({ type: 'cms:pageCommon', common: S.content.common }); } });
    body.addEventListener('click', async (e) => { if (e.target.closest('[data-del]')) { deletePage(); return; } if (e.target.closest('[data-seo-save]')) { const b = e.target.closest('[data-seo-save]'); b.disabled = true; try { await WB.api('PUT', 'api/pages/' + C.pageId + '/seo', { title: $('[data-seo="title"]', body).value, description: $('[data-seo="description"]', body).value, mode: 'custom' }); WB.toast('SEO 를 저장했습니다. 게시 후 반영됩니다.', 'success'); } catch (x) {} b.disabled = false; return; } const gs = e.target.closest('[data-go-seo]'); if (gs) { e.preventDefault(); await flush(); WBEditor.close(true); App.go('seo', { page: C.pageId }); } });
  }
  /* ----- 내용 탭 ----- */
  function renderContent(body, sel) {
    if (sel.kind === 'commonHint') {   /* 일반 페이지 편집에서 헤더 · 푸터 · 퀵메뉴를 클릭한 경우 */
      const nm = COMMON_NAME[sel.which] || '공통 요소';
      body.innerHTML = '<div class="ed-note"><b>' + esc(nm) + '는 모든 페이지에 함께 쓰이는 공통 영역</b>입니다. 페이지 편집 중에는 실수로 바뀌지 않도록 잠겨 있습니다.<br>' + esc(nm) + ' 편집 모드에서 한 번만 고치면 <b>' + C.pageCount + '개 페이지 전체</b>에 반영됩니다.</div>' +
        '<div class="ef__btns"><button class="btn btn--sm" type="button" data-open-common="' + esc(sel.which) + '" style="width:100%">' + esc(nm) + ' 편집 열기</button></div>' +
        '<p class="ef__hint" style="margin:8px 0 0">왼쪽 도구모음의 <b>' + esc(nm) + '</b> 아이콘으로도 들어갈 수 있습니다.</p>';
      body.onclick = (e) => { const b = e.target.closest('[data-open-common]'); if (b) { S.ltab = b.dataset.openCommon === 'quick' ? 'common' : b.dataset.openCommon; setLeftOpen(true); renderLeft(); selectCommon(b.dataset.openCommon); } };
      return;
    }
    if (sel.kind === 'common') return renderCommonForm(body, sel.which);

    const bsec = sel.secIndex != null ? S.content.sections[sel.secIndex] : null;
    if (bsec && bsec.locked) { body.innerHTML = '<div class="ed-note">🔒 잠긴 섹션입니다. 실수로 바뀌지 않도록 편집 · 이동 · 삭제가 막혀 있습니다.</div><div class="ef__btns"><button class="btn btn--sm btn--line" type="button" data-unlock>잠금 해제</button></div>'; body.onclick = (e) => { if (e.target.closest('[data-unlock]')) toggleLock(sel.secIndex); }; return; }
    const item = bsec && sel.elIndex != null && sel.elIndex >= 0 ? ((bsec.data || {}).items || [])[sel.elIndex] : null;
    if (item && item.type === 'form') return renderFormPanel(body, { type: 'block:form', data: item.data || {} });
    if (bsec && bsec.type === 'block:section' && sel.kind === 'section') return renderContainerItems(body, bsec, sel.secIndex);
    if (sel.formField) { const fs0 = (S.content.sections || []).find((x) => (x.type === 'reserve' && sel.formKey === 'reserve') || (x.type === 'block:form' && ((x.data || {}).formKey || 'reserve') === sel.formKey)) || (S.content.sections || []).find((x) => x.type === 'reserve' || x.type === 'block:form'); if (fs0) return renderFormPanel(body, fs0, sel.formField); }
    if (sel.kind === 'section') { const s = S.content.sections[sel.secIndex]; if (s && (s.type === 'reserve' || s.type === 'block:form')) return renderFormPanel(body, s); return renderObjectForm(body, sel.contentPath, '섹션 내용', null); }
    if (sel.elKind === 'image') return renderImageContent(body, sel);
    if (!sel.contentPath) { const ch0 = commonHitOf(sel); if (ch0) return renderCommonEdit(body, sel, ch0); }   /* 헤더 대표번호처럼 링크로 된 공통 요소도 여기서 바로 편집 */
    if (sel.elKind === 'link') return renderButtonContent(body, sel);
    if (sel.paths && sel.paths.some((p) => p.kind === 'form')) { const s = (S.content.sections || []).find((x) => x.type === 'reserve' || x.type === 'block:form'); if (s) return renderFormPanel(body, s); }
    if (!sel.contentPath) {
      const ch = commonHitOf(sel);
      if (ch) return renderCommonEdit(body, sel, ch);   /* 공통 요소 : 여기서 바로 수정 */
      const o = (sel.paths || []).find((p) => p.kind === 'other'); body.innerHTML = '<div class="ed-note">' + (o ? '이 요소는 <b>' + esc(o.where) + '</b>에서 편집합니다. ' + (o.common ? '<a data-common-open="' + o.common + '">여기서 열기</a>' : '<a href="' + esc(o.link) + '" >열기 ↗</a>') : '이 요소는 데이터와 직접 연결되지 않은 장식 요소입니다. [디자인] 탭에서 모양은 바꿀 수 있습니다.') + '</div>' + (sel.text ? '<div class="ef__hint">선택한 텍스트 : ' + esc(String(sel.text).slice(0, 80)) + '</div>' : ''); body.onclick = (e) => { const a = e.target.closest('[data-common-open]'); if (a) selectCommon(a.dataset.commonOpen); }; return; }
    /* 텍스트 : 값 + 종류 + 줄바꿈 */
    const objPath = S.subPath.length ? S.subPath[S.subPath.length - 1] : sel.objPath;
    if (sel.blockField && sel.leafKey === 'html' && !S.subPath.length) {
      body.innerHTML = '<div class="ef__hint" style="margin:0 0 10px">본문은 가운데 화면에서 <b>더블클릭</b>해 바로 고칩니다. 글을 고르면 굵게 · 기울임 · 밑줄 · 색 · 정렬 · 목록 · 링크 도구가 나타납니다. 사이트 공통값은 <code>{대표번호}</code> <code>{사이트명}</code> <code>{현장명}</code> <code>{주소}</code> <code>{상담시간}</code> <code>{이메일}</code> 처럼 적으면 사이트 설정 값으로 바뀌어 표시됩니다.</div><div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-inline-go>화면에서 편집하기</button></div><details class="ef__group"><summary>HTML 직접 편집 (고급)</summary><div><div class="ef"><textarea data-path="' + esc(sel.contentPath) + '" rows="8" class="mono">' + esc(get(S.content, sel.contentPath) || '') + '</textarea></div></div></details><details class="ef__group"><summary>같은 요소의 다른 항목</summary><div>' + renderObjectFields(sel.objPath, null) + '</div></details>';
      bindForm(body); body.addEventListener('click', (e) => { if (e.target.closest('[data-inline-go]')) post({ type: 'cms:inlineStart' }); }); return;
    }
    if (sel.elKind === 'text' && sel.leafKey && !S.subPath.length) {
      const path = sel.contentPath; const v = get(S.content, path);
      if (typeof v === 'string') {
        body.innerHTML = '<div class="ef__hint" style="margin:0 0 10px">내용은 가운데 화면에서 <b>더블클릭</b>해 그 자리에서 고칩니다. <a data-inline-go>이 자리에서 편집</a></div>' +
          '<details class="ef__group"><summary>고급 · 직접 입력 · 줄바꿈</summary>' +
          '<div class="ef"><label class="ef__l">내용 ' + helpIcon('중앙 화면에서 더블클릭해도 바로 수정됩니다') + '</label><textarea data-path="' + esc(path) + '" rows="' + (v.length > 60 ? 4 : 2) + '">' + esc(v) + '</textarea></div>' +
          '<div class="ef__btns"><button class="btn btn--xs btn--ghost" type="button" data-br="\n" title="모든 화면에서 줄바꿈">↵ 줄바꿈</button><button class="btn btn--xs btn--ghost" type="button" data-br="[PC줄바꿈]" title="PC(768px 이상)에서만 줄바꿈">PC에서만 줄바꿈</button><button class="btn btn--xs btn--ghost" type="button" data-br="[모바일줄바꿈]" title="모바일(767px 이하)에서만 줄바꿈">모바일에서만 줄바꿈</button></div></details>' +
          '<div class="ef"><label class="ef__l">텍스트 종류 ' + helpIcon('크기 · 굵기 프리셋을 적용합니다 (디자인 탭에서 세부 조정)') + '</label><div class="ef__seg"><button type="button" data-preset="heading">제목</button><button type="button" data-preset="body">본문</button><button type="button" data-preset="caption">캡션</button><button type="button" data-preset="reset" title="사이트 기본 스타일로 초기화">기본으로</button></div></div>' +
          '<details class="ef__group"><summary>같은 그룹의 다른 항목</summary><div>' + renderObjectFields(objPath, sel.leafKey) + '</div></details>';
        bindForm(body);
        body.addEventListener('click', (e) => { if (e.target.closest('[data-inline-go]')) { post({ type: 'cms:inlineStart' }); return; } const br = e.target.closest('[data-br]'); if (br) { const ta = $('textarea[data-path]', body); const s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + br.dataset.br + ta.value.slice(en); ta.focus(); ta.selectionStart = ta.selectionEnd = s + br.dataset.br.length; applyField(ta, false); return; } const pr = e.target.closest('[data-preset]'); if (pr) applyPreset(sel, pr.dataset.preset); });
        return;
      }
    }
    renderObjectForm(body, objPath, null, sel.leafKey);
  }
  function applyPreset(sel, preset) {
    const selector = sel.selector; if (!selector) return; snapshotBefore(); S.content.styles = S.content.styles || {}; S.content.styles.pc = S.content.styles.pc || {};
    const presets = { heading: { fontSize: 'clamp(26px,3.2vw,44px)', fontWeight: '600', lineHeight: '1.3' }, body: { fontSize: '16px', fontWeight: '400', lineHeight: '1.75' }, caption: { fontSize: '13px', fontWeight: '400', lineHeight: '1.6', color: 'var(--muted-color)' } };
    if (preset === 'reset') { delete S.content.styles.pc[selector]; if (S.content.styles.mobile) delete S.content.styles.mobile[selector]; } else S.content.styles.pc[selector] = Object.assign({}, S.content.styles.pc[selector] || {}, presets[preset]);
    markDirty(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); WB.toast(preset === 'reset' ? '기본 스타일로 되돌렸습니다.' : '적용했습니다.', 'success');
  }
  function renderObjectFields(objPath, focusKey) { const obj = get(S.content, objPath); if (obj == null || typeof obj !== 'object') return ''; if (Array.isArray(obj)) return renderArrayField(objPath, obj, label(objPath.split('.').pop())); return Object.keys(obj).map((k) => renderField(objPath ? objPath + '.' + k : k, k, obj[k], focusKey === k)).join(''); }
  function renderObjectForm(body, objPath, title, focusKey) {
    const obj = get(S.content, objPath);
    if (obj == null || typeof obj !== 'object') { body.innerHTML = '<div class="ed-empty">편집할 데이터가 없습니다.</div>'; return; }
    let html = '';
    const crumbs = [S.sel && S.sel.objPath != null ? S.sel.objPath : objPath].concat(S.subPath);
    if (S.subPath.length) html += '<div class="ef__crumb">' + crumbs.map((p, i) => '<a data-crumb="' + i + '">' + esc(i === 0 ? (title || '상위') : label(p.split('.').pop())) + '</a>').join(' › ') + '</div>';
    else if (title) html += '<div class="ef__crumb">' + esc(title) + '</div>';
    html += renderObjectFields(objPath, focusKey);
    body.innerHTML = html; bindForm(body);
    if (focusKey) { const f = $('[data-path="' + CSS.escape(objPath + '.' + focusKey) + '"]', body); if (f) { f.focus(); if (f.select) f.select(); } }
  }
  function renderField(path, k, v, focus) {
    const l = label(k); const dp = ' data-path="' + esc(path) + '"';
    if (v === null || v === undefined) v = '';
    if (typeof v === 'boolean') return '<div class="ef"><label class="check"><input type="checkbox"' + dp + (v ? ' checked' : '') + '> ' + esc(l) + '</label></div>';
    if (typeof v === 'number') return '<div class="ef"><label class="ef__l">' + esc(l) + '</label><input type="number" step="any"' + dp + ' value="' + v + '"></div>';
    if (typeof v === 'string') {
      if (k === 'target') return '<div class="ef"><label class="ef__l">' + esc(l) + '</label><select' + dp + '><option value="_self"' + (v !== '_blank' ? ' selected' : '') + '>현재 창</option><option value="_blank"' + (v === '_blank' ? ' selected' : '') + '>새 창</option></select></div>';
      if (k === 'objectFit' || k === 'imageFit') return '<div class="ef"><label class="ef__l">' + esc(l) + '</label><select' + dp + '>' + [['cover', '영역 채우기'], ['contain', '전체 이미지 보기'], ['fill', '늘려서 채우기']].map(([o, t]) => '<option value="' + o + '"' + (v === o ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
      if (k === 'layoutType') return '<div class="ef"><label class="ef__l">' + esc(l) + '</label><select' + dp + '>' + Object.keys(C.layouts).map((o) => '<option value="' + o + '"' + (v === o ? ' selected' : '') + '>' + esc(C.layouts[o]) + '</option>').join('') + (C.layouts[v] ? '' : '<option selected>' + esc(v) + '</option>') + '</select></div>';
      if (k === 'formKey') return '<div class="ef"><label class="ef__l">' + esc(l) + '</label><select' + dp + '>' + C.forms.map((f) => '<option value="' + esc(f.key) + '"' + (v === f.key ? ' selected' : '') + '>' + esc(f.name) + '</option>').join('') + '</select></div>';
      if (k === 'page') return '<div class="ef"><label class="ef__l">' + esc(l) + '</label><select' + dp + '><option value="">없음</option>' + C.pages.filter((p) => p.type !== 'main').map((p) => '<option value="' + esc(p.key) + '"' + (v === p.key ? ' selected' : '') + '>' + esc(p.title) + '</option>').join('') + '</select></div>';
      if (k === 'style' && /^(primary|line|ghost|)$/.test(v)) return '<div class="ef"><label class="ef__l">버튼 스타일</label><select' + dp + '>' + [['primary', '기본(채움 · 각진)'], ['line', '테두리'], ['ghost', '텍스트']].map(([o, t]) => '<option value="' + o + '"' + (v === o ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
      if (k === 'align' && /^(left|right|top)$/.test(v)) return '<div class="ef"><label class="ef__l">이미지 위치</label><select' + dp + '>' + [['left', '왼쪽'], ['right', '오른쪽'], ['top', '위']].map(([o, t]) => '<option value="' + o + '"' + (v === o ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
      if (isImgKey(k, v)) return '<div class="ef"><label class="ef__l">' + esc(l) + '</label><div class="ef__img"><img src="' + esc(resolveUrl(v)) + '" alt="" onerror="this.style.visibility=\'hidden\'"><input' + dp + ' value="' + esc(v) + '" placeholder="이미지 주소"><button class="btn btn--xs btn--line" type="button" data-pick="' + esc(path) + '" title="미디어에서 선택">선택</button></div></div>';
      if (isLong(k, v)) return '<div class="ef"><label class="ef__l">' + esc(l) + (k === 'html' ? ' <span class="muted">HTML 허용</span>' : '') + '</label><textarea' + dp + ' rows="' + (v.length > 300 ? 8 : 4) + '">' + esc(v) + '</textarea></div>';
      return '<div class="ef"><label class="ef__l">' + esc(l) + '</label><input' + dp + ' value="' + esc(v) + '"></div>';
    }
    if (Array.isArray(v)) return renderArrayField(path, v, l);
    if (typeof v === 'object') return '<details class="ef__group"' + (focus ? ' open' : '') + '><summary>' + esc(l) + '</summary><div>' + Object.keys(v).map((kk) => renderField(path + '.' + kk, kk, v[kk], false)).join('') + '</div></details>';
    return '';
  }
  function renderArrayField(path, arr, l) {
    const simple = arr.every((x) => typeof x === 'string' || typeof x === 'number');
    if (simple) return '<div class="ef"><label class="ef__l">' + esc(l) + ' <span class="muted">(한 줄에 하나)</span></label><textarea data-path="' + esc(path) + '" data-lines="1" rows="' + Math.min(10, Math.max(3, arr.length + 1)) + '">' + esc(arr.join('\n')) + '</textarea></div>';
    return '<div class="ef"><label class="ef__l">' + esc(l) + ' <span class="muted">' + arr.length + '개 · 드래그로 정렬</span></label><ul class="ef__list" data-list="' + esc(path) + '">' + arr.map((it, i) => '<li class="sort-item" draggable="true" data-i="' + i + '"><span class="handle">⋮⋮</span><span data-open="' + i + '" style="cursor:pointer">' + esc(itemLabel(it, i)) + '</span>' + (it && typeof it === 'object' && 'enabled' in it ? '<input type="checkbox" data-en="' + i + '"' + (it.enabled !== false ? ' checked' : '') + ' title="사용">' : '') + '<button type="button" data-dup="' + i + '" title="복제">⧉</button><button type="button" data-del="' + i + '" title="삭제">✕</button></li>').join('') + '</ul><button class="btn btn--xs btn--line" type="button" data-addto="' + esc(path) + '">+ 항목 추가</button></div>';
  }
  function itemLabel(it, i) { if (it == null || typeof it !== 'object') return String(it); const t = it.title || it.label || it.name || it.tab || it.alt || it.text || it.id || (it.media && it.media.alt) || ''; return '#' + (i + 1) + (t ? ' ' + String(t).replace(/\n/g, ' ').slice(0, 24) : ''); }
  function bindForm(body) {
    body.addEventListener('input', (e) => { const el = e.target; if (!el.dataset.path || el.type === 'checkbox' || el.tagName === 'SELECT') return; applyField(el, true); });
    body.addEventListener('change', (e) => { const el = e.target; if (!el.dataset.path) return; applyField(el, false); });
    body.addEventListener('click', async (e) => {
      const pick = e.target.closest('[data-pick]'); if (pick) { const it = await WB.pickMedia(); if (!it) return; const inp = $('[data-path="' + CSS.escape(pick.dataset.pick) + '"]', body); inp.value = chooseVariant(it); const img = inp.parentElement.querySelector('img'); if (img) { img.src = it.thumb; img.style.visibility = ''; } applyField(inp, false); return; }
      const open = e.target.closest('[data-open]'); if (open && open.closest('[data-list]')) { S.subPath.push(open.closest('[data-list]').dataset.list + '.' + open.dataset.open); renderRight(); return; }
      const crumb = e.target.closest('[data-crumb]'); if (crumb) { S.subPath = S.subPath.slice(0, +crumb.dataset.crumb); renderRight(); return; }
      const add = e.target.closest('[data-addto]'); if (add) { snapshotBefore(); const arr = get(S.content, add.dataset.addto); const tpl = arr.length ? clone(arr[arr.length - 1]) : {}; if (tpl && typeof tpl === 'object') Object.keys(tpl).forEach((k) => { if (typeof tpl[k] === 'string' && !isImgKey(k, tpl[k])) tpl[k] = ''; if (k === 'enabled') tpl[k] = true; }); arr.push(tpl); commitNoHist(); return; }
      const dup = e.target.closest('[data-dup]'); if (dup && dup.closest('[data-list]')) { snapshotBefore(); const arr = get(S.content, dup.closest('[data-list]').dataset.list); arr.splice(+dup.dataset.dup + 1, 0, clone(arr[+dup.dataset.dup])); commitNoHist(); return; }
      const del = e.target.closest('[data-del]'); if (del && del.closest('[data-list]')) { if (!(await WB.confirm('이 항목을 삭제할까요? (실행 취소 가능)', { danger: true, ok: '삭제' }))) return; snapshotBefore(); const arr = get(S.content, del.closest('[data-list]').dataset.list); arr.splice(+del.dataset.del, 1); commitNoHist(); return; }
    });
    body.addEventListener('change', (e) => { const en = e.target.closest('[data-en]'); if (!en) return; snapshotBefore(); const arr = get(S.content, en.closest('[data-list]').dataset.list); arr[+en.dataset.en].enabled = en.checked; commitNoHist(); });
    $$('[data-list]', body).forEach((ul) => WB.sortable(ul, { handle: '.handle', onEnd: (els) => { snapshotBefore(); const arr = get(S.content, ul.dataset.list); const order = els.map((el) => +el.dataset.i); set(S.content, ul.dataset.list, order.map((i) => arr[i])); commitNoHist(); } }));
  }
  let typingSnap = null;
  function applyField(el, typing) {
    const path = el.dataset.path; const old = get(S.content, path);
    let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
    if (el.dataset.lines) v = el.value.split('\n').map((s) => s.trim()).filter((s) => s !== '').map((s) => (Array.isArray(old) && typeof old[0] === 'number' && !isNaN(+s) ? +s : s));
    if (JSON.stringify(v) === JSON.stringify(old)) return;
    if (typing) { if (typingSnap !== path) { snapshotBefore(); typingSnap = path; } set(S.content, path, v); markDirty(); if (typeof v === 'string') post({ type: 'cms:patch', path: compiledPathOf(path), value: v }); return; }
    if (typingSnap !== path) snapshotBefore(); typingSnap = null;
    set(S.content, path, v); markDirty(); rerender(100); renderLeft();
  }
  function compiledPathOf(contentPath) { if (C.pageType === 'main') { const m = contentPath.match(/^sections\.(\d+)\.data\.([^.]+)(.*)$/); if (!m) return null; const s = S.content.sections[+m[1]]; return fullKey(s.type, m[2]) + m[3]; } if (contentPath.startsWith('page')) return 'pages.' + C.pageKey + contentPath.slice(4); return contentPath; }
  function chooseVariant(it) { if (it.width && it.width > 2560 || it.size > 1572864) { WB.toast('용량이 큰 이미지입니다 (' + WB.fmtBytes(it.size) + (it.width ? ' · ' + it.width + 'px' : '') + '). 자동 생성된 WebP 최적화본(최대 1920px)을 사용합니다.', 'info'); return it.pc || it.url; } return it.url; }

  /* ----- 이미지 내용 ----- */
  /* ---------- 클릭 이벤트 (이미지 · 버튼) : 무엇을 할지 고르면 필요한 칸만 나옵니다 ---------- */
  const CLICK_KINDS = [['', '사용하지 않음'], ['page', '내부 페이지 연결'], ['section', '이 페이지 안 위치로 이동'], ['url', '사이트 링크 연결'], ['tel', '전화 걸기'], ['sms', '문자 보내기'], ['mail', '이메일 보내기']];
  function clickKindOf(href) {
    href = String(href || '').trim();
    if (!href) return { kind: '', value: '' };
    if (/^tel:/i.test(href)) return { kind: 'tel', value: href.slice(4) };
    if (/^sms:/i.test(href)) return { kind: 'sms', value: href.slice(4) };
    if (/^mailto:/i.test(href)) return { kind: 'mail', value: href.slice(7) };
    if (/^#page=/.test(href)) return { kind: 'page', value: href.slice(6) };
    if (/^#/.test(href)) return { kind: 'section', value: href.slice(1) };
    return { kind: 'url', value: href };
  }
  function clickEventUI(href, blank, selector) {
    const cur = clickKindOf(href);
    if (!cur.kind && selector && S.clickKind && S.clickKind[selector]) { cur.kind = S.clickKind[selector]; }   /* 종류만 고른 상태 유지 */
    const pages = (C.pages || []).filter((p) => p.type !== 'main');
    const secs = (S.content.sections || []).map((x, i) => ({ id: x.anchor || x.uid || x.type, name: sectionLabel(x) })).filter((x) => x.id);
    const opt = (list, val) => list.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
    let field = '';
    if (cur.kind === 'page') field = '<select data-clickval><option value="">페이지 선택…</option>' + pages.map((p) => '<option value="' + esc(p.key) + '"' + (cur.value === p.key ? ' selected' : '') + '>' + esc(p.title) + '</option>').join('') + '</select>';
    else if (cur.kind === 'section') field = '<select data-clickval><option value="">위치 선택…</option>' + secs.map((x) => '<option value="' + esc(x.id) + '"' + (cur.value === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>';
    else if (cur.kind === 'url') field = '<input data-clickval value="' + esc(cur.value) + '" placeholder="https://..."><label class="check" style="margin-top:6px"><input type="checkbox" data-clickblank' + (blank ? ' checked' : '') + '> 새 창으로 열기</label>';
    else if (cur.kind === 'tel' || cur.kind === 'sms') field = '<input data-clickval value="' + esc(cur.value) + '" placeholder="0212345678">';
    else if (cur.kind === 'mail') field = '<input data-clickval value="' + esc(cur.value) + '" placeholder="name@example.com">';
    return '<div class="ef"><label class="ef__l">클릭 이벤트 ' + helpIcon('이 이미지를 눌렀을 때 할 동작입니다. 편집 화면에서는 이동하지 않고, 공개 홈페이지에서만 동작합니다') + '</label>' +
      '<select data-click>' + opt(CLICK_KINDS, cur.kind) + '</select></div>' + (field ? '<div class="ef">' + field + '</div>' : '');
  }
  function applyClickEvent(body, sel) {
    const kind = ($('[data-click]', body) || {}).value || '';
    const valEl = $('[data-clickval]', body); const val = valEl ? String(valEl.value || '').trim() : '';
    const blankEl = $('[data-clickblank]', body);
    let href = '';
    if (kind === 'page') href = val ? '#page=' + val : '';
    else if (kind === 'section') href = val ? '#' + val : '';
    else if (kind === 'url') href = val;
    else if (kind === 'tel') href = val ? 'tel:' + val.replace(/[^0-9+]/g, '') : '';
    else if (kind === 'sms') href = val ? 'sms:' + val.replace(/[^0-9+]/g, '') : '';
    else if (kind === 'mail') href = val ? 'mailto:' + val : '';
    S.clickKind = S.clickKind || {}; S.clickKind[sel.selector] = kind;
    setAttr(sel.selector, 'href', href);
    setAttr(sel.selector, 'target', kind === 'url' && blankEl && blankEl.checked ? '_blank' : '');
    renderRight(); if (S.floatOn) renderFloatBody(sel);
  }
  function renderImageContent(body, sel) {
    const path = sel.contentPath && sel.leafKey && isImgKey(sel.leafKey, get(S.content, sel.contentPath)) ? sel.contentPath : (sel.contentPath ? findImagePath(sel) : null);
    const cur = path ? get(S.content, path) : sel.src; const obj = path ? get(S.content, path.split('.').slice(0, -1).join('.')) : null;
    const altPath = path ? path.replace(/\.[^.]+$/, '.alt') : null; const hasAlt = altPath && get(S.content, altPath) !== undefined;
    const mobilePath = path ? path.replace(/\.[^.]+$/, '.mobileSrc') : null; const hasMobileKey = mobilePath && obj && ('mobileSrc' in obj);
    const attrs = (S.content.attrs || {})[sel.selector] || {};
    body.innerHTML = '<div class="ef__img" style="margin-bottom:10px"><img src="' + esc(resolveUrl(cur || '')) + '" alt="" style="width:100%;height:120px;flex:none;object-fit:contain"></div>' +
      '<div class="ef__btns"><button class="btn btn--xs" type="button" data-img="replace">이미지 교체</button><button class="btn btn--xs btn--line" type="button" data-img="upload">새 이미지 업로드</button><button class="btn btn--xs btn--line" type="button" data-img="pick">미디어에서 선택</button></div>' +
      '<div class="ef__btns"><button class="btn btn--xs btn--ghost" type="button" data-img="crop">자르기</button><button class="btn btn--xs btn--ghost" type="button" data-img="rotate">회전 90°</button><button class="btn btn--xs btn--ghost" type="button" data-focal-open>초점 위치</button><a class="btn btn--xs btn--ghost" href="' + esc(resolveUrl(cur || '')) + '" target="_blank">원본 보기</a><button class="btn btn--xs btn--danger" type="button" data-img="remove" title="이 이미지를 화면에서 숨깁니다">삭제(숨김)</button></div>' +
      '<div class="ef"><label class="check"><input type="checkbox" id="edKeepRatio" checked> 교체 시 기존 영역 크기 · 비율 유지 ' + helpIcon('켜 두면 이미지 영역 크기는 그대로 두고 그림만 바뀝니다 (권장)') + '</label></div>' +
      (path ? '<div class="ef"><label class="ef__l">이미지 주소</label><input data-path="' + esc(path) + '" value="' + esc(cur || '') + '"></div>' : '<div class="ed-note">이 이미지는 사이트 데이터와 직접 연결되지 않아 주소는 [고급] 탭의 속성으로 바꿉니다.</div>') +
      (hasAlt ? '<div class="ef"><label class="ef__l">대체 텍스트(alt) ' + helpIcon('이미지를 설명하는 문장 · 검색엔진 · 스크린리더용') + '</label><input data-path="' + esc(altPath) + '" value="' + esc(get(S.content, altPath) || '') + '"></div>' : '') +
      '<div class="ef"><label class="ef__l">모바일 이미지 ' + helpIcon('모바일(767px 이하)에서만 다른 이미지를 보여줍니다') + (hasMobileKey && get(S.content, mobilePath) || attrs.mobileSrc ? '<span class="ef__m" title="모바일 전용 값 있음"></span>' : '') + '</label><div class="ef__img"><img src="' + esc(resolveUrl(hasMobileKey ? get(S.content, mobilePath) : (attrs.mobileSrc || ''))) + '" alt="" onerror="this.style.visibility=\'hidden\'"><input ' + (hasMobileKey ? 'data-path="' + esc(mobilePath) + '"' : 'data-attr-mobile="mobileSrc"') + ' value="' + esc(hasMobileKey ? get(S.content, mobilePath) || '' : (attrs.mobileSrc || '')) + '" placeholder="비우면 PC 이미지 사용"><button class="btn btn--xs btn--line" type="button" data-img="mobile">선택</button></div></div>' +
      clickEventUI(attrs.href || '', attrs.target === '_blank', sel.selector) +
      '<details class="ef__group"><summary>효과</summary><div>' +
      '<div class="ef"><label class="ef__l">불투명도</label><input type="range" min="10" max="100" step="5" data-imgstyle="opacity" value="' + Math.round((parseFloat(styleOf(sel.selector, styleMode()).opacity) || 1) * 100) + '"></div>' +
      '<div class="ef__row"><div class="ef"><label class="ef__l">모서리 둥글기(px)</label><input type="number" min="0" max="200" data-imgstyle="borderRadius" value="' + esc(String(styleOf(sel.selector, styleMode()).borderRadius || '').replace('px', '')) + '"></div>' +
      '<div class="ef"><label class="ef__l">그림자</label><select data-imgstyle="boxShadow"><option value="">없음</option><option value="0 6px 18px rgba(0,0,0,.18)"' + (styleOf(sel.selector, styleMode()).boxShadow ? ' selected' : '') + '>보통</option><option value="0 14px 36px rgba(0,0,0,.28)">진하게</option></select></div></div>' +
      '</div></details>';
    bindForm(body);
    body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-img]'); if (b) { const a = b.dataset.img; if (a === 'replace' || a === 'pick') return pickImageFor(sel); if (a === 'upload') return uploadImageFor(sel); if (a === 'crop') return cropImage(sel, false); if (a === 'rotate') return cropImage(sel, true); if (a === 'mobile') { const it = await WB.pickMedia(); if (!it) return; setMobileImage(sel, it.mobile || it.url); return; } if (a === 'remove') { hideSelector(sel.selector); return; } }
      if (e.target.closest('[data-focal-open]')) return focalPicker(sel);
    });
    body.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.attr) setAttr(sel.selector, el.dataset.attr, el.value);
      if (el.dataset.attrMobile) setAttr(sel.selector, 'mobileSrc', el.value);
      if (el.dataset.imgstyle) {
        const k = el.dataset.imgstyle; let v = el.value;
        if (k === 'opacity') v = (+v / 100).toFixed(2);
        if (k === 'borderRadius') v = v === '' ? '' : (+v) + 'px';
        snapshotBefore(); setStyle(sel.selector, styleMode(), k, v); commitNoHist();
      }
      if (el.dataset.click != null) { S.clickKind = S.clickKind || {}; S.clickKind[sel.selector] = el.value; if (!el.value) { setAttr(sel.selector, 'href', ''); setAttr(sel.selector, 'target', ''); } renderRight(); if (S.floatOn) renderFloatBody(sel); return; }
      if (el.dataset.clickval != null || el.dataset.clickblank != null) applyClickEvent(body, sel);
    });
    body.addEventListener('input', (e) => { if (e.target.dataset.imgstyle === 'opacity') { snapshotBefore(); setStyle(sel.selector, styleMode(), 'opacity', (+e.target.value / 100).toFixed(2)); commitNoHist(); } });
  }
  function findImagePath(sel) { const obj = get(S.content, sel.objPath); if (!obj || typeof obj !== 'object') return null; for (const k of ['src', 'image', 'cardImage', 'backgroundImage', 'webp']) if (typeof obj[k] === 'string') return sel.objPath + '.' + k; return null; }
  function setAttr(selector, k, v) { if (!selector) return; snapshotBefore(); S.content.attrs = S.content.attrs || {}; const o = S.content.attrs[selector] = S.content.attrs[selector] || {}; if (v === '' || v == null) delete o[k]; else o[k] = v; if (!Object.keys(o).length) delete S.content.attrs[selector]; commitNoHist(); }
  function setMobileImage(sel, url) { const path = sel.contentPath && sel.leafKey ? sel.contentPath.replace(/\.[^.]+$/, '.mobileSrc') : null; const obj = path ? get(S.content, path.split('.').slice(0, -1).join('.')) : null; if (obj && 'mobileSrc' in obj) { snapshotBefore(); set(S.content, path, url); const wp = path.replace('mobileSrc', 'mobileWebp'); if (get(S.content, wp) !== undefined) set(S.content, wp, ''); commitNoHist(); } else setAttr(sel.selector, 'mobileSrc', url); WB.toast('모바일 이미지를 설정했습니다.', 'success'); }
  function applyImage(sel, it) {
    const url = chooseVariant(it);
    const path = sel.contentPath && sel.leafKey && isImgKey(sel.leafKey, get(S.content, sel.contentPath)) ? sel.contentPath : findImagePath(sel);
    snapshotBefore();
    if (path) { set(S.content, path, url); const base = path.split('.').slice(0, -1).join('.'); const obj = get(S.content, base) || {}; ['webp', 'webp1280', 'mobileWebp'].forEach((k) => { if (k in obj) obj[k] = ''; }); if ('alt' in obj && !obj.alt) obj.alt = it.alt || ''; }
    else setAttr(sel.selector, 'src', url);
    const keep = $('#edKeepRatio'); if (!keep || keep.checked) { /* 영역 크기 유지 : object-fit cover 로 채움 */ S.content.styles = S.content.styles || {}; S.content.styles.pc = S.content.styles.pc || {}; const st = S.content.styles.pc[sel.selector] = S.content.styles.pc[sel.selector] || {}; if (!st.objectFit) st.objectFit = 'cover'; }
    commitNoHist(); WB.toast('이미지를 교체했습니다.', 'success');
  }
  async function pickImageFor(sel) { const it = await WB.pickMedia(); if (it) applyImage(sel, it); }
  function uploadImageFor(sel) { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { if (!inp.files[0]) return; const r = await WB.upload(inp.files, null); if (r[0]) applyImage(sel, r[0]); }; inp.click(); }
  async function ensureMedia(sel) {
    /* 자르기 · 회전은 관리자 서버(동일 origin)의 미디어만 가능 → 공개 사이트 이미지는 먼저 가져오기 */
    const path = sel.contentPath && sel.leafKey && isImgKey(sel.leafKey, get(S.content, sel.contentPath)) ? sel.contentPath : findImagePath(sel);
    const cur = path ? get(S.content, path) : sel.src; if (!cur) { WB.toast('이미지 주소를 찾을 수 없습니다.', 'error'); return null; }
    if (cur.indexOf(C.apiBase) === 0) return { url: cur, path };
    WB.toast('공개 사이트의 이미지를 미디어로 가져오는 중…', 'info');
    const r = await WB.api('POST', 'api/media/import', { url: cur });
    return { url: r.media.original || r.media.url, path, media: r.media };
  }
  async function cropImage(sel, rotateOnly) {
    const src = await ensureMedia(sel); if (!src) return;
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src.url + (src.url.includes('?') ? '&' : '?') + 't=' + Date.now();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('이미지를 불러오지 못했습니다.')); }).catch((e) => { WB.toast(e.message, 'error'); });
    if (!img.naturalWidth) return;
    let rot = rotateOnly ? 90 : 0;
    const m = WB.modal('<div class="row" style="margin-bottom:8px"><button class="btn btn--xs btn--line" type="button" id="crRot">회전 90°</button><select id="crRatio" style="width:auto;height:28px;font-size:12px"><option value="0">자유 비율</option><option value="1.7778">16 : 9</option><option value="1.3333">4 : 3</option><option value="1">1 : 1</option><option value="0.75">3 : 4</option><option value="1.4667">1100 : 750 (대표)</option></select><span class="muted" id="crInfo" style="font-size:12px"></span></div><div class="ed-crop" id="crWrap"><canvas id="crCanvas"></canvas><div class="ed-crop__box" id="crBox"></div></div>', { title: '이미지 자르기 · 회전', large: true, footer: '<button class="btn btn--ghost" data-close>취소</button><button class="btn" id="crOk">적용 (새 이미지로 저장)</button>' });
    const canvas = $('#crCanvas', m), ctx = canvas.getContext('2d'), box = $('#crBox', m), wrap = $('#crWrap', m);
    let scale = 1, crop = { x: 0, y: 0, w: 0, h: 0 };
    function draw() { const rw = rot % 180 ? img.naturalHeight : img.naturalWidth, rh = rot % 180 ? img.naturalWidth : img.naturalHeight; scale = Math.min(1, 900 / rw, 520 / rh); canvas.width = Math.round(rw * scale); canvas.height = Math.round(rh * scale); ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rot * Math.PI / 180); ctx.drawImage(img, -img.naturalWidth * scale / 2, -img.naturalHeight * scale / 2, img.naturalWidth * scale, img.naturalHeight * scale); ctx.restore(); crop = { x: 0, y: 0, w: canvas.width, h: canvas.height }; place(); }
    function place() { box.style.left = crop.x + 'px'; box.style.top = crop.y + 'px'; box.style.width = crop.w + 'px'; box.style.height = crop.h + 'px'; $('#crInfo', m).textContent = Math.round(crop.w / scale) + ' × ' + Math.round(crop.h / scale) + 'px'; }
    draw();
    let drag = null;
    box.addEventListener('mousedown', (e) => { const r = box.getBoundingClientRect(); const resize = e.clientX > r.right - 16 && e.clientY > r.bottom - 16; drag = { resize, sx: e.clientX, sy: e.clientY, c: Object.assign({}, crop) }; e.preventDefault(); });
    addL(window, 'mousemove', (e) => { if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; const ratio = +$('#crRatio', m).value; if (drag.resize) { crop.w = Math.max(30, Math.min(canvas.width - crop.x, drag.c.w + dx)); crop.h = ratio ? crop.w / ratio : Math.max(30, Math.min(canvas.height - crop.y, drag.c.h + dy)); if (crop.y + crop.h > canvas.height) { crop.h = canvas.height - crop.y; if (ratio) crop.w = crop.h * ratio; } } else { crop.x = Math.max(0, Math.min(canvas.width - crop.w, drag.c.x + dx)); crop.y = Math.max(0, Math.min(canvas.height - crop.h, drag.c.y + dy)); } place(); });
    addL(window, 'mouseup', () => { drag = null; });
    $('#crRot', m).addEventListener('click', () => { rot = (rot + 90) % 360; draw(); });
    $('#crRatio', m).addEventListener('change', (e) => { const ratio = +e.target.value; if (!ratio) return; crop.w = Math.min(canvas.width, crop.w); crop.h = crop.w / ratio; if (crop.h > canvas.height) { crop.h = canvas.height; crop.w = crop.h * ratio; } crop.x = Math.min(crop.x, canvas.width - crop.w); crop.y = Math.min(crop.y, canvas.height - crop.h); place(); });
    $('#crOk', m).addEventListener('click', () => {
      const out = document.createElement('canvas'); const rw = rot % 180 ? img.naturalHeight : img.naturalWidth, rh = rot % 180 ? img.naturalWidth : img.naturalHeight; const full = document.createElement('canvas'); full.width = rw; full.height = rh; const fc = full.getContext('2d'); fc.translate(rw / 2, rh / 2); fc.rotate(rot * Math.PI / 180); fc.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      out.width = Math.round(crop.w / scale); out.height = Math.round(crop.h / scale); out.getContext('2d').drawImage(full, Math.round(crop.x / scale), Math.round(crop.y / scale), out.width, out.height, 0, 0, out.width, out.height);
      out.toBlob(async (blob) => { const fd = new FormData(); fd.append('files[]', new File([blob], 'crop-' + Date.now() + '.jpg', { type: 'image/jpeg' })); fd.append('alt', ''); const r = await WB.api('POST', 'api/media', fd); if (r.media[0]) { applyImage(sel, r.media[0]); m.remove(); } }, 'image/jpeg', 0.9);
    });
  }
  function focalPicker(sel) {
    const path = sel.contentPath && sel.leafKey && isImgKey(sel.leafKey, get(S.content, sel.contentPath)) ? sel.contentPath : findImagePath(sel); const cur = path ? get(S.content, path) : sel.src;
    const base = path ? path.split('.').slice(0, -1).join('.') : null; const obj = base ? get(S.content, base) : null; const hasKey = obj && 'objectPosition' in obj;
    const curPos = hasKey ? obj.objectPosition : (((S.content.styles || {}).pc || {})[sel.selector] || {}).objectPosition || 'center center';
    const m = WB.modal('<p class="help" style="margin:0 0 8px">이미지에서 가장 중요한 부분을 클릭하세요. 영역에 맞춰 잘릴 때 그 부분이 항상 보이도록 합니다.</p><div class="ed-focal" id="fpWrap"><img src="' + esc(resolveUrl(cur || '')) + '" alt=""><i id="fpDot"></i></div><div class="muted" style="font-size:12px;margin-top:6px" id="fpInfo">' + esc(curPos) + '</div>', { title: '초점 위치', large: true, footer: '<button class="btn btn--ghost" data-close>취소</button><button class="btn" id="fpOk">적용</button>' });
    let pos = curPos; const dot = $('#fpDot', m); const wrap = $('#fpWrap', m);
    const toPct = (s) => { const map = { left: 0, center: 50, right: 100, top: 0, bottom: 100 }; const p = s.split(/\s+/); const x = p[0] in map ? map[p[0]] : parseFloat(p[0]); const y = p[1] ? (p[1] in map ? map[p[1]] : parseFloat(p[1])) : 50; return [isNaN(x) ? 50 : x, isNaN(y) ? 50 : y]; };
    const [px, py] = toPct(pos); dot.style.left = px + '%'; dot.style.top = py + '%';
    wrap.addEventListener('click', (e) => { const r = wrap.querySelector('img').getBoundingClientRect(); const x = Math.round((e.clientX - r.left) / r.width * 100), y = Math.round((e.clientY - r.top) / r.height * 100); pos = x + '% ' + y + '%'; dot.style.left = x + '%'; dot.style.top = y + '%'; $('#fpInfo', m).textContent = pos; });
    $('#fpOk', m).addEventListener('click', () => { snapshotBefore(); if (hasKey) obj.objectPosition = pos; else setStyle(sel.selector, 'pc', 'objectPosition', pos, true); commitNoHist(); m.remove(); WB.toast('초점 위치를 적용했습니다.', 'success'); });
  }
  /* ----- 버튼 내용 ----- */
  function renderButtonContent(body, sel) {
    const path = sel.contentPath; const obj = sel.objPath ? get(S.content, sel.objPath) : null;
    const labelPath = path && sel.leafKey && typeof get(S.content, path) === 'string' && !/^(href|url|link)$/.test(sel.leafKey) ? path : (obj && typeof obj.label === 'string' ? sel.objPath + '.label' : null);
    const hrefKey = obj ? ['href', 'url', 'link'].find((k) => k in obj) : null; const hrefPath = hrefKey ? sel.objPath + '.' + hrefKey : null;
    const attrs = (S.content.attrs || {})[sel.selector] || {}; const curHref = hrefPath ? get(S.content, hrefPath) : (attrs.href || sel.href || '');
    const lt = /^tel:/.test(curHref) ? 'tel' : /^sms:/.test(curHref) ? 'sms' : /^#kakao$/.test(curHref) ? 'kakao' : /^#visit-reservation/.test(curHref) ? 'form' : /^(index\.html)?#page=/.test(curHref) ? 'page' : /^#/.test(curHref) ? 'section' : /\.(pdf|zip|hwp|docx?|xlsx?|pptx?)(\?|$)/i.test(curHref) ? 'file' : /^https?:\/\//.test(curHref) ? 'url' : /^mailto:/.test(curHref) ? 'mail' : (!curHref || curHref === '#') ? 'none' : 'page';
    body.innerHTML = '<div class="ef"><label class="ef__l">버튼 문구</label>' + (labelPath ? '<input data-path="' + esc(labelPath) + '" value="' + esc(get(S.content, labelPath) || '') + '">' : '<input data-attr="text" value="' + esc(attrs.text || sel.text || '') + '" placeholder="' + esc(sel.text || '') + '">') + '</div>' +
      '<div class="ef"><label class="ef__l">링크 종류</label><select id="edLinkType">' + LINK_TYPES.map(([k, l]) => '<option value="' + k + '"' + (lt === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
      '<div class="ef" id="edLinkVal"></div>' +
      '<div class="ef"><label class="check"><input type="checkbox" id="edLinkBlank"' + ((obj && obj.target === '_blank') || attrs.target === '_blank' ? ' checked' : '') + '> 새 창에서 열기</label></div>' +
      '<div class="ef__hint">버튼 크기 · 색 · 테두리 · 마우스 오버는 [디자인] 탭에서, 기기별 표시는 [디자인 › 기기별 표시]에서 설정합니다.</div>';
    const renderVal = () => { const t = $('#edLinkType', body).value; const el = $('#edLinkVal', body); const v = curHref; el.innerHTML = t === 'page' ? '<label class="ef__l">이동할 페이지</label><select id="edLinkInp"><option value="">선택</option>' + C.pages.filter((p) => p.type !== 'main').map((p) => '<option value="' + (C.single ? '#page=' : 'subpage.html?page=') + esc(p.key) + '"' + (v.indexOf('page=' + p.key) >= 0 ? ' selected' : '') + '>' + esc(p.title) + '</option>').join('') + '<option value="index.html"' + (v === 'index.html' ? ' selected' : '') + '>메인</option></select>' : t === 'url' ? '<label class="ef__l">외부 주소</label><input id="edLinkInp" value="' + esc(/^https?/.test(v) ? v : '') + '" placeholder="https://"> ' : t === 'tel' ? '<label class="check" style="margin-bottom:6px"><input type="checkbox" id="edTelSite"' + (/^tel:(site)?$/.test(v) || !/^tel:/.test(v) ? ' checked' : '') + '> 사이트 대표번호 사용 ' + helpIcon('사이트 설정의 대표번호와 연결됩니다. 대표번호를 바꾸면 이 버튼도 함께 바뀝니다 (권장)') + '</label><input id="edLinkInp" value="' + esc(/^tel:(site)?$/.test(v) ? '' : v.replace(/^tel:/, '')) + '" placeholder="다른 번호를 쓸 때만 입력 (예 1600-0000)"' + (/^tel:(site)?$/.test(v) || !/^tel:/.test(v) ? ' disabled' : '') + '>' : t === 'sms' ? '<label class="ef__l">문자 받을 번호</label><input id="edLinkInp" value="sms:site" readonly><div class="ef__hint" style="margin-top:4px">사이트 설정 › 연락처의 문자 수신 번호로 연결됩니다.</div>' : t === 'kakao' ? '<label class="ef__l">카카오톡 상담</label><input id="edLinkInp" value="#kakao" readonly><div class="ef__hint" style="margin-top:4px">사이트 설정 › 연락처의 카카오톡 링크로 연결됩니다. 링크가 비어 있으면 버튼이 표시되지 않습니다.</div>' : t === 'file' ? '<label class="ef__l">파일 (미디어에서 선택 · PDF 등)</label><div class="ef__img"><input id="edLinkInp" value="' + esc(v) + '" placeholder="파일 주소"><button class="btn btn--xs btn--line" type="button" id="edLinkFile">선택</button></div>' : t === 'mail' ? '<label class="ef__l">받는 이메일 주소</label><input id="edLinkInp" type="email" value="' + esc(/^mailto:/.test(v) ? v.replace(/^mailto:/, '') : '') + '" placeholder="name@example.com">' : t === 'none' ? '<div class="ef__hint">링크 없이 문구만 표시합니다.</div>' : t === 'form' ? '<label class="ef__l">방문예약 폼</label><input id="edLinkInp" value="#visit-reservation" readonly>' : '<label class="ef__l">메인 섹션</label><select id="edLinkInp">' + [['#hero', '첫 화면'], ['#premium', '프리미엄'], ['#environment', '입지환경'], ['#type', '타입'], ['#visit-reservation', '방문예약']].map(([k, l]) => '<option value="' + k + '"' + (v === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>'; };
    renderVal(); bindForm(body);
    const apply = () => { const t = $('#edLinkType', body).value; const inp = $('#edLinkInp', body); let v = inp ? inp.value : ''; if (t === 'tel') { const site = $('#edTelSite', body); v = site && site.checked ? 'tel:site' : 'tel:' + (v.replace(/[^0-9+]/g, '') || 'site'); } if (t === 'url' && v && !/^https?:\/\//.test(v)) v = 'https://' + v; if (t === 'mail') v = v.trim() ? 'mailto:' + v.trim().replace(/^mailto:/, '') : ''; if (t === 'none') v = ''; const blank = $('#edLinkBlank', body).checked; if (hrefPath) { snapshotBefore(); set(S.content, hrefPath, v); if (obj && 'target' in obj) obj.target = blank ? '_blank' : '_self'; commitNoHist(); } else { setAttr(sel.selector, 'href', v); if (blank) setAttr(sel.selector, 'target', '_blank'); else setAttr(sel.selector, 'target', ''); } };
    body.addEventListener('change', (e) => { if (e.target.id === 'edLinkType') { renderVal(); if (/^(tel|sms|kakao|form)$/.test(e.target.value)) apply(); return; } if (e.target.id === 'edTelSite') { const inp = $('#edLinkInp', body); inp.disabled = e.target.checked; if (e.target.checked) inp.value = ''; apply(); return; } if (e.target.id === 'edLinkInp' || e.target.id === 'edLinkBlank') apply(); if (e.target.dataset.attr === 'text') setAttr(sel.selector, 'text', e.target.value); });
    body.addEventListener('click', async (e) => { if (e.target.id === 'edLinkFile') { const it = await WB.pickMedia({ accept: '*/*', title: '파일 선택' }); if (it) { $('#edLinkInp', body).value = it.original || it.url; apply(); } } });
  }
  /* ----- 폼 패널 ----- */
  function renderFormPanel(body, sec, openField) {
    const key = (sec.data && sec.data.formKey) || 'reserve'; const f = C.forms.find((x) => x.key === key);
    if (!f) { body.innerHTML = '<div class="ed-note">연결된 폼(' + esc(key) + ')이 없습니다. 관리자 › 방문예약 폼에서 만들어 주세요.</div>'; return; }
    body.innerHTML = '<div class="ef__hint">방문예약 폼 <b>' + esc(f.name) + '</b> · 필드를 추가 · 수정하면 <b>가운데 미리보기에 바로</b> 나타나고 자동으로 임시저장됩니다. 공개 홈페이지에는 <b>[게시]</b>한 뒤 반영됩니다. 접수된 예약 데이터는 폼을 바꿔도 유지됩니다.</div><div id="edFormPanel">불러오는 중…</div>' + (sec.type === 'reserve' ? '<details class="ef__group"><summary>섹션 문구(제목 · 설명 · 배경)</summary><div>' + renderObjectFields('sections.' + S.content.sections.indexOf(sec) + '.data', null) + '</div></details>' : '');
    bindForm(body);
    const panelEl = $('#edFormPanel', body);
    const mountPanel = () => {
      if (!panelEl.isConnected || panelEl.__mounted) return; panelEl.__mounted = true; S.formPanelKey = key;
      S.formPanel = FormPanel.mount(panelEl, S.forms[key], {
        onBeforeChange: (kind) => snapshotBefore('form:' + key + ':' + kind),
        onChange: (schema, meta) => onFormChange(key, schema, meta),
        onFocus: (name) => post({ type: 'cms:focusField', key, name }),
        onSave: async () => { await saveDraft(true, '폼 수정'); },
        saveLabel: '지금 임시저장 (변경 이력에 기록)', saveHint: '따로 누르지 않아도 2~3초 뒤 자동으로 임시저장됩니다. 공개 홈페이지 반영은 [게시]. 폼 구성을 바꿔도 이미 접수된 예약 데이터는 삭제되지 않습니다.'
      });
      if (openField) S.formPanel.selectField(openField);
    };
    if (S.forms[key]) { mountPanel(); return; }
    loadForm(key).then(mountPanel).catch((e) => { const el = $('#edFormPanel', body); if (el) { el.innerHTML = '<div class="ed-note">폼을 불러오지 못했습니다 : ' + esc(e.message || '') + '<div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-form-retry>다시 시도</button></div></div>'; el.querySelector('[data-form-retry]').addEventListener('click', () => renderRight()); } });
  }
  async function loadForm(key) { if (S.forms[key]) return S.forms[key]; const f = C.forms.find((x) => x.key === key); if (!f) throw new Error('연결된 폼이 없습니다.'); const r = await withTimeout(WB.api('GET', 'api/forms/' + f.id, undefined, { silent: true }), 8000); if (!S.forms[key]) S.forms[key] = r.schema; return S.forms[key]; }
  function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('응답 시간이 초과되었습니다 (' + Math.round(ms / 1000) + '초). 서버 상태를 확인한 뒤 다시 시도해 주세요.')), ms))]); }

  /* ----- 공통 요소 폼 (헤더 · 푸터) ----- */
  /* ---------- 대표번호 일괄 변경 : 미리보기(어디가 바뀌는지) → 확인 → 초안에 적용 ---------- */
  async function telBulk(tel) {
    tel = String(tel || '').trim();
    if (!tel || tel.replace(/[^0-9]/g, '').length < 8) { WB.toast('새 대표번호를 입력해 주세요. (예 1666-1234)', 'error'); return; }
    let scan = null;
    try { scan = await WB.api('POST', 'api/sites/' + C.siteId + '/tel/scan', { tel }); } catch (e) { return; }
    if (!scan || !scan.total) { WB.toast('바꿀 곳이 없습니다. (이미 ' + esc(tel) + ' 로 되어 있거나, 대표번호 항목이 없습니다)', 'info'); return; }
    const rows = (scan.areas || []).map((a) => '<tr><td>' + esc(a.label) + '</td><td style="text-align:right">' + a.count + '곳</td></tr>').join('');
    const pages = (scan.pages || []).slice(0, 8).map((p) => '<li>' + esc(p.title) + ' <span class="muted">' + p.count + '곳</span></li>').join('');
    const m = WB.modal('<p style="margin:0 0 10px">대표번호를 <b>' + esc(scan.from || '(없음)') + '</b> → <b>' + esc(scan.to) + '</b> 로 바꿉니다.</p>' +
      '<table class="tbl tbl--kv" style="margin-bottom:8px"><tbody>' + rows + '<tr><th>합계</th><td style="text-align:right"><b>' + scan.total + '곳</b></td></tr></tbody></table>' +
      (pages ? '<div class="ef__hint" style="margin-bottom:8px">페이지 : <ul style="margin:4px 0 0 16px">' + pages + '</ul></div>' : '') +
      '<p class="ef__hint" style="margin:0">화면에 보이는 번호와 <b>전화 걸기(tel:) 링크</b>가 함께 바뀝니다. 방문예약 고객 연락처 · 관리자 휴대폰 · 문자 발신번호는 바뀌지 않습니다.<br>지금은 <b>초안에만</b> 저장되고, 공개 홈페이지는 <b>[게시하기]</b> 후 반영됩니다.</p>',
      { title: '대표번호 일괄 변경', footer: '<button class="btn btn--ghost" data-close>취소</button><button class="btn" id="telOk">적용</button>' });
    $('#telOk', m).addEventListener('click', async () => {
      $('#telOk', m).disabled = true;
      try {
        const r = await WB.api('POST', 'api/sites/' + C.siteId + '/tel/apply', { tel });
        m.remove();
        WB.toast('대표번호가 ' + (r.total || 0) + '개 위치에 변경되었습니다. [게시하기]를 눌러야 공개 홈페이지에 반영됩니다.', 'success');
        S.settings = {}; delete S.settings.site;
        S.compiled = await WB.compilePreview(C.siteId); syncBp(); S.compiled.styles = S.compiled.styles || {}; S.compiled.styles.baseCss = '';
        await WBEditor.open({ pageId: C.pageId });   /* 바뀐 초안을 다시 불러와 화면에 반영 */
      } catch (e) { $('#telOk', m).disabled = false; }
    });
  }
  async function renderCommonForm(body, which) {
    body.innerHTML = '<div class="muted" style="font-size:12px">불러오는 중…</div>';
    await loadSettings(['site', 'header', 'footer']);
    const site = (S.settings.site || {}).site || {}, hd = S.settings.header || {}, ft = (S.settings.footer || {}).footer || {};   /* 저장 모양 : { site: {...} } · { footer: {...} } */
    const g = (o, p, d) => { const v = get(o, p); return v === undefined || v === null ? (d === undefined ? '' : d) : v; };
    if (which === 'quick') {   /* 화면 오른쪽 퀵메뉴 : 제목 + 버튼 목록 (간단 항목만) */
      await loadSettings(['quick']);
      const qk = S.settings.quick || {}; const items = Array.isArray(qk.quickMenu) ? qk.quickMenu : [];
      const ICONS = [['home', '홈'], ['unit', '타입'], ['mail', '방문예약'], ['phone', '전화'], ['map', '지도'], ['calendar', '일정'], ['premium', '프리미엄'], ['top', '맨 위로']];
      const pageOpts = C.pages.filter((p) => p.type !== 'main').map((p) => '<option value="' + esc(p.key) + '">' + esc(p.title) + '</option>').join('');
      body.innerHTML = '<div class="ed-note">화면 오른쪽에 뜨는 <b>퀵메뉴</b>입니다. 저장하면 <b>' + C.pageCount + '개 페이지 전체</b>에 적용됩니다.</div>' +
        '<div class="ef"><label class="ef__l">제목 (영문 작은 글씨)</label><input id="qkTitle" value="' + esc(qk.quickMenuTitle || 'QUICK MENU') + '"></div>' +
        items.map((it, i) => '<details class="ef__group" open><summary>' + esc(it.label || ('버튼 ' + (i + 1))) + '</summary><div>' +
          '<label class="check"><input type="checkbox" data-q="enabled" data-i="' + i + '"' + (it.enabled === false ? '' : ' checked') + '> 사용</label>' +
          '<div class="ef"><label class="ef__l">이름</label><input data-q="label" data-i="' + i + '" value="' + esc(it.label || '') + '"></div>' +
          '<div class="ef"><label class="ef__l">아이콘</label><select data-q="icon" data-i="' + i + '">' + ICONS.map(([v, l]) => '<option value="' + v + '"' + (String(it.icon) === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
          '<div class="ef"><label class="ef__l">이동 ' + helpIcon('페이지 = 서브페이지로 이동 · 메인 영역 = 메인 화면의 특정 위치로 이동') + '</label><select data-q="type" data-i="' + i + '"><option value="page"' + (it.type === 'page' ? ' selected' : '') + '>페이지</option><option value="section"' + (it.type === 'section' ? ' selected' : '') + '>메인 영역</option></select></div>' +
          '<div class="ef"><label class="ef__l">이동할 곳</label>' + (it.type === 'section' ? '<input data-q="targetId" data-i="' + i + '" value="' + esc(it.targetId || '') + '" placeholder="예: visit-reservation">' : '<select data-q="page" data-i="' + i + '">' + pageOpts.replace('value="' + esc(it.page || '') + '"', 'value="' + esc(it.page || '') + '" selected') + '</select>') + '</div>' +
        '</div></details>').join('') +
        '<div class="ef__btns"><button class="btn btn--sm" type="button" id="edQuickSave" style="width:100%">퀵메뉴 저장 (' + C.pageCount + '개 페이지 적용)</button></div>' +
        '<p class="ef__hint" style="margin:6px 0 0">공개 홈페이지 반영은 [게시하기] 후입니다.</p>';
      body.addEventListener('change', (e) => { const el = e.target; if (el.dataset.q === 'type') renderCommonForm(body, 'quick'); });
      body.addEventListener('click', async (e) => {
        if (e.target.id !== 'edQuickSave') return;
        const out = items.map((it, i) => Object.assign({}, it));
        $$('[data-q]', body).forEach((el) => { const i = +el.dataset.i; if (!out[i]) return; const k = el.dataset.q; out[i][k] = el.type === 'checkbox' ? el.checked : el.value; if (k === 'page') out[i].type = 'page'; if (k === 'targetId') out[i].type = 'section'; });
        const data = Object.assign({}, qk, { quickMenuTitle: $('#qkTitle', body).value.trim() || 'QUICK MENU', quickMenu: out });
        await WB.api('PUT', 'api/settings/quick', { data }); S.settings.quick = data;
        S.compiled = await WB.compilePreview(C.siteId); syncBp(); S.compiled.styles = S.compiled.styles || {}; S.compiled.styles.baseCss = ''; rerender(0);
        WB.toast('퀵메뉴를 저장했습니다. (공개 홈페이지 반영은 게시 후)', 'success');
      });
      return;
    }
    if (which === 'header') body.innerHTML = '<div class="ed-note">공통 헤더입니다. 저장하면 <b>' + C.pageCount + '개 페이지 전체</b>에 적용됩니다.</div>' +
      '<details class="ef__group" open><summary>로고</summary><div><div class="ef"><label class="ef__l">PC 로고 (어두운 배경용 · 흰색)</label><div class="ef__img"><img src="' + esc(resolveUrl(g(site, 'logo.imageLight'))) + '" style="background:#002f47"><input data-set="site:logo.imageLight" value="' + esc(g(site, 'logo.imageLight')) + '"><button class="btn btn--xs btn--line" type="button" data-setpick="site:logo.imageLight">선택</button></div></div><div class="ef"><label class="ef__l">PC 로고 (흰 배경용)</label><div class="ef__img"><img src="' + esc(resolveUrl(g(site, 'logo.imageDark'))) + '"><input data-set="site:logo.imageDark" value="' + esc(g(site, 'logo.imageDark')) + '"><button class="btn btn--xs btn--line" type="button" data-setpick="site:logo.imageDark">선택</button></div></div><div class="ef"><label class="ef__l">모바일 로고 (선택)</label><div class="ef__img"><img src="' + esc(resolveUrl(g(site, 'logo.imageMobile'))) + '"><input data-set="site:logo.imageMobile" value="' + esc(g(site, 'logo.imageMobile')) + '"><button class="btn btn--xs btn--line" type="button" data-setpick="site:logo.imageMobile">선택</button></div></div><div class="ef"><label class="ef__l">로고 너비(px)</label><input type="number" data-set="site:logo.width" value="' + esc(g(site, 'logo.width', 230)) + '"></div></div></details>' +
      '<details class="ef__group" open><summary>대표번호 · 버튼</summary><div><div class="ef"><label class="ef__l">대표번호 ' + helpIcon('헤더 · 모바일 전화 아이콘 · 푸터 · 소메뉴 전화가 함께 바뀝니다') + '</label><div class="ef__row" style="gap:6px"><input data-set="site:tel" id="edTelInput" value="' + esc(g(site, 'tel')) + '" placeholder="예 1666-1234"><button class="btn btn--xs" type="button" id="edTelAll" style="flex:none">전체 적용</button></div><p class="ef__hint" style="margin:4px 0 10px">[전체 적용] : 헤더 · 푸터 · 퀵메뉴 · 전화 버튼 · tel 링크까지 <b>홈페이지 전체</b>의 대표번호를 한 번에 바꿉니다. (초안 저장 · 공개 반영은 [게시하기] 후)</p></div><div class="ef"><label class="ef__l">방문예약 메뉴 문구</label><input data-set="site:register.label" value="' + esc(g(site, 'register.label', '방문예약')) + '"></div><div class="ef"><label class="ef__l">방문예약 링크</label><input data-set="site:register.url" value="' + esc(g(site, 'register.url', '#visit-reservation')) + '"></div></div></details>' +
      '<details class="ef__group" open><summary>헤더 동작 · 스타일</summary><div><label class="check"><input type="checkbox" data-set="header:transparent"' + (g(hd, 'transparent', true) ? ' checked' : '') + '> 투명 헤더 (어두운 이미지 위)</label><br><label class="check"><input type="checkbox" data-set="header:fixed"' + (g(hd, 'fixed', true) ? ' checked' : '') + '> 화면 상단 고정</label><br><label class="check"><input type="checkbox" data-set="header:mobileMenu"' + (g(hd, 'mobileMenu', true) ? ' checked' : '') + '> 모바일 햄버거 메뉴</label><br><label class="check"><input type="checkbox" data-set="header:mobileTel"' + (g(hd, 'mobileTel', true) ? ' checked' : '') + '> 모바일 전화 아이콘</label><div class="ef__row" style="margin-top:8px"><div class="ef"><label class="ef__l">메뉴 글자(px)</label><input type="number" data-set="header:menuFontSize" value="' + esc(g(hd, 'menuFontSize')) + '" placeholder="16"></div><div class="ef"><label class="ef__l">굵기</label><input type="number" data-set="header:menuFontWeight" value="' + esc(g(hd, 'menuFontWeight')) + '" placeholder="500"></div><div class="ef"><label class="ef__l">메뉴 간격(px)</label><input type="number" data-set="header:menuGap" value="' + esc(g(hd, 'menuGap')) + '"></div></div><div class="ef"><label class="ef__l">흰 헤더 배경색</label><input data-set="header:solidBg" value="' + esc(g(hd, 'solidBg')) + '" placeholder="rgba(255,255,255,.97)"></div><div class="ef__hint">헤더 높이는 관리자 › 환경설정 › 디자인 시스템에서, 메뉴 항목은 관리자 › 메뉴 · 헤더에서 편집합니다. <a href="#/menus">메뉴 편집 ↗</a></div></div></details>' +
      '<div class="ef__btns"><button class="btn btn--sm" type="button" id="edCommonSave" style="width:100%">공통 헤더 저장 (' + C.pageCount + '개 페이지 적용)</button></div>';
    else body.innerHTML = '<div class="ed-note">공통 푸터입니다. 저장하면 <b>' + C.pageCount + '개 페이지 전체</b>에 적용됩니다.</div>' +
      '<div class="ef"><label class="ef__l">상담 문의 라벨</label><input data-set="footer:phoneLabel" value="' + esc(g(ft, 'phoneLabel', '상담 문의')) + '"></div><div class="ef"><label class="ef__l">대표번호 ' + helpIcon('비우면 기본 정보의 대표번호를 사용합니다 (권장)') + '</label><input data-set="footer:phoneDisplay" value="' + esc(g(ft, 'phoneDisplay')) + '" placeholder="비움 = 대표번호(' + esc(g(site, 'tel')) + ')"></div>' +
      '<div class="ef"><label class="ef__l">회사명</label><input data-set="footer:company" value="' + esc(g(ft, 'company')) + '"></div><div class="ef"><label class="ef__l">주소</label><input data-set="footer:address" value="' + esc(g(ft, 'address')) + '"></div>' +
      '<div class="ef"><label class="ef__l">주의 문구 (한 줄에 하나)</label><textarea data-set="footer:notices" data-lines="1" rows="6">' + esc((g(ft, 'notices', []) || []).join('\n')) + '</textarea></div>' +
      '<div class="ef"><label class="ef__l">푸터 로고</label><div class="ef__img"><img src="' + esc(resolveUrl(g(ft, 'logo'))) + '" style="background:#001f30"><input data-set="footer:logo" value="' + esc(g(ft, 'logo')) + '"><button class="btn btn--xs btn--line" type="button" data-setpick="footer:logo">선택</button></div></div>' +
      '<div class="ef"><label class="ef__l">링크 (이름|주소 · 한 줄에 하나)</label><textarea data-set="footer:links" data-pairs="1" rows="3">' + esc((g(ft, 'links', []) || []).map((x) => (x.name || '') + '|' + (x.url || '')).join('\n')) + '</textarea></div><div class="ef"><label class="ef__l">SNS (이름|주소)</label><textarea data-set="footer:sns" data-pairs="1" rows="3">' + esc((g(ft, 'sns', []) || []).map((x) => (x.name || '') + '|' + (x.url || '')).join('\n')) + '</textarea></div>' +
      '<div class="ef__row"><div class="ef"><label class="ef__l">배경색</label><input data-set="footer:background" value="' + esc(g(ft, 'background')) + '" placeholder="#001F30"></div><div class="ef"><label class="ef__l">문구 글자(px)</label><input type="number" data-set="footer:noticeSize" value="' + esc(g(ft, 'noticeSize')) + '" placeholder="14"></div></div><div class="ef__row"><div class="ef"><label class="ef__l">모바일 정렬</label><select data-set="footer:mobileAlign"><option value="left"' + (g(ft, 'mobileAlign', 'left') === 'left' ? ' selected' : '') + '>왼쪽</option><option value="center"' + (g(ft, 'mobileAlign') === 'center' ? ' selected' : '') + '>가운데</option></select></div><div class="ef"><label class="ef__l">퀵메뉴와 간격(px)</label><input type="number" data-set="footer:quickGap" value="' + esc(g(ft, 'quickGap')) + '" placeholder="32"></div></div>' +
      '<div class="ef__btns"><button class="btn btn--sm" type="button" id="edCommonSave" style="width:100%">공통 푸터 저장 (' + C.pageCount + '개 페이지 적용)</button></div>';
    const pending = {};
    body.addEventListener('change', (e) => { const el = e.target; if (!el.dataset.set) return; const [grp, path] = el.dataset.set.split(':'); let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; if (el.dataset.lines) v = el.value.split('\n').map((s) => s.trim()).filter(Boolean); if (el.dataset.pairs) v = el.value.split('\n').map((s) => s.trim()).filter(Boolean).map((l) => { const [name, url] = l.split('|'); return { name: (name || '').trim(), url: (url || '').trim() }; }); pending[grp] = pending[grp] || {}; set(pending[grp], (grp === 'site' || grp === 'footer') ? grp + '.' + path : path, v); });
    body.addEventListener('click', async (e) => {
      const pk = e.target.closest('[data-setpick]'); if (pk) { const it = await WB.pickMedia(); if (!it) return; const inp = $('[data-set="' + pk.dataset.setpick + '"]', body); inp.value = it.url; inp.dispatchEvent(new Event('change', { bubbles: true })); const img = inp.parentElement.querySelector('img'); if (img) img.src = it.thumb; return; }
      if (e.target.id === 'edTelAll') { await telBulk($('#edTelInput', body).value); return; }   /* 대표번호 일괄 변경 */
      if (e.target.id === 'edCommonSave') {
        if (!(await WB.confirm('공통 ' + (which === 'header' ? '헤더' : '푸터') + '를 저장하면 ' + C.pageCount + '개 페이지 전체에 적용됩니다. (공개 사이트 반영은 게시 후)\n계속할까요?', { ok: '저장' }))) return;
        for (const grp of Object.keys(pending)) { const merged = deepMerge(clone(S.settings[grp] || {}), pending[grp]); await WB.api('PUT', 'api/settings/' + grp, { data: merged }); S.settings[grp] = merged; }
        S.compiled = await WB.compilePreview(C.siteId); syncBp(); S.compiled.styles = S.compiled.styles || {}; S.compiled.styles.baseCss = ''; rerender(0); WB.toast('저장했습니다. 미리보기를 새로 고칩니다.', 'success');
      }
    });
  }
  function deepMerge(a, b) { Object.keys(b).forEach((k) => { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], b[k]); else a[k] = b[k]; }); return a; }

  /* ----- 구성 탭 ----- */
  function renderCompose(body, sel) {
    if (sel.kind === 'common') { body.innerHTML = '<div class="ed-note"><b>공통 요소</b> 영역입니다. 가운데 화면에서 <b>고칠 글자 · 번호 · 이미지를 직접 클릭</b>하면 여기서 바로 수정할 수 있습니다. (바꾼 값은 모든 페이지에 적용)</div><div class="ef__hint">페이지별 예외(투명 헤더 · 숨김)는 왼쪽 [공통 요소] 탭 아래쪽에 있습니다.</div>'; return; }
    if (sel.kind === 'page' || (C.pageType !== 'main' && sel.secIndex == null)) {
      const p = S.content.page || {};
      body.innerHTML = '<div class="ef__hint">페이지 설정은 [기본] 탭에 있습니다.</div><div class="ef"><label class="ef__l">레이아웃</label><select data-page="layoutType">' + Object.keys(C.layouts).map((k) => '<option value="' + k + '"' + (p.layoutType === k ? ' selected' : '') + '>' + esc(C.layouts[k]) + '</option>').join('') + '</select></div><div class="ef"><label class="ef__l">페이지 제목</label><input data-page="title" value="' + esc(p.title || '') + '"></div><div class="ef"><label class="ef__l">분류(대메뉴명)</label><input data-page="category" value="' + esc(p.category || '') + '"></div><div class="ef"><label class="ef__l">설명</label><textarea data-page="description" rows="3">' + esc(p.description || '') + '</textarea></div><div class="ef"><label class="ef__l">레이아웃 비율</label><input data-page="layoutRatio" value="' + esc(p.layoutRatio || '') + '" placeholder="예 1.2fr 1fr"></div>' + (p.media ? renderField('page.media', 'media', p.media, true) : '');
      bindForm(body); body.addEventListener('change', onPageField); body.addEventListener('input', onPageField); return;
    }
    const i = sel.secIndex; const s = i != null ? S.content.sections[i] : null;
    if (!s) { body.innerHTML = '<div class="ed-empty">섹션을 찾을 수 없습니다. 왼쪽 [레이어]에서 섹션을 선택하세요.</div>'; return; }
    renderSectionSettings(body, s, i);
  }
  const PAD_QUICK = [0, 16, 24, 40, 60, 80, 120];
  function renderSectionSettings(body, s, i, o) {
    o = o || {}; const selector = sectionSelector({ secIndex: i }); const mode = styleMode(); const kit = fieldKit(selector, mode); const cur = styleOf(selector, mode), pcv = styleOf(selector, 'pc');
    const blk = s.type.startsWith('block:'); const homeFull = C.pageType === 'main' && !blk && mode === 'pc';
    const hm = cur['--cms-sec-hmode'] === 'fixed' ? 'fixed' : /vh$/.test(cur.minHeight || '') ? 'screen' : cur.minHeight === '0px' ? 'auto' : cur.minHeight ? 'min' : (mode === 'tablet' ? 'inherit' : 'auto');
    const hpx = parseFloat(cur.minHeight) || '';
    const opt = (v, l) => '<option value="' + v + '"' + (hm === v ? ' selected' : '') + '>' + l + '</option>';
    let html = o.noBar ? deviceBar(mode) : deviceBar(mode);
    html += '<details class="ef__group" open><summary>섹션</summary><div><div class="ef"><label class="ef__l">섹션 이름 ' + helpIcon('레이어 목록 · 화면 표시용 이름') + '</label><input data-secfield="name" value="' + esc(s.name || '') + '" placeholder="' + esc(typeName(s.type)) + '"' + (s.locked ? ' disabled' : '') + '></div>' +
      '<div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-sact="up" title="위로 이동">▲ 위로</button><button class="btn btn--xs btn--line" type="button" data-sact="down" title="아래로 이동">▼ 아래로</button><button class="btn btn--xs btn--line" type="button" data-sact="dup">복제</button><button class="btn btn--xs btn--line" type="button" data-sact="toggle">' + (s.enabled === false ? '표시' : '숨김') + '</button><button class="btn btn--xs btn--line" type="button" data-sact="lock">' + (s.locked ? '잠금 해제' : '잠금') + '</button><button class="btn btn--xs btn--danger" type="button" data-sact="del">삭제</button></div>' +
      '<div class="ef__btns"><button class="btn btn--xs btn--ghost" type="button" data-sact="save-block" title="다른 페이지에서 불러올 수 있도록 저장">재사용 블록으로 저장</button>' + (blk ? '<button class="btn btn--xs btn--ghost" type="button" data-sact="copy" title="다른 페이지에도 붙여넣을 수 있습니다">섹션 복사</button>' : '') + '<button class="btn btn--xs btn--ghost" type="button" data-sact="paste">아래에 붙여넣기</button></div>' +
      (blk && C.pageType !== 'main' ? '<div class="ef"><label class="ef__l">표시 위치</label><select data-secfield="after"><option value=""' + (!s.after ? ' selected' : '') + '>기본 레이아웃 아래</option><option value="top"' + (s.after === 'top' ? ' selected' : '') + '>기본 레이아웃 위</option></select></div>' : '') + (blk ? '' : '<div class="ef__hint">기본 섹션은 삭제 대신 숨김을 권장합니다. 숨긴 섹션은 왼쪽 [섹션 추가]에서 다시 표시할 수 있습니다.</div>') + '</div></details>';
    html += '<details class="ef__group" open><summary>높이</summary><div>' + (homeFull ? '<div class="ef__hint" style="margin:0">메인의 기본 섹션은 PC에서 화면 높이에 맞춰 한 장씩 넘어갑니다. 높이는 태블릿 · 모바일 화면에서 조절할 수 있습니다.</div>' :
      '<div class="ef"><label class="ef__l">높이 방식' + kit.M('minHeight') + '</label><select data-hmode>' + (mode === 'tablet' ? opt('inherit', 'PC 설정 사용') : '') + opt('auto', '내용에 맞춤 (자동' + (mode !== 'tablet' ? ' · 기본' : '') + ')') + opt('min', '최소 높이') + opt('fixed', '고정 높이') + opt('screen', '화면 높이 (100vh)') + '</select></div>' +
      '<div class="ef"' + (hm === 'min' || hm === 'fixed' ? '' : ' hidden') + '><label class="ef__l">높이</label><div class="ef__px"><input type="number" min="40" step="1" data-hpx value="' + hpx + '"><span>px</span></div><div class="ef__hint" style="margin-top:4px">내용이 더 길면 잘리지 않도록 내용 높이가 우선합니다. 가운데 화면 아래쪽의 파란 손잡이를 끌어도 됩니다.</div></div>' +
      (mode === 'mobile' ? '<div class="ef__hint" style="margin:0">모바일은 기본이 "내용에 맞춤"입니다. PC에서 정한 높이는 모바일에 적용되지 않습니다.</div>' : '') +
      '<div class="ef__btns"><button class="btn btn--xs btn--ghost" type="button" data-hreset>높이 초기화</button></div>') + '</div></details>';
    html += '<details class="ef__group" open><summary>여백 · 폭 · 정렬</summary><div>' + kit.px('paddingTop', '위 여백', PAD_QUICK) + kit.px('paddingBottom', '아래 여백', PAD_QUICK) +
      '<div class="ef"><label class="check"><input type="checkbox" data-padlink' + (S.padLinked ? ' checked' : '') + '> 위 · 아래 같이 조절 ' + helpIcon('켜 두면 한쪽 값을 바꿀 때 다른 쪽도 같은 값이 됩니다. 가운데 화면에서는 Alt 를 누른 채 여백 손잡이를 끌어도 됩니다.') + '</label></div>' +
      (blk ? kit.px('--cms-sec-padx', '좌우 여백', [0, 16, 24, 40]) + kit.inp('--cms-sec-maxw', '콘텐츠 최대 너비', '기본 1200px · 예 960px · 100%') + kit.selInp('--cms-sec-valign', '세로 정렬 ' + helpIcon('섹션 높이가 내용보다 클 때 내용의 세로 위치'), [['', '위 (기본)'], ['center', '가운데'], ['flex-end', '아래']]) : '') + kit.selInp('textAlign', '가로 정렬', [['', '기본'], ['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']]) +
      (cur.padding ? '<div class="ed-note">예전 방식의 여백 값(' + esc(cur.padding) + ')이 있습니다. [여백 초기화] 후 위 · 아래 여백으로 다시 지정해 주세요.</div>' : '') +
      '<div class="ef__btns"><button class="btn btn--xs btn--ghost" type="button" data-padreset>' + DEV_LABEL[mode] + ' 여백 초기화</button><button class="btn btn--xs btn--ghost" type="button" data-sact="copy-style">설정 복사</button><button class="btn btn--xs btn--ghost" type="button" data-sact="paste-style">설정 붙여넣기</button></div></div></details>';
    if (s.type === 'block:section') html += '<details class="ef__group" open><summary>섹션 안의 요소</summary><div id="edItems"></div></details>';
    html += '<div class="ef__hint">배경 · 오버레이 · 테두리 · 그림자는 [디자인], 기기별 표시는 [디자인 › 기기별 표시], 앵커 ID · 클래스 · CSS 는 [고급] 탭에 있습니다.</div>';
    body.innerHTML = html;
    if (!o.noBar) { bindSectionSettings(body, s, i, selector, mode); kit.bind(body, { linked: (k) => (S.padLinked ? { paddingTop: 'paddingBottom', paddingBottom: 'paddingTop' }[k] : null) }); }
  }
  function bindSectionSettings(body, s, i, selector, mode) {
    const cur = styleOf(selector, mode), pcv = styleOf(selector, 'pc');
    if (s.type === 'block:section') drawContainerItems($('#edItems', body), s, i);
    const secs = S.content.sections;
    body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-hreset]')) { snapshotBefore(); setStyles(selector, mode, { minHeight: '', height: '', '--cms-sec-hmode': '' }); renderRight(); return; }
      if (e.target.closest('[data-padreset]')) { snapshotBefore(); setStyles(selector, mode, { paddingTop: '', paddingBottom: '', padding: '', '--cms-sec-padx': '' }); renderRight(); WB.toast(DEV_LABEL[mode] + ' 여백을 기본값으로 되돌렸습니다.', 'success'); return; }
      const b = e.target.closest('[data-sact]'); if (!b) return; const a = b.dataset.sact;
      if (s.locked && !/^(lock|toggle|copy|copy-style|save-block)$/.test(a)) { WB.toast('잠긴 섹션입니다. 잠금을 먼저 풀어 주세요.', 'info'); return; }
      if (a === 'up' && i > 0) { snapshotBefore(); [secs[i - 1], secs[i]] = [secs[i], secs[i - 1]]; S.sel.secIndex = i - 1; syncAfter(); commitNoHist(); }
      else if (a === 'down' && i < secs.length - 1) { snapshotBefore(); [secs[i + 1], secs[i]] = [secs[i], secs[i + 1]]; S.sel.secIndex = i + 1; syncAfter(); commitNoHist(); }
      else if (a === 'dup') duplicateSection(i);
      else if (a === 'toggle') { snapshotBefore(); s.enabled = s.enabled === false; commitNoHist(); }
      else if (a === 'lock') toggleLock(i);
      else if (a === 'del') deleteSection(i);
      else if (a === 'copy') copySection(i); else if (a === 'paste') pasteSection(i); else if (a === 'copy-style') copySectionStyle(i); else if (a === 'paste-style') pasteSectionStyle(i);
      else if (a === 'save-block') { const name = await WB.prompt('블록 이름', s.name || sectionLabel(s)); if (name === null) return; await WB.api('POST', 'api/blocks', { name, section: s }); WB.toast('재사용 블록으로 저장했습니다. [섹션 추가 › 저장한 블록]에서 불러올 수 있습니다.', 'success'); }
    });
    body.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.secfield) { snapshotBefore(); if (el.value === '') delete s[el.dataset.secfield]; else s[el.dataset.secfield] = el.value; commitNoHist(); return; }
      if (el.hasAttribute('data-padlink')) { S.padLinked = el.checked; post({ type: 'cms:padLinked', on: S.padLinked }); return; }
      if (el.hasAttribute('data-hmode')) { const v = el.value; const base = Math.max(40, Math.round((S.rects.sel && S.rects.sel.rect && S.rects.sel.rect.height) || 600)); snapshotBefore(); const n = (parseFloat(cur.minHeight) && !/vh$/.test(cur.minHeight) && cur.minHeight !== '0px' ? parseFloat(cur.minHeight) : base) + 'px'; setStyles(selector, mode, v === 'inherit' ? { minHeight: '', height: '', '--cms-sec-hmode': '' } : v === 'auto' ? { minHeight: mode === 'tablet' && pcv.minHeight ? '0px' : '', height: '', '--cms-sec-hmode': '' } : v === 'screen' ? { minHeight: '100vh', height: '', '--cms-sec-hmode': '' } : { minHeight: n, height: '', '--cms-sec-hmode': v === 'fixed' ? 'fixed' : '' }); renderRight(); return; }
      if (el.hasAttribute('data-hpx')) { const n = Math.max(40, Math.round(+el.value || 0)); snapshotBefore(); setStyles(selector, mode, { minHeight: n + 'px', height: '' }); }
    });
  }
  /* 빈 섹션(요소 컨테이너) : 안에 든 요소 목록 — 선택 · 순서 · 복제 · 숨김 · 삭제 */
  function renderContainerItems(body, s, i) { body.innerHTML = '<div class="ef__hint" style="margin:0 0 10px">이 섹션은 요소를 직접 담는 <b>빈 섹션</b>입니다. 왼쪽 <b>[요소 추가]</b>에서 눌러 넣거나 가운데 화면으로 끌어다 놓으세요. 높이 · 여백은 [구성], 배경은 [디자인] 탭에서 정합니다.</div><div id="edItems"></div>'; drawContainerItems($('#edItems', body), s, i); }
  function drawContainerItems(box, s, i) {
    const items = (s.data && s.data.items) || [];
    box.innerHTML = (items.length ? '<ul class="ef__list" id="edItemList">' + items.map((it, j) => '<li class="sort-item' + (it.enabled === false ? ' is-off' : '') + '" draggable="true" data-j="' + j + '"><span class="handle">⋮⋮</span><span data-item-sel="' + j + '" style="cursor:pointer">' + esc(typeName('block:' + it.type)) + (it.data && (it.data.title || it.data.label) ? ' · ' + esc(String(it.data.title || it.data.label).slice(0, 16)) : '') + '</span><button type="button" data-item="hide" data-j="' + j + '" title="' + (it.enabled === false ? '표시' : '숨김') + '">' + (it.enabled === false ? '◻' : '◼') + '</button><button type="button" data-item="dup" data-j="' + j + '" title="복제">⧉</button><button type="button" data-item="del" data-j="' + j + '" title="삭제">✕</button></li>').join('') + '</ul>' : '<div class="ed-empty" style="padding:4px 0 10px">아직 요소가 없습니다. 공개 홈페이지에는 빈 영역(지정한 높이 · 배경)만 표시됩니다.</div>') + '<button class="btn btn--xs btn--line" type="button" data-item-add style="width:100%">+ 요소 추가</button>';
    box.onclick = (e) => { if (e.target.closest('[data-item-add]')) { S.ltab = 'elements'; setLeftOpen(true); renderLeft(); return; } const b = e.target.closest('[data-item]'); if (b) { elementAction(b.dataset.item, i, +b.dataset.j); return; } const sl = e.target.closest('[data-item-sel]'); if (sl) post({ type: 'cms:selectEl', blockUid: s.uid, elUid: items[+sl.dataset.itemSel].uid }); };
    const ul = $('#edItemList', box); if (ul) WB.sortable(ul, { handle: '.handle', onEnd: (els) => { if (s.locked) { WB.toast('잠긴 섹션입니다.', 'info'); renderRight(); return; } snapshotBefore(); const order = els.map((el) => +el.dataset.j); s.data.items = order.map((j) => items[j]); commitNoHist(); } });
  }
  function onPageField(e) { const el = e.target; if (!el.dataset.page) return; if (e.type === 'input' && el.tagName === 'SELECT') return; snapshotBefore(); S.content.page = S.content.page || {}; S.content.page[el.dataset.page] = el.type === 'checkbox' ? el.checked : el.value; markDirty(); if (e.type === 'change') { rerender(50); renderLeft(); } }

  /* ----- 디자인 · 반응형 ----- */
  function setStyle(selector, mode, k, v, silent) { S.content.styles = S.content.styles || {}; S.content.styles[mode] = S.content.styles[mode] || {}; const st = S.content.styles[mode][selector] = S.content.styles[mode][selector] || {}; if (v === '' || v == null) delete st[k]; else st[k] = v; if (!Object.keys(st).length) delete S.content.styles[mode][selector]; markDirty(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); if (!silent) {} }
  function styleOf(selector, mode) { return (((S.content.styles || {})[mode] || {})[selector]) || {}; }
  /* 지금 보고 있는 화면(PC · 태블릿 · 모바일)의 값을 편집 : 태블릿 · 모바일은 PC 값을 상속하고, 바꾼 항목만 전용 값으로 저장 → [PC 설정 사용]으로 되돌림 */
  const DEV_ICON = { pc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/></svg>', tablet: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/></svg>', mobile: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/></svg>' };
  function deviceBar(mode) { return '<div class="ed-devbar" role="group" aria-label="편집할 화면"><div class="ed-devbar__seg">' + ['pc', 'tablet', 'mobile'].map((d) => '<button type="button" data-setdev="' + d + '"' + (d === mode ? ' class="is-on"' : '') + '>' + DEV_ICON[d] + DEV_LABEL[d] + '</button>').join('') + '</div><div class="ed-modeseg"><button type="button" data-setmode="simple"' + (UI.mode !== 'advanced' ? ' class="is-on"' : '') + '>간편</button><button type="button" data-setmode="advanced"' + (UI.mode === 'advanced' ? ' class="is-on"' : '') + '>고급</button></div><span class="ed-devbar__note">' + (mode === 'pc' ? 'PC 기본값 · 태블릿 · 모바일은 이 값을 상속' : DEV_LABEL[mode] + ' 화면에만 적용 · 비운 항목은 PC 설정 사용') + '</span></div>'; }
  function brandColors() { const c = (S.compiled && S.compiled.theme && S.compiled.theme.colors) || {}; return [['', '사이트 기본값', ''], ['var(--brand-primary)', '메인', c['--brand-primary']], ['var(--brand-secondary)', '보조', c['--brand-secondary']], ['var(--brand-accent)', '강조', c['--brand-accent']], ['var(--brand-text)', '어두운 글자', c['--brand-text']], ['var(--brand-text-light)', '밝은 글자', c['--brand-text-light']], ['var(--brand-bg)', '배경', c['--brand-bg']]]; }
  function fieldKit(selector, mode) {
    const cur = styleOf(selector, mode), pc = styleOf(selector, 'pc'); const dev = mode !== 'pc'; const filled = (o, k) => o[k] != null && o[k] !== '';
    const mark = (k) => { const c2 = styleOf(selector, mode), p2 = styleOf(selector, 'pc'); if (!dev) return ''; if (filled(c2, k)) return '<span class="ef__own">' + DEV_LABEL[mode] + ' 개별값 · ' + esc(String(c2[k]).slice(0, 14)) + '<button type="button" data-stinherit="' + esc(k) + '" title="이 항목의 ' + DEV_LABEL[mode] + ' 개별값을 지우고 PC 설정을 따릅니다">PC 설정으로 되돌리기</button></span>'; return '<span class="ef__inh" title="PC 값을 그대로 사용 중">PC 설정 사용' + (filled(p2, k) ? ' · ' + esc(String(p2[k]).slice(0, 14)) : '') + '</span>'; };
    const M = (k) => '<span data-mark="' + esc(k) + '">' + mark(k) + '</span>';
    const ph = (k, d) => (dev && filled(pc, k) ? 'PC: ' + pc[k] : (d || ''));
    const inp = (k, l, p, type) => '<div class="ef"><label class="ef__l">' + l + M(k) + '</label><input data-st="' + k + '" value="' + esc(cur[k] || '') + '" placeholder="' + esc(ph(k, p)) + '"' + (type ? ' type="' + type + '"' : '') + '></div>';
    const selInp = (k, l, opts) => '<div class="ef"><label class="ef__l">' + l + M(k) + '</label><select data-st="' + k + '">' + opts.map(([o, tx]) => '<option value="' + esc(o) + '"' + ((cur[k] || '') === o ? ' selected' : '') + '>' + tx + '</option>').join('') + '</select></div>';
    const color = (k, l, extra) => { const v = cur[k] || ''; return '<div class="ef ef--color"><label class="ef__l">' + l + M(k) + '</label><div class="ef__row"><input type="color" value="' + (/^#[0-9a-f]{6}$/i.test(v) ? v : '#000000') + '" data-stc="' + k + '" aria-label="' + esc(l) + ' 색 선택"><input data-st="' + k + '" value="' + esc(v) + '" placeholder="' + esc(ph(k, '사이트 기본값 · 예 #002f47')) + '"></div><div class="ef__sw">' + brandColors().concat(extra || []).map(([val, name, c]) => '<button type="button" data-stv="' + k + '" data-v="' + esc(val) + '"' + (v === val ? ' class="is-on"' : '') + ' title="' + (val === '' ? '개별 설정을 지우고 사이트 기본값 사용' : /^var\(/.test(val) ? '사이트 설정의 ' + name + ' 색과 연결 (사이트 설정에서 바꾸면 함께 바뀜)' : name) + '">' + (val ? '<i style="background:' + esc(c || val) + '"></i>' : '') + esc(name) + '</button>').join('') + '</div></div>'; };
    const range = (k, l, min, max, unit) => { const f = parseFloat(cur[k]); const n = isNaN(f) ? '' : (k === 'opacity' ? Math.round(f * 100) : f); return '<div class="ef"><label class="ef__l">' + l + M(k) + '</label><div class="ef__range"><input type="range" min="' + min + '" max="' + max + '" step="1" value="' + (n === '' ? (k === 'opacity' ? 100 : min) : n) + '" data-str="' + k + '" data-unit="' + unit + '"><input type="number" value="' + n + '" data-stn="' + k + '" data-unit="' + unit + '" placeholder="' + esc(dev && filled(pc, k) ? 'PC ' + pc[k] : '자동') + '"><span class="muted" style="font-size:11px">' + unit + '</span></div></div>'; };
    const px = (k, l, quick, labels) => { const f = parseFloat(cur[k]); const n = isNaN(f) ? '' : f; return '<div class="ef"><label class="ef__l">' + l + M(k) + '</label><div class="ef__px"><input type="number" min="0" step="1" value="' + n + '" data-stn="' + k + '" data-unit="px" placeholder="' + esc(ph(k, '기본')) + '"><span>px</span></div>' + (quick ? '<div class="ef__quick">' + quick.map((q, i) => '<button type="button" data-stquick="' + k + '" data-v="' + q + '"' + (n === q ? ' class="is-on"' : '') + '>' + (labels ? labels[i] : q) + '</button>').join('') + '</div>' : '') + '</div>'; };
    /* 크기 : 값 + 단위 선택 + 자동 · 화면에 맞춤 · 내용에 맞춤 (CSS 문법 입력 없음) */
    const parseSize = (v) => { const m = /^\s*(-?[\d.]+)\s*(px|%|vw|vh|em|rem)\s*$/.exec(String(v || '')); return m ? { n: m[1], u: m[2] } : { n: '', u: 'px', kw: /^(auto|fit-content|max-content|min-content|none)$/.test(String(v || '')) ? String(v) : '' }; };
    const size = (k, l, o) => { o = o || {}; const v = cur[k] || ''; const ps = parseSize(v); const units = o.units || ['px', '%', 'vw', 'vh']; return '<div class="ef"><label class="ef__l">' + l + M(k) + '</label><div class="ef__sizew"><input type="number" step="any" data-szv="' + k + '" value="' + esc(ps.n) + '" placeholder="' + esc(ps.kw ? { auto: '자동', 'fit-content': '내용에 맞춤', 'max-content': '내용에 맞춤', 'min-content': '내용에 맞춤', none: '제한 없음' }[ps.kw] || ps.kw : ph(k, '자동')) + '"><select data-szu="' + k + '" aria-label="단위">' + units.map((u) => '<option value="' + u + '"' + (ps.u === u ? ' selected' : '') + (u === 'vw' || u === 'vh' ? ' data-adv' : '') + '>' + u + '</option>').join('') + '</select></div><div class="ef__quick">' + (o.presets || [['auto', '자동'], ['100%', '화면에 맞춤'], ['fit-content', '내용에 맞춤']]).map(([val, name]) => '<button type="button" data-stv="' + k + '" data-v="' + esc(val) + '"' + (v === val ? ' class="is-on"' : '') + '>' + esc(name) + '</button>').join('') + '</div></div>'; };
    /* 여백 박스 : 상 · 우 · 하 · 좌 (선택한 기기만) + 연결(모두 · 상하 · 좌우 · 따로) + 프리셋 */
    const padBox = (keys, l, presets) => { const sides = [['top', '위', keys.top], ['right', '오른쪽', keys.right], ['bottom', '아래', keys.bottom], ['left', '왼쪽', keys.left]].filter((s) => s[2]); const val = (k) => { const f = parseFloat(cur[k]); return isNaN(f) ? '' : f; }; return '<div class="ef ef--padbox" data-padbox><label class="ef__l">' + l + '</label><div class="ed-padbox">' + sides.map((s) => '<label class="ed-padbox__' + s[0] + '"><span>' + s[1] + M(s[2]) + '</span><input type="number" min="0" step="1" data-pad="' + s[2] + '" data-side="' + s[0] + '" value="' + val(s[2]) + '" placeholder="' + esc(ph(s[2], '0')) + '"></label>').join('') + '<div class="ed-padbox__center"><span class="ed-padbox__link" role="group" aria-label="여백 연결">' + [['all', '모두'], ['y', '상하'], ['x', '좌우'], ['none', '따로']].filter((m) => m[0] === 'none' || m[0] === 'all' || (m[0] === 'y' ? keys.top && keys.bottom : keys.left && keys.right)).map((m) => '<button type="button" data-padlink="' + m[0] + '"' + ((S.padLink || 'none') === m[0] ? ' class="is-on"' : '') + '>' + m[1] + '</button>').join('') + '</span></div></div>' + '<div class="ef__quick">' + (presets || [[0, '없음'], [8, '좁게'], [16, '보통'], [32, '넓게']]).map(([n, name]) => '<button type="button" data-padpreset="' + n + '">' + name + '</button>').join('') + '<button type="button" data-padreset title="이 화면의 여백 값을 모두 지웁니다">초기화</button></div></div>'; };
    /* 슬라이더 + 숫자 + 빠른 선택 : 끄는 동안 미리보기만 · 놓을 때 저장 1건 */
    const slider = (k, l, min, max, unit, presets, step) => { const f = parseFloat(cur[k]); const n = isNaN(f) ? '' : (k === 'opacity' ? Math.round(f * 100) : f); return '<div class="ef"><label class="ef__l">' + l + M(k) + '</label><div class="ef__range"><input type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + (n === '' ? (k === 'opacity' ? 100 : min) : n) + '" data-str="' + k + '" data-unit="' + unit + '" aria-label="' + esc(l) + '"><input type="number" step="' + (step || 1) + '" value="' + n + '" data-stn="' + k + '" data-unit="' + unit + '" placeholder="' + esc(dev && filled(pc, k) ? 'PC ' + pc[k] : '기본') + '"><span class="muted" style="font-size:11px">' + unit + '</span></div>' + (presets ? '<div class="ef__quick">' + presets.map(([val, name]) => '<button type="button" data-stquick="' + k + '" data-v="' + val + '" data-unit="' + unit + '"' + (String(n) === String(val) ? ' class="is-on"' : '') + '>' + name + '</button>').join('') + '</div>' : '') + '</div>'; };
    function bind(body, opts) {
      opts = opts || {}; let dragSnap = false;
      const note = () => { if (dev && !S.__devNoted) { S.__devNoted = true; WB.toast(DEV_LABEL[mode] + ' 화면에만 적용됩니다.', 'info'); } };
      const put = (k, v, kind, silent) => { if (!silent) snapshotBefore(kind || ''); if (k === 'opacity' && v !== '') v = String(parseFloat(v) / 100); const props = {}; props[k] = v; const other = opts.linked && opts.linked(k); if (other) props[other] = v; setStyles(selector, mode, props, { silent: !!silent }); Object.keys(props).forEach((kk) => $$('[data-mark="' + kk + '"]', body).forEach((el) => { el.innerHTML = mark(kk); })); if (other) { const o = body.querySelector('[data-stn="' + other + '"]'); if (o) o.value = parseFloat(v) || (v === '' ? '' : 0); } if (!silent) { renderLeft(); note(); } };
      const padPut = (k, v, side) => { const props = {}; const link = S.padLink || 'none'; const sides = $$('[data-pad]', body); sides.forEach((inp) => { const same = link === 'all' || (link === 'y' && (side === 'top' || side === 'bottom') && (inp.dataset.side === 'top' || inp.dataset.side === 'bottom')) || (link === 'x' && (side === 'left' || side === 'right') && (inp.dataset.side === 'left' || inp.dataset.side === 'right')) || inp.dataset.pad === k; if (same) { props[inp.dataset.pad] = v; inp.value = v === '' ? '' : parseFloat(v); } }); snapshotBefore(); setStyles(selector, mode, props); Object.keys(props).forEach((kk) => $$('[data-mark="' + kk + '"]', body).forEach((el) => { el.innerHTML = mark(kk); })); note(); };
      body.addEventListener('change', (e) => {
        const el = e.target;
        if (el.dataset.stc) { const txt = el.parentElement.querySelector('[data-st]'); txt.value = el.value; put(txt.dataset.st, el.value); return; }
        if (el.dataset.st) { put(el.dataset.st, el.value); return; }
        if (el.dataset.pad) { padPut(el.dataset.pad, el.value === '' ? '' : (parseFloat(el.value) || 0) + 'px', el.dataset.side); return; }
        if (el.dataset.szv || el.dataset.szu) { const k = el.dataset.szv || el.dataset.szu; const nv = body.querySelector('[data-szv="' + k + '"]'), nu = body.querySelector('[data-szu="' + k + '"]'); put(k, nv.value === '' ? '' : nv.value + nu.value); $$('[data-stv="' + k + '"]', body).forEach((b) => b.classList.remove('is-on')); return; }
        if (el.dataset.str) { dragSnap = false; markDirty(); renderLeft(); note(); return; }   /* 슬라이더를 놓음 : 자동저장 예약 (이력은 처음 움직일 때 1건) */
        if (el.dataset.stn) { const v = el.value === '' ? '' : el.value + el.dataset.unit; put(el.dataset.stn, v); const r = body.querySelector('[data-str="' + el.dataset.stn + '"]'); if (r && el.value !== '') r.value = el.value; }
      });
      body.addEventListener('input', (e) => { const el = e.target; if (!el.dataset.str) return; const n = body.querySelector('[data-stn="' + el.dataset.str + '"]'); if (n) n.value = el.value; if (!dragSnap) { snapshotBefore(); dragSnap = true; } put(el.dataset.str, el.value + (el.dataset.str === 'opacity' ? '' : el.dataset.unit), '', true); });   /* 끄는 동안 : 화면 미리보기만 */
      body.addEventListener('click', (e) => {
        const dv = e.target.closest('[data-setdev]'); if (dv) { setDevice(dv.dataset.setdev); return; }
        const md = e.target.closest('[data-setmode]'); if (md) { setMode(md.dataset.setmode); return; }
        const ih = e.target.closest('[data-stinherit]'); if (ih) { e.preventDefault(); snapshotBefore(); const props = {}; props[ih.dataset.stinherit] = ''; if (ih.dataset.stinherit === 'minHeight') { props.height = ''; props['--cms-sec-hmode'] = ''; } setStyles(selector, mode, props); renderRight(); return; }
        const sv = e.target.closest('[data-stv]'); if (sv) { put(sv.dataset.stv, sv.dataset.v); renderRight(); return; }
        const q = e.target.closest('[data-stquick]'); if (q) { put(q.dataset.stquick, q.dataset.v + (q.dataset.unit || 'px')); renderRight(); return; }
        const pl = e.target.closest('[data-padlink]'); if (pl) { S.padLink = pl.dataset.padlink; $$('[data-padlink]', body).forEach((b) => b.classList.toggle('is-on', b === pl)); post({ type: 'cms:padLinked', on: S.padLink === 'all' || S.padLink === 'y' }); return; }
        const pp = e.target.closest('[data-padpreset]'); if (pp) { const props = {}; $$('[data-pad]', body).forEach((inp) => { props[inp.dataset.pad] = pp.dataset.padpreset + 'px'; inp.value = pp.dataset.padpreset; }); snapshotBefore(); setStyles(selector, mode, props); renderRight(); return; }
        const pr = e.target.closest('[data-padreset]'); if (pr) { const props = {}; $$('[data-pad]', body).forEach((inp) => { props[inp.dataset.pad] = ''; }); props.padding = ''; snapshotBefore(); setStyles(selector, mode, props); renderRight(); return; }
      });
    }
    return { cur, pc, dev, M, inp, selInp, color, range, px, size, padBox, slider, bind };
  }
  /* 되돌리기 : 바뀔 항목을 먼저 보여주고 확인 */
  async function resetStyles(selector, label) {
    const st = S.content.styles || {}; const rows = []; ['pc', 'tablet', 'mobile'].forEach((m) => { const v = (st[m] || {})[selector]; if (v) Object.keys(v).forEach((k) => rows.push(DEV_LABEL[m] + ' · ' + k + ' = ' + String(v[k]).slice(0, 40))); });
    const attrs = ((S.content.attrs || {})[selector]) || {}; const hidden = ['pc', 'tablet', 'mobile'].filter((m) => ((S.content.hidden || {})[m] || []).includes(selector));
    if (!rows.length && !hidden.length) { WB.toast('바꾼 스타일이 없습니다. (사이트 기본값 그대로)', 'info'); return; }
    const ok = await WB.confirm((label || '이 요소') + '의 디자인을 사이트 기본값으로 되돌립니다. 내용(글 · 이미지 · 링크)은 그대로 둡니다.\n\n되돌릴 항목 ' + (rows.length + hidden.length) + '개 :\n' + rows.slice(0, 12).map((r) => '· ' + r).join('\n') + (rows.length > 12 ? '\n· … 외 ' + (rows.length - 12) + '개' : '') + hidden.map((m) => '\n· ' + DEV_LABEL[m] + ' 숨김 해제').join(''), { ok: '기본 스타일로 되돌리기', title: '기본 스타일로 되돌리기' });
    if (!ok) return; snapshotBefore(); ['pc', 'tablet', 'mobile'].forEach((m) => { if (st[m]) delete st[m][selector]; if (S.content.hidden && S.content.hidden[m]) S.content.hidden[m] = S.content.hidden[m].filter((s) => s !== selector); });
    markDirty(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); renderRight(); WB.toast('기본 스타일로 되돌렸습니다.', 'success');
  }
  const ALIGN9 = [['left top', '↖'], ['center top', '↑'], ['right top', '↗'], ['left center', '←'], ['center center', '·'], ['right center', '→'], ['left bottom', '↙'], ['center bottom', '↓'], ['right bottom', '↘']];
  const posGrid = (kit, k, l) => '<div class="ef"><label class="ef__l">' + l + kit.M(k) + '</label><div class="ed-posgrid">' + ALIGN9.map(([v, s]) => '<button type="button" data-stv="' + k + '" data-v="' + v + '"' + ((kit.cur[k] || '') === v ? ' class="is-on"' : '') + ' title="' + v + '">' + s + '</button>').join('') + '</div></div>';
  const RADIUS = [['', '없음'], ['4px', '조금'], ['12px', '둥글게'], ['999px', '원형']];
  const ANIM_SIMPLE = [['', '없음'], ['fadeIn', 'Fade In (서서히)'], ['fadeUp', 'Fade Up (아래에서 위로)'], ['fadeDown', 'Fade Down (위에서 아래로)'], ['fadeLeft', 'Fade Left (왼쪽에서)'], ['fadeRight', 'Fade Right (오른쪽에서)'], ['zoomIn', 'Zoom In (작게 → 원래)'], ['zoomOut', 'Zoom Out (크게 → 원래)'], ['slideUp', 'Slide Up (멀리 아래에서)'], ['slideLeft', 'Slide Left (멀리 오른쪽에서)'], ['slideRight', 'Slide Right (멀리 왼쪽에서)'], ['none', '애니메이션 끄기 (기존 효과 포함)']];
  const ANIM_EASE = [['', '기본 (ease)'], ['linear', '일정하게 (linear)'], ['ease-in', '천천히 시작 (ease-in)'], ['ease-out', '천천히 끝 (ease-out)'], ['ease-in-out', '천천히 시작 · 끝 (ease-in-out)'], ['cubic-bezier(.22,1,.36,1)', '부드럽게 (cubic)']];
  const SHADOWS = [['', '없음'], ['0 2px 10px rgba(0,0,0,.08)', '약하게'], ['0 8px 24px rgba(0,0,0,.12)', '보통'], ['0 16px 44px rgba(0,0,0,.18)', '강하게']];
  const OVERLAYS = [['rgba(0,0,0,.2)', '어둡게 20%', 'rgba(0,0,0,.2)'], ['rgba(0,0,0,.4)', '어둡게 40%', 'rgba(0,0,0,.4)'], ['rgba(0,0,0,.6)', '어둡게 60%', 'rgba(0,0,0,.6)'], ['rgba(255,255,255,.5)', '밝게 50%', 'rgba(255,255,255,.5)']];
  const DEV_ROWS_F = () => [['pc', 'PC', S.bp.pc + 'px 이상'], ['tablet', '태블릿', S.bp.tablet + ' ~ ' + (S.bp.pc - 1) + 'px'], ['mobile', '모바일', (S.bp.tablet - 1) + 'px 이하']];
  function visGroup(selector, mode) {
    const hid = S.content.hidden || {}; const legacy = !('tablet' in hid); const isHid = (m) => (m === 'tablet' && legacy ? (hid.pc || []) : (hid[m] || [])).includes(selector);
    const cur = isHid(mode);
    return (cur ? '<div class="ed-note">' + DEV_LABEL[mode] + ' 화면에서 숨긴 요소입니다. <button type="button" class="btn btn--xs btn--line" data-hide-dev="' + mode + '" data-on="0">다시 표시</button></div>' : '') +
      '<div class="ed-vis">' + DEV_ROWS_F().map(([m, l, w]) => '<div class="ed-vis__row"><span class="ed-vis__dev">' + DEV_ICON[m] + l + ' <small>' + w + '</small></span><span class="ed-vis__seg"><button type="button" data-hide-dev="' + m + '" data-on="0"' + (!isHid(m) ? ' class="is-on"' : '') + '>표시</button><button type="button" data-hide-dev="' + m + '" data-on="1"' + (isHid(m) ? ' class="is-on"' : '') + '>숨김</button></span></div>').join('') + '</div><div class="ef__hint" style="margin:8px 0 0">숨긴 요소는 편집 화면에서 흐리게 보이고 공개 홈페이지에서는 표시되지 않습니다.</div>';
  }
  function bindVis(body, selector) { body.addEventListener('click', (e) => { const b = e.target.closest('[data-hide-dev]'); if (!b) return; snapshotBefore(); setHidden(selector, b.dataset.hideDev, b.dataset.on === '1'); markDirty(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); renderRight(); renderLeft(); }); }
  function renderStyle(body, sel) {
    const selector = sel.selector || (sel.kind === 'section' ? sectionSelector(sel) : null);
    if (!selector) { body.innerHTML = '<div class="ed-empty">중앙 화면에서 요소를 클릭하면 그 요소의 디자인을 편집할 수 있습니다.</div>'; return; }
    const mode = styleMode(); const kit = fieldKit(selector, mode); const { inp, selInp, color, size, slider, px, padBox, M, cur } = kit;
    const kind = sel.kind === 'section' ? 'section' : sel.elKind; const sec = sel.secIndex != null ? S.content.sections[sel.secIndex] : null; const blk = !!(sec && sec.type.startsWith('block:'));
    if (kind === 'section' && sec && sec.type === 'block:divider') return renderDivider(body, sel, sec);
    let html = deviceBar(mode);
    if (kind === 'section') { renderSectionSettings(body, sec, sel.secIndex, { noBar: true }); html = body.innerHTML; }
    if (kind === 'text' || kind === 'link' || kind === 'element') html += grp('font', '글자', selInp('fontFamily', '글꼴', FONTS) + slider('fontSize', '글자 크기', 10, 80, 'px', [[14, '작게'], [16, '보통'], [22, '크게']]) + selInp('fontWeight', '굵기', [['', '기본'], ['300', '가늘게'], ['400', '보통'], ['500', '중간'], ['600', '약간 굵게'], ['700', '굵게'], ['800', '아주 굵게']]) + color('color', '글자색') + selInp('textAlign', '정렬', [['', '기본'], ['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']]) + '<details class="ef__group"><summary>세부 글자 설정</summary><div>' + '<div data-adv>' + slider('lineHeight', '줄 간격', 1, 2.5, '', [[1.3, '좁게'], [1.6, '보통'], [2, '넓게']], 0.05) + '</div>' +  + inp('letterSpacing', '글자 간격', '예 -0.02em · 1px') + selInp('textTransform', '대소문자', [['', '기본'], ['uppercase', '모두 대문자'], ['lowercase', '모두 소문자'], ['capitalize', '단어 첫 글자 대문자']]) + selInp('textDecoration', '밑줄', [['', '없음'], ['underline', '밑줄'], ['line-through', '취소선']]) + color('backgroundColor', '글자 배경색') + selInp('textShadow', '텍스트 효과', [['', '없음'], ['0 1px 2px rgba(0,0,0,.25)', '약한 그림자'], ['0 2px 8px rgba(0,0,0,.4)', '강한 그림자']]) + '</div></details>', true);
    if (kind === 'image') html += grp('image', '이미지', '<div class="ef"><label class="ef__l">이미지 맞춤' + M('objectFit') + '</label><div class="ef__seg">' + [['cover', '채우기'], ['contain', '맞추기'], ['none', '원본 비율']].map(([v, l]) => '<button type="button" data-stv="objectFit" data-v="' + v + '"' + ((cur.objectFit || '') === v ? ' class="is-on"' : '') + '>' + l + '</button>').join('') + '</div></div>' + posGrid(kit, 'objectPosition', '위치') + slider('--cms-darken', '어둡기', 0, 90, '%') + inp('aspectRatio', '비율', '예 16 / 9 · 4 / 3') + '<div data-adv>' + slider('--cms-blur', '블러', 0, 20, 'px') + color('--cms-overlay', '오버레이 색') + '</div>', true);
    if (kind !== 'section') html += grpAdv('size', '크기와 위치', size('width', '가로 크기') + size('height', '세로 크기', { presets: [['auto', '자동'], ['100vh', '화면 높이']] }) + (kind === 'link' ? inp('padding', '버튼 안쪽 여백', '예 14px 28px') : '') + '<div data-adv>' + size('maxWidth', '최대 너비', { presets: [['none', '제한 없음'], ['100%', '화면에 맞춤']] }) + size('minHeight', '최소 높이', { presets: [['', '없음']] }) + selInp('position', '위치 방식', [['', '기본'], ['relative', '상대'], ['absolute', '절대'], ['sticky', '고정(스크롤)']]) + selInp('overflow', '넘침', [['', '기본'], ['hidden', '숨김'], ['auto', '스크롤']]) + '</div>', false);
    if (kind !== 'section') html += grpAdv('space', '여백', padBox({ top: 'paddingTop', right: 'paddingRight', bottom: 'paddingBottom', left: 'paddingLeft' }, '안쪽 여백') + padBox({ top: 'marginTop', right: 'marginRight', bottom: 'marginBottom', left: 'marginLeft' }, '바깥 여백'), false);
    if (kind === 'link') html += grp('button', '버튼', color('backgroundColor', '배경색') + '<div class="ef"><label class="ef__l">모서리' + M('borderRadius') + '</label><div class="ef__seg">' + RADIUS.map(([v, l]) => '<button type="button" data-stv="borderRadius" data-v="' + v + '"' + ((cur.borderRadius || '') === v ? ' class="is-on"' : '') + '>' + l + '</button>').join('') + '</div></div>' + selInp('--cms-icon', '아이콘', [['', '없음'], ['arrow', '화살표 →'], ['phone', '전화'], ['download', '다운로드'], ['mail', '메일'], ['external', '새 창 ↗']]) + selInp('--cms-hover', '마우스 오버', [['', '기본'], ['dark', '어둡게'], ['light', '밝게'], ['invert', '색 반전'], ['lift', '살짝 떠오름']]) + (mode === 'mobile' ? selInp('--cms-full', '모바일 전체 너비', [['', '아니오'], ['1', '전체 너비']]) : '') + '<div data-adv>' + inp('border', '테두리', '예 1px solid #002F47') + '</div><div class="ef__hint" style="margin:0">색을 비워 두면 사이트 설정의 버튼 색(브랜드 색)을 따릅니다.</div>', false);
    if (kind === 'section' || kind === 'element') {
      const bg = cur.backgroundImage || ''; const bgUrl = (bg.match(/url\((["']?)(.*?)\1\)/) || [])[2] || '';
      html += grp('bg', '배경', color('backgroundColor', '배경색') + '<div class="ef"><label class="ef__l">배경 이미지' + M('backgroundImage') + '</label><div class="ed-bgpick">' + (bgUrl ? '<img src="' + esc(resolveUrl(bgUrl)) + '" alt="">' : '<span class="ed-bgpick__empty">이미지를 선택해 주세요</span>') + '<span class="ef__btns" style="margin:0"><button class="btn btn--xs btn--line" type="button" data-bgpick>' + (bgUrl ? '교체' : '이미지 선택') + '</button>' + (bgUrl ? '<button class="btn btn--xs btn--ghost" type="button" data-bgclear>삭제</button>' : '') + '</span></div>' + (bgUrl ? '<div class="ef__seg" style="margin-top:8px">' + [['cover', '채우기'], ['contain', '맞추기'], ['auto', '원본 비율']].map(([v, l]) => '<button type="button" data-stv="backgroundSize" data-v="' + v + '"' + ((cur.backgroundSize || 'cover') === v ? ' class="is-on"' : '') + '>' + l + '</button>').join('') + '</div>' + posGrid(kit, 'backgroundPosition', '배경 위치') : '') + '</div>' + (kind === 'section' && blk ? color('--cms-sec-overlay', '오버레이 ' + helpIcon('배경 이미지 · 영상 위에 덮는 색 — 글자가 잘 보이게 합니다'), OVERLAYS) + (mode === 'pc' ? '<div class="ef"><label class="ef__l">배경 영상 ' + helpIcon('MP4 · 소리 없이 자동 반복 재생. 모바일 데이터 절약을 위해 대표 이미지도 함께 지정해 주세요.') + '</label><div class="ef__btns" style="margin:0"><button class="btn btn--xs btn--line" type="button" data-bgvideo>' + ((sec.style || {}).bgVideo ? '영상 교체' : '영상 선택') + '</button>' + ((sec.style || {}).bgVideo ? '<button class="btn btn--xs btn--ghost" type="button" data-bgvideo-clear>영상 삭제</button><button class="btn btn--xs btn--line" type="button" data-bgposter>대표 이미지</button>' : '') + '</div>' + ((sec.style || {}).bgVideo ? '<div class="ef__hint" style="margin:6px 0 0">' + esc(String(sec.style.bgVideo).split('/').pop()) + '</div>' : '') + '</div>' : '') : ''), true);
      html += grp('border', '테두리 · 모서리 · 그림자', '<div class="ef"><label class="ef__l">모서리' + M('borderRadius') + '</label><div class="ef__seg">' + RADIUS.map(([v, l]) => '<button type="button" data-stv="borderRadius" data-v="' + v + '"' + ((cur.borderRadius || '') === v ? ' class="is-on"' : '') + '>' + l + '</button>').join('') + '</div></div>' + selInp('boxShadow', '그림자', SHADOWS.some((x) => x[0] === (cur.boxShadow || '')) ? SHADOWS : SHADOWS.concat([[cur.boxShadow, '직접 입력한 값']])) + '<div data-adv>' + inp('borderTop', '위 테두리', '예 1px solid #e1e6ea') + inp('borderBottom', '아래 테두리', '예 1px solid #e1e6ea') + slider('borderRadius', '모서리 직접 조절', 0, 60, 'px') + '</div>', false);
    }
    html += grpAdv('vis', '기기별 표시', visGroup(selector, mode), false);
    html += grp('anim', '애니메이션', selInp('--cms-anim', '등장 효과', ANIM_SIMPLE) + slider('--cms-anim-dur', '지속시간', 100, 3000, 'ms', [[400, '빠르게'], [700, '보통'], [1200, '느리게']], 50) + slider('--cms-anim-delay', '지연시간', 0, 3000, 'ms', [[0, '없음'], [200, '0.2초'], [500, '0.5초']], 50) + '<div data-adv>' + selInp('--cms-anim-ease', '움직임 (easing)', ANIM_EASE) + '</div>' +  + '<div data-adv>' + selInp('--cms-anim-repeat', '실행', [['', '스크롤로 화면에 들어올 때 한 번만'], ['repeat', '화면에 들어올 때마다 반복']]) + '</div>' +  + '<div data-adv>' + selInp('--cms-anim-mobile', '모바일', [['', '모바일에서도 실행'], ['off', '모바일에서 끄기']]) + '</div>' +  + '<p class="help" style="margin:4px 0 0">효과는 공개 홈페이지에서 스크롤로 요소가 보일 때 실행됩니다 (에디터 화면에서는 바로 보임). 기존 홈페이지의 애니메이션은 [애니메이션 끄기]를 고르지 않는 한 그대로 둡니다.</p><div data-adv>' + slider('opacity', '투명도', 0, 100, '%') + '</div>', false);
    html += '<div class="ef__btns ed-resetrow">' + (mode !== 'pc' ? '<button class="btn btn--xs btn--line" type="button" data-stclear="' + mode + '">' + DEV_LABEL[mode] + ' 개별값 모두 지우기 (PC 설정 사용)</button>' : '') + '<button class="btn btn--xs btn--ghost" type="button" data-stresetall>기본 스타일로 되돌리기</button></div>';
    body.innerHTML = html; kit.bind(body); bindVis(body, selector);
    if (kind === 'section') bindSectionSettings(body, sec, sel.secIndex, selector, mode);
    body.addEventListener('change', (e) => { const el = e.target; if (!el.dataset.secstyle || !sec) return; snapshotBefore(); sec.style = sec.style || {}; if (el.value) sec.style[el.dataset.secstyle] = el.value; else delete sec.style[el.dataset.secstyle]; commitNoHist(); });
    body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-bgpick]')) { const it = await WB.pickMedia(); if (it) { snapshotBefore(); setStyles(selector, mode, { backgroundImage: 'url(' + it.url + ')', backgroundSize: cur.backgroundSize || 'cover' }); renderRight(); } return; }
      if (e.target.closest('[data-bgclear]')) { snapshotBefore(); setStyles(selector, mode, { backgroundImage: '', backgroundSize: '', backgroundPosition: '' }); renderRight(); return; }
      if (e.target.closest('[data-bgvideo]') || e.target.closest('[data-bgposter]')) { const vid = !!e.target.closest('[data-bgvideo]'); const it = await WB.pickMedia({ type: vid ? 'video' : 'image' }); if (it && sec) { snapshotBefore(); sec.style = sec.style || {}; sec.style[vid ? 'bgVideo' : 'bgPoster'] = it.url; commitNoHist(); } return; }
      if (e.target.closest('[data-bgvideo-clear]')) { if (sec) { snapshotBefore(); sec.style = sec.style || {}; delete sec.style.bgVideo; delete sec.style.bgPoster; commitNoHist(); } return; }
      if (e.target.closest('[data-stresetall]')) { resetStyles(selector, sel.label); return; }
      const c = e.target.closest('[data-stclear]'); if (c) { snapshotBefore(); const st = S.content.styles || {}; if (st[c.dataset.stclear]) delete st[c.dataset.stclear][selector]; markDirty(); post({ type: 'cms:css', css: buildCss(C.pageKey, S.content) }); renderRight(); WB.toast('PC 설정으로 되돌렸습니다.', 'success'); }
    });
  }
  /* 구분선 : 굵기 · 길이 · 색 · 선 모양 · 정렬 · 위아래 간격 (세부 수치는 고급) */
  function renderDivider(body, sel, sec) {
    const selector = '#cms-' + sec.uid + ' hr'; const mode = styleMode(); const kit = fieldKit(selector, mode); const { color, slider, M, cur } = kit;
    const w = parseFloat(cur.width) || 100; const ml = cur.marginLeft, mr = cur.marginRight; const align = w >= 100 ? 'center' : (ml === '0' || ml === '0px') && mr === 'auto' ? 'left' : ml === 'auto' && (mr === '0' || mr === '0px') ? 'right' : 'center';
    const html = deviceBar(mode) + grp('divider', '구분선', slider('borderTopWidth', '굵기 <small class="muted">얇게 ─ 두껍게</small>', 1, 20, 'px') + slider('width', '길이', 10, 100, '%', [[30, '짧게'], [60, '보통'], [100, '전체 너비']]) + color('borderTopColor', '색상') + slider('opacity', '투명도', 0, 100, '%') +
      '<div class="ef"><label class="ef__l">선 모양' + M('borderTopStyle') + '</label><div class="ef__seg">' + [['solid', '━ 실선'], ['dashed', '╌ 점선'], ['dotted', '┈ 둥근 점선']].map(([v, l]) => '<button type="button" data-stv="borderTopStyle" data-v="' + v + '"' + ((cur.borderTopStyle || 'solid') === v ? ' class="is-on"' : '') + '>' + l + '</button>').join('') + '</div></div>' +
      (w < 100 ? '<div class="ef"><label class="ef__l">정렬</label><div class="ef__seg">' + [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']].map(([v, l]) => '<button type="button" data-divalign="' + v + '"' + (align === v ? ' class="is-on"' : '') + '>' + l + '</button>').join('') + '</div></div>' : '') +
      '<div class="ef"><label class="ef__l">위아래 간격' + M('marginTop') + '</label><div class="ef__quick">' + [[8, '좁게'], [24, '보통'], [48, '넓게']].map(([n, l]) => '<button type="button" data-divgap="' + n + '"' + (parseFloat(cur.marginTop) === n ? ' class="is-on"' : '') + '>' + l + '</button>').join('') + '</div><div data-adv>' + kit.px('marginTop', '위 간격') + kit.px('marginBottom', '아래 간격') + '</div></div>', true) +
      grp('vis', '기기별 표시', visGroup(selector, mode), false) + '<div class="ef__btns ed-resetrow"><button class="btn btn--xs btn--ghost" type="button" data-stresetall>기본 스타일로 되돌리기</button></div>' + '<div class="ef__hint">가운데 화면에서 구분선 양 끝 손잡이를 끌면 길이가, 가운데를 끌면 위치가 바뀝니다.</div>';
    body.innerHTML = html; kit.bind(body); bindVis(body, selector);
    if (!cur.border && !cur.borderTopStyle) setStyles(selector, 'pc', { border: '0', borderTopStyle: 'solid', borderTopWidth: cur.borderTopWidth || '1px' }, { silent: true });   /* 브라우저 기본 선 대신 조절 가능한 선 */
    body.addEventListener('click', (e) => {
      const a = e.target.closest('[data-divalign]'); if (a) { snapshotBefore(); const v = a.dataset.divalign; setStyles(selector, mode, v === 'left' ? { marginLeft: '0', marginRight: 'auto' } : v === 'right' ? { marginLeft: 'auto', marginRight: '0' } : { marginLeft: 'auto', marginRight: 'auto' }); renderRight(); return; }
      const g = e.target.closest('[data-divgap]'); if (g) { snapshotBefore(); setStyles(selector, mode, { marginTop: g.dataset.divgap + 'px', marginBottom: g.dataset.divgap + 'px' }); renderRight(); return; }
      if (e.target.closest('[data-stresetall]')) resetStyles(selector, '구분선');
    });
  }
  /* ----- 고급 탭 : 동작(클릭 · 통계) · 사용자 클래스 · CSS · 데이터(JSON) ----- */
  function renderAdvanced(body, sel) {
    const selector = sel.selector || (sel.kind === 'section' ? sectionSelector(sel) : null); S.content.attrs = S.content.attrs || {}; const a = selector ? (S.content.attrs[selector] || {}) : {};
    let html = '<div class="ed-note">개발자용 설정입니다. 일반 편집은 [내용] · [디자인] 탭을 사용하세요.</div>';
    const asec = sel.kind === 'section' && sel.secIndex != null ? S.content.sections[sel.secIndex] : null;
    if (selector && sel.kind !== 'section') html += grp('act', '동작', '<div class="ef"><label class="ef__l">클릭 시 동작</label><select data-attr="action"><option value=""' + (!a.action ? ' selected' : '') + '>없음(기본 링크 유지)</option><option value="scroll:visit-reservation"' + (a.action === 'scroll:visit-reservation' ? ' selected' : '') + '>방문예약 폼으로 스크롤</option><option value="scroll:top"' + (a.action === 'scroll:top' ? ' selected' : '') + '>맨 위로</option><option value="tel"' + (a.action === 'tel' ? ' selected' : '') + '>대표번호로 전화</option></select></div><div class="ef"><label class="ef__l">통계 클릭 이름 ' + helpIcon('트래픽 통계의 클릭 항목에 이 이름으로 집계됩니다') + '</label><input data-attr="track" value="' + esc(a.track || '') + '" placeholder="예: 메인 상담버튼"></div>', true);
    if (asec && asec.type.startsWith('block:')) html += grp('anchor', '앵커', '<div class="ef"><label class="ef__l">앵커 ID ' + helpIcon('메뉴 · 버튼 링크를 #이름 으로 걸면 이 섹션으로 이동합니다 (영문 · 숫자 · - 만)') + '</label><input data-anchor value="' + esc(asec.anchor || '') + '" placeholder="예 event"></div>', true);
    if (selector) html += grp('cls', '사용자 클래스 · CSS', '<div class="ef__hint mono" style="word-break:break-all;margin:0 0 8px">' + esc(selector) + '</div><div class="ef"><label class="ef__l">추가 CSS 클래스</label><input data-attr="class" value="' + esc(a.class || '') + '"></div><div class="ef"><label class="ef__l">HTML id</label><input data-attr="id" value="' + esc(a.id || '') + '"></div>' + (sel.elKind === 'image' ? '<div class="ef"><label class="ef__l">이미지 로딩</label><select data-attr="loading"><option value=""' + (!a.loading ? ' selected' : '') + '>기본</option><option value="lazy"' + (a.loading === 'lazy' ? ' selected' : '') + '>지연</option><option value="eager"' + (a.loading === 'eager' ? ' selected' : '') + '>즉시</option></select></div>' : '') + '<div class="ef"><label class="ef__l">이 요소 사용자 CSS</label><textarea data-attr="css" class="mono" rows="4" placeholder="transform:rotate(1deg);">' + esc(a.css || '') + '</textarea></div>', false);
    html += grp('pagecss', '페이지 사용자 CSS', '<div class="ef"><textarea data-custom-css class="mono" rows="5">' + esc((S.content.styles || {}).custom || '') + '</textarea></div>', false);
    if (sel.contentPath || sel.kind === 'section') { const pth = sel.kind === 'section' ? sel.contentPath : (S.subPath.length ? S.subPath[S.subPath.length - 1] : sel.objPath); html += grp('json', '데이터(JSON)', '<div class="ef"><label class="ef__l"><span class="muted mono">' + esc(pth) + '</span></label><textarea data-json="' + esc(pth) + '" class="mono" rows="10">' + esc(JSON.stringify(get(S.content, pth), null, 2)) + '</textarea><div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-json-apply>JSON 적용</button></div></div>', false); }
    body.innerHTML = html;
    body.addEventListener('change', (e) => { const el = e.target; if (el.hasAttribute('data-anchor') && asec) { const v = el.value.trim().replace(/^#/, '').replace(/[^a-zA-Z0-9_-]/g, ''); el.value = v; snapshotBefore(); if (v) asec.anchor = v; else delete asec.anchor; commitNoHist(); return; } if (el.dataset.attr && selector) setAttr(selector, el.dataset.attr, el.value); if (el.hasAttribute('data-custom-css')) { snapshotBefore(); S.content.styles = S.content.styles || {}; S.content.styles.custom = el.value; commitNoHist(); } });
    body.addEventListener('click', (e) => { if (!e.target.closest('[data-json-apply]')) return; const ta = $('[data-json]', body); try { const v = JSON.parse(ta.value); snapshotBefore(); set(S.content, ta.dataset.json, v); commitNoHist(); WB.toast('적용했습니다.', 'success'); } catch (x) { WB.toast('JSON 형식에 오류가 있습니다: ' + x.message, 'error'); } });
  }

  /* ---------- 상단 동작 ---------- */
  const DEV_PRESETS = { pc: [1920, 1440, 1280, 1024], tablet: [768, 820, 1024], mobile: [360, 375, 390, 430] };
  S.devW = Object.assign({ pc: 1440, tablet: 768, mobile: 390 }, UI.devW || {});
  function devWidth() { return S.devW[S.device] || 1440; }
  function applyZoom(z, auto) {
    S.zoom = z; const w = devWidth();
    frameWrap.style.width = Math.round(w * z) + 'px'; frameScale.style.width = w + 'px'; frameScale.style.transform = 'scale(' + z + ')'; frameScale.style.height = (100 / z) + '%';
    const v = $('#edZoomVal'); if (v) { v.textContent = Math.round(z * 100) + '%'; v.classList.toggle('is-fit', !!auto); v.title = auto ? '화면에 맞춤 (' + Math.round(z * 100) + '%) — 누르면 100%' : '누르면 화면에 맞춤'; }
    if (S.commonMode) { commonFrameSize(); }
    drawCanvasInfo(); drawOverlay();
  }
  function fitZoom() { const avail = $('#edStage').clientWidth - 72; return Math.max(0.25, Math.min(1, Math.floor(avail / devWidth() * 100) / 100)); }
  function fitDevice() { const want = (UI.zoom || {})[S.device]; if (want && want !== 'fit') applyZoom(+want, false); else applyZoom(fitZoom(), true); }
  function drawCanvasInfo() { const el = $('#edCanvasInfo'); if (!el) return; el.innerHTML = '<b>' + DEV_LABEL[S.device] + ' · ' + devWidth() + 'px</b> <span class="ed-canvasinfo__presets">' + DEV_PRESETS[S.device].map((w) => '<button type="button" data-devw="' + w + '"' + (w === devWidth() ? ' class="is-on"' : '') + '>' + w + '</button>').join('') + '<button type="button" data-devw="custom" title="너비 직접 입력">…</button></span> <span class="muted">배율 ' + Math.round(S.zoom * 100) + '%</span>'; el.style.pointerEvents = 'auto'; }
  $('#edCanvasInfo').addEventListener('click', async (e) => { const b = e.target.closest('[data-devw]'); if (!b) return; let w = b.dataset.devw; if (w === 'custom') { const v = await WB.prompt(DEV_LABEL[S.device] + ' 화면 너비(px)', String(devWidth())); if (v === null) return; w = parseInt(v, 10); if (!(w >= 320 && w <= 3000)) { WB.toast('320 ~ 3000 사이로 입력해 주세요.', 'error'); return; } } S.devW[S.device] = +w; UI.devW = S.devW; saveUi(); fitDevice(); });
  function setDevice(dev) { if (S.device !== dev) S.__devNoted = false; S.device = dev; $$('[data-dev]').forEach((x) => { const on = x.dataset.dev === dev; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); frameWrap.dataset.dev = dev; fitDevice(); renderRight(); }   /* 화면(기기)을 바꾸면 캔버스 너비 · 설정값 · 숨김 · 개별값 표시가 함께 바뀜 */
  $$('[data-dev]').forEach((b) => b.addEventListener('click', () => setDevice(b.dataset.dev)));
  $$('[data-emode]').forEach((b) => b.addEventListener('click', () => setEditMode(b.dataset.emode)));
  addL(window, 'resize', fitDevice);
  /* 저장하지 않은 변경이 있을 때만 브라우저 기본 경고 */
  addL(window, "beforeunload", (ev) => { if (S.dirty) { ev.preventDefault(); ev.returnValue = ""; return ""; } });
  /* 줌 : 작은 [−] 100% [＋] 컨트롤 (가운데 글자를 누르면 화면에 맞춤 ↔ 100%) */
  const ZSTEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5];
  $('.ed-zoom').addEventListener('click', (e) => {
    const b = e.target.closest('[data-zoom]'); if (!b) return;
    UI.zoom = UI.zoom || {};
    if (b.dataset.zoom === 'fit') {
      const v = $('#edZoomVal');
      if (v && v.classList.contains('is-fit')) { UI.zoom[S.device] = 1; saveUi(); applyZoom(1, false); }
      else { delete UI.zoom[S.device]; saveUi(); fitDevice(); }
      return;
    }
    const cur = S.zoom; let z;
    if (b.dataset.zoom === 'in') { z = ZSTEPS.find((x) => x > cur + 0.001) || ZSTEPS[ZSTEPS.length - 1]; }
    else { const under = ZSTEPS.filter((x) => x < cur - 0.001); z = under.length ? under[under.length - 1] : ZSTEPS[0]; }
    UI.zoom[S.device] = z; saveUi(); applyZoom(z, false);
  });
  $('#edUndo').addEventListener('click', undo); $('#edRedo').addEventListener('click', redo);
  addL(document, 'keydown', (e) => { const tag = (e.target.tagName || '').toLowerCase(); const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDraft(true, ''); } if (e.key === 'Escape' && S.floatOn) { closeFloat(); } if (typing) return; const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase(); if (e.key === 'Escape') { if ($('.ed-chooser') || $('.modal')) return; deselect(); } else if (e.key === 'Delete' && S.sel) { e.preventDefault(); onCanvasKey('delete'); } else if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if (mod && k === 'y') { e.preventDefault(); redo(); } else if (mod && k === 'd') { e.preventDefault(); onCanvasKey('duplicate'); } else if (mod && k === 'c' && !String(window.getSelection())) onCanvasKey('copy'); else if (mod && k === 'v') onCanvasKey('paste'); else if (e.key === '?') shortcutHelp(); });
  /* 반응형 비교 : 확인용 — 카드를 누르면 그 기기로 편집 화면 전환 */
  async function compareView() {
    await saveDraft(false); let url = C.frameUrl.replace(/([?&])cms_edit=1&?/, '$1').replace(/[?&]$/, '');
    try { const r = await WB.previewToken(C.pageType === 'main' ? 'main' : C.pageKey, { silent: true }); if (/^https?:\/\//.test(r.url)) url = r.url; } catch (e) {}
    const cards = [['pc', S.devW.pc], ['tablet', S.devW.tablet], ['mobile', S.devW.mobile]];
    const m = WB.modal('<p class="help" style="margin:0 0 10px">저장된 초안을 세 화면 크기로 동시에 봅니다. 카드를 누르면 그 기기 편집 화면으로 돌아갑니다.</p><div class="ed-compare">' + cards.map(([d, w]) => '<div class="ed-compare__card" data-cmp="' + d + '"><div class="ed-compare__head">' + DEV_LABEL[d] + '<small>' + w + 'px</small></div><div class="ed-compare__view" data-w="' + w + '"><iframe src="' + esc(url) + '" title="' + DEV_LABEL[d] + ' 미리보기" loading="lazy"></iframe></div></div>').join('') + '</div>', { title: '반응형 비교', large: true, autofocus: false });
    const fitAll = () => $$('.ed-compare__view', m).forEach((v) => { const w = +v.dataset.w; const cw = v.clientWidth || 300; const z = Math.min(1, cw / w); const f = v.querySelector('iframe'); f.style.width = w + 'px'; f.style.height = Math.round(Math.min(760, 900) ) + 'px'; f.style.transform = 'scale(' + z + ')'; v.style.height = Math.round(760 * z) + 'px'; });
    setTimeout(fitAll, 30); addL(window, 'resize', fitAll);
    m.addEventListener('click', (e) => { const c = e.target.closest('[data-cmp]'); if (c) { setDevice(c.dataset.cmp); m.remove(); window.removeEventListener('resize', fitAll); } });
  }
  function shortcutHelp() { WB.modal('<table class="tbl"><tbody>' + [['Ctrl + Z', '실행 취소'], ['Ctrl + Shift + Z · Ctrl + Y', '다시 실행'], ['Ctrl + S', '임시저장 (변경 이력에 기록)'], ['Ctrl + D', '선택한 섹션 · 요소 복제'], ['Ctrl + C · Ctrl + V', '섹션 복사 · 붙여넣기 (다른 페이지에도 가능)'], ['Delete', '선택한 섹션 · 요소 삭제'], ['Esc', '선택 해제 · 글 편집 취소'], ['더블클릭', '글을 화면에서 바로 수정'], ['Alt + 방향키', '선택한 요소 크기 · 섹션 높이 미세 조절 (Shift = 1px)'], ['Alt + 여백 손잡이 끌기', '위 · 아래 여백 함께 조절'], ['Shift + 끌기', '8px 맞춤 없이 1px 단위로 조절'], ['?', '이 단축키 안내']].map(([a, b]) => '<tr><td style="white-space:nowrap"><b>' + a + '</b></td><td>' + b + '</td></tr>').join('') + '</tbody></table>', { title: '단축키 안내' }); }
  $('#edSave').addEventListener('click', async () => { const note = await WB.prompt('임시저장 메모 (변경 이력에 표시 · 비워도 됩니다)', ''); if (note === null) return; saveDraft(true, note); });
  $('#edPreview').addEventListener('click', async () => { await saveDraft(false); const r = await WB.previewToken(C.pageType === 'main' ? 'main' : C.pageKey); window.open(r.url, 'wb_preview'); WB.toast('새 창에서 PC · 모바일 폭으로 확인해 보세요 (30분 유효 링크).', 'info'); });
  $('#edPageSel').addEventListener('change', (e) => { goPage(+e.target.value); });
  /* 상단 페이지 선택 : 검색 가능한 목록 (페이지가 많아도 바로 찾기) */
  (() => {
    const pick = $('#edPagePick'), btn = $('#edPageBtn'), pop = $('#edPagePop'), q = $('#edPageSearch'), none = $('#edPageNone');
    if (!pick || !btn || !pop) return;
    const items = () => [...pop.querySelectorAll('[data-pagepick]')];
    const filter = () => { const v = (q.value || '').trim().toLowerCase(); let n = 0; items().forEach((b) => { const hit = !v || (b.dataset.q || '').includes(v); b.parentNode.hidden = !hit; if (hit) n++; }); none.hidden = !!n; };
    const open = (on) => { pop.hidden = !on; btn.setAttribute('aria-expanded', on ? 'true' : 'false'); pick.classList.toggle('is-open', !!on); if (on) { q.value = ''; filter(); setTimeout(() => q.focus(), 10); } };
    btn.addEventListener('click', () => open(pop.hidden));
    q.addEventListener('input', filter);
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { open(false); btn.focus(); } if (e.key === 'Enter') { const first = items().find((b) => !b.parentNode.hidden); if (first) first.click(); } });
    pop.addEventListener('click', (e) => { const b = e.target.closest('[data-pagepick]'); if (!b) return; open(false); goPage(+b.dataset.pagepick); });
    addL(document, 'click', (e) => { if (!pop.hidden && !pick.contains(e.target)) open(false); }, true);
  })();
  /* 페이지 이동 : 바뀐 내용을 먼저 저장 → 주소(#/editor?pageId=)를 바꾸며 그 페이지의 데이터를 새로 불러옴 (뒤로가기 · 앞으로가기 · 새로고침 유지) */
  let moving = false;
  /* 저장하지 않은 변경이 있을 때 물어보기 — where: "exit"(에디터 나가기) · "page"(다른 페이지로) */
  async function confirmUnsaved(where) {
    if (!S.dirty) return "go";
    const isPage = where === "page";
    return new Promise((resolve) => {
      const m = WB.modal("<p style=\"margin:0 0 10px\">" + (isPage ? "현재 페이지에 저장하지 않은 변경사항이 있습니다." : "저장되지 않은 변경사항이 있습니다.") + "</p>" +
        "<p class=\"ef__hint\" style=\"margin:0\">저장하지 않고 나가면 마지막 저장 이후의 변경사항이 사라집니다.</p>",
        { title: "저장되지 않은 변경사항", guard: true, footer:
          "<button class=\"btn btn--ghost\" id=\"uvStay\">계속 편집</button>" +
          "<button class=\"btn btn--line\" id=\"uvDrop\">저장하지 않고 " + (isPage ? "이동" : "나가기") + "</button>" +
          "<button class=\"btn\" id=\"uvSave\">저장하고 " + (isPage ? "이동" : "나가기") + "</button>" });
      let done = false;
      const fin = (v) => { if (done) return; done = true; try { m.clean && m.clean(); } catch (x) {} m.remove(); resolve(v); };
      $("#uvStay", m).addEventListener("click", () => fin("stay"));
      $("#uvDrop", m).addEventListener("click", () => { S.dirty = false; S.formDirty = {}; fin("go"); });
      $("#uvSave", m).addEventListener("click", async () => {
        const b = $("#uvSave", m); b.disabled = true; b.textContent = "저장 중…";
        await saveDraft(false);
        if (S.dirty || S.saveErr) { b.disabled = false; b.textContent = "저장하고 " + (isPage ? "이동" : "나가기"); WB.toast("저장하지 못했습니다. 다시 시도해 주세요.", "error"); return; }
        fin("go");
      });
    });
  }
  window.__wbEditorGuard = confirmUnsaved;

  async function goPage(id) { id = +id; if (!id || moving) return; if (id === +C.pageId) { WB.toast('지금 편집 중인 페이지입니다.', 'info'); return; }
    if (S.dirty) { const r0 = await confirmUnsaved('page'); if (r0 !== 'go') { const sel0 = $('#edPageSel'); if (sel0) sel0.value = String(C.pageId); return; } }   /* 페이지가 바뀌기 전 저장 여부 안내 */
    moving = true; try { await flush(); await WBEditor.open({ pageId: id, push: true }); } finally { moving = false; } }
  async function flush() { clearTimeout(saveTimer); const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let n = 0; while (S.saving && n++ < 50) await sleep(100); }   /* 자동 저장하지 않음 : 저장은 사용자가 고른 대로 */
  $('#edSiteSel').addEventListener('change', (e) => { App.selectSite(+e.target.value).then(() => App.go('editor')); });
  $('#edExit').addEventListener('click', async (ev) => { ev.preventDefault(); const r0 = await confirmUnsaved('exit'); if (r0 !== 'go') return; cleanupEditorUI(); WBEditor.close(); if (window.App) App.go('dashboard'); });
  const pub = $('#edPublish'); if (pub) pub.addEventListener('click', publishFlow);
  const rev = $('#edReview'); if (rev) rev.addEventListener('click', async () => { await saveDraft(false); await WB.api('POST', 'api/pages/' + C.pageId + '/review', {}); setStatus('review'); WB.toast('검토 요청했습니다. 게시 권한자가 확인 후 게시합니다.', 'success'); });
  async function publishFlow() {
    pub.disabled = true;
    try {
      await saveDraft(false);
      const r = await WB.api('POST', 'api/pages/' + C.pageId + '/publish-check', { content: S.content });
      const s = r.summary;
      const m = WB.modal('<p class="help" style="margin:0 0 8px">게시하면 아래 변경이 <b>공개 홈페이지에 바로 반영</b>됩니다.</p><div class="ed-diff"><div><b>' + s.pages.length + '</b><span>변경된 페이지</span></div><div><b>' + s.text + '</b><span>수정한 텍스트</span></div><div><b>' + s.images + '</b><span>교체한 이미지</span></div><div><b>' + s.links + '</b><span>변경된 링크</span></div><div><b>' + s.forms + '</b><span>수정된 폼</span></div><div><b>' + s.deleted + '</b><span>삭제된 섹션</span></div><div><b>' + s.added + '</b><span>추가된 섹션</span></div><div><b>' + s.mobile + '</b><span>모바일 전용 변경</span></div></div>' +
        (s.pages.length ? '<ul class="ef__list">' + s.pages.map((p) => '<li><span>' + esc(p.title) + (p.current ? ' (현재)' : '') + ' · 변경 ' + p.changes + '건</span><small class="muted">' + esc(C.statuses[p.status] || p.status) + '</small></li>').join('') + '</ul>' : '<div class="ed-ok">이 페이지 외에 변경된 페이지가 없습니다.</div>') +
        (r.issues.length ? '<div style="margin-top:8px">' + r.issues.map((i) => '<div class="alert alert--' + (i.level === 'error' ? 'error' : i.level === 'warn' ? 'warn' : 'info') + '" style="margin-bottom:4px"><span>' + esc(i.text) + '</span></div>').join('') + '</div>' : '<div class="ed-ok">점검 결과 문제가 없습니다.</div>') +
        (WB.S.platform === 'php' ? '<p class="help" style="margin:8px 0 0">바뀌는 파일 : /index.html · /sitemap.xml · /robots.txt — 지금 공개 중인 index.html 은 게시 직전에 자동 백업되고, 게시 이력 › 홈페이지 백업에서 되돌릴 수 있습니다.</p>' : '') +
        '<label class="check" style="margin-top:8px"><input type="checkbox" id="pubChk"> PC · 모바일 미리보기로 확인했습니다</label>', { title: '게시 전 변경 요약', large: true, footer: '<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--line" id="pubPrev">미리보기 열기</button><button class="btn" id="pubOk"' + (r.hasErrors ? ' disabled title="오류 항목을 먼저 해결해 주세요"' : '') + '>확인 후 게시</button>' });
      $('#pubPrev', m).addEventListener('click', () => $('#edPreview').click());
      $('#pubOk', m).addEventListener('click', async () => { if (!$('#pubChk', m).checked && !(await WB.confirm('미리보기를 확인하지 않고 게시할까요?', { ok: '그대로 게시' }))) return; m.close(); setSave('saving', '게시 중…'); const applyResult = (rr) => {   /* '게시 완료' 는 공개 홈페이지 파일 저장 + 공개 주소에서 새 버전 확인까지 끝났을 때만 */
        if (!$('#edSaveInfo')) return;
        const hhmm = new Date().toTimeString().slice(0, 5);
        if (rr && rr.ok && rr.status !== 'local-only') { S.dirty = false; S.formDirty = {}; C.status = 'published'; setPubState('published'); setSave('saved', '게시 완료 · ' + hhmm + ' · 공개 홈페이지 반영 완료'); refreshPageStates(); }
        else if (rr && rr.ok) { S.dirty = false; C.status = 'published'; C.pubState = 'waiting'; paintStatus('failed'); setSave('error', '게시 실패 · 공개 홈페이지 반영을 확인하지 못했습니다'); }
        else if (rr) { paintStatus('failed'); setSave('error', '게시 실패 · 공개 홈페이지 반영에 실패했습니다 (이전 버전 그대로)'); }
      }; const rr = await WB.runPublish({ title: '페이지 게시 · ' + C.pageTitle, onDone: applyResult, start: () => WB.api('POST', 'api/pages/' + C.pageId + '/publish', { content: S.content, async: true, session: (WB.presence && WB.presence.key) || '' }, { silent: true }) }); if (!rr && $('#edSaveInfo')) setSave('saving', '게시 진행 중… (상단 게시 상태에서 결과 확인)'); });
    } catch (e) {}
    pub.disabled = false;
  }
  $('#edMore').addEventListener('click', (e) => {
    e.stopPropagation(); const old = $('.ed-more'); if (old) { old.remove(); return; }
    const m = document.createElement('div'); m.className = 'ed-more';
    m.innerHTML = '<button type="button" data-m="versions">버전 이력 · 이전 버전 복원</button><button type="button" data-m="schedule">예약 게시…</button>' + (C.canPublish ? '<button type="button" data-m="unpublish">게시 중지 (페이지 숨김)</button>' : '') + '<hr><button type="button" data-m="seo">이 페이지 SEO ↗</button><button type="button" data-m="reload">미리보기 새로고침</button><button type="button" data-m="compare">반응형 비교 (PC · 태블릿 · 모바일)</button><button type="button" data-m="keys">단축키 안내</button><button type="button" data-m="json">페이지 데이터(JSON) 보기</button><hr><button type="button" data-m="exit">에디터 종료 (관리자로)</button>';
    document.body.appendChild(m);
    const close = () => m.remove(); setTimeout(() => addL(document, 'click', close, { once: true }), 0);
    m.addEventListener('click', async (e2) => {
      const a = (e2.target.closest('[data-m]') || {}).dataset; if (!a) return;
      if (a.m === 'versions') { S.ltab = 'history'; setLeftOpen(true); renderLeft(); }
      else if (a.m === 'keys') shortcutHelp();
      else if (a.m === 'compare') compareView();
      else if (a.m === 'exit') $('#edExit').click();
      else if (a.m === 'schedule') { const m2 = WB.modal('<div class="ef"><label class="ef__l">게시 일시</label><input type="datetime-local" id="schAt" value="' + (C.publishAt ? C.publishAt.replace(' ', 'T').slice(0, 16) : '') + '"></div><p class="help">지정 시각에 자동으로 게시됩니다. (서버 예약 작업 5분 간격)</p>', { title: '예약 게시', footer: '<button class="btn btn--ghost" data-close>취소</button><button class="btn" id="schOk">예약</button>' }); $('#schOk', m2).addEventListener('click', async () => { const at = $('#schAt', m2).value; if (!at) return; try { const r = await WB.api('POST', 'api/pages/' + C.pageId + '/schedule', { publish_at: at.replace('T', ' '), content: S.content }); C.publishAt = r.publish_at; setStatus('scheduled'); WB.toast('예약되었습니다 : ' + r.publish_at, 'success'); m2.remove(); } catch (x) {} }); }
      else if (a.m === 'unpublish') { if (await WB.confirm('이 페이지를 공개 사이트에서 내립니다. (메뉴에서도 자동으로 숨겨짐) 진행할까요?', { danger: true, ok: '게시 중지' })) { const ur = await WB.runPublish({ title: '게시 중지 · ' + C.pageTitle, start: () => WB.api('POST', 'api/pages/' + C.pageId + '/unpublish', { async: true }, { silent: true }) }); setStatus('stopped'); if (ur && ur.ok) WB.toast('게시를 중지했습니다.', 'success'); } }
      else if (a.m === 'seo') { await flush(); WBEditor.close(true); App.go('seo', { page: C.pageId }); }
      else if (a.m === 'reload') rerender(0);
      else if (a.m === 'json') WB.modal('<pre class="code" style="max-height:70vh">' + esc(JSON.stringify(S.content, null, 2)) + '</pre>', { title: '페이지 데이터', large: true });
    });
  });
  addL(window, 'beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- 로드 ---------- */
  async function load() {
    const r = await WB.api('GET', 'api/pages/' + C.pageId + '/draft');
    if (!r.compiled) r.compiled = await WB.compilePreview(C.siteId);   /* 운영(PHP) 서버 : 브라우저가 공용 코어로 컴파일 */
    S.content = r.content || {}; S.content.sections = S.content.sections || []; S.content.styles = S.content.styles || {}; S.content.hidden = S.content.hidden || {}; S.content.attrs = S.content.attrs || {}; S.content.trash = S.content.trash || [];
    if (C.pageType !== 'main') S.content.page = S.content.page || {};
    S.compiled = r.compiled || {}; syncBp(); S.compiled.styles = S.compiled.styles || {}; S.compiled.styles.baseCss = ''; setStatus(r.page.status, r.page.pub_state || (r.page.published_version_id && r.page.published_version_id === r.page.draft_version_id ? 'published' : 'waiting')); C.publishAt = r.page.publish_at;
    S.history = []; S.future = []; updateHistBtns(); S.dirty = false; setSave('saved', '저장됨');
    S.baseRev = (r.page && r.page.updated_at) || "";   /* 저장 충돌 확인용 */
    presenceReport();
    const pgRow = pageRow(); pgRow.hadPublished = !!(r.page && r.page.published_version_id); S.sel = { kind: 'page', label: '페이지 · ' + C.pageTitle }; hiddenBar();
    renderLeft(); renderRight();
    const hasForm = (S.content.sections || []).some((s) => s.type === 'reserve' || s.type === 'block:form') || C.pageType !== 'main';
    if (hasForm) { for (const f of C.forms) { try { await loadForm(f.key); } catch (e) {} } }   /* 폼 초안을 먼저 받아 두어야 처음 화면부터 필드 목록 = 미리보기 */
    if (frame.src === 'about:blank' || !frame.src) { frame.src = C.frameUrl; watchReady(); } else rerender(0);
  }
  function boot() { return load().catch((e) => { $('#edRightBody').innerHTML = '<div class="ed-note">초안을 불러오지 못했습니다: ' + esc(e.message) + '</div>'; setSave('error', '불러오기 실패'); frameError('페이지 데이터를 불러오지 못했습니다 : ' + (e.message || '')); }); }
  applyUi();
  boot();
  return { flush, isDirty: () => S.dirty };
}
  return { open, close, isOpen, current: () => cfg, flush: () => (inst && inst.flush ? inst.flush() : Promise.resolve()), isDirty: () => !!(inst && inst.isDirty && inst.isDirty()) };
})();
