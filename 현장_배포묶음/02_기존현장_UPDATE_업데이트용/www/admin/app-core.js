/* 통합웹빌더 관리자 — 공통 : API 클라이언트(Bearer 토큰) · 토스트 · 모달 · 확인창 · 미디어 선택/업로드(브라우저 최적화 · 썸네일) · 드래그 정렬 · 상태 · 라우터 */
window.WB = (function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: (k) => { try { return sessionStorage.getItem(k) || localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v, persist) => { try { (persist ? localStorage : sessionStorage).setItem(k, v); } catch (e) {} }, del: (k) => { try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch (e) {} } };
  const CFG = window.WB_CONFIG || {};   /* 운영 서버 설정 : 배포 패키지가 넣음 { platform:'php', api:'../api/index.php' } — 개발(Node)에서는 없음 */
  const S = { base: '', token: '', user: null, sites: [], site: null, roles: {}, statuses: {}, version: '', platform: CFG.platform === 'php' ? 'php' : 'node' };
  function apiBase() { if (S.base) return S.base; if (CFG.api) return String(CFG.api).replace(/\/$/, ''); if (location.protocol === 'file:') return ''; return location.origin; }
  /* API 주소 : 운영(PHP) = api/index.php?r=/경로&질의 · 개발(Node) = /api/경로 — 사용자가 서버 주소를 입력하지 않음 */
  function apiUrl(url) { url = String(url).replace(/^\//, ''); if (S.platform === 'php') { const i = url.indexOf('?'); const p = (i < 0 ? url : url.slice(0, i)).replace(/^api\/?/, ''); const q = i < 0 ? '' : url.slice(i + 1); return apiBase() + '?r=/' + p + (q ? '&' + q : ''); } return apiBase() + '/' + url; }
  let csrf = ''; const base = './';   /* editor.js 호환 */
  async function api(method, url, data, opts) {
    opts = opts || {};
    const headers = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }; if (S.token) headers.Authorization = 'Bearer ' + S.token; if (S.site) headers['X-Site-Id'] = String(S.site.id);
    let body; let sendMethod = method;
    if (data instanceof FormData) { body = data; }
    else if (data !== undefined) {
      const json = JSON.stringify(data);
      /* 카페24 등 일부 서버는 큰 JSON 요청을 막습니다 (100KB 넘으면 404). 큰 내용은 파일 첨부 형식으로 보냅니다. */
      if (!opts.forceJson && json.length > 90000 && typeof FormData !== 'undefined' && typeof Blob !== 'undefined') {
        const fd = new FormData(); fd.append('_method', method); fd.append('__json', new Blob([json], { type: 'application/json' }), 'body.json');
        body = fd; sendMethod = 'POST';
      } else { headers['Content-Type'] = 'application/json'; body = json; }
    }
    /* 시간 초과 : 응답이 없으면 화면이 "불러오는 중" 으로 멈추지 않도록 끊고 오류로 알립니다 (파일 올리기 · 게시는 더 길게) */
    const ms = opts.timeout != null ? opts.timeout : ((data instanceof FormData) ? 180000 : (/publish|import|backup|restore|sync/.test(String(url)) ? 60000 : 15000));
    const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const tid = ctl ? setTimeout(() => { try { ctl.abort(); } catch (e) {} }, ms) : 0;
    let res; try { res = await fetch(apiUrl(url), { method: sendMethod, headers, body, credentials: 'same-origin', signal: ctl ? ctl.signal : undefined }); } catch (e) {
      clearTimeout(tid);
      const timedOut = e && (e.name === 'AbortError' || /abort/i.test(e.message || ''));
      const err = new Error(timedOut ? '서버가 ' + Math.round(ms / 1000) + '초 안에 응답하지 않았습니다. 잠시 후 다시 시도해 주세요. [TIMEOUT]' : '서버에 연결할 수 없습니다. 인터넷 연결과 주소(' + apiBase() + ')를 확인해 주세요. [NETWORK ERROR]');
      err.code = timedOut ? 'TIMEOUT' : 'NETWORK'; err.status = 0;
      if (!opts.silent) toast(err.message, 'error'); throw err;
    }
    clearTimeout(tid);
    if (res.status === 404 && sendMethod !== method && !opts.noRetryJson) {   /* 파일 첨부 형식을 막는 서버 : 원래 JSON 방식으로 한 번 더 */
      try { return await api(method, url, data, Object.assign({}, opts, { noRetryJson: true, forceJson: true })); } catch (e2) { throw e2; }
    }
    if (opts.raw) return res;
    let json = null; try { json = await res.json(); } catch (e) { json = { ok: false, error: (res.status === 404 ? '요청한 기능을 서버에서 찾을 수 없습니다. 관리자 파일과 서버(api) 파일의 버전이 다를 수 있습니다. [API 404 · ' + String(url).split('?')[0] + ']' : '서버 응답을 해석할 수 없습니다. [HTTP ' + res.status + ']') }; }
    if (res.status === 401 && S.token) { S.token = ''; store.del('wb_token'); if (window.App) App.showLogin('로그인이 만료되었습니다. 다시 로그인해 주세요.'); const e401 = new Error('로그인이 만료되었습니다. [SESSION EXPIRED]'); e401.code = 'SESSION'; e401.status = 401; throw e401; }
    if (res.ok && json.ok !== false && method !== 'GET' && !/^\/?api\/(auth|notifications|publish-jobs|sites\/\d+\/(publish|deploy)|pages\/\d+\/publish)/.test(url)) refreshPublishState(900);   /* 저장이 일어나면 게시 상태(변경사항 있음)를 다시 확인 */
    if (!res.ok || json.ok === false) { const err = new Error(json.error || ('오류 ' + res.status)); err.data = json; err.status = res.status; err.code = json.code || (res.status === 404 ? 'API 404' : res.status === 403 ? 'FORBIDDEN' : res.status >= 500 ? 'SERVER ' + res.status : 'HTTP ' + res.status); if (res.status >= 500) err.message = (json.error || '서버 오류가 발생했습니다.') + ' [' + (json.code || ('HTTP ' + res.status)) + ' · ' + (json.at ? String(json.at).slice(11, 16) : new Date().toTimeString().slice(0, 5)) + ']'; if (!opts.silent) toast(err.message, 'error'); throw err; }
    return json;
  }
  async function download(url, filename) { const res = await api('GET', url, undefined, { raw: true }); if (!res.ok) { let j = {}; try { j = await res.json(); } catch (e) {} toast(j.error || '다운로드 실패 (' + res.status + ')', 'error'); return; } const blob = await res.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  /* 알림 : 오류는 6초 · 나머지 2.6초 — opts.action = { label, run } 을 주면 [다시 시도] 같은 버튼이 붙음 */
  function toast(msg, type, opts) {
    opts = opts || {}; let wrap = $('.toast-wrap'); if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    /* 같은 내용 · 같은 종류의 토스트가 이미 떠 있으면 새로 만들지 않고 표시 시간만 늘립니다 (중복 표시 방지) */
    const dup = [].slice.call(wrap.children).filter(function (x) { return x.__msg === msg && x.__type === (type || ''); })[0];
    if (dup && !opts.action) { clearTimeout(dup.__timer); dup.style.opacity = '1'; dup.__timer = setTimeout(dup.__close, (type === 'error' ? 6000 : 2600)); return dup; }
    const el = document.createElement('div'); el.className = 'toast' + (type ? ' toast--' + type : ''); el.__msg = msg; el.__type = type || ''; const span = document.createElement('span'); span.textContent = msg; el.appendChild(span);
    const close = () => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }; el.__close = close;
    if (opts.action && opts.action.run) { const b = document.createElement('button'); b.type = 'button'; b.textContent = opts.action.label || '다시 시도'; b.addEventListener('click', () => { close(); opts.action.run(); }); el.appendChild(b); }
    wrap.appendChild(el); el.__timer = setTimeout(close, opts.action ? 9000 : type === 'error' ? 6000 : 2600); return el;
  }
  /* 모달 공통 규칙 : 크기 sm(440) · 기본(600) · large(1080) — 제목 왼쪽 · 닫기(×) 오른쪽 위 · 아래 바(취소 왼쪽 → 저장 오른쪽 끝)
     열려 있는 동안 뒤 화면 스크롤 잠금 · Esc / 바깥 클릭 / × / [취소] 모두 같은 닫기 · opts.guard = true 면 입력을 바꾼 뒤 닫을 때 확인 */
  function modal(html, opts) {
    opts = opts || {}; const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); if (opts.title) m.setAttribute('aria-label', opts.title);
    m.innerHTML = '<div class="modal__box' + (opts.large ? ' modal__box--lg' : opts.small ? ' modal__box--sm' : '') + '"><div class="modal__head"><span>' + esc(opts.title || '') + '</span>' + (opts.locked ? '' : '<button class="modal__x" type="button" aria-label="닫기">×</button>') + '</div><div class="modal__body">' + html + '</div>' + (opts.footer !== false ? '<div class="modal__foot">' + (opts.footer || '<button class="btn btn--ghost" data-close>닫기</button>') + '</div>' : '') + '</div>';
    document.body.appendChild(m); document.body.classList.add('is-modal');
    let dirty = false, gone = false, asking = false; if (opts.guard) { const mark = (e) => { if (e.target.closest('.modal__body')) dirty = true; }; m.addEventListener('input', mark); m.addEventListener('change', mark); }
    const detach = () => { if (gone) return; gone = true; document.removeEventListener('keydown', onKey); if (!document.querySelector('.modal')) document.body.classList.remove('is-modal'); };
    const nativeRemove = m.remove.bind(m); m.remove = () => { nativeRemove(); detach(); };   /* 저장 뒤 코드에서 바로 지우는 경우에도 스크롤 잠금이 풀리도록 */
    const close = async () => { if (gone || asking || opts.locked) return;   /* locked : 필수 입력 창(첫 로그인 비밀번호 변경) — 닫기 · Esc · 바깥 클릭 무시 */ if (opts.guard && dirty) { asking = true; const okToClose = await confirm('저장하지 않은 입력이 있습니다. 닫을까요?', { ok: '닫기', title: '저장 확인', danger: true }); asking = false; if (!okToClose) return; } m.remove(); if (m.onClose !== null && opts.onClose) opts.onClose(); };
    const onKey = (e) => { if (e.key !== 'Escape') return; const all = $$('.modal'); if (all[all.length - 1] !== m) return; e.stopPropagation(); close(); };   /* 겹쳐 열린 경우 맨 위 창만 닫힘 */
    document.addEventListener('keydown', onKey);
    let downOnBackdrop = false; m.addEventListener('mousedown', (e) => { downOnBackdrop = e.target === m; });   /* 입력칸에서 끌다가 바깥에서 놓은 경우는 닫지 않음 */
    m.addEventListener('click', (e) => { if ((e.target === m && downOnBackdrop) || e.target.closest('.modal__x') || e.target.closest('[data-close]')) close(); });
    m.close = close; m.clean = () => { dirty = false; }; m.setDirty = (v) => { dirty = !!v; };
    const first = $('.modal__body input:not([type=hidden]):not([disabled]), .modal__body select, .modal__body textarea', m); if (first && opts.autofocus !== false) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) {} }, 30);
    return m;
  }
  function confirm(msg, opts) { opts = opts || {}; return new Promise((resolve) => { const m = modal('<p style="margin:0;white-space:pre-line;line-height:1.65">' + esc(msg) + '</p>', { title: opts.title || '확인', small: true, autofocus: false, footer: '<button class="btn btn--ghost" data-close>취소</button><button class="btn ' + (opts.danger ? 'btn--danger' : '') + '" data-ok>' + esc(opts.ok || '확인') + '</button>', onClose: () => resolve(false) }); const ok = $('[data-ok]', m); ok.addEventListener('click', () => { m.onClose = null; resolve(true); m.remove(); }); setTimeout(() => ok.focus(), 30); }); }
  function prompt(msg, def, opts) { opts = opts || {}; return new Promise((resolve) => { const m = modal('<label class="lbl">' + esc(msg) + '</label><input class="inp" value="' + esc(def || '') + '">', { title: opts.title || '입력', small: true, footer: '<button class="btn btn--ghost" data-close>취소</button><button class="btn" data-ok>확인</button>', onClose: () => resolve(null) }); const inp = $('input', m); setTimeout(() => { inp.focus(); inp.select(); }, 40); const ok = () => { const v = inp.value; m.onClose = null; resolve(v); m.remove(); }; $('[data-ok]', m).addEventListener('click', ok); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); }); }); }
  /* 행 메뉴(⋯) : items = [{ label, run, danger, hr }] */
  function menuPop(anchor, items) {
    $$('.menu-pop').forEach((x) => x.remove()); const pop = document.createElement('div'); pop.className = 'menu-pop'; pop.setAttribute('role', 'menu');
    pop.innerHTML = items.map((it, i) => (it.hr ? '<hr>' : '<button type="button" role="menuitem" data-i="' + i + '"' + (it.danger ? ' class="is-danger"' : '') + '>' + esc(it.label) + '</button>')).join('');
    document.body.appendChild(pop); const r = anchor.getBoundingClientRect(); const w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px'; pop.style.top = (r.bottom + h + 8 > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
    const close = () => { pop.remove(); document.removeEventListener('mousedown', out, true); document.removeEventListener('keydown', key, true); window.removeEventListener('scroll', close, true); };
    const out = (e) => { if (!pop.contains(e.target)) close(); }; const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); anchor.focus(); } };
    setTimeout(() => { document.addEventListener('mousedown', out, true); document.addEventListener('keydown', key, true); window.addEventListener('scroll', close, true); const f = $('button', pop); if (f) f.focus(); }, 0);
    pop.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const it = items[+b.dataset.i]; close(); if (it && it.run) it.run(); });
    return pop;
  }
  const skeleton = () => '<div class="skel" aria-busy="true" aria-label="불러오는 중"><i></i><i></i><i></i><i></i></div>';
  /* 입력값 검증 (화면) — 서버(validateSettings)도 같은 규칙으로 다시 검사 */
  const V = {
    tel: (v) => !v || (/^[0-9+\-\s().]{4,24}$/.test(v) && v.replace(/\D/g, '').length >= 4) || '전화번호는 숫자와 - 만 입력해 주세요. (예 1600-0000)',
    email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || '이메일 형식이 올바르지 않습니다. (예 name@example.com)',
    url: (v) => !v || /^(https?:\/\/|\/|\.\/|#)/i.test(v) || '주소는 https:// 로 시작해야 합니다.',
    color: (v) => !v || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i.test(v) || '색은 #RRGGBB 또는 rgb() · rgba() 형식으로 입력해 주세요.',
  };
  function validateForm(root) { let ok = true, firstBad = null; $$('[data-v]', root).forEach((el) => { const rule = V[el.dataset.v]; const res = rule ? rule(String(el.value || '').trim()) : true; const bad = res !== true; el.classList.toggle('is-invalid', bad); let msg = el.parentElement.querySelector('.field__err'); if (bad) { if (!msg) { msg = document.createElement('span'); msg.className = 'field__err'; (el.closest('.set-color, .img-pick') || el).insertAdjacentElement('afterend', msg); } msg.textContent = res; ok = false; firstBad = firstBad || el; } else if (msg) msg.remove(); }); if (firstBad) { try { firstBad.focus(); } catch (e) {} } return ok; }
  /* ---- 이미지 최적화(브라우저) : 최대 폭 축소 · WebP 변환 · 모바일(860) · 썸네일(320) ---- */
  function loadImage(file) { return new Promise((resolve, reject) => { const url = URL.createObjectURL(file); const img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다: ' + file.name)); }; img.src = url; }); }
  function drawTo(img, maxW, type, quality) { const scale = Math.min(1, maxW / img.naturalWidth); const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale)); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); return new Promise((resolve) => c.toBlob((b) => resolve(b), type, quality)); }
  async function optimizeImage(file, opts) {
    opts = opts || {}; const out = { main: file, mobile: null, thumb: null, original: null, note: '' };
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return out;   /* GIF · SVG 는 그대로 */
    try {
      const img = await loadImage(file); const maxW = opts.maxWidth || 1920; const type = opts.keepPng && file.type === 'image/png' ? 'image/png' : 'image/webp';
      const main = await drawTo(img, maxW, type, 0.84); if (main && main.size < file.size * 0.98) { out.main = new File([main], file.name.replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.png'), { type }); out.original = opts.keepOriginal ? file : null; out.note = Math.round((1 - main.size / file.size) * 100) + '% 축소'; }
      if (img.naturalWidth > 900) { const m = await drawTo(img, 860, 'image/webp', 0.82); if (m) out.mobile = new File([m], 'm.webp', { type: 'image/webp' }); }
      const t = await drawTo(img, 320, 'image/webp', 0.8); if (t) out.thumb = new File([t], 't.webp', { type: 'image/webp' });
    } catch (e) { /* 실패 시 원본 그대로 */ }
    return out;
  }
  const UPLOAD_MAX = 50 * 1048576;
  function sendUpload(url, fd, onProgress) {   /* 업로드 경로는 이 함수 하나 (POST api/media · api/sites/:id/media → 같은 서버 처리) */
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest(); x.open('POST', apiUrl(url)); x.withCredentials = true; x.setRequestHeader('Accept', 'application/json'); x.setRequestHeader('X-Requested-With', 'XMLHttpRequest'); if (S.token) x.setRequestHeader('Authorization', 'Bearer ' + S.token); if (S.site) x.setRequestHeader('X-Site-Id', String(S.site.id));
      if (onProgress) x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = () => { let j = null; try { j = JSON.parse(x.responseText); } catch (e) {} if (x.status === 401) { reject(new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.')); return; } if (x.status >= 200 && x.status < 300 && j && j.ok !== false) resolve(j); else reject(new Error((j && j.error) || (x.status === 413 ? '파일이 너무 큽니다. (서버 제한 초과)' : '업로드 실패 (' + x.status + ')'))); };
      x.onerror = () => reject(new Error('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.')); x.ontimeout = () => reject(new Error('업로드 시간이 초과되었습니다.')); x.send(fd);
    });
  }
  /* 파일 하나 업로드 → { media } 또는 오류(throw). hooks.onProgress(0~1) */
  async function uploadOne(file, opts, hooks) {
    opts = opts || {}; hooks = hooks || {};
    if (file.size > UPLOAD_MAX) throw new Error('50MB 를 넘는 파일은 올릴 수 없습니다. (' + fmtBytes(file.size) + ')');
    if (!file.size) throw new Error('빈 파일입니다.');
    const o = opts.optimize === false || /^video\//.test(file.type) ? { main: file } : await optimizeImage(file, opts);
    const fd = new FormData(); fd.append('files[]', o.main, o.main.name); if (o.mobile) fd.append('mobile_0', o.mobile, 'm.webp'); if (o.thumb) fd.append('thumb_0', o.thumb, 't.webp'); if (o.original) fd.append('original_0', o.original, file.name);
    if (/^video\//.test(file.type)) { const d = await videoDuration(file).catch(() => 0); if (d) fd.append('duration_0', String(d)); }
    if (opts.folderId) fd.append('folder_id', opts.folderId); if (opts.extra) Object.keys(opts.extra).forEach((k) => fd.append(k, opts.extra[k]));
    const r = await sendUpload(opts.url || 'api/media', fd, hooks.onProgress);
    if (r.errors && r.errors.length && !(r.media || []).length) throw new Error(r.errors[0]);
    if (!(r.media || []).length) throw new Error('서버가 파일을 받지 못했습니다.');
    refreshPublishState(900); return r.media[0];
  }
  async function upload(files, folderId, extra, opts) {
    opts = Object.assign({}, opts || {}, { folderId, extra }); const out = []; const seen = new Set();
    for (const f of Array.from(files)) { const key = f.name + ':' + f.size + ':' + f.lastModified; if (seen.has(key)) continue; seen.add(key); try { out.push(await uploadOne(f, opts)); } catch (e) { toast(f.name + ' : ' + e.message, 'error'); } }
    if (out.length) toast(out.length + '개 업로드 완료' + (out.some((m) => m.duplicate) ? ' (이미 있는 파일은 기존 항목을 사용합니다)' : ''), 'success');
    return out;
  }
  function videoDuration(file) { return new Promise((resolve, reject) => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); }; v.onerror = reject; v.src = URL.createObjectURL(file); }); }
  /* ---- 공통 미디어 창 ----
     pickMedia({ type:'image'|'video'|'all', multiple, title, okLabel, accept, manage }) → 선택한 항목(없으면 null)
     탭 : 업로드 · 이미지 · 영상 / 파일명 검색 · 정렬 · 미사용 파일만 / 썸네일 카드 · 미리보기 · 사용 위치 · 대체 텍스트 · 파일 교체 · 삭제(사용 중이면 불가) */
  function pickMedia(opts) {
    opts = opts || {}; const want = opts.type || 'image'; const manage = !!opts.manage; const canEdit = !S.site || !S.site.menu || S.site.menu.media !== false;
    return new Promise((resolve) => {
      const kinds = (opts.accept === '*/*' ? [['all', '전체 파일']] : []).concat(want !== 'video' ? [['image', '이미지']] : []).concat(want !== 'image' ? [['video', '영상']] : []);
      let tab = kinds[0][0], page = 1, q = '', sort = 'recent', unused = false, selected = [], uploading = false, loadSeq = 0; const recent = [];
      const accept = opts.accept || (want === 'video' ? 'video/mp4,video/webm' : want === 'all' ? 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/gif');
      const m = modal('<div class="tabs" id="mlTabs" role="tablist">' + (canEdit ? '<button type="button" data-ml="upload" role="tab">업로드</button>' : '') + kinds.map((k) => '<button type="button" data-ml="' + k[0] + '" role="tab">' + k[1] + '</button>').join('') + '</div>' +
        '<div class="mlib"><div class="mlib__main"><div id="mlUpload" hidden><input type="file" id="mlFile" class="hidden" multiple accept="' + esc(accept) + '"><div class="dropzone" id="mlDrop" tabindex="0"><b>여기에 파일을 끌어다 놓으세요</b>또는 <a id="mlBrowse" href="#">내 컴퓨터에서 선택</a><br><span class="muted">JPG · PNG · WebP · GIF · SVG' + (want !== 'image' ? ' · MP4 · WebM' : '') + ' · 파일당 최대 50MB · 이미지는 자동으로 용량 최적화(WebP) · 모바일용 · 썸네일이 함께 만들어집니다</span></div><div class="mlib__up" id="mlUpList" style="margin-top:12px"></div></div>' +
        '<div id="mlList"><div class="mlib__bar"><input class="inp" id="mlQ" type="search" placeholder="파일명 검색" aria-label="파일명 검색"><select id="mlSort" aria-label="정렬"><option value="recent">최근 올린 순</option><option value="old">오래된 순</option><option value="name">이름순</option><option value="size">용량 큰 순</option></select><label class="check" style="margin:0"><input type="checkbox" id="mlUnused"> 미사용 파일만</label><span class="muted" id="mlInfo"></span></div><div class="media-grid" id="mlGrid"></div><div class="pager" id="mlPager"></div></div></div>' +
        '<aside class="mlib__side" id="mlSide" aria-live="polite"></aside></div>',
        { title: opts.title || (manage ? '미디어' : want === 'video' ? '영상 선택' : want === 'all' ? '미디어 선택' : '이미지 선택'), large: true, autofocus: false, footer: '<span class="muted" id="mlSel" style="margin-right:auto;font-size:12.5px"></span><button class="btn btn--ghost" data-close>' + (manage ? '닫기' : '취소') + '</button>' + (manage ? '' : '<button class="btn" id="mlOk" disabled>' + esc(opts.okLabel || '선택 완료') + '</button>'), onClose: () => resolve(null) });
      const grid = $('#mlGrid', m), pager = $('#mlPager', m), side = $('#mlSide', m), okBtn = $('#mlOk', m), selInfo = $('#mlSel', m);
      const finish = (v) => { m.onClose = null; resolve(v); m.remove(); };
      const card = (it) => '<button type="button" class="media-item' + (selected.find((s) => s.id === it.id) ? ' is-sel' : '') + '" data-id="' + it.id + '" title="' + esc(it.name) + '"><div class="media-item__img">' + (it.is_image ? '<img src="' + esc(it.thumb) + '" alt="" loading="lazy">' : '<div class="media-item__video">▶ ' + esc(it.duration ? Math.round(it.duration) + '초' : '영상') + '</div>') + '</div><div class="media-item__meta">' + esc(it.name) + '<br><span class="muted">' + (it.width ? it.width + '×' + it.height + ' · ' : '') + fmtBytes(it.size) + '</span></div></button>';
      function setTab(next) { tab = next; $$('[data-ml]', m).forEach((b) => { const on = b.dataset.ml === tab; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }); $('#mlUpload', m).hidden = tab !== 'upload'; $('#mlList', m).hidden = tab === 'upload'; if (tab !== 'upload') { page = 1; load(); } else drawSide(); }
      async function load() {
        const seq = ++loadSeq; grid.innerHTML = '<div class="empty" style="grid-column:1/-1">불러오는 중…</div>';
        let r; try { r = await api('GET', 'api/media?type=' + (tab === 'all' ? '' : tab) + '&per=40&page=' + page + '&sort=' + sort + (unused ? '&unused=1' : '') + '&q=' + encodeURIComponent(q), undefined, { silent: true }); } catch (e) { if (seq !== loadSeq) return; grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>목록을 불러오지 못했습니다</b>' + esc(e.message || '') + '<br><button class="btn btn--sm btn--line" type="button" data-ml-retry>다시 시도</button></div>'; return; }
        if (seq !== loadSeq) return;
        $('#mlInfo', m).textContent = r.total + '개' + (unused ? ' (미사용)' : '') + ' · 전체 ' + fmtBytes(r.total_bytes);
        grid.innerHTML = r.rows.length ? r.rows.map(card).join('') : '<div class="empty" style="grid-column:1/-1"><b>' + (q ? '검색 결과가 없습니다' : unused ? '사용하지 않는 파일이 없습니다' : (tab === 'video' ? '등록된 영상이 없습니다' : '등록된 파일이 없습니다')) + '</b>' + (q ? '다른 파일명으로 검색해 보세요.' : canEdit && !unused ? '[업로드] 탭에서 파일을 올려 주세요.<br><button class="btn btn--sm" type="button" data-ml-goupload>업로드하기</button>' : '') + '</div>';
        r.rows.forEach((it) => { const el = $('[data-id="' + it.id + '"]', grid); if (el) el.__item = it; });
        pager.innerHTML = r.pages > 1 ? Array.from({ length: r.pages }, (_, i) => '<a href="#" data-p="' + (i + 1) + '" class="' + (i + 1 === page ? 'is-on' : '') + '">' + (i + 1) + '</a>').join('') : '';
      }
      function syncSel() { $$('.media-item', grid).forEach((el) => el.classList.toggle('is-sel', !!selected.find((s) => s.id === +el.dataset.id))); selInfo.textContent = selected.length ? selected.length + '개 선택 · ' + selected[selected.length - 1].name : (manage ? '' : '파일을 선택해 주세요. (더블클릭 = 바로 선택)'); if (okBtn) okBtn.disabled = !selected.length; drawSide(); }
      async function drawSide() {
        const it = selected[selected.length - 1];
        if (!it) { side.innerHTML = '<div class="empty" style="padding:24px 0">' + (tab === 'upload' ? '올린 파일은 자동으로 목록에 추가되고 선택됩니다.' : '파일을 누르면 미리보기와 사용 위치가 표시됩니다.') + '</div>'; return; }
        side.innerHTML = '<div class="mlib__preview">' + (it.is_image ? '<img src="' + esc(it.url) + '" alt="">' : '<video src="' + esc(it.url) + '" controls preload="metadata" playsinline></video>') + '</div><div class="mlib__name">' + esc(it.name) + '</div><div class="mlib__meta">' + esc(it.mime || '') + ' · ' + fmtBytes(it.size) + (it.width ? ' · ' + it.width + '×' + it.height : '') + '<br>' + esc(fmtDate(it.created_at)) + '</div>' +
          (canEdit ? '<div class="field"><label>대체 텍스트(alt)</label><input class="inp" id="mlAlt" value="' + esc(it.alt || '') + '" placeholder="이미지를 설명하는 문장"></div>' : '') + '<h4>사용 위치</h4><ul class="mlib__usage" id="mlUsage"><li class="muted">확인 중…</li></ul>' +
          (canEdit ? '<div class="row"><input type="file" id="mlRep" class="hidden" accept="' + (it.is_image ? 'image/*' : 'video/mp4,video/webm') + '"><button class="btn btn--xs btn--line" type="button" id="mlRepBtn" title="주소는 그대로 두고 파일만 바꿉니다 (사용 중인 모든 곳에 반영 · 게시 필요)">파일 교체</button><button class="btn btn--xs btn--danger" type="button" id="mlDel" disabled>삭제</button><a class="btn btn--xs btn--ghost" href="' + esc(it.original || it.url) + '" target="_blank" rel="noopener">원본 보기</a></div><p class="help" id="mlDelHelp"></p>' : '');
        let usages = [];
        try { usages = (await api('GET', 'api/media/' + it.id + '/usages', undefined, { silent: true })).usages || []; } catch (e) { usages = null; }
        if (selected[selected.length - 1] !== it) return; const ul = $('#mlUsage', side); if (!ul) return;
        if (usages === null) { ul.innerHTML = '<li class="down">사용 위치를 확인하지 못했습니다. (안전을 위해 삭제할 수 없습니다)</li>'; return; }
        const live = usages.filter((u) => u.scope === 'live'), hist = usages.filter((u) => u.scope !== 'live');
        ul.innerHTML = usages.length ? live.map((u) => '<li>' + esc(u.title) + '</li>').join('') + hist.map((u) => '<li class="muted">' + esc(u.title) + '</li>').join('') : '<li class="muted">사용 중인 곳이 없습니다.</li>';
        const del = $('#mlDel', side), help = $('#mlDelHelp', side); if (!del) return;
        del.disabled = live.length > 0; help.textContent = live.length ? '사용 중인 파일은 삭제할 수 없습니다. 위 위치에서 다른 파일로 바꾼 뒤 [게시]하면 삭제할 수 있습니다.' : hist.length ? '지금은 쓰지 않지만 이전 게시본 · 이전 버전에 남아 있습니다. 삭제하면 그 버전으로 복원했을 때 이미지가 비어 보입니다.' : '어디에서도 사용하지 않는 파일입니다.';
        del.onclick = async () => { if (!(await confirm((hist.length ? '이전 게시본 · 이전 버전에서 사용한 파일입니다. 삭제하면 그 버전으로 복원했을 때 이미지가 비어 보입니다.\n\n' : '') + '"' + it.name + '" 파일을 삭제할까요? 되돌릴 수 없습니다.', { danger: true, ok: '삭제' }))) return; try { await api('DELETE', 'api/media/' + it.id + (hist.length ? '?force=1' : '')); } catch (e) { drawSide(); return; } selected = selected.filter((s) => s.id !== it.id); toast('삭제했습니다.', 'success'); await load(); syncSel(); };
        $('#mlAlt', side).addEventListener('change', async (e) => { try { await api('PATCH', 'api/media/' + it.id, { alt: e.target.value }); it.alt = e.target.value; toast('대체 텍스트를 저장했습니다.', 'success'); } catch (x) {} });
        $('#mlRepBtn', side).addEventListener('click', () => $('#mlRep', side).click());
        $('#mlRep', side).addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; const btn = $('#mlRepBtn', side); btn.disabled = true; btn.classList.add('is-busy'); try { const fd = new FormData(); const o = it.is_image ? await optimizeImage(f) : { main: f }; fd.append('file', o.main, o.main.name); if (o.thumb) fd.append('thumb_0', o.thumb, 't.webp'); if (o.mobile) fd.append('mobile_0', o.mobile, 'm.webp'); await sendUpload('api/media/' + it.id + '/replace', fd); toast('파일을 교체했습니다. 사용 중인 모든 곳에 새 파일이 표시됩니다. (공개 홈페이지는 게시 후)', 'success'); selected = []; await load(); syncSel(); } catch (x) { toast('교체 실패 : ' + x.message, 'error'); btn.disabled = false; btn.classList.remove('is-busy'); } });
      }
      /* 업로드 : 파일마다 진행률 · 실패 사유 표시 — 올리는 동안 같은 파일을 다시 올리지 못하게 막음 */
      async function uploadFiles(fileList) {
        if (uploading) { toast('업로드가 진행 중입니다. 끝난 뒤 다시 시도해 주세요.', 'info'); return; }
        const files = Array.from(fileList); if (!files.length) return; uploading = true; $('#mlDrop', m).classList.add('is-busy'); const list = $('#mlUpList', m); const okItems = []; const seen = new Set();
        for (const f of files) {
          const row = document.createElement('div'); row.className = 'mlib__upitem'; row.innerHTML = '<span>' + esc(f.name) + '</span><div class="mlib__prog"><b></b></div><i>대기</i>'; list.prepend(row); const bar = $('b', row), st = $('i', row);
          const fail = (msg) => { row.classList.add('is-bad'); st.textContent = msg; $('.mlib__prog', row).remove(); };
          const key = f.name + ':' + f.size + ':' + f.lastModified; if (seen.has(key) || recent.includes(key)) { fail('이미 올린 파일입니다 (중복 업로드 방지)'); continue; } seen.add(key);
          const okType = accept === '*/*' || accept.split(',').some((a) => a.trim() === f.type || (a.trim().slice(-2) === '/*' && f.type.indexOf(a.trim().slice(0, -1)) === 0)); if (!okType) { fail('지원하지 않는 형식입니다 (' + (f.type || '알 수 없음') + ')'); continue; }
          st.textContent = '준비 중';
          try { const media = await uploadOne(f, { optimize: !/^video\//.test(f.type) }, { onProgress: (r) => { bar.style.width = Math.round(r * 100) + '%'; st.textContent = Math.round(r * 100) + '%'; } }); bar.style.width = '100%'; row.classList.add('is-ok'); st.textContent = media.duplicate ? '이미 등록된 파일 — 기존 항목 사용' : '완료'; okItems.push(media); recent.push(key); }
          catch (e) { fail(e.message || '업로드 실패'); }
        }
        uploading = false; $('#mlDrop', m).classList.remove('is-busy'); $('#mlFile', m).value = '';
        if (okItems.length) { const last = okItems[okItems.length - 1]; selected = opts.multiple ? okItems.slice() : [last]; const kind = last.is_image ? 'image' : 'video'; q = ''; $('#mlQ', m).value = ''; sort = 'recent'; $('#mlSort', m).value = 'recent'; unused = false; $('#mlUnused', m).checked = false; tab = kinds.find((k) => k[0] === kind) ? kind : kinds[0][0]; page = 1; setTab(tab); setTimeout(syncSel, 50); toast(okItems.length + '개 업로드 완료 — 목록에서 바로 선택되었습니다.', 'success'); }
      }
      m.addEventListener('click', (e) => {
        const tb = e.target.closest('[data-ml]'); if (tb) { setTab(tb.dataset.ml); return; }
        if (e.target.closest('#mlBrowse')) { e.preventDefault(); $('#mlFile', m).click(); return; }
        if (e.target.closest('[data-ml-goupload]')) { setTab('upload'); return; } if (e.target.closest('[data-ml-retry]')) { load(); return; }
        const pg = e.target.closest('[data-p]'); if (pg) { e.preventDefault(); page = +pg.dataset.p; load(); return; }
        const el = e.target.closest('.media-item'); if (!el || !el.__item) return; const it = el.__item;
        if (opts.multiple) { const i = selected.findIndex((s) => s.id === it.id); if (i >= 0) selected.splice(i, 1); else selected.push(it); } else selected = selected.length && selected[0].id === it.id && manage ? [] : [it];
        syncSel();
      });
      grid.addEventListener('dblclick', (e) => { const el = e.target.closest('.media-item'); if (!el || !el.__item || manage) return; finish(opts.multiple ? [el.__item] : el.__item); });
      let qt; $('#mlQ', m).addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value.trim(); page = 1; load(); }, 300); });
      $('#mlSort', m).addEventListener('change', (e) => { sort = e.target.value; page = 1; load(); }); $('#mlUnused', m).addEventListener('change', (e) => { unused = e.target.checked; page = 1; load(); });
      const fileInp = $('#mlFile', m); if (fileInp) { fileInp.addEventListener('change', (e) => uploadFiles(e.target.files)); const dz = $('#mlDrop', m); dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInp.click(); } }); ['dragenter', 'dragover'].forEach((ev) => m.addEventListener(ev, (e) => { if (!canEdit) return; e.preventDefault(); if (tab !== 'upload') setTab('upload'); dz.classList.add('is-over'); })); ['dragleave', 'drop'].forEach((ev) => m.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-over'); })); m.addEventListener('drop', (e) => { if (canEdit && e.dataTransfer && e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }); }
      if (okBtn) okBtn.addEventListener('click', () => { if (selected.length) finish(opts.multiple ? selected : selected[selected.length - 1]); });
      setTab(tab); syncSel();
    });
  }
  function fmtBytes(b) { b = +b || 0; return b > 1048576 ? (b / 1048576).toFixed(1) + 'MB' : b > 1024 ? Math.round(b / 1024) + 'KB' : b + 'B'; }
  function fmtNum(n) { return (+n || 0).toLocaleString('ko-KR'); }
  function fmtDate(s, short) { if (!s) return '-'; s = String(s); return short ? s.slice(5, 16) : s.slice(0, 16); }
  function sortable(container, opts) {
    opts = opts || {}; const sel = opts.selector || '.sort-item'; let dragging = null;
    container.addEventListener('dragstart', (e) => { const it = e.target.closest(sel); if (!it || it.parentElement !== container) return; if (opts.handle && !e.target.closest(opts.handle) && !it.__handleDown) { e.preventDefault(); return; } dragging = it; it.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (x) {} });
    container.addEventListener('dragover', (e) => { if (!dragging) return; e.preventDefault(); const over = e.target.closest(sel); if (!over || over === dragging || over.parentElement !== container) return; const r = over.getBoundingClientRect(); const before = (opts.horizontal ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2); container.insertBefore(dragging, before ? over : over.nextSibling); });
    container.addEventListener('dragend', () => { if (!dragging) return; dragging.classList.remove('is-dragging'); dragging = null; $$(sel, container).forEach((x) => { x.__handleDown = false; }); if (opts.onEnd) opts.onEnd($$(sel, container).filter((x) => x.parentElement === container)); });
    if (opts.handle) container.addEventListener('mousedown', (e) => { const h = e.target.closest(opts.handle); if (h) { const it = h.closest(sel); if (it) it.__handleDown = true; } });
    $$(sel, container).forEach((x) => x.setAttribute('draggable', 'true'));
    return { refresh: () => $$(sel, container).forEach((x) => x.setAttribute('draggable', 'true')) };
  }
  /* ---------- 게시 ----------
     저장 안 된 변경 자동 저장 → 게시 작업 시작 → 진행 단계 표시(게시 준비 · 공개 서버 전송 · 공개 주소 확인) → 공개 주소에서 같은 버전이 확인된 경우에만 '게시 완료'
     실패하면 실패한 단계 · 이유 · [다시 시도] 를 보여 주고, 공개 홈페이지는 이전 게시 버전 그대로 둡니다. */
  const PUB_STEPS = [['save', '변경사항 저장'], ['compile', '게시 데이터 생성'], ['prepare', '공개용 파일 준비'], ['connect', '공개 서버 연결'], ['upload', '공개 서버로 전송'], ['switch', '게시 데이터 교체'], ['verify', '공개 주소에서 확인'], ['finalize', '게시 완료 처리']];
  let pending = null;   /* 저장하지 않은 설정 화면 : { label, save() } — [게시하기]가 먼저 저장 */
  function setPending(label, save) { pending = save ? { label, save } : null; document.body.classList.toggle('has-pending', !!pending); }
  async function savePending() { if (!pending) return true; const p = pending; try { await p.save(); if (pending === p) setPending(null); return true; } catch (e) { toast('[' + p.label + '] 을(를) 저장하지 못해 게시를 중단했습니다 : ' + (e.message || ''), 'error'); return false; } }
  function publishResultHtml(r) {
    const ok = r && r.ok; const st = r && r.status; const dep = (r && r.deploy) || {}; const checks = (r && r.verify && r.verify.checks) || [];
    const head = (!ok && r && r.cancelled) ? '<div class="alert alert--warn"><span><b>게시 취소</b> · ' + esc(r.error || '') + '</span></div>' : !ok ? '<div class="alert alert--error"><span><b>게시 실패</b> · ' + esc((PUB_STEPS.find((s) => s[0] === r.failedStep) || ['', r.failedStep || '게시'])[1]) + ' 단계에서 중단되었습니다.<br>' + esc(r.error || '') + '</span></div><p class="help">공개 홈페이지에는 <b>이전 게시 버전이 그대로</b> 표시됩니다. 원인을 해결한 뒤 [다시 시도]를 눌러 주세요.</p>'
      : st === 'local-only' ? '<div class="alert alert--error"><span><b>' + (S.platform === 'php' ? '게시 실패 · 공개 홈페이지 반영을 확인하지 못했습니다 (v' + r.version + ')' : '이 PC 의 서버에만 게시되었습니다 (v' + r.version + ')') + '</b><br>' + esc(r.warning || '') + '</span></div>'
        : '<div class="alert alert--ok"><span><b>게시 완료 · v' + r.version + '</b>' + (dep.mode === 'ftp' ? ' — 공개 서버로 전송하고 공개 주소에서 같은 버전을 확인했습니다.' : dep.mode === 'server' ? ' — 운영 서버에 게시 파일(index.html)을 저장하고 공개 주소에서 같은 버전을 확인했습니다.' : ' — 공개 홈페이지가 이 서버의 게시 데이터를 읽고 있습니다.') + '</span></div>';
    const rows = [];
    if (r && r.version) rows.push(['게시 버전', 'v' + r.version + (r.restoredFrom ? ' (v' + r.restoredFrom + ' 복원)' : '')]);
    if (r && r.domain) rows.push(['공개 도메인', esc(r.domain)]);
    if (dep.mode === 'ftp' && dep.ok) rows.push(['전송', '홈페이지 파일 ' + (dep.files || 0) + '개 · 업로드 이미지 ' + (dep.uploaded || 0) + '개 → ' + esc(dep.target || '') + (dep.relay ? ' · 공개 접수 API 설정 포함' : '')]);
    if (r && r.formsPromoted) rows.push(['폼', '폼 초안 ' + r.formsPromoted + '개를 공개용으로 반영']);
    if (r && r.files && r.files.length) rows.push(['바뀐 파일', esc(r.files.join(' · '))]);
    if (r && r.ok) rows.push(['자동 백업', r.backup ? '게시 직전 홈페이지 → ' + esc(r.backup) + ' <small class="muted">(게시 이력 · 버전 › 홈페이지 백업에서 복원)</small>' : '<span class="muted">백업할 이전 파일 없음</span>']);
    if (r && r.guardNotes && r.guardNotes.length) rows.push(['참고', esc(r.guardNotes.join(' '))]);
    if (dep.warnings && dep.warnings.length) rows.push(['자동 정리', dep.warnings.length + '곳의 주소를 공개용으로 바꿨습니다 (' + esc(dep.warnings.slice(0, 3).map((w) => w.reason + (w.path ? ':' + w.path : '')).join(', ')) + ')']);
    return head + (rows.length ? '<table class="tbl tbl--kv">' + rows.map((x) => '<tr><th>' + x[0] + '</th><td>' + x[1] + '</td></tr>').join('') + '</table>' : '') +
      (checks.length ? '<ul class="pub-checks">' + checks.map((c) => '<li class="' + (c.ok ? 'is-ok' : 'is-bad') + '"><i>' + (c.ok ? '✓' : '✕') + '</i><span>' + esc({ version: '게시 버전', config: '연결 설정', html: '홈페이지 파일', relay: '공개 접수 API', 'html-localhost': 'localhost 주소', url: '공개 주소' }[c.key] || c.key) + '</span><small>' + esc(c.detail) + '</small></li>').join('') + '</ul>' : '');
  }
  /* opts : { title, start() → { job } | 결과 } — 끝나면 결과(r.ok) 를 돌려줌 · 창을 닫아도 게시는 서버에서 계속됨 */
  function runPublish(opts) {
    return new Promise((resolve) => {
      let result = null, stopped = false, timer = null;
      const m = modal('<div class="pub-run"><ol class="pub-steps" id="pubSteps">' + PUB_STEPS.map((s) => '<li data-step="' + s[0] + '"><i></i><span>' + s[1] + '</span><small></small></li>').join('') + '</ol><div id="pubOut"></div></div>', { title: opts.title || '게시', footer: '<span class="help" id="pubHint" style="margin-right:auto">창을 닫아도 게시는 계속 진행됩니다.</span><button class="btn btn--ghost" data-close id="pubClose">닫기</button>', onClose: () => { stopped = true; clearTimeout(timer); resolve(result); } });   /* 결과가 나오면 바로 resolve (창은 사용자가 닫을 때까지 유지) · 창을 먼저 닫으면 null — 게시는 서버에서 계속되고 상단 배지에 결과가 표시됨 */
      const mark = (key, state, note) => { const li = $('[data-step="' + key + '"]', m); if (!li) return; li.className = state; if (note !== undefined) $('small', li).textContent = note; };
      const upTo = (key, failed) => { let hit = false; PUB_STEPS.forEach((s) => { if (s[0] === key) { hit = true; mark(s[0], failed ? 'is-bad' : 'is-run'); } else if (!hit) mark(s[0], 'is-ok'); }); };
      const finish = (r) => {
        result = r; const out = $('#pubOut', m); const hint = $('#pubHint', m); if (hint) hint.textContent = '';
        if (opts.onDone) { try { opts.onDone(r); } catch (e) {} } document.dispatchEvent(new CustomEvent('wb:publish-done', { detail: r })); resolve(r);
        if (r && r.ok) { PUB_STEPS.forEach((s) => { const li = $('[data-step="' + s[0] + '"]', m); if (li && !li.className) li.className = 'is-skip'; else if (li && li.className === 'is-run') li.className = 'is-ok'; }); mark('finalize', 'is-ok'); }
        else upTo((r && r.failedStep) || 'compile', true);
        out.innerHTML = publishResultHtml(r || { ok: false, error: '게시 결과를 받지 못했습니다.' });
        const foot = $('.modal__foot', m); const extra = document.createElement('span'); extra.className = 'row';
        extra.innerHTML = (r && r.ok && r.publicUrl ? '<a class="btn btn--line" href="' + esc(r.publicUrl) + '" target="_blank" rel="noopener" id="pubOpen">공개 페이지 열기 ↗</a>' : '') + (r && !r.ok ? '<button class="btn" type="button" id="pubRetry">다시 시도</button>' : '');
        foot.insertBefore(extra, $('#pubClose', m));
        const rt = $('#pubRetry', m); if (rt) rt.addEventListener('click', () => { stopped = true; clearTimeout(timer); runPublish(Object.assign({}, opts, { start: opts.retry || opts.start })); m.remove(); });
        /* 메인(또는 공통 내용)이 비어서 막힌 경우 : 지금 공개 중인 홈페이지 내용으로 다시 채우기 */
        if (r && !r.ok && /비어 있습니다/.test(String(r.error || ''))) {
          const fix = document.createElement('button'); fix.className = 'btn btn--line'; fix.type = 'button'; fix.id = 'pubFix'; fix.textContent = '공개 홈페이지에서 내용 다시 가져오기';
          extra.insertBefore(fix, extra.firstChild);
          fix.addEventListener('click', async () => {
            fix.disabled = true; fix.textContent = '복구 중…';
            const sid = S.site && S.site.id;
            let done = '';
            try {
              /* 1) 메인 페이지부터 되살립니다 (게시가 막히는 가장 흔한 원인) */
              try { const rm = await api('POST', 'api/sites/' + sid + '/pages/repair-main', {}, { silent: true }); if (rm && rm.sections) done = '메인 화면 구성 ' + rm.sections + '개를 되살렸습니다.'; } catch (e0) {}
              /* 2) 나머지 페이지도 지금 공개 중인 내용으로 다시 채웁니다 */
              const rr = await api('POST', 'api/sites/' + sid + '/pages/import', { force: true });
              toast((done ? done + ' ' : '') + '공개 홈페이지에서 페이지 ' + ((rr && rr.pages) || 0) + '개를 다시 가져왔습니다. 에디터를 새로 열고 [게시]를 다시 눌러 주세요.', 'success');
              m.remove();
              if (window.WBEditor && WBEditor.isOpen()) { WBEditor.close(true); }
              if (window.App) App.go('editor', {}, true);
            } catch (e2) { fix.disabled = false; fix.textContent = '공개 홈페이지에서 내용 다시 가져오기'; }
          });
        }
        refreshPublishState();
      };
      const poll = async (jobId) => {
        if (stopped && result) return;
        try { const r = await api('GET', 'api/publish-jobs/' + jobId, undefined, { silent: true }); const j = r.job; (j.steps || []).forEach((s) => mark(s.key, 'is-ok')); if (j.state === 'running') { upTo(j.step === 'start' ? 'compile' : j.step, false); if (j.progress) mark(j.step, 'is-run', j.progress.n + ' / ' + j.progress.total + ' · ' + j.progress.file); timer = setTimeout(() => poll(jobId), 700); return; } finish(j.result || { ok: false, error: j.error }); }
        catch (e) { finish({ ok: false, failedStep: 'compile', error: e.message || '게시 상태를 확인할 수 없습니다.' }); }
      };
      (async () => {
        mark('save', 'is-run'); mark('save', 'is-ok'); mark('compile', 'is-run');
        const stepper = { step: (k, note) => { upTo(k, false); if (note) mark(k, 'is-run', note); } };
        try {
          let r = await opts.start(stepper);
          if (r && r.job && S.platform !== 'php') { poll(r.job); return; }   /* 운영(PHP) : 진행 상태 API 가 없으므로 폴링하지 않음 */
          /* 운영(PHP) 서버 : 페이지 게시본만 확정되고 needsSitePublish 가 오면, 같은 창에서 공개 홈페이지(index.html) 생성 · 저장 · 공개 주소 확인까지 이어서 끝냅니다.
             (게시 · 게시 중지 · 공개/비공개 등 페이지 게시를 부르는 모든 곳에 적용) */
          if (r && r.ok && r.needsSitePublish && S.site) {
            const sr = await clientPublish(S.site.id, opts.note || String(opts.title || '페이지 게시').replace(/^.*?·\s*/, '') + ' 게시', stepper);
            sr.pagePublished = true; if (r.summary) sr.summary = r.summary; r = sr;
          }
          finish(r);
        }
        catch (e) { const d = e.data || {}; finish(d.version ? d : { ok: false, cancelled: !!(e.cancelled || d.cancelled), failedStep: d.failedStep || 'compile', error: e.message || '게시를 시작하지 못했습니다.' }); }
      })();
    });
  }
  async function publishSite(note, o) {
    o = o || {}; if (!S.site) return null;
    if (window.WBEditor && WBEditor.isOpen()) { try { await WBEditor.flush(); } catch (e) {} }
    if (!(await savePending())) return null;
    let st = null; try { st = await api('GET', 'api/sites/' + S.site.id + '/publish-status', undefined, { silent: true }); } catch (e) {}
    if (st && st.job) { toast('이미 게시가 진행 중입니다. 잠시 후 다시 확인해 주세요.', 'info'); return null; }
    const lines = st ? [st.pages.length ? '수정한 페이지 ' + st.pages.length + '개 (' + st.pages.slice(0, 4).map((p) => p.title).join(', ') + (st.pages.length > 4 ? ' …' : '') + ')' : '', st.formDirty || st.formDrafts ? '폼 초안 ' + st.formDrafts + '개' : '', st.settingsChanged ? '사이트 설정 · 메뉴 · 팝업 · SEO 등 변경' : ''].filter(Boolean) : [];
    const msg = '[' + S.site.name + '] 의 저장된 내용을 공개 홈페이지에 반영합니다.\n' + (lines.length ? '\n· ' + lines.join('\n· ') + '\n' : (st && !st.dirty ? '\n(마지막 게시 이후 바뀐 내용이 없습니다 — 그래도 다시 게시할 수 있습니다)\n' : '')) + '\n' + (st && st.mode === 'ftp' ? '공개 서버(' + st.domain + ')로 전송한 뒤 공개 주소에서 확인합니다.' : S.platform === 'php' ? '바뀌는 파일 : /index.html · /sitemap.xml · /robots.txt\n지금 공개 중인 index.html 은 게시 직전에 자동 백업되고, 게시 이력 › 홈페이지 백업에서 되돌릴 수 있습니다.' : '이 서버의 게시 데이터를 갱신합니다.');
    if (!o.skipConfirm && !(await confirm(msg, { ok: '게시', title: '사이트 게시' }))) return null;
    if (S.platform === 'php') return runPublish({ title: '사이트 게시 · ' + S.site.name, start: (job) => clientPublish(S.site.id, note || '', job) });
    const body = { note: note || '', pages: 'changed', async: true, force: !!o.force };
    return runPublish({ title: '사이트 게시 · ' + S.site.name, start: () => api('POST', 'api/sites/' + S.site.id + '/publish', body, { silent: true }) });
  }
  /* 게시 상태 배지 (상단) : 변경사항 있음 · 게시 중 · 게시 완료 · 이 PC 에만 게시 · 게시 실패 */
  let pubStateTimer = null, pubState = null;
  function refreshPublishState(delay) { clearTimeout(pubStateTimer); pubStateTimer = setTimeout(async () => { const el = $('#tbPubState'); if (!S.site || !S.token) return; try { pubState = await api('GET', 'api/sites/' + S.site.id + '/publish-status', undefined, { silent: true }); } catch (e) { return; } drawPublishState(el || $('#tbPubState')); document.dispatchEvent(new CustomEvent('wb:publish-state', { detail: pubState })); }, delay == null ? 300 : delay); }
  function drawPublishState(el) {
    if (!el || !pubState) return; const p = pubState; let cls = 'is-ok', text = '';
    if (p.job) { cls = 'is-run'; text = '게시 중 · ' + (p.job.stepText || ''); }
    else if (p.never) { cls = 'is-warn'; text = '아직 게시 안 함'; }
    else if (p.last && p.last.status === 'failed') { cls = 'is-bad'; text = '게시 실패 v' + p.last.version + ' · 공개는 v' + (p.current ? p.current.version : '-'); }
    else if (p.dirty) { cls = 'is-warn'; text = '변경사항 있음 · 게시 필요'; }
    else if (p.current && p.current.status === 'local-only') { cls = 'is-warn'; text = '이 PC 에만 게시됨 v' + p.current.version; }
    else { text = '게시 완료 v' + (p.current ? p.current.version : ''); }
    el.className = 'tb__pub ' + cls; el.textContent = text; el.hidden = false;
    el.title = (p.current ? '공개 버전 v' + p.current.version + ' · ' + fmtDate(p.current.at, true) + ' · ' + (p.current.by || '시스템') : '게시 이력 없음') + (p.domain ? ' · ' + p.domain : '') + (p.last && p.last.error ? '\n마지막 오류 : ' + p.last.error : '') + '\n클릭하면 게시 이력을 엽니다.';
  }
  /* ---------- 운영(PHP) 서버 : 번들(DB 행) + 홈페이지 템플릿 → 공용 코어(WBCore)로 게시 파일 생성 → 서버 저장 → 공개 주소 확인 ---------- */
  const tplCache = {};
  async function loadTemplates(siteId) {
    if (S.platform !== 'php') return api('GET', 'api/sites/' + siteId + '/tpl', undefined, { silent: true });
    if (tplCache.data) return tplCache.data;
    const get = async (n) => { const r = await fetch(new URL('tpl/' + n + '?v=' + encodeURIComponent(S.version || ''), location.href).href, { cache: 'no-cache' }); if (!r.ok) throw new Error('홈페이지 템플릿을 읽지 못했습니다 : tpl/' + n + ' (' + r.status + ')'); return r.text(); };
    const names = ['index.html', 'style.css', 'site-data.js', 'cms.js', 'common.js', 'main.js', 'subpage.js']; const tx = await Promise.all(names.map(get));
    let ver = ''; try { const rv = await fetch(new URL('tpl/version.json?t=' + Date.now(), location.href).href, { cache: 'no-store' }); if (rv.ok) { const j = await rv.json(); ver = String((j && j.version) || ''); } } catch (e) {}
    tplCache.data = { index: tx[0], css: tx[1], js: { 'site-data': tx[2], cms: tx[3], common: tx[4], main: tx[5], subpage: tx[6] }, version: ver }; return tplCache.data;
  }
  /* ---------- 게시 전 점검 : 지금 공개 중인 홈페이지(/index.html)를 기준으로 비교 ----------
     · 게시하면 사라지는 페이지(예 : 사업개요 #page=overview) → 경고 후 기본값 [게시 취소]
     · 공개 홈페이지가 관리자 게시용 원본보다 최신(원본 버전 표시 wb-tpl) → 경고
     · 새 게시 파일이 단일 파일 구조(#page=)가 아니면 저장하지 않음 (subpage.html?page= 구조로 되돌아가지 않게) */
  function readPublished(html) {
    const m = /window\.CMS_PUBLISHED\s*=\s*/.exec(html || ''); if (!m) return null;
    let i = m.index + m[0].length, d = 0, q = null, k = i;
    for (; k < html.length; k++) { const c = html[k]; if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; } if (c === '"') { q = c; continue; } if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
    try { return JSON.parse(html.slice(i, k + 1)); } catch (e) { return null; }
  }
  const livePages = (d) => Object.keys((d && d.pages) || {}).filter((k) => ((d.pages[k] || {}).enabled !== false));
  /* 지금 공개 중인 홈페이지(index.html) 원문 · 그 안의 CMS_CONFIG (예약 접수 주소 등) */
  async function fetchLive(b, siteId) {
    let html = ''; try { const r = await api('GET', 'api/sites/' + siteId + '/publish/live', undefined, { silent: true }); html = (r && r.html) || ''; } catch (e) {}   /* 1순위 : 서버에 있는 홈페이지 파일 그대로 */
    const pub = String(b.publicUrl || b.self || location.origin).replace(/\/(index\.html)?$/, '') + '/index.html';
    if (!html) { let same = false; try { same = new URL(pub, location.href).origin === location.origin; } catch (e) {} if (same) { try { const res = await fetch(pub + '?t=' + Date.now(), { cache: 'no-store' }); if (res.ok) html = await res.text(); } catch (e) {} } }   /* 2순위 : 같은 주소(도메인)일 때만 직접 읽기 */
    let cfg = null; const m = /window\.CMS_CONFIG\s*=\s*(\{[^<]*?\})\s*;?\s*(?:<\/script>|\n)/.exec(html); if (m) { try { cfg = JSON.parse(m[1]); } catch (e) { cfg = null; } }
    return { html, cfg };
  }
  /* 공개 홈페이지가 쓰는 예약 접수 주소가 같은 서버의 상대 주소(예 ./wb-api/reserve.php)면 그대로 유지 */
  const keepReserve = (cfg) => { const r = cfg && typeof cfg.reserve === 'string' ? cfg.reserve.trim() : ''; return (r && /^\.?\/[^:]*$/.test(r) && !/^\/\//.test(r)) ? r : ''; };
  async function publishGuard(b, data, builtHtml, tplVersion, live) {
    const out = { issues: [], notes: [], blocked: '' };
    if (!/"single":true/.test(builtHtml || '')) out.blocked = '새 게시 파일이 현재 홈페이지 구조(단일 파일 · #page= 주소)와 다릅니다. 공개 홈페이지를 보호하기 위해 게시하지 않았습니다.';
    const cur = (live && live.html) || '';
    if (!cur) { out.notes.push('지금 공개 중인 홈페이지를 읽지 못해 비교하지 못했습니다.'); return out; }
    const kr = keepReserve(live.cfg); if (kr) out.notes.push('방문예약 접수 주소는 지금 공개 중인 홈페이지와 같게 유지합니다 (' + kr + ').');
    const curData = readPublished(cur); const before = livePages(curData); const after = livePages(data);
    const gone = before.filter((k) => after.indexOf(k) < 0);
    if (gone.length) out.issues.push('게시하면 공개 홈페이지에서 사라지는 페이지 : ' + gone.map((k) => ((curData.pages[k] || {}).title || k) + ' (#page=' + k + ')').join(', ') + ' — 그 페이지가 [게시 중지] 또는 [숨김] 상태인지 확인해 주세요.');
    /* 메인 섹션 · 공통 내용이 통째로 비면 홈페이지가 빈 화면이 됩니다 → 게시하지 않음 */
    const secBefore = ((curData && curData.sections) || []).length, secAfter = ((data && data.sections) || []).length;
    if (secBefore > 0 && secAfter === 0) out.blocked = '새 게시 파일의 메인 화면 구성이 비어 있습니다 (지금 ' + secBefore + '개 → 0개). 공개 홈페이지가 빈 화면이 되므로 게시하지 않았습니다. 에디터에서 [메인] 페이지를 열어 내용을 확인해 주세요.';
    const conBefore = Object.keys((curData && curData.content) || {}).length, conAfter = Object.keys((data && data.content) || {}).length;
    if (!out.blocked && conBefore > 0 && conAfter === 0) out.blocked = '새 게시 파일의 공통 내용(사업개요 본문 등)이 비어 있습니다 (지금 ' + conBefore + '개 → 0개). 공개 홈페이지가 깨지므로 게시하지 않았습니다.';
    const curTpl = (/<meta name="wb-tpl" content="([^"]*)"/.exec(cur) || [])[1] || '';
    if (tplVersion && curTpl && curTpl > tplVersion) out.issues.push('지금 공개 중인 홈페이지(원본 ' + curTpl + ')가 관리자 게시용 원본(' + tplVersion + ')보다 최신입니다. 게시하면 예전 원본으로 다시 만들어집니다.');
    if (!curTpl) out.notes.push('지금 공개 중인 홈페이지는 원본 버전 표시가 없는 파일(직접 올린 파일)입니다. 게시하면 관리자 게시용 원본' + (tplVersion ? '(' + tplVersion + ')' : '') + '으로 다시 만들어지고, 게시 직전 상태는 자동 백업됩니다.');
    return out;
  }
  function loadBundle(siteId) { return api('GET', 'api/sites/' + siteId + '/bundle', undefined, { silent: true }); }
  /* 미리보기용 컴파일(초안 포함) : 개발 서버는 서버가, 운영 서버는 브라우저가 같은 코어로 */
  async function compilePreview(siteId) { siteId = siteId || (S.site && S.site.id); if (S.platform !== 'php') return api('GET', 'api/sites/' + siteId + '/compiled', undefined, { silent: true }); const b = await loadBundle(siteId); return WBCore.compileFrom(b.src, { base: b.base, apiBase: b.siteApi || '' }, { preview: true, formDrafts: true }); }
  async function previewToken(page, opts) { opts = opts || {}; const siteId = S.site.id; if (S.platform !== 'php') return api('GET', 'api/sites/' + siteId + '/preview-token?page=' + encodeURIComponent(page || 'main'), undefined, opts); const data = await compilePreview(siteId); return api('POST', 'api/sites/' + siteId + '/preview', { page: page || 'main', data }, opts); }
  async function previewSite(page) { if (!S.site) return; const r = await previewToken(page); if (!/^https?:\/\//.test(r.url)) { toast('사이트 관리에서 공개 홈페이지 주소를 먼저 입력해 주세요.', 'error'); return; } window.open(r.url, 'wb_preview'); }
  async function verifyPublic(url, version, siteId) { const checks = []; let same = true; try { same = new URL(url, location.href).origin === location.origin; } catch (e) {} if (!same && siteId) { try { const lv = await api('GET', 'api/sites/' + siteId + '/publish/live', undefined, { silent: true }); if (lv && lv.hosted && lv.html) { const m0 = /"cms":\{[^}]*"version":(\d+)/.exec(lv.html) || /window\.CMS_PUBLISHED\s*=\s*\{[\s\S]{0,400}?"version":(\d+)/.exec(lv.html); const v0 = m0 ? +m0[1] : null; checks.push({ key: 'html', ok: v0 === version, detail: '서버의 홈페이지 파일 · 공개 버전 ' + (v0 == null ? '확인 불가' : 'v' + v0) + ' / 게시 v' + version }); return { ok: checks.every((c) => c.ok), checks }; } } catch (e) {} } try { const res = await fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' }); const text = await res.text(); const m = /"cms":\{[^}]*"version":(\d+)/.exec(text) || /window\.CMS_PUBLISHED\s*=\s*\{[\s\S]{0,400}?"version":(\d+)/.exec(text); const v = m ? +m[1] : null; checks.push({ key: 'html', ok: res.ok && v === version, detail: 'HTTP ' + res.status + ' · 공개 버전 ' + (v == null ? '확인 불가' : 'v' + v) + ' / 게시 v' + version }); } catch (e) { checks.push({ key: 'html', ok: false, detail: '공개 주소에 연결할 수 없습니다 : ' + (e.message || '') }); } return { ok: checks.every((c) => c.ok), checks }; }
  async function clientPublish(siteId, note, job, restoreId) {
    const step = (k, n) => { if (job && job.step) job.step(k, n); };
    step('compile', '게시 데이터 생성');
    const [b, tpl] = await Promise.all([loadBundle(siteId), loadTemplates(siteId)]);
    let data, restoredFrom = 0;
    if (restoreId) { const snap = await api('GET', 'api/sites/' + siteId + '/snapshots/' + restoreId, undefined, { silent: true }); data = snap.snapshot.content; restoredFrom = snap.snapshot.version_no; }
    else data = WBCore.compileFrom(b.src, { base: b.base, apiBase: b.siteApi || '' }, { preview: false, formDrafts: true, single: true });
    const version = (+b.src.maxVersion || 0) + 1; data.cms = Object.assign({}, data.cms || {}, { version, publishedBy: S.user ? S.user.name : '' }); if (restoredFrom) data.cms.restoredFrom = restoredFrom;
    step('prepare', '공개용 파일 준비');
    const live = await fetchLive(b, siteId);
    const built = WBCore.buildSingle(b.src.site, data, tpl, { base: b.base, self: b.self, publicBase: b.publicBase, apiBase: b.siteApi || '', reserve: keepReserve(live.cfg) || b.reserve || './wb-api/reserve.php', analytics: !!b.analytics, allow: b.allow || [] });
    const tplVer = (tpl && tpl.version) || ''; if (tplVer) built.html = built.html.replace(/<head([^>]*)>/i, (m0) => m0 + '\n<meta name="wb-tpl" content="' + tplVer.replace(/[^0-9A-Za-z._-]/g, '') + '">');
    step('prepare', '게시 전 점검 (지금 공개 중인 홈페이지와 비교)');
    const g = await publishGuard(b, data, built.html, tplVer, live);
    if (g.blocked) { const e0 = new Error(g.blocked); e0.data = { failedStep: 'prepare' }; throw e0; }
    if (g.issues.length) {
      const go = await confirm('게시하기 전에 확인이 필요합니다.\n\n· ' + g.issues.join('\n· ') + (g.notes.length ? '\n\n참고 : ' + g.notes.join(' ') : '') + '\n\n바뀌는 파일 : index.html · sitemap.xml · robots.txt (지금 공개 중인 index.html 은 게시 직전에 자동 백업)\n\n그래도 게시할까요?', { danger: true, ok: '그래도 게시', title: '게시 전 확인' });
      if (!go) { const e1 = new Error('게시를 취소했습니다. 공개 홈페이지는 그대로입니다.'); e1.cancelled = true; e1.data = { failedStep: 'prepare', cancelled: true }; throw e1; }
    }
    step('upload', '서버에 게시 파일 저장 (' + Math.round(built.html.length / 1024) + 'KB)');
    const r = await api('POST', 'api/sites/' + siteId + '/publish-result', { session: (PR && PR.key) || '', note: note || '', version, html: built.html, data: built.data, sitemap: built.sitemap, robots: built.robots, form: built.form, restoredFrom: restoredFrom || undefined }, { silent: true });
    step('verify', '공개 주소에서 확인');
    r.verify = await verifyPublic(r.publicUrl, version, siteId);
    if (!r.verify.ok) { r.status = 'local-only'; r.warning = '서버에 게시 파일을 저장했지만 공개 주소에서 아직 새 버전이 확인되지 않았습니다. 잠시 후 새로고침하거나 사이트 설정 › 배포 · 연결 › [공개 서버 연결 점검]을 실행해 주세요.'; }
    if (built.warnings && built.warnings.length) r.deploy.warnings = built.warnings;
    r.guardNotes = g.notes; r.tplVersion = tplVer;
    return r;
  }
  /* 운영(PHP) 서버 : SEO 최종 제목 · 설명과 sitemap · robots 미리보기를 브라우저가 공용 코어로 계산 (개발 서버는 서버가 계산해 내려줌) */
  async function resolveSeoClient(siteId, r) {
    const b = await loadBundle(siteId); const ctx = { base: b.base, apiBase: b.siteApi || '' }; const site = Object.assign({}, b.src.site, { public_url: b.publicUrl || b.src.site.public_url || '' });
    const prev = WBCore.compileFrom(b.src, ctx, { preview: true, formDrafts: true, single: true }); r.resolved = (prev.seo && prev.seo.resolved) || {};
    (r.pages || []).forEach((p) => { const x = r.resolved[p.type === 'main' ? 'main' : p.key] || {}; p.resolved = x; p.mode = x.mode || p.mode || 'inherit'; });
    const pub = WBCore.compileFrom(b.src, ctx, { preview: false, formDrafts: false, single: true });
    r.sitemapPreview = WBCore.sitemapXml({ pages: pub.pages, seo: { resolved: r.resolved } }, site, true); r.robotsPreview = WBCore.robotsTxt({ seo: { site: r.site } }, site);
    return r;
  }
  function restoreSnapshot(siteId, snapshotId, job) { if (S.platform === 'php') return clientPublish(siteId, '이전 버전 복원', job, snapshotId); return api('POST', 'api/sites/' + siteId + '/snapshots/' + snapshotId + '/restore', { async: true }, { silent: true }); }
  function bindImagePickers(root) { $$('[data-pick-image]', root).forEach((btn) => { if (btn.__bound) return; btn.__bound = true; btn.addEventListener('click', async () => { const it = await pickMedia(); if (!it) return; const target = $(btn.dataset.pickImage); const idTarget = btn.dataset.pickId ? $(btn.dataset.pickId) : null; const thumb = btn.dataset.pickThumb ? $(btn.dataset.pickThumb) : null; if (target) { target.value = it.url; target.dispatchEvent(new Event('input', { bubbles: true })); target.dispatchEvent(new Event('change', { bubbles: true })); } if (idTarget) idTarget.value = it.id; if (thumb) thumb.src = it.thumb; }); }); }
  /* 폼 → 객체 (name 에 . 경로 · [] 배열 · checkbox boolean · number) */
  function formData(form) { const data = {}; const setPath = (o, p, v) => { const ks = p.split('.'); let cur = o; ks.slice(0, -1).forEach((k) => { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }); cur[ks[ks.length - 1]] = v; }; $$('[name]', form).forEach((el) => { if (el.disabled) return; const k = el.name; let v; if (el.type === 'checkbox') { if (k.endsWith('[]')) { if (!el.checked) return; const key = k.slice(0, -2); const arr = key.split('.').reduce((a, kk) => (a == null ? undefined : a[kk]), data) || []; setPath(data, key, arr.concat([el.value])); return; } v = el.checked; } else if (el.type === 'radio') { if (!el.checked) return; v = el.value; } else if (el.type === 'number') v = el.value === '' ? '' : +el.value; else if (el.dataset.lines !== undefined) v = el.value.split('\n').map((s) => s.trim()).filter(Boolean); else if (el.dataset.json !== undefined) { try { v = el.value.trim() ? JSON.parse(el.value) : null; } catch (e) { throw new Error('JSON 형식 오류: ' + k); } } else v = el.value; setPath(data, k, v); }); return data; }
  function fillForm(form, obj, prefix) { const walk = (o, p) => { Object.keys(o || {}).forEach((k) => { const v = o[k]; const name = p ? p + '.' + k : k; if (v && typeof v === 'object' && !Array.isArray(v)) { walk(v, name); return; } const el = form.querySelector('[name="' + name + '"]'); if (!el) return; if (el.type === 'checkbox') el.checked = !!v && v !== 'false' && v !== 'N'; else if (el.dataset.lines !== undefined) el.value = (Array.isArray(v) ? v : []).join('\n'); else if (el.dataset.json !== undefined) el.value = v == null ? '' : JSON.stringify(v, null, 2); else el.value = v == null ? '' : v; }); }; walk(obj, prefix || ''); }
  /* 비밀번호 규칙 (서버 wb_valid_password · validPassword 와 같음) : 8자 이상 · 같은 글자 반복(00000000) · 연속(12345678 · 87654321 · abcdefgh) 금지 */
  function pwIssue(p) { p = String(p || ''); if (p.length < 8) return '비밀번호는 8자 이상이어야 합니다.'; if (/^(.)\1+$/.test(p)) return '같은 글자만 반복한 비밀번호는 사용할 수 없습니다.'; const c = Array.from(p.toLowerCase()).map((x) => x.charCodeAt(0)); const step = c[1] - c[0]; if ((step === 1 || step === -1) && c.every((v, i) => i === 0 || v - c[i - 1] === step)) return '연속된 숫자 · 문자(12345678 등)는 사용할 수 없습니다.'; return ''; }
  /* ================= 동시 접속 알림 =================
     같은 현장 관리자에 다른 브라우저 · PC · 탭이 접속해 있으면 알려 줍니다.
     15초마다 상태를 보내고(heartbeat), 60초 넘게 소식이 없는 접속은 서버에서 지워집니다.
     공개 홈페이지와는 무관하며, 접속 기록을 쌓아 두지 않습니다(활동 로그 아님). */
  const PR = {
    key: (() => { try { let k = sessionStorage.getItem('wb_sess_key'); if (!k) { k = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('wb_sess_key', k); } return k; } catch (e) { return 's' + Math.random().toString(36).slice(2, 10); } })(),
    ctx: { route: '', page_id: null, page_title: '' },
    state: { count: 0, others: [], samePage: [], sameRoute: [], publishing: null },
    timer: null, warned: false, onChange: null,
    env() {
      const ua = navigator.userAgent || '';
      const device = /Mobi|Android|iPhone/i.test(ua) ? '모바일' : (/iPad|Tablet/i.test(ua) ? '태블릿' : 'PC');
      const browser = ua.indexOf('Edg/') >= 0 ? 'Edge' : ua.indexOf('OPR/') >= 0 ? 'Opera' : ua.indexOf('Whale') >= 0 ? 'Whale' : ua.indexOf('Chrome') >= 0 ? 'Chrome' : ua.indexOf('Safari') >= 0 ? 'Safari' : ua.indexOf('Firefox') >= 0 ? 'Firefox' : '브라우저';
      return { device, browser };
    },
    set(ctx) { Object.assign(PR.ctx, ctx || {}); PR.beat(); },
    async beat() {
      if (!S.token || !S.site) return;
      const e = PR.env();
      try {
        const r = await api('POST', 'api/presence/beat', Object.assign({ session: PR.key, site_id: S.site.id, device: e.device, browser: e.browser }, PR.ctx), { silent: true, timeout: 10000 });
        PR.state = { count: r.count || 0, others: r.others || [], samePage: r.samePage || [], sameRoute: r.sameRoute || [], publishing: r.publishing || null };
        PR.paint();
        if (PR.state.count > 0 && !PR.warned) { PR.warned = true; PR.firstNotice(); }
        if (typeof PR.onChange === 'function') { try { PR.onChange(PR.state); } catch (x) {} }
      } catch (x) {}
    },
    start() { if (PR.timer) return; PR.beat(); PR.timer = setInterval(PR.beat, 15000); window.addEventListener('beforeunload', PR.bye); },
    stop() { clearInterval(PR.timer); PR.timer = null; },
    bye() { try { const b = JSON.stringify({ session: PR.key }); if (navigator.sendBeacon) { navigator.sendBeacon(apiUrl('api/presence/bye'), new Blob([b], { type: 'application/json' })); } else { api('POST', 'api/presence/bye', { session: PR.key }, { silent: true }); } } catch (e) {} },
    paint() {
      const b = document.getElementById('wbPresence'); if (!b) return;
      const n = PR.state.count;
      b.hidden = n === 0;
      b.classList.toggle('is-warn', PR.state.samePage.length > 0 || PR.state.sameRoute.length > 0);
      const t = b.querySelector('span'); if (t) t.textContent = '동시 접속중' + (n > 1 ? ' ' + n + '명' : (n === 1 ? ' 1명' : ''));
      b.title = n ? PR.state.others.map((o) => o.name + ' · ' + (o.page_title || o.route || '')).join(' / ') : '';
    },
    firstNotice() {
      const names = PR.state.others.map((o) => o.name).filter(Boolean).join(', ');
      modal('<p style="margin:0 0 10px">현재 다른 브라우저 또는 기기에서 이 관리자에 접속 중입니다.' + (names ? ' (' + esc(names) + ')' : '') + '</p>' +
        '<p style="margin:0 0 10px">동시에 같은 화면이나 페이지를 고치면 작업 내용이 서로 덮어써질 수 있습니다.</p>' +
        '<ul class="ef__hint" style="margin:0 0 4px 16px"><li>같은 메뉴를 고친 경우 새로고침이 필요할 수 있습니다.</li><li>에디터에서 같은 페이지를 함께 편집하면 저장 충돌이 생길 수 있습니다.</li></ul>',
        { title: '다른 브라우저에서 동시 접속중', footer: '<button class="btn" data-close>확인</button>' });
    },
    list() {
      if (!PR.state.count) { toast('지금은 다른 접속자가 없습니다.', 'info'); return; }
      const rows = PR.state.others.map((o) => '<div class="wb-pr__row"><b>' + esc(o.name || '관리자') + '</b>' +
        '<small>' + esc(o.device || '') + (o.browser ? ' · ' + esc(o.browser) : '') + '</small>' +
        '<small>' + esc(o.page_title ? '에디터 / ' + o.page_title : (o.route || '')) + (o.publishing ? ' · 게시 중' : '') + '</small>' +
        '<small class="muted">' + esc(o.ago || '') + '</small></div>').join('');
      modal('<div class="wb-pr">' + rows + '</div><p class="ef__hint" style="margin:10px 0 0">이 목록은 지금 접속 중인 화면만 보여 줍니다. (기록을 저장하지 않습니다)</p>',
        { title: '현재 접속자', footer: '<button class="btn btn--ghost" data-close>닫기</button>' });
    },
  };
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#wbPresence')) PR.list(); });
  return { presence: PR, pwIssue, api, download, toast, modal, confirm, prompt, menuPop, skeleton, validateForm, validators: V, pickMedia, resolveSeoClient, mediaLibrary: () => pickMedia({ type: 'all', manage: true, title: '미디어 (이미지 · 영상)' }), upload, uploadOne, optimizeImage, sortable, publishSite, runPublish, publishResultHtml, refreshPublishState, publishState: () => pubState, setPending, savePending, hasPending: () => !!pending, previewSite, previewToken, compilePreview, loadBundle, loadTemplates, clientPublish, restoreSnapshot, verifyPublic, bindImagePickers, formData, fillForm, esc, fmtBytes, fmtNum, fmtDate, base, csrf, $, $$, S, store, apiBase };
})();
