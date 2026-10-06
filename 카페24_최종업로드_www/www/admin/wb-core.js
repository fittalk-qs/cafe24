/* 통합웹빌더 공용 코어 (Node 서버 · 관리자 브라우저 공용 · 외부 의존 없음)
   · 게시 데이터 컴파일(DB 행 → SITE_DATA 모양 JSON) · SEO 최종값 · 브랜드 디자인 토큰 · 기기별 CSS · 폼 스키마/검증
   · 공개용 정리(sanitize · localhost 검사) · SEO 태그 · sitemap · robots · 단일 파일(index.html) 빌드
   Node : require('./wb-core')  /  브라우저(관리자) : window.WBCore — 운영(PHP 서버)에서는 관리자 브라우저가 이 코드로 게시 파일을 만들어 서버에 저장합니다. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.WBCore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /* ---------- 공통 도우미 ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function now(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function today(d) { return now(d).slice(0, 10); }
  function jsonSafe(s, def) { if (s === null || s === undefined || s === '') return def; if (typeof s === 'object') return s; try { return JSON.parse(s); } catch (e) { return def; } }
  function enc(v) { return JSON.stringify(v === undefined ? null : v); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function get(o, p, def) { const v = String(p).split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); return v === undefined ? def : v; }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v, max) { const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)); return max ? s.slice(0, max) : s; }
  function int(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : (def || 0); }
  function hostOf(url) { try { return new URL(url).host; } catch (e) { return ''; } }

  /* ---------- 상수 ---------- */
  const SECTION_KEYS = { mainVisual: ['mainSlider', 'summaryScene', 'summary', 'content.businessOverview'], summaryMobile: [], premium: ['premiumSection', 'premium', 'content.premiumItems'], environment: ['environmentSection', 'environment', 'content.location', 'content.complexDesign', 'content.hypert', 'content.mainFeatureCards'], type: ['unitSection', 'content.unitTypes'], reserve: ['reserve'] };
  const SECTION_NAMES = { mainVisual: '메인 슬라이드 + 써머리', summaryMobile: '써머리(모바일)', premium: '프리미엄', environment: '입지환경 · 설계', type: '타입안내', reserve: '방문예약' };
  const SETTING_GROUPS = { site: ['site'], theme: ['theme'], footer: ['footer'], quick: ['quickMenuTitle', 'quickMenu'], popupOptions: ['popupOptions'], subpage: ['subpage'], misc: ['imageSettings', 'fullPageScroll', 'settings', 'animation', 'animationPresets', 'sectionMap', 'pageAliases'] };
  const CONTENT_KEYS = ['businessOverview', 'premiumItems', 'mainFeatureCards', 'location', 'complexDesign', 'hypert', 'unitTypes'];
  const PAGE_STATUS = { draft: '작성 중', saved: '임시저장', review: '검토 중', published: '게시됨', scheduled: '예약 게시', stopped: '게시 중지' };
  const shortKey = (k) => (k.startsWith('content.') ? k.slice(8) : k);
  const fullKey = (type, k) => { const hit = (SECTION_KEYS[type] || []).find((f) => shortKey(f) === k); return hit || (CONTENT_KEYS.includes(k) ? 'content.' + k : k); };
  const VISIT_TIMES = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
  const FIELD_TYPES = { name: '성함', text: '텍스트', phone: '연락처', email: '이메일', date: '방문 날짜', time: '방문 시간', number: '숫자', select: '선택(드롭다운)', checkbox: '체크박스', radio: '라디오', textarea: '문의사항', consent: '개인정보 동의', hidden: '숨김 필드', custom: '사용자 정의' };
  const WIDE_TYPES = ['textarea', 'checkbox', 'radio', 'consent', 'custom', 'hidden'];
  function fieldFull(type, width) { return width === 'full' || (width !== 'half' && WIDE_TYPES.includes(type)); }
  const FID = /^f[0-9a-z]{1,14}$/; const newFid = () => 'f' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 8);
  const fieldId = (v) => (typeof v === 'string' && FID.test(v) ? v : (typeof v === 'number' && v > 0 ? 'f' + v : newFid()));
  function normalizeFields(fields) { const used = {}; return (fields || []).map((f, i) => { const type = FIELD_TYPES[f.type] ? f.type : 'text'; const width = ['half', 'full', 'auto'].includes(f.width) ? f.width : 'full'; let id = fieldId(f.id); if (used[id]) id = newFid(); used[id] = true; return { id, enabled: f.enabled !== false, name: str(f.name).replace(/[^a-zA-Z0-9_]/g, '') || 'field' + i, type, label: str(f.label, 120), description: str(f.description, 250), placeholder: str(f.placeholder, 160), required: !!f.required, full: fieldFull(type, width), width, options: (f.options || []).map(String).filter((o) => o !== ''), validation: isObj(f.validation) ? f.validation : {}, defaultValue: str(f.defaultValue, 250) }; }); }
  /* '팝업 열기 버튼' 요소는 더 이상 지원하지 않음 : 불러올 때 · 게시할 때 제외 */
  const noPopupButton = (list) => (list || []).filter((s) => s && s.type !== 'block:popupButton').map((s) => { if (s && s.type === 'block:section' && s.data && Array.isArray(s.data.items)) s.data.items = s.data.items.filter((it) => it && it.type !== 'popupButton'); return s; });
  function pageContentOf(v) { const c = v ? (isObj(v.content_json) ? clone(v.content_json) : (jsonSafe(v.content_json, {}) || {})) : {}; if (Array.isArray(c.sections)) c.sections = noPopupButton(c.sections); return c; }

  /* ---------- 폼 스키마 (forms 행 + form_fields 행 → 스키마) ---------- */
  function schemaFromRows(f, rows) { if (!f) return { key: '', fields: [], settings: {} }; const fields = (rows || []).map((r) => ({ id: r.fid || 'f' + r.id, enabled: !!int(r.enabled, 0) || r.enabled === true, name: r.key, type: r.type, label: r.label, description: r.description || '', placeholder: r.placeholder || '', required: !!int(r.required, 0) || r.required === true, full: fieldFull(r.type, r.width), width: r.width, options: jsonSafe(r.options_json, []), validation: jsonSafe(r.validation_json, {}), defaultValue: r.default_value || '' })); return { id: f.id, key: f.key, name: f.name, version: int(f.version, 1), status: f.status, settings: jsonSafe(f.settings_json, {}), fields }; }
  function draftSchemaOf(f) { if (!f || !f.draft_json) return null; const d = jsonSafe(f.draft_json, null); if (!isObj(d)) return null; return { id: f.id, key: f.key, name: f.name, version: int(f.version, 1) + 1, status: f.status, draft: true, settings: isObj(d.settings) ? d.settings : {}, fields: normalizeFields(d.fields) }; }
  function formSchemaOf(f, rows, preferDraft) { if (preferDraft) { const d = draftSchemaOf(f); if (d) return d; } return schemaFromRows(f, rows); }

  /* ---------- 접수 검증 (공개 폼 제출 · 서버 재검증) ---------- */
  function validateSubmission(schema, input) {
    const errors = {}; const data = {}; let name = '', phone = '', date = null, time = '';
    for (const f of schema.fields) {
      if (!f.enabled) continue; const k = f.name, type = f.type, label = f.label || k, v = f.validation || {};
      if (type === 'phone') { const raw = typeof input[k] === 'string' ? input[k] : (str(input[k + '1']).trim() + '-' + str(input[k + '2']).trim()); let digits = String(raw).replace(/[^0-9]/g, ''); if (digits === '' || raw === '-') { if (f.required) errors[k] = label + ' 항목은 필수입니다.'; continue; } const prefix = String(schema.settings.phonePrefix || '010').replace(/[^0-9]/g, ''); if (String(raw).includes('-') && digits.slice(0, 3) !== prefix && digits.length <= 8) digits = prefix + digits; if (!/^0\d{8,10}$/.test(digits)) { errors[k] = label + ' 형식이 올바르지 않습니다.'; continue; } const val = digits.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3'); data[k] = val; phone = val; continue; }
      if (type === 'checkbox') { let arr = input[k] == null ? [] : (Array.isArray(input[k]) ? input[k] : [input[k]]); arr = arr.map((x) => str(x, 200).trim()).filter(Boolean); if (f.required && !arr.length) { errors[k] = label + ' 항목을 선택해 주세요.'; continue; } if (f.options && f.options.length && arr.some((x) => !f.options.includes(x))) { errors[k] = label + ' 값이 올바르지 않습니다.'; continue; } data[k] = arr; continue; }
      if (type === 'consent') { const on = !!input[k] && input[k] !== '0' && input[k] !== 'false' && input[k] !== 'N'; if (f.required && !on) { errors[k] = label + ' 에 동의해 주세요.'; continue; } data[k] = on ? 'Y' : 'N'; continue; }
      let s = input[k] == null || typeof input[k] === 'object' ? '' : String(input[k]).trim(); s = s.slice(0, type === 'textarea' ? 3000 : 300);
      if (s === '') { if (f.required && type !== 'hidden') errors[k] = label + ' 항목은 필수입니다.'; else data[k] = ''; continue; }
      switch (type) {
        case 'email': if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) errors[k] = label + ' 형식이 올바르지 않습니다.'; break;
        case 'number': if (isNaN(Number(s))) errors[k] = label + ' 항목은 숫자만 입력할 수 있습니다.'; else if (v.min !== undefined && v.min !== '' && Number(s) < Number(v.min)) errors[k] = label + ' 값은 ' + v.min + ' 이상이어야 합니다.'; else if (v.max !== undefined && v.max !== '' && Number(s) > Number(v.max)) errors[k] = label + ' 값은 ' + v.max + ' 이하여야 합니다.'; break;
        case 'date': if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(new Date(s).getTime())) errors[k] = label + ' 형식이 올바르지 않습니다.'; else if (v.futureOnly && s < today()) errors[k] = label + ' 은(는) 오늘 이후 날짜만 선택할 수 있습니다.'; else date = s; break;
        case 'time': { const times = schema.settings.visitTimes || []; if (times.length && !times.includes(s)) errors[k] = label + ' 값이 올바르지 않습니다.'; else time = s; break; }
        case 'select': case 'radio': if (f.options && f.options.length && !f.options.includes(s)) errors[k] = label + ' 값이 올바르지 않습니다.'; break;
        default: if (v.minLength && s.length < int(v.minLength)) errors[k] = label + ' 항목은 ' + v.minLength + '자 이상 입력해 주세요.'; else if (v.maxLength && s.length > int(v.maxLength)) errors[k] = label + ' 항목은 ' + v.maxLength + '자 이하로 입력해 주세요.'; else if (v.pattern) { try { if (!new RegExp(v.pattern, 'u').test(s)) errors[k] = label + ' 형식이 올바르지 않습니다.'; } catch (e) {} }
      }
      if (errors[k]) continue; data[k] = s; if (type === 'name' || (k === 'name' && !name)) name = s;
    }
    for (const a of schema.settings.agreements || []) { if (a.enabled === false || !a.name) continue; const on = !!input[a.name] && input[a.name] !== '0' && input[a.name] !== 'false' && input[a.name] !== 'N'; if (a.required && !on) errors[a.name] = '필수 동의 항목에 체크해 주세요.'; data[a.name] = on ? 'Y' : 'N'; }
    for (const f of schema.fields) if (errors[f.name] && f.validation && f.validation.errorMessage) errors[f.name] = String(f.validation.errorMessage);
    return { ok: !Object.keys(errors).length, errors, data, name, phone, date, time };
  }

  /* ---------- 미디어 URL ---------- */
  function mediaUrl(m, base, variant) { if (!m) return ''; const v = jsonSafe(m.variants_json, {}) || {}; const rel = (variant && v[variant]) || v.src || m.filename; return base + '/uploads/' + rel; }
  const mediaFnOf = (mediaMap, base) => (id, variant) => { if (!id) return ''; const m = mediaMap ? mediaMap[id] : null; return m && !m.deleted_at ? mediaUrl(m, base, variant) : ''; };

  /* ---------- 컴파일 : src(행 묶음) → SITE_DATA 모양 ----------
     src = { site, settings:[{group_key,data_json}], pages:[{...pages 행, draft:content|null, published:content|null}], seo:[seo 행], forms:[forms 행], formFields:{formId:[행]}, popups:[행], media:{id:행}, menuItems:[menu_items 행], maxVersion }
     ctx = { base(업로드 파일 주소 기준 · '…/uploads/' 앞부분) } · opts = { preview, formDrafts } */
  function compileFrom(src, ctx, opts) {
    opts = opts || {}; const preview = !!opts.preview; const site = src.site; const base = (ctx && ctx.base) || ''; const media = mediaFnOf(src.media, base); const out = {}; let design = null;
    for (const row of src.settings || []) {
      const bag = jsonSafe(row.data_json, {}); if (!isObj(bag)) continue; const g = row.group_key;
      if (SETTING_GROUPS[g]) Object.assign(out, clone(bag)); else if (g === 'analytics') out.analytics = bag; else if (g === 'design') design = bag; else if (g === 'header') out.headerSettings = bag; else if (g === 'seo') out.seoSettings = bag; else if (g === 'privacy') out.privacySettings = { retentionDays: bag.submissionRetentionDays || null };
    }
    if (design) out.theme = applyDesign(isObj(out.theme) ? out.theme : {}, design);
    if (site.tel && isObj(out.site)) out.site.tel = site.tel;
    if (isObj(out.site) && !out.site.url && site.public_url) out.site.url = site.public_url;
    out.menu = compileMenuFrom(src.menuItems || []);
    const pages = src.pages || []; const seoRows = src.seo || []; const seoByPage = {}; let sseo = null; seoRows.forEach((r) => { if (r.scope === 'site') sseo = r; else if (r.scope === 'page' && r.page_id) seoByPage[r.page_id] = r; });
    out.sections = []; out.content = out.content || {}; out.pages = {}; out.blocks = {}; out.attrs = {}; out.pageCommon = {}; out.seo = { site: {}, pages: {} }; const styleSets = {};
    for (const p of pages) {
      /* 게시본이 비어 있으면(예전 오류로 빈 버전이 저장된 경우) 초안 내용을 대신 씁니다 — 공개 홈페이지가 빈 화면이 되는 것을 막습니다 */
      const hasBody = (c) => !!c && ((Array.isArray(c.sections) && c.sections.length > 0) || (isObj(c.page) && Object.keys(c.page).length > 0));
      const live = ['published', 'scheduled'].includes(p.status) ? (hasBody(p.published) ? p.published : (hasBody(p.draft) ? p.draft : p.published)) : null;
      const content = preview ? (p.draft || p.published || null) : live;
      const isLive = preview ? true : p.status === 'published';
      if (p.type === 'main') {
        if (!content) continue;
        for (const s of content.sections || []) { const type = str(s.type); if (type.startsWith('block:')) { (out.blocks.main = out.blocks.main || []).push(blockOut(s)); continue; } out.sections.push({ id: type, enabled: s.enabled !== false }); for (const [k, v] of Object.entries(s.data || {})) { const full = fullKey(type, k); if (full.startsWith('content.')) out.content[full.slice(8)] = v; else out[full] = v; } }
        collectStyles(styleSets, 'main', content); if (isObj(content.attrs) && Object.keys(content.attrs).length) out.attrs.main = content.attrs; if (isObj(content.common) && Object.keys(content.common).length) out.pageCommon.main = content.common;
        continue;
      }
      const key = p.key;
      if (!content) { out.pages[key] = { enabled: false, title: p.title }; continue; }
      const page = Object.assign({}, content.page || {}); page.enabled = isLive ? (page.enabled !== false) : false; out.pages[key] = page;
      for (const [k, v] of Object.entries(content.content || {})) out.content[k] = v;
      for (const s of content.sections || []) if (str(s.type).startsWith('block:')) (out.blocks[key] = out.blocks[key] || []).push(blockOut(s));
      collectStyles(styleSets, key, content); if (isObj(content.attrs) && Object.keys(content.attrs).length) out.attrs[key] = content.attrs; if (isObj(content.common) && Object.keys(content.common).length) out.pageCommon[key] = content.common;
      const pseo = seoByPage[p.id]; if (pseo) out.seo.pages[key] = seoOut(pseo, media);
    }
    out.forms = {};
    for (const f of src.forms || []) {
      if (f.status !== 'published') continue;
      const schema = formSchemaOf(f, (src.formFields || {})[f.id] || [], preview || !!opts.formDrafts); out.forms[f.key] = schema;
      if (f.key === 'reserve') { const r = isObj(out.reserve) ? out.reserve : {}; r.fields = schema.fields; r.agreements = schema.settings.agreements || []; r.visitTimes = schema.settings.visitTimes || VISIT_TIMES; r.phonePrefix = schema.settings.phonePrefix || '010'; r.submitLabel = schema.settings.submitLabel || r.submitLabel || '방문예약하기'; r.doneTitle = schema.settings.doneTitle || r.doneTitle || ''; r.doneText = schema.settings.doneText || r.doneText || ''; delete r.action; delete r.method; delete r.demoTitle; delete r.demoText; out.reserve = r; }
    }
    const pops = compilePopupsFrom(src.popups || [], preview, media); out.popupBanners = pops.banners; out.videoPopups = pops.videos;
    if (sseo) out.seo.site = seoOut(sseo, media);
    if (out.seo.site && isObj(out.seo.site.structured)) { const sd = out.seo.site.structured; const tel = (isObj(out.site) && out.site.tel) || site.tel || ''; if (tel) sd.telephone = tel; else delete sd.telephone; if (isObj(out.site) && out.site.name && (!sd.name || sd['@type'] === 'Organization')) sd.name = out.site.name; if (site.public_url && !/example\.com|localhost/.test(site.public_url)) sd.url = String(site.public_url).replace(/\/(index\.html)?$/, '') + '/'; if (isObj(out.site) && out.site.email) sd.email = out.site.email; if (isObj(out.site) && out.site.address) sd.address = out.site.address; }
    out.seo.resolved = resolveSeo(site, out, pages, sseo, seoByPage, media, !!opts.single);
    setBreakpoints(design && design.breakpoints); out.breakpoints = Object.assign({}, BP);
    out.styles = { css: (design ? designCss(design) : '') + commonCss(out.headerSettings || {}, out.footer || {}) + buildCss(styleSets) };
    out.cms = { siteKey: site.key, api: (ctx && ctx.apiBase) || '', version: int(src.maxVersion, 0) + (preview ? 0 : 1), publishedAt: now(), preview };
    return out;
  }
  function blockOut(s) { return { uid: str(s.uid), type: str(s.type).slice(6), enabled: s.enabled !== false, data: s.data || {}, style: s.style || {}, after: str(s.after), name: str(s.name), anchor: str(s.anchor), locked: !!s.locked }; }
  /* SEO 최종값 : inherit(기본값 그대로) · auto(페이지명 + 사이트명) · custom(입력한 항목만) — 공개 주소는 사이트의 실제 도메인 */
  function resolveSeo(site, out, pages, sseo, seoByPage, media, single) {
    const pub = String(site.public_url || '').replace(/\/(index\.html)?$/, ''); const s = sseo ? seoOut(sseo, media) : { og: {}, verification: {} };
    const siteName = (isObj(out.site) && out.site.name) || site.name; const defTitle = s.title || siteName; const rule = (sseo && sseo.title_rule) || 'page_site';
    const abs = (u) => { if (!u) return ''; if (/^https?:\/\//.test(u)) return u; return pub ? pub + '/' + String(u).replace(/^\.?\//, '') : u; };
    const defImage = s.shareImage || (s.og && s.og.image) || './assets/images/og-image.jpg'; const favicon = s.favicon || '';
    const siteNoindex = /noindex/i.test(String(s.robots || ''));
    const pageUrl = (key) => (single ? pub + '/#page=' + encodeURIComponent(key) : pub + '/subpage.html?page=' + encodeURIComponent(key));
    const make = (pg, key, isMain) => {
      const row = pg ? seoByPage[pg.id] : null; const p = row ? seoOut(row, media) : { og: {} };
      const hasCustom = !!(row && (row.title || row.description || row.keywords || row.canonical || (p.og && (p.og.title || p.og.description || p.og.image)) || row.share_image_media_id));
      const mode = (row && row.mode) || (hasCustom ? 'custom' : 'inherit'); const pageName = pg ? pg.title : '';
      const autoTitle = isMain || !pageName || rule === 'site' ? defTitle : (rule === 'site_page' ? siteName + ' | ' + pageName : pageName + ' | ' + siteName);
      const title = mode === 'custom' && p.title ? p.title : (mode === 'auto' ? autoTitle : defTitle);
      const description = (mode === 'custom' && p.description) || s.description || ''; const keywords = (mode === 'custom' && p.keywords) || s.keywords || '';
      const canonical = (mode === 'custom' && p.canonical) || (pub ? (isMain ? pub + '/' : pageUrl(key)) : '');
      const noindex = siteNoindex || !!(row && int(row.noindex, 0)) || (mode === 'custom' && /noindex/i.test(String(row && row.robots || '')));
      const live = pg ? (pg.status === 'published' || isMain) : true;
      return { mode, title, description, keywords, canonical, url: canonical, robots: noindex ? 'noindex,nofollow' : (s.robots && !siteNoindex ? s.robots : 'index,follow'), noindex, hidden: !live, siteName,
        ogTitle: (mode === 'custom' && p.og && p.og.title) || (mode === 'inherit' ? ((s.og && s.og.title) || title) : title), ogDescription: (mode === 'custom' && p.og && p.og.description) || (s.og && s.og.description) || description,
        image: abs((mode === 'custom' && (p.shareImage || (p.og && p.og.image))) || defImage), favicon, google: (s.verification && s.verification.google) || '', naver: (s.verification && s.verification.naver) || '', lastmod: pg && pg.updated_at ? String(pg.updated_at).slice(0, 10) : '' };
    };
    const res = {}; for (const pg of pages) res[pg.type === 'main' ? 'main' : pg.key] = make(pg, pg.key, pg.type === 'main');
    if (!res.main) res.main = make(null, 'main', true);
    res._default = Object.assign({}, make(null, '_default', true), { canonical: '', url: pub ? (single ? pub + '/' : pub + '/subpage.html') : '' });
    return res;
  }
  const noExample = (o) => { if (o && typeof o.image === 'string') o.image = o.image.replace(/^https?:\/\/(www\.)?example\.com\//i, './'); return o; };
  function seoOut(r, media) { const og = noExample(jsonSafe(r.og_json, {}) || {}); return { title: r.title || '', description: r.description || '', keywords: r.keywords || '', canonical: r.canonical || '', robots: r.robots || 'index,follow', og, structured: jsonSafe(r.structured_json, null), verification: jsonSafe(r.verification_json, {}), favicon: r.favicon_media_id ? media(r.favicon_media_id) : '', shareImage: r.share_image_media_id ? media(r.share_image_media_id) : (og.image || '') }; }
  function compileMenuFrom(items) {
    const out = []; items = items || [];
    for (const g of items) { if (g.parent_id) continue; const children = items.filter((c) => c.parent_id === g.id).map((c) => { const it = { enabled: !!int(c.enabled, 0) || c.enabled === true, page: c.page_key || '', label: c.label }; if (c.link_type === 'url' && c.url) { it.url = c.url; it.target = c.target || '_self'; } return it; }); out.push({ enabled: !!int(g.enabled, 0) || g.enabled === true, id: g.page_key || g.label, label: g.label, latin: g.latin || '', items: children }); }
    return out;
  }
  function compilePopupsFrom(rows, preview, media) {
    const banners = []; const videos = []; const n = now();
    for (const p of rows || []) {
      if (p.status === 'deleted') continue;
      const active = p.status === 'published' && (!p.start_at || p.start_at <= n) && (!p.end_at || p.end_at >= n);
      if (!active && !preview) continue;
      const o = jsonSafe(p.options_json, {}) || {};
      const common = { id: p.id, enabled: active || !!preview, name: p.name, pages: jsonSafe(p.pages_json, ['main']), rule: p.hide_rule || 'today', reshowHours: p.reshow_hours || 24, devices: p.devices || 'all', priority: p.priority || 0, overlay: p.overlay == null ? null : Number(p.overlay), position: jsonSafe(p.position_json, {}), size: jsonSafe(p.size_json, {}), closeBtn: o.closeBtn !== false, start: p.start_at, end: p.end_at };
      if (p.type === 'video') { const src = p.video_media_id ? media(p.video_media_id) : str(p.video_url); if (!src) continue; videos.push(Object.assign(common, { src, poster: p.poster_media_id ? media(p.poster_media_id) : str(p.pc_src), thumb: p.pc_media_id ? media(p.pc_media_id, 'thumb') : '', autoplay: o.autoplay !== false, muted: o.muted !== false, loop: !!o.loop, controls: o.controls !== false, ratioPc: o.ratioPc || '16 / 9', ratioMobile: o.ratioMobile || '16 / 9', firstVisitOnly: !!o.firstVisitOnly, title: p.alt || p.name, href: p.link || '', target: p.target || '_self' })); continue; }
      const src = p.pc_media_id ? media(p.pc_media_id) : str(p.pc_src); const msrc = p.mobile_media_id ? media(p.mobile_media_id, 'mobile') : str(p.mobile_src);
      if (!src && !msrc) continue;
      banners.push(Object.assign(common, { src: src || msrc, mobileSrc: msrc, alt: p.alt || p.name, href: p.link || '', target: p.target || '_self', hideRule: p.hide_rule || 'today' }));
    }
    return { banners, videos };
  }
  function popupLibraryFrom(rows, media) {
    return (rows || []).filter((p) => p.status === 'published').map((p) => { const o = jsonSafe(p.options_json, {}) || {}; const isVideo = p.type === 'video'; return { id: p.id, name: p.name, type: isVideo ? 'video' : 'image', src: p.pc_media_id ? media(p.pc_media_id) : str(p.pc_src), mobileSrc: p.mobile_media_id ? media(p.mobile_media_id, 'mobile') : str(p.mobile_src), alt: p.alt || p.name, href: p.link || '', target: p.target || '_self', video: isVideo ? (p.video_media_id ? media(p.video_media_id) : str(p.video_url)) : '', poster: isVideo && p.poster_media_id ? media(p.poster_media_id) : '', muted: o.muted !== false, loop: !!o.loop, controls: o.controls !== false, ratioPc: o.ratioPc || '16 / 9', ratioMobile: o.ratioMobile || '16 / 9', overlay: p.overlay == null ? null : Number(p.overlay) }; }).filter((p) => p.src || p.mobileSrc || p.video);
  }
  function collectStyles(sets, key, content) { const st = content.styles; if (!isObj(st)) return; sets[key] = { pc: st.pc || {}, tablet: st.tablet || {}, mobile: st.mobile || {}, custom: str(st.custom), hidden: content.hidden || {} }; }
  /* 브랜드 디자인 → CSS 토큰 (메인 컬러 하나로 어두운/밝은/옅은 단계 계산) */
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  function hexRgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  function mixHex(h, target, ratio) { const a = hexRgb(h), b = hexRgb(target); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * ratio).toString(16).padStart(2, '0')).join(''); }
  function applyDesign(theme, d) {
    theme.colors = theme.colors || {}; theme.fonts = theme.fonts || {}; theme.layout = theme.layout || {}; theme.typography = theme.typography || {};
    const C = theme.colors; const setc = (token, v, legacy) => { if (!v) return; C[token] = String(v); (legacy || []).forEach((k) => { delete C[k]; }); };
    if (d.brandColor) { setc('--brand-primary', d.brandColor, ['--color-primary']); const hex = HEX.test(String(d.brandColor)); setc('--brand-primary-dark', d.brandDark || (hex ? mixHex(d.brandColor, '#000000', 0.34) : ''), ['--color-primary-dark']); setc('--brand-primary-light', d.brandLight || (hex ? mixHex(d.brandColor, '#ffffff', 0.16) : ''), ['--color-primary-light']); setc('--brand-primary-soft', hex ? mixHex(d.brandColor, '#ffffff', 0.9) : '', ['--color-primary-soft']); delete C['--color-quick-text']; }
    setc('--brand-secondary', d.secondaryColor || d.mutedColor, ['--color-text-muted']); setc('--brand-accent', d.accentColor, ['--color-accent']); setc('--brand-text', d.textColor || d.bodyColor, ['--color-text']); setc('--brand-text-light', d.textLightColor); setc('--brand-bg', d.backgroundColor, ['--color-background']);
    setc('--button-primary', d.buttonColor); setc('--button-primary-hover', d.buttonHoverColor || (d.buttonColor && HEX.test(String(d.buttonColor)) ? mixHex(d.buttonColor, '#ffffff', 0.16) : '')); setc('--button-primary-text', d.buttonTextColor); setc('--link-color', d.linkColor);
    if (d.overlayColor && HEX.test(String(d.overlayColor))) C['--brand-overlay-rgb'] = hexRgb(d.overlayColor).join(',');
    if (d.overlayOpacity !== undefined && d.overlayOpacity !== '' && !isNaN(Number(d.overlayOpacity))) C['--brand-overlay-opacity'] = String(Math.max(0, Math.min(1, Number(d.overlayOpacity))));
    const map = { surfaceColor: '--color-surface', borderColor: '--color-border' }; for (const [k, v] of Object.entries(map)) if (d[k]) theme.colors[v] = String(d[k]);
    if (d.headingWeight) theme.typography['--fw-section-title'] = String(int(d.headingWeight) || 600);
    /* 메뉴 디자인 : 헤더 1차 메뉴 · 메가메뉴 소메뉴 (에디터에서 메뉴를 고르고 바꾼 값 · 사이트 전체 페이지 공통) */
    const px = (v) => (v === undefined || v === '' ? '' : int(v) + 'px');
    if (px(d.menuFontSize)) theme.typography['--fs-gnb'] = px(d.menuFontSize);
    if (d.menuFontWeight) theme.typography['--fw-gnb'] = String(int(d.menuFontWeight) || 500);
    if (d.menuLetterSpacing !== undefined && d.menuLetterSpacing !== '') theme.typography['--menu-letter-spacing'] = String(d.menuLetterSpacing);
    if (d.menuAlign) theme.layout['--menu-align'] = String(d.menuAlign);
    setc('--menu-color', d.menuColor); setc('--header-active-color', d.menuHoverColor);
    if (px(d.subFontSize)) theme.typography['--fs-mega'] = px(d.subFontSize);
    if (d.subFontWeight) theme.typography['--fw-mega'] = String(int(d.subFontWeight) || 500);
    if (d.subLetterSpacing !== undefined && d.subLetterSpacing !== '') theme.typography['--menu-sub-letter-spacing'] = String(d.subLetterSpacing);
    if (d.subAlign) theme.layout['--menu-sub-align'] = String(d.subAlign);
    setc('--menu-sub-color', d.subColor); setc('--menu-sub-hover-color', d.subHoverColor);
    const radius = d.buttonStyle === 'pill' ? 999 : d.buttonStyle === 'rounded' ? 8 : (d.buttonStyle === 'square' ? 0 : null);
    if (d.buttonRadius !== undefined && d.buttonRadius !== '') theme.layout['--button-radius'] = int(d.buttonRadius) + 'px'; else if (radius != null) theme.layout['--button-radius'] = radius + 'px';
    if (d.radius !== undefined && d.radius !== '') theme.layout['--radius-base'] = int(d.radius) + 'px';
    if (d.baseFont) theme.fonts.body = String(d.baseFont); if (d.headingFont) theme.fonts.display = String(d.headingFont);
    if (d.contentWidth) theme.layout['--content-width'] = String(d.contentWidth); if (d.headerHeight) theme.layout['--header-height'] = String(d.headerHeight); if (d.headerHeightMobile) theme.layout['--header-height-mobile'] = String(d.headerHeightMobile);
    if (d.baseLineHeight) theme.typography['--lh-base'] = String(d.baseLineHeight);
    return theme;
  }
  const cssv = (x) => String(x == null ? '' : x).replace(/[{};]/g, '');
  function designCss(d) {
    let css = ''; const b = d.button || {}; let rules = [];
    if (b.background) rules.push('background:' + cssv(b.background)); if (b.color) rules.push('color:' + cssv(b.color)); if (b.radius !== undefined && b.radius !== '') rules.push('border-radius:' + int(b.radius) + 'px'); if (b.height) rules.push('min-height:' + int(b.height) + 'px'); if (b.fontSize) rules.push('font-size:' + int(b.fontSize) + 'px'); if (b.fontWeight) rules.push('font-weight:' + int(b.fontWeight));
    if (rules.length) css += '.btn:not(.btn--line):not(.btn--ghost),.reserve__submit,.cms-btn:not(.cms-btn--line):not(.cms-btn--ghost){' + rules.join(';') + ' !important;}';
    const i = d.input || {}; rules = [];
    if (i.height) rules.push('height:' + int(i.height) + 'px'); if (i.radius !== undefined && i.radius !== '') rules.push('border-radius:' + int(i.radius) + 'px'); if (i.border) rules.push('border-color:' + cssv(i.border)); if (i.background) rules.push('background:' + cssv(i.background));
    if (rules.length) css += '.field__control:not(textarea){' + rules.join(';') + ' !important;}';
    if (d.headingColor) css += '.section__title,.sub-hero__title,.summary__title,.type__name,.env__title{color:' + cssv(d.headingColor) + ' !important;}';
    if (d.sectionGap) css += '@media (min-width:768px){.sub-section,.cms-block__inner{padding-top:' + int(d.sectionGap) + 'px;padding-bottom:' + int(d.sectionGap) + 'px;}}';
    return css ? '/* design system */\n' + css + '\n' : '';
  }
  function commonCss(h, f) {
    let css = '';
    if (h.fixed === false) css += '.header{position:absolute !important;}';
    if (h.menuFontSize) css += '.gnb__link{font-size:' + int(h.menuFontSize) + 'px !important;}'; if (h.menuFontWeight) css += '.gnb__link{font-weight:' + int(h.menuFontWeight) + ' !important;}';
    if (h.menuGap) css += '@media (min-width:1024px){.gnb{column-gap:' + int(h.menuGap) + 'px !important;grid-template-columns:repeat(var(--menu-count,6),auto) !important;justify-content:center;}}';
    if (h.solidBg) css += '.header.is-solid{background:' + cssv(h.solidBg) + ' !important;}'; if (h.mobileMenu === false) css += '.header__toggle{display:none !important;}'; if (h.mobileTel === false) css += '.header__tel-m{display:none !important;}';
    if (f.background) css += '.footer{background:' + cssv(f.background) + ' !important;}'; if (f.noticeSize) css += '@media (min-width:768px){.footer__notices li{font-size:' + int(f.noticeSize) + 'px !important;}}';
    if (f.mobileAlign === 'center') css += '@media (max-width:767px){.footer__inner{text-align:center;}.footer-contact{align-items:center !important;}}';
    if (f.quickGap) css += '@media (max-width:767px){.footer{padding-bottom:calc(var(--quick-mobile-height) + env(safe-area-inset-bottom) + ' + int(f.quickGap) + 'px) !important;}}';
    return css ? '/* header/footer settings */\n' + css + '\n' : '';
  }
  /* 반응형 구간(사이트 설정 › 반응형 기준) — 기본 PC 1200 이상 · 태블릿 768~1199 · 모바일 767 이하 */
  let BP = { tablet: 768, pc: 1200 };
  function setBreakpoints(bp) { const tb = int(bp && bp.tablet, 768), pc = int(bp && bp.pc, 1200); BP = { tablet: tb >= 480 && tb < pc ? tb : 768, pc: pc > tb && pc <= 2000 ? pc : 1200 }; return BP; }
  const CSS_MQ = { pc: '', get tablet() { return '@media (min-width: ' + BP.tablet + 'px) and (max-width: ' + (BP.pc - 1) + 'px)'; }, get mobile() { return '@media (max-width: ' + (BP.tablet - 1) + 'px)'; } };
  const CSS_SECTION = /^#(cms-[\w-]+|hero|summary-mobile|premium|environment|location|type|visit-reservation)$/;
  const cssProp = (k) => (k.indexOf('--') === 0 ? k : k.replace(/([A-Z])/g, '-$1').toLowerCase());
  const cssVal = (x) => String(x == null ? '' : x).replace(/[{};]/g, '');
  const cssSel = (s) => String(s).replace(/[^a-zA-Z0-9_\-\.#:\[\]="'\s>+~(),\*]/g, '');
  function pageCss(pageKey, st, hidden) {
    st = st || {}; hidden = hidden || {}; let css = ''; const scope = 'body[data-cms-page="' + pageKey + '"] ';
    ['pc', 'tablet', 'mobile'].forEach((mode) => {
      let rules = '', wide = '';
      Object.keys(st[mode] || {}).forEach((sel) => { const d = st[mode][sel]; if (!d || typeof d !== 'object') return; let body = '', tall = ''; Object.keys(d).forEach((k) => { const v = d[k]; if (v === '' || v == null) return; const decl = cssProp(k) + ':' + cssVal(v) + ' !important;'; if (mode === 'pc' && (k === 'minHeight' || k === 'height') && CSS_SECTION.test(sel)) tall += decl; else body += decl; }); if (body) rules += scope + cssSel(sel) + '{' + body + '}'; if (tall) wide += scope + cssSel(sel) + '{' + tall + '}'; });
      if (rules) css += CSS_MQ[mode] ? CSS_MQ[mode] + '{' + rules + '}' : rules;
      if (wide) css += '@media (min-width: ' + BP.tablet + 'px){' + wide + '}';
      let hide = ''; (hidden[mode] || []).forEach((sel) => { hide += scope + cssSel(sel) + '{display:none !important;}'; });
      if (hide) css += (mode === 'pc' ? ('tablet' in hidden ? '@media (min-width: ' + BP.pc + 'px)' : '@media (min-width: ' + BP.tablet + 'px)') : CSS_MQ[mode]) + '{' + hide + '}';
    });
    if (st.custom) css += '\n' + String(st.custom).replace(/<\/style/gi, '') + '\n';
    return css;
  }
  function buildCss(sets) { let css = ''; for (const [pageKey, set] of Object.entries(sets)) css += pageCss(pageKey, { pc: set.pc, tablet: set.tablet, mobile: set.mobile, custom: set.custom }, set.hidden); return css; }

  /* ---------- 공개용 정리 (localhost · 예시 주소 제거) ---------- */
  const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/i;
  function siteUrl(site) { return String(site.public_url || '').replace(/\/(index\.html)?$/, ''); }
  function hasLocal(text, allow) { let t = String(text); for (const o of [].concat(allow || [])) if (o && LOCAL_HOST.test(o + '/')) t = t.split(o).join(''); return /https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(?![\w.-])/i.test(t); }
  function effectiveApi(site, publicBase) { const api = String(publicBase || '').replace(/\/$/, ''); if (!api) return ''; if (LOCAL_HOST.test(api + '/') && !LOCAL_HOST.test(siteUrl(site) + '/')) return ''; return api; }
  /* ctx = { base(업로드 주소 기준), self, publicBase } */
  function sanitize(data, site, ctx) {
    ctx = ctx || {}; const base = ctx.base || ''; const self = ctx.self || base; const warnings = []; const pub = siteUrl(site); const apiPub = effectiveApi(site, ctx.publicBase);
    if (ctx.publicBase && !apiPub) warnings.push({ path: 'publicBaseUrl', value: ctx.publicBase, reason: 'server-localhost' });
    const prefixes = [base + '/uploads/' + site.key + '/', self + '/uploads/' + site.key + '/'].filter((p) => p.length > '/uploads//'.length);
    const walk = (o, trail) => {
      if (typeof o === 'string') {
        let s = o;
        for (const p of prefixes) if (s.indexOf(p) >= 0) s = s.split(p).join('./assets/uploads/' + site.key + '/');
        s = s.replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/uploads\/([a-z0-9_-]+)\//gi, './assets/uploads/$1/');
        if (hasLocal(s, pub)) { warnings.push({ path: trail, value: s.slice(0, 120), reason: 'localhost' }); const keep = '<<WB-PUB-ORIGIN>>'; s = (pub ? s.split(pub).join(keep) : s).replace(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/gi, pub || '').split(keep).join(pub); }
        if (/https?:\/\/(www\.)?example\.com/i.test(s)) { if (pub) s = s.replace(/https?:\/\/(?:www\.)?example\.com/gi, pub); else warnings.push({ path: trail, value: s.slice(0, 120), reason: 'example.com' }); }
        return s;
      }
      if (Array.isArray(o)) return o.map((v, i) => walk(v, trail + '.' + i));
      if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) r[k] = (!trail && k === 'cms') ? Object.assign({}, o[k]) : walk(o[k], trail ? trail + '.' + k : k); return r; }
      return o;
    };
    const out = walk(data, '');
    if (out.cms) { out.cms.api = apiPub; }
    if (out.site && pub) out.site.url = pub;
    if (out.seo && out.seo.resolved && pub) for (const k of Object.keys(out.seo.resolved)) { const r = out.seo.resolved[k]; if (r && typeof r.image === 'string' && /^\.?\/?assets\//.test(r.image)) r.image = pub + '/' + r.image.replace(/^\.?\//, ''); }
    return { data: out, warnings };
  }

  /* ---------- SEO 태그 · sitemap · robots ---------- */
  function headTags(seo) {
    const t = [];
    t.push('<title>' + esc(seo.title) + '</title>');
    if (seo.description) t.push('<meta name="description" content="' + esc(seo.description) + '">');
    if (seo.keywords) t.push('<meta name="keywords" content="' + esc(seo.keywords) + '">');
    t.push('<meta name="robots" content="' + esc(seo.robots || 'index,follow') + '">');
    if (seo.canonical) t.push('<link rel="canonical" href="' + esc(seo.canonical) + '">');
    t.push('<meta property="og:type" content="website">');
    if (seo.siteName) t.push('<meta property="og:site_name" content="' + esc(seo.siteName) + '">');
    t.push('<meta property="og:title" content="' + esc(seo.ogTitle || seo.title) + '">');
    if (seo.ogDescription || seo.description) t.push('<meta property="og:description" content="' + esc(seo.ogDescription || seo.description) + '">');
    if (seo.url) t.push('<meta property="og:url" content="' + esc(seo.url) + '">');
    if (seo.image) { t.push('<meta property="og:image" content="' + esc(seo.image) + '">'); t.push('<meta name="twitter:image" content="' + esc(seo.image) + '">'); }
    t.push('<meta name="twitter:card" content="summary_large_image">');
    t.push('<meta name="twitter:title" content="' + esc(seo.ogTitle || seo.title) + '">');
    if (seo.ogDescription || seo.description) t.push('<meta name="twitter:description" content="' + esc(seo.ogDescription || seo.description) + '">');
    if (seo.google) t.push('<meta name="google-site-verification" content="' + esc(seo.google) + '">');
    if (seo.naver) t.push('<meta name="naver-site-verification" content="' + esc(seo.naver) + '">');
    t.push('<link rel="icon" href="' + esc(seo.favicon || './assets/images/favicon.png') + '">');
    t.push('<link rel="apple-touch-icon" href="' + esc(seo.favicon || './assets/images/favicon.png') + '">');
    return t.join('\n');
  }
  function bakeHtml(html, seo, ver) {
    let h = String(html);
    h = h.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
    h = h.replace(/<meta\s+(?:name|property)="(?:description|keywords|robots|og:[^"]*|twitter:[^"]*|google-site-verification|naver-site-verification)"[^>]*>\s*/gi, '');
    h = h.replace(/<link\s+rel="(?:canonical|icon|apple-touch-icon)"[^>]*>\s*/gi, '');
    h = h.replace(/<!--\s*공유 대표이미지[\s\S]*?-->\s*/g, '');
    const block = '<!-- 통합웹빌더 게시 시 생성 (SEO · 공유 미리보기) v' + esc(seo.version || '') + ' -->\n' + headTags(seo) + '\n';
    h = /<meta\s+name="viewport"[^>]*>\s*/i.test(h) ? h.replace(/(<meta\s+name="viewport"[^>]*>\s*)/i, (m) => m + block) : h.replace(/<head[^>]*>/i, (m) => m + '\n' + block);
    if (ver) { h = h.replace(/(href|src)="((?:\.\/)?assets\/(?:css|js)\/[^"?]+)(\?[^"]*)?"/g, (m, a, p) => a + '="' + p + '?v=' + ver + '"'); h = h.replace(/(<script\s+src="(?:\.\/)?assets\/js\/site-data\.js)/, '<script>window.CMS_ASSET_VER="' + ver + '";</script>\n$1'); }
    return h;
  }
  function sitemapXml(data, site, single) {
    const base = siteUrl(site); const res = (data.seo && data.seo.resolved) || {}; const urls = [];
    const add = (key, loc) => { const r = res[key] || {}; if (r.noindex || r.hidden) return; urls.push('<url><loc>' + esc(loc) + '</loc>' + (r.lastmod ? '<lastmod>' + esc(r.lastmod) + '</lastmod>' : '') + '</url>'); };
    add('main', base + '/');
    if (!single) Object.keys(data.pages || {}).forEach((k) => { const p = data.pages[k]; if (!p || p.enabled === false) return; add(k, base + '/subpage.html?page=' + encodeURIComponent(k)); });
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
  }
  function robotsTxt(data, site) {
    const base = siteUrl(site); const s = (data.seo && data.seo.site) || {}; const block = /noindex/i.test(String(s.robots || ''));
    return 'User-agent: *\n' + (block ? 'Disallow: /\n' : 'Allow: /\nDisallow: /wb-api/\nDisallow: /api/\nDisallow: /admin/\nDisallow: /assets/data/\n') + 'Sitemap: ' + base + '/sitemap.xml\n';
  }
  /* 공개 접수 API 용 폼 구성(슬림) — wb-api/data/form.php · PHP 접수 API 의 검증 기준 */
  function formSlim(data) {
    const f = (data.forms && data.forms.reserve) || { fields: [], settings: {} }; const s = f.settings || {};
    return { version: f.version || 0, publish_version: (data.cms && data.cms.version) || 0, fields: (f.fields || []).map((x) => ({ id: x.id || null, enabled: x.enabled !== false, name: x.name, type: x.type, label: x.label, required: !!x.required, options: x.options || [], validation: x.validation || {} })), settings: { agreements: s.agreements || [], visitTimes: s.visitTimes || [], phonePrefix: s.phonePrefix || '010', spam: s.spam || {}, doneTitle: s.doneTitle || '', doneText: s.doneText || '', successRedirect: s.successRedirect || '', retentionDays: s.retentionDays || 365 } };
  }
  function relayFormPhp(data) { return '<?php exit; ?>\n' + JSON.stringify(formSlim(data)); }

  /* ---------- 단일 파일(index.html) 빌드 ----------
     tpl = { index, css, js: { 'site-data', cms, common, main, subpage } } · opts = { base, self, publicBase, apiBase, reserve, analytics, allow } */
  const safeScript = (s) => String(s).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const rewriteLinks = (s) => String(s).replace(/subpage\.html\?page=/g, '#page=');
  const BOOT = `window.SINGLE_FILE = true;
(function () {
  var page = (location.hash.match(/^#page=([\\w-]+)/) || [])[1] || '';
  document.body.setAttribute('data-page', page ? 'subpage' : 'index');
  var drop = document.getElementById(page ? 'sections' : 'subpage'); if (drop) drop.parentNode.removeChild(drop);
  window.addEventListener('hashchange', function (e) {
    var o = (e.oldURL.split('#')[1] || '').match(/^page=([\\w-]+)/), n = (e.newURL.split('#')[1] || '').match(/^page=([\\w-]+)/);
    if ((o && o[1]) !== (n && n[1])) location.reload();
  });
})();`;
  const DATA_FIX = `SITE_DATA.pageUrl = function (pageId) { return '#page=' + pageId; };
(function () {
  function fix(v) { return (typeof v === 'string') ? v.replace(/subpage\\.html\\?page=/g, '#page=') : v; }
  function walk(o, depth) { if (!o || typeof o !== 'object' || depth > 12) return; Object.keys(o).forEach(function (k) { if (typeof o[k] === 'string') o[k] = fix(o[k]); else if (typeof o[k] === 'object') walk(o[k], depth + 1); }); }
  walk(SITE_DATA, 0);
})();`;
  function buildSingle(site, data, tpl, opts) {
    opts = opts || {}; if (!tpl || !tpl.index || !tpl.css || !tpl.js) throw new Error('홈페이지 템플릿(index.html · style.css · js)이 없습니다.');
    const clean = sanitize(data, site, { base: opts.base, self: opts.self, publicBase: opts.publicBase }); const pub = clean.data; const warnings = clean.warnings.slice();
    const apiBase = opts.apiBase || '';
    pub.cms = Object.assign({}, pub.cms || {}, { api: apiBase, single: true });
    const version = pub.cms.version || 0;
    const pubJson = rewriteLinks(JSON.stringify(pub));
    const css = String(tpl.css).replace(/url\((["']?)\.\.\/(fonts|images)\//g, 'url($1./assets/$2/');
    const js = {}; ['site-data', 'cms', 'common', 'main', 'subpage'].forEach((n) => { if (typeof tpl.js[n] !== 'string') throw new Error('템플릿 스크립트가 없습니다 : ' + n); js[n] = tpl.js[n]; });
    const pubUrl = siteUrl(site); if (pubUrl) js['site-data'] = js['site-data'].split('https://www.example.com').join(pubUrl);
    const preloads = (tpl.index.match(/<link\s+rel="preload"[^>]*>/g) || []).join('\n');
    const fonts = (tpl.index.match(/<link\s+rel="preconnect"[^>]*>|<link\s+href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>/g) || []).filter((l, i, a) => a.indexOf(l) === i).join('\n');
    const cfg = { enabled: true, siteKey: site.key, api: apiBase, published: '', reserve: opts.reserve || './wb-api/reserve.php', timeout: 2500, analytics: !!opts.analytics, single: true, version };
    const res = (pub.seo && pub.seo.resolved) || {}; const seo = Object.assign({ version }, res.main || {});
    const inline = ['common', 'main', 'subpage'].map((n) => '"assets/js/' + n + '.js": function () {\n' + safeScript(js[n]) + '\n}').join(',\n');
    const html = ['<!DOCTYPE html>', '<html lang="ko">', '<head>', '<meta charset="UTF-8">', '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
      '<!-- 통합웹빌더 단일 파일 v' + version + ' · 생성 ' + now() + ' — 이 파일(index.html) + assets/ 로 동작 · 메뉴는 #page=ID · 관리자에서 [게시하기]하면 갱신됩니다 -->',
      headTags(seo), fonts, preloads, '<style>', css, '</style>', '</head>',
      '<body data-page="index">', '<div id="siteHeader"></div>', '<main id="sections"></main>', '<main id="subpage"></main>', '<div id="siteFooter"></div>',
      '<script>' + BOOT + '</script>',
      '<script>' + safeScript(js['site-data']) + '\n' + DATA_FIX + '</script>',
      '<script>window.CMS_CONFIG = ' + JSON.stringify(cfg) + ';\nwindow.CMS_PUBLISHED = ' + safeScript(pubJson) + ';</script>',
      '<script>window.__CMS_INLINE = {\n' + inline + '\n};</script>',
      '<script>' + safeScript(js.cms) + '</script>',
      '</body>', '</html>', ''].join('\n');
    const bad = [];
    if (hasLocal(html, [siteUrl(site)].concat(opts.allow || []))) bad.push('localhost');
    if (/\bblob:/.test(html.replace(/\/\*[\s\S]*?\*\//g, ''))) warnings.push({ reason: 'blob', value: 'blob: 주소' });
    if (/["'(]file:\/\//.test(html)) bad.push('file://');
    if (bad.length) throw new Error('단일 파일에 배포용이 아닌 주소가 남아 있습니다 : ' + bad.join(', '));
    return { html, warnings, version, cfg, data: pub, sitemap: sitemapXml(pub, site, true), robots: robotsTxt(pub, site), form: formSlim(pub) };
  }

  return { now, today, jsonSafe, enc, esc, clone, get, isObj, str, int, hostOf, fieldId, SECTION_KEYS, SECTION_NAMES, SETTING_GROUPS, CONTENT_KEYS, PAGE_STATUS, shortKey, fullKey, VISIT_TIMES, FIELD_TYPES, fieldFull, normalizeFields, noPopupButton, pageContentOf, schemaFromRows, draftSchemaOf, formSchemaOf, validateSubmission, mediaUrl, mediaFnOf, compileFrom, blockOut, resolveSeo, seoOut, compileMenuFrom, compilePopupsFrom, popupLibraryFrom, applyDesign, designCss, commonCss, setBreakpoints, getBreakpoints: () => Object.assign({}, BP), CSS_MQ, pageCss, buildCss, LOCAL_HOST, siteUrl, hasLocal, effectiveApi, sanitize, headTags, bakeHtml, sitemapXml, robotsTxt, formSlim, relayFormPhp, buildSingle };
});
