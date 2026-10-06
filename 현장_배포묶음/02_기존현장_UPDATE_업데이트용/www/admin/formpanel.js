/* 폼 필드 패널 (에디터 오른쪽 패널 · 폼 설정 화면 공용) : 필드 목록(드래그 손잡이 · 종류 아이콘 · 이름 · 설정 · 복제 · 삭제 · 필수) · 필드 추가 · 필드 설정 · 제출 버튼 · 완료 문구 · 동의
   하나의 폼 구성(schema)을 기준으로 필드 목록과 미리보기가 함께 그려지도록, 모든 변경은 onChange(schema, { kind, focus }) 로 즉시 알립니다.
   FormPanel.mount(container, schema, { onBeforeChange(kind), onChange(schema, meta), onSave(schema), saveLabel, saveHint })
     → { getSchema, setSchema(schema), selectField(name), render } */
window.FormPanel = (function () {
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TYPES = { text: ['텍스트', 'T'], name: ['성함', '👤'], phone: ['연락처', '📞'], email: ['이메일', '✉'], date: ['날짜', '📅'], time: ['시간', '🕘'], select: ['셀렉트', '▾'], checkbox: ['체크박스', '☑'], radio: ['라디오', '◉'], textarea: ['문의사항', '¶'], consent: ['개인정보 동의', '✓'], hidden: ['숨김값', '·'], number: ['숫자', '#'], custom: ['사용자 정의', '⚙'] };
  /* 새 필드 기본 너비 : 성함 · 연락처 · 방문 날짜 · 방문 시간만 절반(2열), 그 밖의 일반 필드는 한 줄 전체 */
  const DEFAULTS = { name: { label: '성함', required: true, width: 'half', placeholder: '성함을 입력해 주세요' }, text: { label: '추가 입력', width: 'full' }, phone: { label: '연락처', required: true, width: 'half' }, email: { label: '이메일', width: 'full', placeholder: 'example@email.com' }, date: { label: '방문 날짜', width: 'half' }, time: { label: '방문 시간', width: 'half' }, number: { label: '숫자', width: 'full' }, select: { label: '선택', width: 'full', options: ['옵션 1', '옵션 2'] }, checkbox: { label: '체크박스', width: 'full', options: ['항목 1', '항목 2'] }, radio: { label: '라디오', width: 'full', options: ['항목 1', '항목 2'] }, textarea: { label: '문의사항', width: 'full', placeholder: '궁금하신 내용을 남겨주세요' }, consent: { label: '개인정보 수집 · 이용에 동의합니다', required: true, width: 'full' }, hidden: { label: '숨김 필드', width: 'full' }, custom: { label: '사용자 정의', width: 'full' } };
  const WIDTHS = { full: '한 줄 전체', half: '절반 (2열)', auto: '자동' };
  function keyFor(fields, type) { const base = { name: 'name', phone: 'phone', email: 'email', date: 'date', time: 'time', textarea: 'memo', consent: 'agree' }[type] || type; let k = base, i = 2; while (fields.some((f) => f.name === k)) k = base + i++; return k; }
  function normalize(schema) {
    schema.fields = Array.isArray(schema.fields) ? schema.fields : [];
    schema.settings = Object.assign({ submitLabel: '방문예약하기', doneTitle: '', doneText: '', successRedirect: '', phonePrefix: '010', visitTimes: [], agreements: [], button: {}, spam: {}, notifyEmail: '', retentionDays: 365 }, schema.settings || {});
    schema.settings.button = schema.settings.button || {}; schema.settings.spam = schema.settings.spam || {}; schema.settings.agreements = schema.settings.agreements || [];
    return schema;
  }
  function mount(box, schema, opts) {
    opts = opts || {};
    const S = { schema: normalize(schema), sel: 0, view: 'list' };
    const before = (kind) => { if (opts.onBeforeChange) opts.onBeforeChange(kind); };
    const change = (kind, focus) => { if (opts.onChange) opts.onChange(S.schema, { kind: kind || 'edit', focus: focus || '' }); };
    const saveBar = () => (opts.onSave ? '<div class="ef__btns" style="margin-top:12px"><button class="btn btn--sm" type="button" id="fpSave" style="width:100%">' + esc(opts.saveLabel || '폼 저장 (초안 · 게시하면 공개 홈페이지에 반영)') + '</button></div>' : '');
    function render() {
      const f = S.schema.fields;
      if (S.view === 'field') return renderField();
      if (S.view === 'settings') return renderSettings();
      box.innerHTML = '<div class="ef__hint">필드를 클릭하면 설정을 수정합니다. 드래그(⋮⋮)로 순서를 바꾸고, 필수 항목은 <em style="color:#c0392b">*</em> 로 표시됩니다. 바꾼 내용은 가운데 미리보기에 바로 나타납니다.</div><ul class="ed-fields" id="fpList">' +
        f.map((x, i) => '<li class="sort-item" draggable="true" data-i="' + i + '" data-name="' + esc(x.name) + '"' + (x.enabled === false ? ' style="opacity:.5"' : '') + '><span class="handle" title="드래그하여 순서 변경">⋮⋮</span><i title="' + esc((TYPES[x.type] || [x.type])[0]) + '">' + esc((TYPES[x.type] || ['', '?'])[1]) + '</i><span data-open="' + i + '" title="설정 열기">' + esc(x.label || x.name) + (x.required ? ' <em>*</em>' : '') + ' <small style="color:#8a98a3">' + esc((TYPES[x.type] || [x.type])[0]) + (x.width === 'half' ? ' · 절반' : x.width === 'auto' ? ' · 자동' : '') + (x.enabled === false ? ' · 사용 안 함' : '') + '</small></span><button type="button" data-open="' + i + '" title="설정">⚙</button><button type="button" data-dup="' + i + '" title="복제">⧉</button><button type="button" data-del="' + i + '" title="삭제">✕</button></li>').join('') + '</ul>' +
        '<div class="ef__btns"><select id="fpAddType" style="flex:1;height:30px;font-size:12px"><option value="">+ 입력 필드 추가…</option>' + Object.keys(TYPES).map((t) => '<option value="' + t + '">' + esc(TYPES[t][0]) + '</option>').join('') + '</select></div>' +
        '<div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-view="settings">제출 버튼 · 완료 문구 · 동의 · 스팸 방지</button></div>' +
        (opts.onSave ? saveBar() + '<div class="ef__hint">' + esc(opts.saveHint || '폼 구성을 바꿔도 이미 접수된 예약 데이터는 삭제되지 않습니다. 예약에는 제출 당시의 필드 구성이 함께 저장됩니다.') + '</div>' : '');
      const ul = $('#fpList', box);
      WB.sortable(ul, { handle: '.handle', onEnd: (els) => { const order = els.map((e) => +e.dataset.i); before('reorder'); S.schema.fields = order.map((i) => f[i]); change('reorder'); render(); } });
    }
    function renderField() {
      const f = S.schema.fields[S.sel]; if (!f) { S.view = 'list'; return render(); }
      const v = f.validation || {}; const hasOpt = ['select', 'checkbox', 'radio'].includes(f.type); const w = WIDTHS[f.width] ? f.width : 'full';
      box.innerHTML = '<div class="ef__crumb"><a data-view="list">← 필드 목록</a> › ' + esc(f.label || f.name) + '</div>' +
        '<div class="ef"><label class="ef__l">필드 종류</label><select data-f="type">' + Object.keys(TYPES).map((t) => '<option value="' + t + '"' + (f.type === t ? ' selected' : '') + '>' + esc(TYPES[t][0]) + '</option>').join('') + '</select></div>' +
        '<div class="ef"><label class="ef__l">사용자에게 보이는 라벨</label><input data-f="label" value="' + esc(f.label) + '" placeholder="예: 성함"></div>' +
        '<div class="ef"><label class="ef__l">관리자용 필드명 <span class="ed-help" title="영문 · 저장 및 CSV 열 이름에 사용">?</span></label><input data-f="name" value="' + esc(f.name) + '" class="mono"></div>' +
        '<div class="ef"><label class="ef__l">설명 (라벨 아래 안내)</label><input data-f="description" value="' + esc(f.description || '') + '" placeholder="예: 연락 가능한 번호를 입력해 주세요"></div>' +
        (['hidden', 'consent'].includes(f.type) ? '' : '<div class="ef"><label class="ef__l">입력 안내 문구(placeholder)</label><input data-f="placeholder" value="' + esc(f.placeholder || '') + '"></div>') +
        (hasOpt ? '<div class="ef"><label class="ef__l">선택 항목 (한 줄에 하나)</label><textarea data-f="options" rows="4">' + esc((f.options || []).join('\n')) + '</textarea></div>' : '') +
        (f.type === 'hidden' ? '<div class="ef"><label class="ef__l">기본값 <span class="ed-help" title="utm_source 처럼 주소의 값을 담으려면 필드명을 utm_… 로">?</span></label><input data-f="defaultValue" value="' + esc(f.defaultValue || '') + '"></div>' : '<div class="ef"><label class="ef__l">기본값</label><input data-f="defaultValue" value="' + esc(f.defaultValue || '') + '"></div>') +
        '<div class="ef__row"><div class="ef"><label class="ef__l">너비 <span class="ed-help" title="한 줄 전체 · 절반(2열 중 한 칸) · 자동(문의사항 · 선택 목록처럼 긴 항목은 전체, 짧은 입력은 절반)">?</span></label><select data-f="width">' + Object.keys(WIDTHS).map((k) => '<option value="' + k + '"' + (w === k ? ' selected' : '') + '>' + WIDTHS[k] + '</option>').join('') + '</select></div><div class="ef"><label class="ef__l">모바일 폭</label><select data-v="mobileWidth"><option value=""' + (!v.mobileWidth ? ' selected' : '') + '>전체(기본)</option><option value="half"' + (v.mobileWidth === 'half' ? ' selected' : '') + '>절반</option></select></div></div>' +
        '<div class="ef"><label class="check"><input type="checkbox" data-f="required"' + (f.required ? ' checked' : '') + '> 필수 입력</label> <label class="check"><input type="checkbox" data-f="enabled"' + (f.enabled !== false ? ' checked' : '') + '> 사용</label></div>' +
        '<div class="ef"><label class="ef__l">오류 문구 <span class="ed-help" title="비우면 기본 문구(예: 성함 항목은 필수입니다.)">?</span></label><input data-v="errorMessage" value="' + esc(v.errorMessage || '') + '" placeholder="예: 성함을 입력해 주세요."></div>' +
        (['text', 'name', 'custom', 'textarea'].includes(f.type) ? '<div class="ef__row"><div class="ef"><label class="ef__l">최소 글자</label><input type="number" data-v="minLength" value="' + esc(v.minLength ?? '') + '"></div><div class="ef"><label class="ef__l">최대 글자</label><input type="number" data-v="maxLength" value="' + esc(v.maxLength ?? '') + '"></div></div><div class="ef"><label class="ef__l">입력 형식 (정규식 · 선택)</label><input data-v="pattern" value="' + esc(v.pattern || '') + '" class="mono" placeholder="^[가-힣]{2,}$"></div>' : '') +
        (f.type === 'number' ? '<div class="ef__row"><div class="ef"><label class="ef__l">최소</label><input type="number" data-v="min" value="' + esc(v.min ?? '') + '"></div><div class="ef"><label class="ef__l">최대</label><input type="number" data-v="max" value="' + esc(v.max ?? '') + '"></div></div>' : '') +
        (f.type === 'date' ? '<div class="ef"><label class="check"><input type="checkbox" data-v="futureOnly"' + (v.futureOnly ? ' checked' : '') + '> 오늘 이후 날짜만</label></div>' : '') +
        '<div class="ef"><label class="ef__l">표시 조건 <span class="ed-help" title="다른 필드가 특정 값일 때만 표시 (예: route=지인)">?</span></label><input data-v="showIf" value="' + esc(v.showIf || '') + '" placeholder="필드명=값 (비우면 항상 표시)"></div>' +
        '<div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-view="list">목록으로</button><button class="btn btn--xs btn--ghost" type="button" data-dup="' + S.sel + '">복제</button><button class="btn btn--xs btn--danger" type="button" data-del="' + S.sel + '">삭제</button></div>' + saveBar();
    }
    function renderSettings() {
      const s = S.schema.settings, b = s.button || {}, sp = s.spam || {};
      box.innerHTML = '<div class="ef__crumb"><a data-view="list">← 필드 목록</a> › 폼 설정</div>' +
        '<details class="ef__group" open><summary>제출 버튼</summary><div><div class="ef"><label class="ef__l">버튼 문구</label><input data-s="submitLabel" value="' + esc(s.submitLabel || '') + '"></div><div class="ef__row"><div class="ef"><label class="ef__l">배경색</label><input data-s="button.background" value="' + esc(b.background || '') + '" placeholder="기본"></div><div class="ef"><label class="ef__l">글자색</label><input data-s="button.color" value="' + esc(b.color || '') + '" placeholder="기본"></div></div><div class="ef__row"><div class="ef"><label class="ef__l">모서리(px)</label><input type="number" data-s="button.radius" value="' + esc(b.radius ?? 0) + '"></div><div class="ef"><label class="ef__l">글자 크기(px)</label><input type="number" data-s="button.fontSize" value="' + esc(b.fontSize ?? '') + '"></div><div class="ef"><label class="ef__l">굵기</label><input type="number" data-s="button.fontWeight" value="' + esc(b.fontWeight ?? '') + '"></div></div><div class="ef__row"><div class="ef"><label class="ef__l">테두리</label><input data-s="button.border" value="' + esc(b.border || '') + '" placeholder="예 1px solid #002F47"></div><div class="ef"><label class="ef__l">너비</label><select data-s="button.width"><option value="full"' + (b.width !== 'auto' ? ' selected' : '') + '>전체</option><option value="auto"' + (b.width === 'auto' ? ' selected' : '') + '>내용 크기</option></select></div><div class="ef"><label class="ef__l">정렬</label><select data-s="button.align"><option value=""' + (!b.align ? ' selected' : '') + '>기본</option><option value="left"' + (b.align === 'left' ? ' selected' : '') + '>왼쪽</option><option value="center"' + (b.align === 'center' ? ' selected' : '') + '>가운데</option><option value="right"' + (b.align === 'right' ? ' selected' : '') + '>오른쪽</option></select></div></div></div></details>' +
        '<details class="ef__group" open><summary>접수 완료</summary><div><div class="ef"><label class="ef__l">완료 제목</label><input data-s="doneTitle" value="' + esc(s.doneTitle || '') + '"></div><div class="ef"><label class="ef__l">완료 안내 문구</label><textarea data-s="doneText" rows="2">' + esc(s.doneText || '') + '</textarea></div><div class="ef"><label class="ef__l">완료 후 이동 주소 (선택)</label><input data-s="successRedirect" value="' + esc(s.successRedirect || '') + '" placeholder="https://"></div><div class="ef"><label class="ef__l">접수 알림 이메일</label><input data-s="notifyEmail" value="' + esc(s.notifyEmail || '') + '" placeholder="담당자 이메일"></div></div></details>' +
        '<details class="ef__group"><summary>연락처 · 방문 시간</summary><div><div class="ef"><label class="ef__l">연락처 앞자리</label><input data-s="phonePrefix" value="' + esc(s.phonePrefix || '010') + '"></div><div class="ef"><label class="ef__l">방문 시간 목록 (한 줄에 하나)</label><textarea data-s="visitTimes" rows="4">' + esc((s.visitTimes || []).join('\n')) + '</textarea></div></div></details>' +
        '<details class="ef__group" open><summary>개인정보 동의 (' + s.agreements.length + ')</summary><div>' + s.agreements.map((a, i) => '<div style="border:1px solid var(--line);padding:8px;margin-bottom:6px"><div class="ef"><label class="ef__l">동의 문구</label><input data-a="label" data-i="' + i + '" value="' + esc(a.label || '') + '"></div><div class="ef__row"><div class="ef"><label class="ef__l">키</label><input data-a="name" data-i="' + i + '" value="' + esc(a.name || '') + '" class="mono"></div><div class="ef"><label class="ef__l">버튼 문구</label><input data-a="toggleLabel" data-i="' + i + '" value="' + esc(a.toggleLabel || '내용보기') + '"></div></div><div class="ef"><label class="ef__l">동의 내용 전문</label><textarea data-a="terms" data-i="' + i + '" rows="4">' + esc(a.terms || '') + '</textarea></div><label class="check"><input type="checkbox" data-a="required" data-i="' + i + '"' + (a.required ? ' checked' : '') + '> 필수</label> <label class="check"><input type="checkbox" data-a="enabled" data-i="' + i + '"' + (a.enabled !== false ? ' checked' : '') + '> 사용</label> <button class="btn btn--xs btn--danger" type="button" data-adel="' + i + '">삭제</button></div>').join('') + '<button class="btn btn--xs btn--line" type="button" id="fpAgreeAdd">+ 동의 항목 추가</button></div></details>' +
        '<details class="ef__group"><summary>스팸 · 중복 방지 · 보관</summary><div><label class="check"><input type="checkbox" data-s="spam.honeypot"' + (sp.honeypot !== false ? ' checked' : '') + '> 봇 차단(허니팟)</label><div class="ef__row" style="margin-top:8px"><div class="ef"><label class="ef__l">최소 작성 시간(초)</label><input type="number" data-s="spam.minSeconds" value="' + esc(sp.minSeconds ?? 3) + '"></div><div class="ef"><label class="ef__l">동일 연락처 중복 차단(분)</label><input type="number" data-s="spam.duplicateMinutes" value="' + esc(sp.duplicateMinutes ?? 10) + '"></div></div><div class="ef"><label class="ef__l">개인정보 보관 기간(일)</label><input type="number" data-s="retentionDays" value="' + esc(s.retentionDays ?? 365) + '"></div></div></details>' +
        '<div class="ef__btns"><button class="btn btn--xs btn--line" type="button" data-view="list">목록으로</button></div>' + saveBar();
    }
    box.addEventListener('click', (e) => {
      const t = e.target;
      const view = t.closest('[data-view]'); if (view) { S.view = view.dataset.view; render(); return; }
      const open = t.closest('[data-open]'); if (open) { S.sel = +open.dataset.open; S.view = 'field'; render(); const cur = S.schema.fields[S.sel]; if (cur && opts.onFocus) opts.onFocus(cur.name); return; }
      const dup = t.closest('[data-dup]'); if (dup) { const i = +dup.dataset.dup; before('duplicate'); const c = JSON.parse(JSON.stringify(S.schema.fields[i])); delete c.id; c.name = keyFor(S.schema.fields, c.type); c.label += ' (복사)'; S.schema.fields.splice(i + 1, 0, c); S.sel = i + 1; S.view = 'field'; change('duplicate', c.name); render(); return; }
      const del = t.closest('[data-del]'); if (del) { WB.confirm('이 필드를 삭제할까요? 이미 접수된 예약 데이터는 유지됩니다.', { danger: true, ok: '삭제' }).then((ok) => { if (!ok) return; before('delete'); S.schema.fields.splice(+del.dataset.del, 1); S.sel = 0; S.view = 'list'; change('delete'); render(); }); return; }
      const adel = t.closest('[data-adel]'); if (adel) { before('settings'); S.schema.settings.agreements.splice(+adel.dataset.adel, 1); change('settings'); render(); return; }
      if (t.id === 'fpAgreeAdd') { before('settings'); S.schema.settings.agreements.push({ enabled: true, name: 'agree' + (S.schema.settings.agreements.length + 1), label: '[필수] 개인정보 수집 · 이용에 동의합니다.', required: true, toggleLabel: '내용보기', terms: '' }); change('settings'); render(); return; }
      if (t.id === 'fpSave' && opts.onSave) opts.onSave(S.schema);
    });
    box.addEventListener('change', (e) => {
      const el = e.target;
      if (el.id === 'fpAddType') {
        const type = el.value; if (!type) return;
        before('add');
        const field = Object.assign({ enabled: true, name: '', type, label: '', description: '', placeholder: '', required: false, width: 'full', options: [], validation: {}, defaultValue: '' }, DEFAULTS[type] || {}, { name: keyFor(S.schema.fields, type) });
        S.schema.fields.push(field); S.sel = S.schema.fields.length - 1; S.view = 'field';   /* 추가한 필드를 바로 선택 → 설정 패널 */
        change('add', field.name); render(); const first = $('[data-f="label"]', box); if (first) { first.focus(); first.select(); } return;
      }
      onEdit(el, true);
    });
    box.addEventListener('input', (e) => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') return; onEdit(e.target, false); });
    function onEdit(el, isChange) {
      const f = S.schema.fields[S.sel];
      if (el.dataset.f && f && S.view === 'field') { const k = el.dataset.f; before('field:' + S.sel + ':' + k); if (k === 'options') f.options = el.value.split('\n').map((s) => s.trim()).filter(Boolean); else if (el.type === 'checkbox') f[k] = el.checked; else if (k === 'name') f.name = el.value.replace(/[^a-zA-Z0-9_]/g, ''); else f[k] = el.value; if (k === 'type' && isChange) { f.options = f.options && f.options.length ? f.options : (DEFAULTS[f.type] || {}).options || []; render(); } change('edit', f.name); return; }
      if (el.dataset.v && f && S.view === 'field') { before('field:' + S.sel + ':v.' + el.dataset.v); f.validation = f.validation || {}; f.validation[el.dataset.v] = el.type === 'checkbox' ? el.checked : el.value; change('edit', f.name); return; }
      if (el.dataset.s) { before('settings:' + el.dataset.s); const path = el.dataset.s.split('.'); let o = S.schema.settings; path.slice(0, -1).forEach((k) => { o = o[k] = o[k] || {}; }); const k = path[path.length - 1]; o[k] = k === 'visitTimes' ? el.value.split('\n').map((s) => s.trim()).filter(Boolean) : el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; change('settings'); return; }
      if (el.dataset.a) { const a = S.schema.settings.agreements[+el.dataset.i]; if (a) { before('settings:agree' + el.dataset.i + el.dataset.a); a[el.dataset.a] = el.type === 'checkbox' ? el.checked : el.value; change('settings'); } }
    }
    render();
    return {
      getSchema: () => S.schema, render,
      setSchema: (next) => { S.schema = normalize(next); if (S.view === 'field' && !S.schema.fields[S.sel]) S.view = 'list'; render(); },
      selectField: (name) => { const i = S.schema.fields.findIndex((x) => x.name === name); if (i < 0) return false; S.sel = i; S.view = 'field'; render(); return true; }
    };
  }
  return { mount, TYPES, DEFAULTS, WIDTHS };
})();
