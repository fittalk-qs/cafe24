/* =========================================================================
   site-data.js : 사이트의 모든 데이터 (문구 · 이미지 · 컬러 · 폰트 · 메뉴 · 링크)
   ------------------------------------------------------------------------
   다른 현장에 복제할 때는 이 파일만 수정하면 됩니다.
   · 모든 항목의 enabled:false → 화면에서 자동 제거
   · 이미지 형식 : media { enabled, src, mobileSrc, alt, href, target, ratio, objectFit, objectPosition }
     (모든 이미지는 실제 <img> 태그로 출력되며, src 만 바꾸면 즉시 교체됩니다)
   · theme 값은 페이지 로드 시 CSS 변수로 자동 적용됩니다.
   ========================================================================= */
/* =========================================================================
   siteContent : 메인과 소메뉴가 함께 사용하는 공통 콘텐츠 데이터
   ------------------------------------------------------------------------
   · 여기 한 곳만 수정하면 메인 섹션과 해당 소메뉴 페이지가 동시에 바뀝니다.
   · 이미지는 src 한 번만 바꾸면 PC · 모바일에 동시에 반영됩니다. (모바일 전용 이미지 없음)
     businessOverview  사업개요        → 메인 조감도 위 사업개요 오버레이 + 사업안내 > 사업개요
     premiumItems      프리미엄 5개    → 메인 프리미엄(호버 시 섹션 전체 배경 전환) + 단지안내 > 프리미엄
     mainFeatureCards  메인 3카드      → 입지환경 · 단지설계 · 하이퍼트 (각 상세 페이지 데이터의 cardImage · summary 사용)
     location          입지환경        → 메인 카드 + 사업안내 > 입지환경
     complexDesign     단지설계        → 메인 카드 + 단지안내 > 단지설계
     hypert            하이퍼트        → 메인 카드 + 사업안내 > 하이퍼트
     unitTypes         타입 11종       → 세대안내 > 평면정보 (전체) · 메인 타입안내는 unitSection.mainTypes 로 3종만 선택
   · 이미지 파일은 assets/images/{business,location,complex,community,system,unit,sales,brand,premium,popup}/ 에 페이지별로 정리
   ========================================================================= */
const siteContent = {

  /* ---------- 사업개요 ---------- */
  businessOverview: {
    latin: "SUMMARY",
    title: "목동윤슬자이 사업개요",
    description: "",
    rows: [
      { label: "사업명",     value: "목동윤슬자이" },
      { label: "대지위치",   value: "서울특별시 양천구 목동 924, 924-3, 924-5" },
      { label: "연면적",     value: "231,478.8855㎡" },
      { label: "타입",       value: "전용 114㎡ ~ 203㎡" },
      { label: "공급규모",   value: "총 651실" },
      { label: "분양물 용도", value: "오피스텔 및 근린생활시설, 운동시설, 업무시설(공공기여), 창고시설" }
    ],
    note: "※ 본 제작물에 사용된 사진, 이미지, CG 등은 소비자의 이해를 돕기 위한 것으로 실제와 다를 수 있으니, 견본주택 및 현장을 직접 방문하시어 확인하시기 바랍니다.\n※ 본 홈페이지의 사업개요 및 규모 등은 인·허가 과정이나 실제 시공시 현장 여건 등에 따라 변경될 수 있으므로 청약 및 계약 전 분양광고 확인 및 견본주택을 방문하시어 확인하시기 바랍니다."
  },

  /* ---------- 프리미엄 5개 (메인 : 호버 시 섹션 전체 배경 전환 · 소메뉴 : 항목별 동일 크기 이미지) ---------- */
  premiumItems: [
    { key: "lifestyle", title: "Life Style", description: "백화점, 대형마트, 대형병원 등 프리미엄 라이프를 완성하는 목동 중심 생활권",
      media: { src: "./assets/images/premium-01.jpg", alt: "premium-01.jpg" } },
    { key: "education", title: "Education", description: "대한민국 대표 교육특구 목동이 선사하는 압도적인 Top Tier 명문 학군",
      media: { src: "./assets/images/premium-02.jpg", alt: "premium-02.jpg" } },
    { key: "traffic", title: "Traffic", description: "오목교역, 국회대로, 서부간선도로, 올림픽대로 등 편리한 교통",
      media: { src: "./assets/images/premium-05.jpg", alt: "premium-05.jpg" } },
    { key: "healing", title: "Healing", description: "오목공원, 안양천, 목동종합운동장, 국회대로 상부공원(가칭), 공원조성(예정) 등 도심 속 여유를 누릴 수 있는 자연친화형 주거환경",
      media: { src: "./assets/images/premium-03.jpg", alt: "premium-03.jpg" } },
    { key: "vision", title: "Vision", description: "목동 신시가지 아파트 재건축 예정에 따른 미래가치와 새롭게 변화할 주거환경",
      media: { src: "./assets/images/premium-04.jpg", alt: "premium-04.jpg" } }
  ],

  /* ---------- 메인 3카드 : 번호 · key(상세 데이터) · 제목 · 이동할 소메뉴 ---------- */
  mainFeatureCards: [
    { number: "01", key: "location",      title: "입지환경", page: "location" },
    { number: "02", key: "complexDesign", title: "단지설계", page: "design" },
    { number: "03", key: "hypert",        title: "하이퍼트", page: "hypert" }
  ],

  /* ---------- 입지환경 (사업안내 > 입지환경 · 메인 카드) ---------- */
  location: {
    latin: "THE PRESTIGIOUS LOCATION",
    title: "시간이 쌓아올린 명성",
    description: "TOP TIER 명문 학군과 편리한 교통환경, 백화점, 대형병원, 공원까지 생활 인프라를 모두 갖춘 특별한 입지에서 지금까지 경험하지 못한 한층 더 높은 수준의 삶을 누리십시오.",
    summary: "TOP TIER 명문 학군과 편리한 교통환경, 백화점 · 대형병원 · 공원까지 생활 인프라를 모두 갖춘 특별한 입지",
    /* [이미지] 주변 입지 지도 · 광역 위치도 (지도는 object-fit: contain) */
    /* [이미지] 공식 입지환경 안내 (PC 1100×1904 / 모바일 850×1774 — <picture> 로 분기) */
    image:      { src: "./assets/images/pages/location-pc.jpg", mobileSrc: "./assets/images/pages/location-mobile.jpg", alt: "location-pc.jpg", width: 1100, height: 1904 },
    cardImage:  { src: "./assets/images/location.png", alt: "location.png", objectFit: "cover" },   /* 메인 카드 (4:3) */
    note: "※ 주변 개발계획은 관련 기관의 사정에 따라 변경되거나 지연될 수 있습니다."
  },

  /* ---------- 단지설계 (단지안내 > 단지설계 · 메인 카드) ---------- */
  complexDesign: {
    title: "찬란히 빛나는 위용",
    latin: "ICON OF MOKDONG",
    summary: "BI · 커튼월룩 · 네드 칸과의 협업으로 완성한 목동의 아이콘, 찬란히 빛나는 위용",
    description: "글로벌 아티스트의 키네틱 아트로 물결치는 저층부와 하늘을 빛으로 수놓은 듯 화려하게 빛나는 상층부는 예술과 건축이 하나 되어 이곳만의 새로운 아이콘을 완성합니다.",
    /* [이미지] 공식 단지설계 상세 이미지 (외관 · 조감도 · 배치도 · 조경, 1100×3199 · 원본 비율) */
    /* [이미지] 단지설계 원본 이미지 (자르기 · 확대 없음 · 원본 비율 그대로) — 소메뉴 ICON OF MOKDONG 아래 */
    detail:    { src: "./assets/images/pages/complex-design-pc.jpg", mobileSrc: "./assets/images/pages/complex-design-mobile.jpg", alt: "complex-design-pc.jpg", width: 1100, height: 3199 },
    cardImage: { src: "./assets/images/complex-design-card.png",  alt: "complex-design-card.png", objectFit: "cover", objectPosition: "center center" },   /* 공식 원본에서 흰 여백 · 둥근 모서리 없이 다시 잘라낸 4:3 파일 · 각진 사각형 */   /* 메인 카드 02 (4:3 크롭본) */
    points: [
      { title: "옥탑부", description: "BI와 구조물, 조명 연출이 조화를 이루어 단지의 상징성과 브랜드 인지성을 확보" },
      { title: "측벽",   description: "세련된 유리 마감인 커튼월룩을 적용한 차별화된 외관 연출" },
      { title: "저층부", description: "글로벌 아티스트 네드 칸과의 협업으로 예술성 부여" }
    ],
    landscapeTitle: "조경",
    landscape: [
      { title: "엘리시안포레스트" },
      { title: "북포레스트" },
      { title: "순환산책로" }
    ],
    note: "※ 포디움 외벽에 적용되는 미술작품에는 조명설치를 위한 구조물이 돌출될 수 있습니다.\n※ 본 홈페이지상의 이미지는 소비자의 이해를 돕기 위한 것으로 실제와 차이가 있을 수 있으며, 건축물의 옥탑부, 옥상조형물, 주동 형태, 저층 마감, 창호 형태 및 크기, 줄눈, 측벽 디자인, 태양광 집광판, 외부 색채, 난간 색상, 벽체 마감, 주민공동시설 외관, 외부 로고, 세부 식재, 포장 계획, 단차구조물(옹벽 또는 자연석 쌓기 등), 근린생활시설의 규모 및 외관 등은 추후 변경될 수 있습니다.\n※ 저층부는 석재, 석재뿜칠, 페인트 등 기타 자재로 마감되고, 주동 형태에 따라 각 자재의 적용 비율 및 적용 층수는 각 동별로 상이할 수 있으며, 인허가 및 현장 여건에 의해 조정될 수 있습니다."
  },

  /* ---------- 하이퍼트 (사업안내 > 하이퍼트 · 메인 카드) ---------- */
  hypert: {
    latin: "NEW LIFESTYLE TRENDS",
    title: "실용과 품격이 공존하는 새로운 주거트렌드 Hypert",
    summary: "실용과 품격이 공존하는 새로운 주거트렌드 Hypert",
    coreTitle: "HYPERT Core Value",
    /* [이미지] HYPERT Core Value 다이어그램 (공식 이미지 · 1100×490 · 원본 비율) · 메인 카드용 4:3 */
    /* [이미지] 공식 하이퍼트 안내 (PC 1100×1614 / 모바일 850×1721 — <picture> 로 분기) */
    image:     { src: "./assets/images/pages/hypert-pc.jpg", mobileSrc: "./assets/images/pages/hypert-mobile.jpg", alt: "hypert-pc.jpg", width: 1100, height: 1614 },
    cardImage: { src: "./assets/images/hypert.png", alt: "hypert.png", objectFit: "cover" }
  },

  /* ---------- 타입 전체 11종 (세대안내 > 평면정보) ----------
     · 이미지는 여기 한 곳(image)에만 있습니다. 메인 타입안내 3장은 unitSection.mainTypes 에서 id 로 골라 같은 이미지를 씁니다.
     · 공식 평면정보 이미지 (1100×1452~2221 · 원본 비율 그대로 표시) */
  unitTypes: [
    /* modelHouseUrl : 타입별 E-모델하우스 (새 창)
       · 114㎡B → vr2 · 203㎡AD → vr3 (요청 주소). 115㎡A 의 vr1/tour.html 은 공식 서버에 존재하지 않아(404 확인) vr2 투어의 115A 장면으로 연결
       · vr2 · vr3 는 한 투어 안에 세 타입 장면이 모두 있고 기본 시작 장면이 203AD 라서, 해당 타입 거실에서 시작하도록 ?startscene= 을 붙였습니다 */
    { id: "114B",    title: "114㎡B",    image: "./assets/images/type-114b.png",    alt: "type-114b.png", width: 1100, height: 1549,
      cardImage: "./assets/images/type-114b-card.png", cardAlt: "type-114b-card.png",   /* 메인 타입 카드 전용 (351×468 · 3:4) — 평면정보 페이지는 위 image(고해상) 사용 */
      modelHouseUrl: "https://www.xi-event.com/templete/mdx/vr2/tour.html?startscene=scene_114b_living" },
    { id: "115A",    title: "115㎡A",    image: "./assets/images/type-115a.png",    alt: "type-115a.png", width: 1100, height: 1500,
      cardImage: "./assets/images/type-115a-card.png", cardAlt: "type-115a-card.png",   /* 메인 타입 카드 전용 (351×468 · 3:4) — 평면정보 페이지는 위 image(고해상) 사용 */
      modelHouseUrl: "https://www.xi-event.com/templete/mdx/vr2/tour.html?startscene=scene_115a_living" },
    { id: "114C",    title: "114㎡C",    image: "./assets/images/type-114c.jpg",    alt: "type-114c.jpg", width: 1100, height: 1452 },
    { id: "119A-T1", title: "119㎡A-T1", image: "./assets/images/type-119a-t1.jpg", alt: "type-119a-t1.jpg", width: 1100, height: 1452 },
    { id: "120A-T2", title: "120㎡A-T2", image: "./assets/images/type-120a-t2.jpg", alt: "type-120a-t2.jpg", width: 1100, height: 1452 },
    { id: "120A-T3", title: "120㎡A-T3", image: "./assets/images/type-120a-t3.jpg", alt: "type-120a-t3.jpg", width: 1100, height: 1452 },
    { id: "117C-T1", title: "117㎡C-T1", image: "./assets/images/type-117c-t1.jpg", alt: "type-117c-t1.jpg", width: 1100, height: 1500 },
    { id: "118C-T2", title: "118㎡C-T2", image: "./assets/images/type-118c-t2.jpg", alt: "type-118c-t2.jpg", width: 1100, height: 1500 },
    { id: "203AD",   title: "203㎡AD",   image: "./assets/images/type-203ad.png",   alt: "type-203ad.png", width: 1100, height: 2221,
      cardImage: "./assets/images/type-203ad-card.png", cardAlt: "type-203ad-card.png",   /* 메인 타입 카드 전용 (351×468 · 3:4) — 평면정보 페이지는 위 image(고해상) 사용 */
      modelHouseUrl: "https://www.xi-event.com/templete/mdx/vr3/tour.html" },
    { id: "202BD",   title: "202㎡BD",   image: "./assets/images/type-202bd.jpg",   alt: "type-202bd.jpg", width: 1100, height: 2073 },
    { id: "198CD",   title: "198㎡CD",   image: "./assets/images/type-198cd.jpg",   alt: "type-198cd.jpg", width: 1100, height: 2073 }
  ]
};

const SITE_DATA = {
  /* 공통 콘텐츠 (위 siteContent) — 메인 · 소메뉴가 함께 사용 */
  content: siteContent,


  /* ===============================================================
     테마 : 컬러 · 폰트 · 타이포 (CSS 변수로 자동 적용)
     =============================================================== */
  theme: {
    fonts: {
      display: '"Cormorant Garamond","Times New Roman",Times,Georgia,serif',   /* 영문 제목용 */
      body: '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","맑은 고딕",-apple-system,BlinkMacSystemFont,sans-serif'
    },
    /* 브랜드 디자인 토큰 : 이 값만 바꾸면 버튼 · 활성 메뉴 · 링크 · 아이콘 · 퀵메뉴 · 폼 · 팝업 · 헤더 · 푸터에 모두 적용됩니다. (관리자 › 사이트 설정 › 브랜드·디자인 과 같은 값 · 예전 이름 --color-primary 등은 style.css 에서 이 토큰을 참조) */
    colors: {
      "--brand-primary": "#002F47",
      "--brand-primary-dark": "#001F30",
      "--brand-primary-light": "#0B5274",
      "--brand-primary-soft": "#E8F0F3",
      "--brand-accent": "#B79A6B",
      "--brand-bg": "#F7F6F2",
      "--color-background-soft": "#EEF1F1",
      "--color-surface": "#FFFFFF",
      "--brand-text": "#17252C",
      "--brand-secondary": "#748188",
      "--color-border": "rgba(0,47,71,.16)",
      "--color-header-overlay-text": "#FFFFFF",
      "--color-header-solid-bg": "rgba(255,255,255,.97)",
      "--color-quick-bg": "#FFFFFF",
      "--color-quick-text": "var(--brand-primary)"
    },
    /* 글자 크기 · 굵기 · 자간 · 행간 (필요한 값만 남겨도 됩니다) */
    typography: {
      "--fs-section-title": "clamp(26px,3.2vw,44px)",
      "--fw-section-title": "600",
      "--fs-summary-latin": "clamp(46px,5vw,88px)",
      "--fs-premium-title": "clamp(16px,1.5vw,23px)",
      "--fs-env-title": "clamp(21px,2.2vw,30px)",
      "--fs-type-name": "clamp(22px,2.2vw,32px)",
      "--fs-gnb": "16px",
      "--fw-gnb": "500",
      "--lh-base": "1.75"
    },
    layout: {
      "--header-height": "92px",
      "--header-height-mobile": "76px",   /* 모바일(767px 이하) 헤더 높이 : 메인 첫 화면의 흰 헤더 영역 · 소메뉴 상단 여백에 공통 적용 (common.js applyTheme) */
      "--content-width": "1440px",
      "--seq-scenes": "2.4",
      "--line-rotate-speed": ".5s"
    }
  },

  /* ---------------------------------------------------------------
     공통 이미지 설정
     모든 이미지는 { enabled, src, mobileSrc, alt, ratio, objectFit, objectPosition, href, target }
     형식을 사용합니다. src 에는 "./images/a.jpg", "/images/a.jpg",
     "https://example.com/a.jpg" 모두 넣을 수 있습니다.
     --------------------------------------------------------------- */
  imageSettings: {
    fallbackImage: "",   /* 주소가 없거나 로딩 실패 시 대신 표시할 이미지 (글자 없는 그래픽) */
    defaultObjectFit: "cover",
    defaultObjectPosition: "center center"
  },

  /* 메인페이지 원스크롤 (휠 한 번에 한 섹션) */
  fullPageScroll: {
    enabled: true,
    duration: 700,         /* 섹션 이동 시간(ms) · easing cubic-bezier(.22,1,.36,1) · 잠금은 애니메이션 종료 시 해제 */
    stageDuration: 650,    /* 조감도 → 사업개요 레이어 전환 시간(ms) */
    wheelThreshold: 40,    /* 이 값 이상 누적되어야 이동 (휠 1회 = 1단계) */
    wheelCooldown: 90,     /* 이동 종료 직후 관성 휠 무시(ms) */
    revealDelay: 60,       /* 콘텐츠 등장 대기(ms) */
    revealDuration: 600,   /* 텍스트 등장 시간(ms) */
    imageRevealDuration: 800,    /* 이미지 등장 시간(ms) */
    staggerDelay: 100      /* 항목별 순차 지연(ms) */
  },

  settings: {
    quickMobile: "bottom",     /* "bottom" 하단 가로형 / "compact" 우측 축소형 */
    scrollSequence: true
  },

  /* 스크롤 등장 효과 : enabled:false 로 전체를 끌 수 있습니다. */
  animation: {
    enabled: true,
    replay: false,          /* true 면 위로 올라갔다 내려올 때 다시 재생 */
    duration: 600,          /* ms (텍스트 0.55~0.7초) */
    stagger: 100,           /* 같은 영역 항목의 순차 지연 (ms) */
    threshold: 0.18,
    parallax: true          /* 배경의 아주 느린 패럴랙스 */
  },
  /* 효과 프리셋 (섹션별로 자동 적용됩니다) */
  animationPresets: {
    fadeUp:      { opacity: true, translateY: 36, blur: 4 },
    fadeIn:      { opacity: true, translateY: 0,  blur: 5 },
    imageReveal: { clipPath: true, scale: 1.045 },
    lineGrow:    { scaleX: true },
    stagger:     { delay: 130 }
  },

  /* 섹션 순서 · 노출 */
  sections: [
    { id: "mainVisual",  enabled: true },   /* 첫 화면 : 5장 이미지 슬라이드 + (PC · 태블릿) 같은 화면 위 SUMMARY 오버레이 (mainSlider · summaryScene · siteContent.businessOverview) */
    { id: "summaryMobile", enabled: true },  /* 모바일(767px 이하) 전용 SUMMARY 섹션 : 슬라이드 다음 · 배경 #002F47 · 오버레이 없음 · 내용만큼 늘어남 (PC 는 숨김) */
    { id: "premium",     enabled: true },
    { id: "environment", enabled: true },
    { id: "type",        enabled: true },
    { id: "reserve",     enabled: true }
  ],

  /* ===============================================================
     사이트 기본 정보
     =============================================================== */
  site: {
    name: "목동윤슬자이",
    /* 로고 : 한글·영문 텍스트를 따로 출력하지 않고 로고 이미지 한 장만 사용합니다.
       어두운 헤더에서는 imageLight(화이트), 흰색 헤더에서는 imageDark(네이비)로 자동 전환됩니다.
       (이미지 파일이 아직 없을 때만 fallbackText 가 임시로 표시됩니다) */
    logo: {
      imageLight: "./assets/images/logo-white.svg",
      imageDark: "./assets/images/logo-navy.svg",
      alt: "logo-white.svg",
      width: 230,
      fallbackText: "목동윤슬자이"
    },
    tel: "0000-0000",              /* 대표번호 단일 설정값 : PC 헤더(아이콘+번호) · 모바일 헤더 전화 아이콘 · 모바일 메뉴 · 푸터 상담번호 · 소메뉴 CTA 의 표시 문구와 tel: 링크가 모두 이 값 하나로 연결됩니다 */
    url: "https://www.example.com",   /* 공개 홈페이지 실제 도메인 (공유 대표이미지 절대 URL 의 기준 · index.html · subpage.html 의 og:image 와 함께 교체) */
    shareImage: "./assets/images/og-image.jpg?v=20260916",   /* SEO · 카카오톡 · 네이버 · SNS 공유 대표이미지 1100×750 (페이지별 대표이미지가 없을 때 기본값) — 메인 슬라이드에는 사용하지 않음 */            /* 대표번호 (헤더 · 모바일 메뉴 · 퀵메뉴 · 방문예약 · 푸터 · tel:00000000 공통) — 실제 번호로 교체 */
    register: { label: "방문예약", url: "#visit-reservation", target: "_self" },
    /* 최초 진입 인트로 : 홈페이지에 처음 들어왔을 때 브랜드명을 잠깐 보여준 뒤 메인 첫 화면으로 이어집니다.
       · enabled:false 로 두면 인트로를 쓰지 않습니다. · 한 브라우저 세션에서 1회만 나옵니다 (내부 페이지를 다녀와도 다시 안 나옴)
       · 주소 뒤에 ?intro=1 을 붙이면 다시 볼 수 있습니다 (관리자 [인트로 보기 ↗]). 에디터 · 미리보기에서는 나오지 않습니다.
       · title 을 비우면 현장명(site.name)을 씁니다. sup · sub 를 비우면 그 줄은 표시하지 않습니다. */
    intro: {
      enabled: true,
      sup: "MOKDONG",              /* 위쪽 작은 영문 */
      title: "목동윤슬자이",         /* 가운데 큰 글씨 (비우면 현장명) */
      sub: "YOONSEUL XI",          /* 아래 아주 작은 영문 (모바일에서는 숨김) */
      bg: "#F7F7F4",               /* 배경 (오프화이트) */
      color: "#1B2429"             /* 글자색 */
    }
  },

  /* [이미지] 메인 첫 화면 : 공식 홈페이지(xi.co.kr/MDX) 첫 화면과 같은 5장 이미지 슬라이드 — 문구 · 요약정보 없음
     · PC : slide-0N-pc.jpg (1920×1080) / 모바일(767px 이하) : slide-0N-mobile.* — <picture> 로 분기 (PC 이미지를 잘라 쓰지 않음)
     · 자동 재생 4초(interval) · 옆으로 넘어가는 이동 0.75초(duration · transform: translate3d · 활성 · 나가는 2장만 애니메이션) · 무한 반복 · 하단 페이지 표시 · 터치 스와이프 · 탭 비활성 시 일시정지 · 조작하면 자동재생 시간 재계산
     · 파일 : PC webp(1920 + 1280 srcset · sizes 100vw) + jpg 대체, 모바일 webp + jpg 대체 — 1번만 preload · fetchpriority=high, 2~5번은 loading=lazy · decoding=async (1번 로딩 뒤 순서대로)
     · 모바일(767px 이하) : 공식 홈페이지 모바일 전용 이미지 5장(640×645)을 자르거나 확대하지 않고 그대로(contain) 표시 — 헤더는 흰 영역으로 분리, 이미지 아래 흰 슬로건 영역(mobileSlogan) + 작은 페이지 표시
     · 휠은 슬라이드를 바꾸지 않습니다 (원스크롤 : 아래로 휠 1회 → SUMMARY 섹션) */
  mainSlider: {
    enabled: true,
    interval: 4000,          /* 다음 이미지로 넘어가는 대기 시간 (ms) — 조작하면 다시 계산 */
    duration: 750,           /* 옆으로 넘어가는 이동 시간 (ms · transform: translate3d) */
    /* 모바일(767px 이하) : 이미지 아래 흰 슬로건 영역 (PC 에는 없음) */
    mobileSlogan: { latin: "MOKDONG, A NEW STANDARD", lines: ["목동의 빛나는 오늘,", "새로운 삶의 기준이 되다"] },
    slides: [
      { src: "./assets/images/main-slider/slide-01-pc.jpg", webp: "./assets/images/main-slider/slide-01-pc.webp", webp1280: "./assets/images/main-slider/slide-01-pc-1280.webp", mobileSrc: "./assets/images/main-slider/slide-01-mobile.jpg", mobileWebp: "./assets/images/main-slider/slide-01-mobile.webp", alt: "목동윤슬자이 메인 조감도" },
      { src: "./assets/images/main-slider/slide-02-pc.jpg", webp: "./assets/images/main-slider/slide-02-pc.webp", webp1280: "./assets/images/main-slider/slide-02-pc-1280.webp", mobileSrc: "./assets/images/main-slider/slide-02-mobile.jpg", mobileWebp: "./assets/images/main-slider/slide-02-mobile.webp", alt: "목동윤슬자이 메인 슬라이드 2" },
      { src: "./assets/images/main-slider/slide-03-pc.jpg", webp: "./assets/images/main-slider/slide-03-pc.webp", webp1280: "./assets/images/main-slider/slide-03-pc-1280.webp", mobileSrc: "./assets/images/main-slider/slide-03-mobile.jpg", mobileWebp: "./assets/images/main-slider/slide-03-mobile.webp", alt: "목동윤슬자이 메인 슬라이드 3" },
      { src: "./assets/images/main-slider/slide-04-pc.jpg", webp: "./assets/images/main-slider/slide-04-pc.webp", webp1280: "./assets/images/main-slider/slide-04-pc-1280.webp", mobileSrc: "./assets/images/main-slider/slide-04-mobile.jpg", mobileWebp: "./assets/images/main-slider/slide-04-mobile.webp", alt: "목동윤슬자이 메인 슬라이드 4" },
      { src: "./assets/images/main-slider/slide-05-pc.jpg", webp: "./assets/images/main-slider/slide-05-pc.webp", webp1280: "./assets/images/main-slider/slide-05-pc-1280.webp", mobileSrc: "./assets/images/main-slider/slide-05-mobile.jpg", mobileWebp: "./assets/images/main-slider/slide-05-mobile.webp", alt: "목동윤슬자이 메인 슬라이드 5" }
    ]
  },

  /* SUMMARY(사업개요) : 첫 화면 슬라이드와 같은 섹션 — 아래로 휠/스와이프 1회 → 현재 슬라이드 정지 + 어두운 오버레이 + 써머리 내용 (별도 섹션 · 단색 배경 없음)
     · 한 번 더 아래로 → 프리미엄 · 위로 → 오버레이 제거 · 슬라이드 재생 (프리미엄에서 위로 올라오면 써머리 상태로 복귀) */
  summaryScene: {
    enabled: true,
    overlayColor: "rgba(0, 25, 38, 0.82)",         /* PC : 써머리 상태에서만 슬라이드 위에 덮이는 어두운 오버레이 (0.6s ease 전환 · 배경 이미지는 은은하게 · 작은 안내 문구까지 읽히도록 0.82) */
    overlayColorMobile: "rgba(0, 25, 38, 0.78)",   /* 모바일(767px 이하) — 필요하면 따로 조절 */
    latin: "SUMMARY",
    title: "",                 /* 비우면 siteContent.businessOverview.title 사용 */
    desc: "",
    note: ""                   /* 비우면 siteContent.businessOverview.note 사용 */
  },
  /* 사업개요 내용은 siteContent.businessOverview 를 사용합니다. (단지 선택 탭 없음) */
  summary: [],

  /* PREMIUM : 항목 개수만큼 화면이 자동 분할됩니다. [이미지] premium[].media = 항목별 전체 배경 이미지 */
  premiumSection: {
    enabled: true,
    showHeading: true,          /* false 로 두면 제목 영역이 사라지고 분할 영역이 더 커집니다 */
    minHeight: "100svh",
    eyebrow: "PREMIUM",
    title: "목동윤슬자이의 다섯 가지 프리미엄",
    titleLines: ["목동윤슬자이의", "다섯 가지 프리미엄"],   /* 모바일 : 두 줄로 표시 (PC 는 한 줄) */
    desc: "",
    moreLabel: "자세히 보기"
  },
  /* 프리미엄 5개 항목은 siteContent.premiumItems 를 사용합니다. */
  premium: [],

  /* 메인 3카드 (입지환경 · 단지설계 · 하이퍼트) : 항목은 siteContent.mainFeatureCards, 내용과 이미지는 각 상세 데이터에서 가져옵니다 */
  environmentSection: {
    enabled: true,
    eyebrow: "",
    title: "입지와 설계, 새로운 주거 기준",
    desc: "",
    moreLabel: "자세히 보기",
    imageAspectRatio: "4 / 3",     /* 메인 3카드 이미지 동일 4:3 */
    imageGap: "34px",
    cardGap: "72px",
    autoplayInterval: 5000,     /* 모바일 자동 슬라이드 간격(ms) */
    resumeDelay: 0              /* 스와이프 후 자동재생 재개 대기(ms) · 0 = 조작 직후 5초 카운트 다시 시작 */
  },
  environment: [],

  /* TYPE : 메인 타입안내 — PC 3열 카드(제목 → 버튼 → 세로 평면 이미지) · 모바일 1장씩 자동 슬라이드 + 스와이프
     mainTypes[].id 는 siteContent.unitTypes 의 id (이미지는 그곳 한 곳에서만 관리) · buttons 는 카드별 버튼 구성 */
  unitSection: {
    enabled: true,
    autoplay: true,             /* 모바일(1장씩) 자동 이동 · PC 는 3장이 모두 보이므로 이동 없음 */
    autoplayInterval: 5000,     /* 자동 이동 간격(ms) */
    resumeDelay: 0,             /* 스와이프 후 재개 대기(ms) · 0 = 조작 직후 5초 카운트 다시 시작 */
    perView: 3,                 /* PC 한 화면 카드 수 */
    eyebrow: "",
    title: "타입안내",
    desc: "",                   /* 제목 아래 설명 문구는 사용하지 않습니다 */
    imageRatio: "3 / 4",        /* 카드 하단 세로형 이미지 칸 (평면도는 contain 으로 잘리지 않게) */
    imageFit: "contain",           /* 평면도 전체가 보이도록 (자르기 · 확대 없음) */
    imageRatio: "351 / 468",       /* 타입 카드 이미지 영역 3:4 (실제 파일 351×468 기준 · 흰 배경) */
    mainTypes: [                                          /* 순서 : 114㎡B → 115㎡A → 203㎡AD · 버튼은 세 카드 모두 [평면타입] [e모델하우스] 두 개 */
      { id: "114B",  buttons: ["floorPlan", "modelHouse"] },
      { id: "115A",  buttons: ["floorPlan", "modelHouse"] },
      { id: "203AD", buttons: ["floorPlan", "modelHouse"] }
    ],
    /* 버튼 연결 : floorPlan → 평면정보(해당 타입 탭) · modelHouse → 타입별 unitTypes[].modelHouseUrl (새 창) */
    links: {
      floorPlan:  "subpage.html?page=floorplan&type={id}",
      modelHouse: "{modelHouseUrl}"
    },
    linkLabels: { floorPlan: "평면타입", modelHouse: "e모델하우스" },
    modelHouseLabel: "e모델하우스 보기 (새 창)",           /* 세대안내 > 평면정보 탭 아래 버튼 */
    /* [이미지] 섹션 배경 (조감도와 같은 파일 : PC hero.png · 모바일 hero-mobile.png — 모바일에서 PC 이미지를 추가로 받지 않음) */
    media: { enabled: true, src: "./assets/images/hero.png", mobileSrc: "./assets/images/hero-mobile.png", alt: "hero.png", href: "", target: "_self", objectFit: "cover", objectPosition: "center center" }
  },
  reserve: {
    enabled: true,
    eyebrow: "",            /* 큰 한글 제목 위 작은 영문은 표시하지 않습니다 */
    title: "방문예약",
    /* 제목 아래 안내 문구 (두 줄) */
    desc: "편안한 관람과 원활한 상담을 위해 사전 방문예약을 신청해 주세요.\n예약 내용을 확인한 후 담당자가 안내 연락을 드립니다.",
    /* 접수 : 통합웹빌더 서버 API 로 전송되어 통합웹빌더관리자 › 방문예약 관리에 저장됩니다. 연결 정보(서버 주소 · 사이트 식별값)는 assets/js/cms-config.js 한 곳에서 관리 */
    submitLabel: "방문예약 신청",
    sendingLabel: "전송 중…",
    doneTitle: "방문예약이 접수되었습니다",
    doneText: "고객님의 방문예약이 정상적으로 접수되었습니다.\n본 모델하우스 담당직원이 예약안내차 곧 전화를 드리겠습니다. 감사합니다.",
    /* 방문예약 섹션에는 이미지 슬롯이 없습니다. (상담 정보 + 폼만) */
    /* 방문예약 섹션 배경 이미지 (src 를 비우면 placeholder 대신 배경색만 사용) */
    backgroundImage: { enabled: false, src: "", alt: "", objectFit: "cover", objectPosition: "center" },
    backgroundOpacity: 0.12,
    phonePrefix: "010",                                  /* 연락처 앞자리 */
    visitTimes: ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"],   /* 22차 : 오전 10시 ~ 오후 6시 30분 간격 17개 */
    /* 개인정보 약관은 agreements[].terms 에 두고 '내용보기' 토글로 펼칩니다 (별도 policyText 없음) */
    fields: [
      { enabled: true, name: "name",  label: "성함",      type: "text",  required: true,  placeholder: "성함을 입력해 주세요" },
      { enabled: true, name: "phone", label: "연락처",    type: "phone", required: true },
      { enabled: true, name: "date",  label: "방문 날짜", type: "date",  required: false },
      { enabled: true, name: "time",  label: "방문 시간", type: "time",  required: false },
      { enabled: true, name: "memo",  label: "문의사항",  type: "textarea", required: false, full: true, placeholder: "궁금하신 내용을 남겨주세요" }
    ],
    agreements: [
      { enabled: true, name: "agreePrivacy", label: "[필수] 개인정보 수집, 이용, 위탁, 양도에 동의합니다.", required: true, toggleLabel: "내용보기",
        terms: "■ 개인정보 수집, 이용, 위탁, 양도 동의\n㈜핏톡는 고객님의 원활한 서비스 이용을 위해 필요한 최소한의 개인정보를 수집하고 있습니다.\n* 개인정보 제공받는 자 : ㈜핏톡\n* 직방, 호갱노노는 고객님의 개인정보를 수집하거나 분양상담에 직접 관여하지 않습니다. 제공되는 부동산 정보는 각 콘텐츠 제공업체로부터 받는 정보로 참고용입니다. 정보의 정확성이나 신뢰성을 보증하지 않으며, 서비스 이용의 결과에 대해서 어떠한 법적인 책임을 지지 않습니다.\n* 고객님은 개인정보 수집에 동의하지 않을 권리가 있습니다. 다만, 필수 항목에 대한 동의를 거부하실 경우 관심고객 등록이 불가능합니다.\n1. 수집하는 개인정보 항목\n관심고객 등록을 통해 다음과 같은 개인정보를 수집합니다.\n* 개인정보 제공 필수 항목 : 이름, 휴대전화번호\n* 개인정보 제공 선택 항목 : 주소 (시/도, 시/군/구), 관심 타입, 연령대\n2. 개인정보의 수집 및 이용 목적\n수집된 개인정보는 다음의 목적으로 이용됩니다.\n* 이름, 휴대전화번호 : 분양 정보 안내, 상담, 고지사항 전달, 불만 처리, 이벤트 정보 제공\n* 관심 타입: 맞춤형 정보 제공\n* 연령대: 통계 분석 및 맞춤형 서비스 제공\n3. 개인정보의 보유 및 이용 기간\n수집된 개인정보는 원칙적으로 관심고객 등록 시점부터 분양 완료 시까지 보유 및 이용합니다. 단, 마케팅 활용 동의 시에는 별도의 보유 기간을 따릅니다.\n* 파기 절차: 분양 완료 후 별도 DB로 이관하여 일정 기간 보관 후 파기\n* 파기 방법: 전자적 파일 형태의 정보는 복구 불가능한 기술적 방법을 사용하여 영구 삭제하며, 종이 문서 형태의 정보는 분쇄하거나 소각합니다." }
    ]
  },

  /* ---------------------------------------------------------------
     좌측 팝업 : 등록된 배너가 가로 한 줄로 한 번에 펼쳐집니다.
     --------------------------------------------------------------- */
  /* 좌측 팝업 : 이미지 전용 (제목 · 설명 · 버튼 없음) */
  popupOptions: {
    autoOpen: true,
    bannerWidth: "350px",          /* PC 배너 기준 크기 350 × 470 (비율 유지) — 패널 높이는 이 값에 맞춰 자동 고정 */
    aspectRatio: "350 / 470",      /* 배너 비율 (PC · 모바일 동일) */
    itemGap: "14px",               /* 배너 사이 여백 · 패널 안쪽 여백 */
    objectFit: "cover",            /* cover | contain */
    objectPosition: "center",
    quickGap: "24px",              /* 팝업 ↔ 우측 퀵메뉴 간격 */
    screenGap: "20px",
    /* 모바일 : 화면 중앙 모달 · 배너 1장씩 자동 슬라이드 (같은 popupBanners 배열 사용) */
    mobileWidth: "min(calc(100vw - 32px), 420px)",
    autoplayInterval: 4200,        /* 자동 넘김 간격(ms) */
    slideDuration: 600,            /* 슬라이드 전환 시간(ms) */
    resumeDelay: 5000              /* 사용자 조작 후 자동 넘김 재개 대기(ms) */
  },
  /* [이미지] 팝업 배너 : PC 3열과 모바일 슬라이드가 이 배열 하나를 그대로 사용합니다.
     src 를 한 번만 바꾸면 양쪽에 동시에 반영되고, 항목을 추가/삭제하면 양쪽에 자동 반영됩니다.
     href 에 클릭 시 이동할 주소(비우면 링크 없음), target:"_blank" 면 새 창 */
  popupBanners: [
    { enabled: true, src: "./assets/images/popup-01.jpg", alt: "popup-01.jpg", href: "", target: "_self" },
    { enabled: true, src: "./assets/images/popup-02.jpg", alt: "popup-02.jpg", href: "", target: "_self" },
    { enabled: true, src: "./assets/images/popup-03.jpg", alt: "popup-03.jpg", href: "", target: "_self" }
  ],

  /* 우측 퀵메뉴 (icon : home / unit / mail / phone / map / calendar / premium / top) */
  quickMenuTitle: "QUICK MENU",
  quickMenu: [
    { enabled: true, label: "홈",       icon: "home", type: "section", targetId: "hero" },
    { enabled: true, label: "타입",     icon: "unit", type: "page", page: "floorplan" },   /* 세대안내 > 평면정보 페이지로 이동 (상단 메뉴와 같은 주소) */
    { enabled: true, label: "방문예약", icon: "mail", type: "section", targetId: "visit-reservation" }
  ],

  /* ---------------------------------------------------------------
     푸터 : 유의사항과 상담 문의만 표시합니다.
     --------------------------------------------------------------- */
  footer: {
    enabled: true,
    notices: [
      "본 사이트에 사용된 이미지 및 내용, 문구 등은 소비자의 이해를 돕기 위해 제작 또는 표기된 것으로 실제와 차이가 있습니다.",
      "본 사이트 상의 개발 및 교통계획에 대한 사항은 추후 관계기관의 사정에 따라 변경 및 취소될 수 있으며, 이는 당사와 무관함을 알려드립니다.",
      "본 사이트의 내용은 사업주체 및 관계기관의 사정에 따라 변경될 수 있습니다.",
      "본 사이트는 편집 및 인쇄과정에서 오류 및 오타가 있을 수 있습니다.",
      "상기 내용 및 이미지는 소비자의 이해를 돕기 위한 것으로 실제와 다를 수 있습니다."
    ],
    phoneLabel: "상담 문의",
    phoneDisplay: "",              /* 비우면 site.tel 사용 (대표번호는 site.tel 한 곳에서만 관리) */
    phoneLink: ""                  /* 비우면 site.tel 의 숫자만 사용 */
  },

  /* =================================================================
     [기존 메뉴 유지 영역] 명칭 · 순서 · 하위 메뉴 · 링크를 변경하지 마세요.
     ================================================================= */
  menu: [
    { enabled: true, id: "biz", label: "사업안내", latin: "PROJECT", items: [
      { enabled: true, page: "overview",   label: "사업개요" },
      { enabled: true, page: "hypert",     label: "하이퍼트" },
      { enabled: true, page: "location",   label: "입지환경" },
      { enabled: true, page: "aerial",     label: "항공 VR",  url: "https://www.xi-event.com/templete/mdx/area_vr/tour.html", target: "_blank" },   /* 공식 항공 VR (새 창) */
      { enabled: true, page: "directions", label: "오시는길" },
      { enabled: true, page: "brand",      label: "브랜드소개" }
    ]},
    { enabled: true, id: "complex", label: "단지안내", latin: "COMPLEX", items: [
      { enabled: true, page: "premium",   label: "프리미엄" },
      { enabled: true, page: "siteplan",  label: "단지배치도" },
      { enabled: true, page: "unitmap",   label: "동·호수배치도" },
      { enabled: true, page: "design",    label: "단지설계" },
      { enabled: true, page: "nedkahn",   label: "네드칸" },
      { enabled: true, page: "rooftop",   label: "루프탑 가든" },
      { enabled: true, page: "clubcloud", label: "CLUB CLOUD" },
      { enabled: true, page: "concord",   label: "콩코드 클럽 바이 조선" },
      { enabled: true, page: "system",    label: "SYSTEM" },
      { enabled: true, page: "telecom",   label: "이동통신설비협의결과서" }
    ]},
    { enabled: true, id: "unit", label: "세대안내", latin: "UNIT", items: [
      { enabled: true, page: "items",     label: "기본제공품목" },
      { enabled: true, page: "floorplan", label: "평면정보" },
      { enabled: true, page: "emodel",    label: "E-모델하우스", url: "https://www.xi-event.com/templete/mdx/vr3/tour.html", target: "_blank" }   /* 공식 E-모델하우스 VR (새 창) */
    ]},
    { enabled: true, id: "sale", label: "분양안내", latin: "SALES", items: [
      { enabled: true, page: "schedule",   label: "분양일정" },
      { enabled: true, page: "supply",     label: "공급안내" },
      { enabled: true, page: "adshort",    label: "분양광고(축약)", url: "https://xi-event.com/templete/mdx/pdf/%EB%B6%84%EC%96%91%EA%B4%91%EA%B3%A0%EC%B6%95%EC%95%BD.pdf", target: "_blank" },   /* 공식 PDF (새 창) */
      { enabled: true, page: "adfull",     label: "분양광고(전문)", url: "https://xi-event.com/templete/mdx/pdf/%EB%B6%84%EC%96%91%EA%B4%91%EA%B3%A0%EC%A0%84%EB%AC%B8.pdf", target: "_blank" },   /* 공식 PDF (새 창) */
      { enabled: true, page: "stamptax",   label: "인지세 납부안내" },
      { enabled: true, page: "contract",   label: "정당계약 안내문" }
    ]},
    { enabled: true, id: "pr", label: "홍보센터", latin: "MEDIA", items: [
      { enabled: true, page: "tv",    label: "자이TV" },
      { enabled: true, page: "press", label: "언론보도" }
    ]},
    { enabled: true, id: "cs", label: "방문예약", latin: "RESERVATION", items: [
      { enabled: true, page: "register", label: "방문예약" }    /* sectionMap 에 의해 메인 방문예약 섹션(#visit-reservation)으로 이동 */
    ]}
  ],

  /* 모든 서브메뉴는 공통 서브페이지로 연결됩니다. */
  pageUrl: function (pageId) { return "subpage.html?page=" + pageId; },

  /* 메인페이지 섹션으로 바로 스크롤시키고 싶은 메뉴가 있으면 여기에 추가하세요.
     예) overview: "summary" → 사업개요 메뉴가 메인페이지 SUMMARY 섹션으로 이동
     기본값은 비어 있으며, 모든 메뉴가 subpage.html?page=... 실제 페이지로 이동합니다. */
  sectionMap: { register: "visit-reservation" },   /* 방문예약 메뉴 → 메인 방문예약 섹션 */
  /* 예전 페이지 ID 호환 : subpage.html?page=interior → hypert */
  pageAliases: { interior: "hypert", product: "overview", skyclub: "clubcloud", hotelclub: "concord" },
  /* =================================================================
     서브페이지 공통 설정
     ================================================================= */
  subpage: {
    showTabs: true,                 /* 같은 카테고리의 형제 메뉴를 상단 탭으로 표시 */
    homeLabel: "HOME",
    prevLabel: "PREV",
    nextLabel: "NEXT",
    ctaTitle: "견본주택 방문을 예약하세요",
    ctaText: "방문예약 후 전문 상담사의 안내를 받으실 수 있습니다.",
    ctaButton: "방문예약 하기",
    ctaUrl: "#visit-reservation",
    notFound: {
      category: "NOT FOUND",
      title: "페이지를 찾을 수 없습니다",
      description: "주소가 변경되었거나 존재하지 않는 페이지입니다. 아래 메뉴에서 원하시는 내용을 선택해 주세요.",
      media: { enabled: false }
    }
  },

  /* =================================================================
     서브페이지 (subpage.html?page=페이지ID)
     ------------------------------------------------------------------
     [이미지 규칙 - 모든 페이지 공통]
       · 모든 페이지에 media(대표 이미지)가 있습니다. 화면에 실제 <img> 로 출력됩니다.
           media: { enabled, src, mobileSrc, alt, href, target, ratio, objectFit, objectPosition, position }
           position : top(본문 위, 가로형) | bottom | left(텍스트와 2열) | right
           ※ 사업개요 · 입지환경 · 항공VR · 오시는길 · E-모델하우스 · 문서는
             레이아웃 안의 정해진 자리(왼쪽 이미지 · 입지도 · 썸네일 · 약도 · 문서 이미지)에 배치됩니다.
           ※ 방문예약(form) 은 이미지 슬롯이 없습니다.
       · 항목이 여러 개인 페이지는 items[] / tabs[] / documents[] / values[] / legend[] / transports[]
         의 항목마다 media 가 있습니다. (항목별 개별 이미지)
       · media 를 아예 지우면 (없음) 로 자동 생성되고, enabled:false 로 두면 영역과 여백이 함께 사라집니다.
       · src 는 "./assets/images/a.jpg" · "/images/a.jpg" · "https://..." 모두 가능, mobileSrc 는 모바일(767px 이하) 전용.
       · href 를 넣으면 이미지가 링크(<a>)가 됩니다. target:"_blank" 면 새 창.

     layoutType 에 따라 본문 레이아웃이 완전히 달라집니다.
       overview     사업개요 : 왼쪽 대표 이미지 + 오른쪽 사업개요 표
       featureGrid  특화상품 : 항목마다 이미지 + 설명 카드
       locationMap  입지환경 : 큰 입지도 + 생활권마다 이미지 + 설명
       vr           항공 VR · e모델하우스 : 대표 썸네일 + 실행 버튼(또는 iframe) + 타입별 이미지
       directions   오시는 길 : 약도 이미지 + 주소 표 + 교통수단별 이미지 안내
       brandStory   브랜드 소개 : 대표 이미지 · 로고 이미지 · 브랜드 비주얼 · VALUE 마다 이미지
       premium      프리미엄 : 항목마다 텍스트 옆 개별 이미지 (좌우 교차)
       sitePlan     단지배치도 : 선택 탭 + 탭별 큰 이미지 + 범례마다 이미지
       unitMap      동·호수배치도 : 동 선택 탭 + 동별 큰 이미지
       imageStory   단지설계 : 설계 항목마다 큰 이미지 + 설명
       hypertPage   하이퍼트 : NEW LIFESTYLE TRENDS · Core Value 4개 (siteContent.hypert)
       locationPage 입지환경 : 지도 · 생활환경 · 광역 위치도 (siteContent.location)
       complexDesign 단지설계 : 외관 · 설계 설명 · 조감도 · 배치도 · 조경 (siteContent.complexDesign)
       gallery      시설 소개 : 항목마다 이미지 카드 (루프탑 · 스카이클럽 · 호텔클럽 · SYSTEM)
       system       SYSTEM 목록형 : 항목마다 이미지 + 번호 + 설명
       floorPlan    평면정보 : 타입 탭 + 왼쪽 평면 이미지 + 오른쪽 면적표
       table        기본제공품목 · 공급안내 : 대표 이미지 + 품목별 이미지 + 표 (+ 문서)
       document     문서 : 문서 대표(스캔) 이미지 + 문서마다 썸네일
       schedule     분양일정 : 일정 안내 이미지 + 일정마다 이미지
       news         언론보도 : 기사마다 썸네일 이미지
       video        자이TV : 영상마다 썸네일 이미지 + 재생
       form         방문예약 : 안내 문구 + 폼 (이미지 없음)
       text         약관 등 : 대표 이미지 + 텍스트
     ※ layoutType 이 없거나 새로 추가한 페이지도 media(없으면 placeholder)가 자동으로 출력됩니다.
     ================================================================= */
  pages: {
    /* =============== 사업안내 =============== */
    overview: {
      enabled: true, category: "사업안내", title: "사업개요",
      description: "",
      layoutType: "overview",
      layoutRatio: "1.2fr 1fr",
      /* [이미지] 조감도 (siteContent.businessOverview.birdview 와 같은 파일) — 표의 위·아래 라인에 맞춰 표시 */
      media: { enabled: true, src: "./assets/images/pages/business-overview.jpg", mobileSrc: "", alt: "business-overview.jpg", href: "", target: "_self", ratio: "22 / 15", objectFit: "cover", objectPosition: "center center" },
      details: [],            /* 비우면 siteContent.businessOverview.rows */
      notice: "",             /* 비우면 siteContent.businessOverview.note */
      sections: []
    },
    hypert: {
      enabled: true, category: "사업안내", title: "하이퍼트",
      description: "",
      layoutType: "hypertPage",         /* 내용은 siteContent.hypert */
      media: { enabled: false },
      sections: []
    },
    location: {
      enabled: true, category: "사업안내", title: "입지환경",
      description: "",
      layoutType: "locationPage",       /* 내용은 siteContent.location */
      media: { enabled: false },
      sections: []
    },
    aerial: {
      enabled: true, category: "사업안내", title: "항공 VR",
      description: "단·층별 조망을 항공 촬영 기반 VR 로 확인하실 수 있습니다.",
      layoutType: "vr",
      vrUrl: "https://www.xi-event.com/templete/mdx/area_vr/tour.html",   /* 공식 항공 VR (새 창) */
      buttonLabel: "항공 VR 보기 (새 창)",
      media: { enabled: false },
      sections: []
    },
    directions: {
      enabled: true, category: "사업안내", title: "오시는길",
      description: "",
      layoutType: "directions",
      /* [이미지] 공식 약도 (498×456 · 원본 비율 · 원본보다 크게 확대하지 않음) */
      media: { enabled: true, src: "./assets/images/pages/directions-map.jpg", mobileSrc: "", alt: "directions-map.jpg", href: "", target: "_self", width: 498, height: 456 },
      places: [
        { label: "현장",     address: "서울특별시 양천구 목동 924, 924-3, 924-5", mapUrl: "https://naver.me/FwGKjhc6", mapLabel: "네이버지도 보기" },
        { label: "견본주택", address: "서울특별시 양천구 목동 919-8번지",         mapUrl: "https://naver.me/5resOXV6", mapLabel: "네이버지도 보기" }
      ],
      contactLabel: "분양문의",           /* 전화번호는 site.tel 사용 */
      sections: []
    },
    brand: {
      enabled: true, category: "사업안내", title: "브랜드소개",
      description: "집에 대한 가장 앞선 생각, 언제나 자이에서 시작됩니다.",
      layoutType: "brandStory",
      media: { enabled: false },
      /* 브랜드 대표 비주얼 (공식 브랜드 페이지 이미지 · 791×420 · 중앙 정렬 · width:100%; height:auto) */
      visual: { src: "./assets/images/brand-visual.png", alt: "brand-visual.png", width: 791, height: 420 },
      identity: {
        latin: "BRAND IDENTITY",
        title: "Brand Identity",
        lead: "brand identity는 자이를 한마디로 규정 짓는 Keyword로 자이의 존재의 이유이자 핵심 철학입니다.",
        headline: "고객의 삶에 대한 섬세한 통찰력으로 일상이 특별해지는 경험을 창조합니다",
        body: "고객의 삶 속에서 찾은 작지만 새로운 실마리들은 뜻밖의 영감이 되어 익숙하고 당연하다고 생각했던 모든 것들에 새로운 의미를 부여함으로써 고객이 보고, 느끼고, 즐기고, 성장하는 모든 순간을 새로운 경험으로 창조합니다.\n이러한 영감과 경험으로 이루어진 여정은 고객의 삶을 재창조하고 자이의 차별적 가치를 향해 앞으로 나아가는 원동력이 됩니다.\n고객의 삶 속에 숨겨진 잠재력에서 영감을 찾아 특별한 고객 경험으로 성장시키는 것, 그것이 자이의 존재 이유입니다.",
        images: [
          { src: "./assets/images/brand-identity-01.png", alt: "brand-identity-01.png", width: 862, height: 420 },
          { src: "./assets/images/brand-identity-02.png", alt: "brand-identity-02.png", width: 862, height: 420 }
        ]
      },
      coreValue: {
        latin: "CORE VALUE",
        title: "Core Value",
        lead: "Core Value는 자이 Brand Identity를 강화하기 위해 실천해야 할 가치로 내부 구성원의 모든 판단과 행동의 기준이 되는 역할을 합니다.",
        items: [
          { en: "IMMERSION IN LIFE",        ko: "고객을 향한 몰입",        description: "고객을 향한 깊은 이해와 남다른 통찰력, 고객 경험 여정을 관통하는 자이의 마음가짐과 태도", image: { src: "./assets/images/brand-core-01.png", alt: "brand-core-01.png", width: 790, height: 370 } },
          { en: "ATTENTION TO DETAIL",      ko: "섬세함의 차이",           description: "고객을 향한 섬세한 시선, 차이를 완성하는 자이의 섬세함", image: { src: "./assets/images/brand-core-02.png", alt: "brand-core-02.png", width: 790, height: 370 } },
          { en: "THE XIAN INITIATIVE",      ko: "자이안만이 누리는 특별함", description: "일상과 문화, 미학과 기술의 경계를 확장하여 삶에 영감을 주는 다양한 상품 및 서비스 컨텐츠", image: { src: "./assets/images/brand-core-03.png", alt: "brand-core-03.png", width: 790, height: 370 } },
          { en: "EXTRAORDINARY EXPERIENCE", ko: "최상의 경험",             description: "고객이 원하는 삶의 다양한 가치들이 일상 속에서 실현되는 경험", image: { src: "./assets/images/brand-core-04.png", alt: "brand-core-04.png", width: 790, height: 370 } }
        ]
      },
      colors: {
        latin: "BRAND COLOR",
        title: "브랜드 컬러",
        items: [
          { name: "XI DEEP Blue",     pantone: "PANTONE 2189 C",       cmyk: "C100 M30 Y16 K77", rgb: "R18 G45 B67",    hex: "#122d43" },
          { name: "Xi Gray",          pantone: "PANTONE Cool Gray 1C", cmyk: "C6 M7 Y10 K11",    rgb: "R216 G212 B205", hex: "#d8d4cd" },
          { name: "Xi Sky Blue",      pantone: "PANTONE 638 C",        cmyk: "C75 M3 Y5 K0",     rgb: "R75 G186 B230",  hex: "#46a5e6" },
          { name: "Xi Heritage Blue", pantone: "PANTONE 7704 C",       cmyk: "C89 M36 Y26 K0",   rgb: "R0 G133 B173",   hex: "#0085ad" }
        ]
      },
      officialUrl: "https://xi.co.kr/mdx/view?cmsMenuSeq=29474",
      sections: []
    },

    /* =============== 단지안내 =============== */
    premium: {
      enabled: true, category: "단지안내", title: "프리미엄",
      description: "",
      layoutType: "premium",
      media: { enabled: false },       /* 대표 이미지 없음 · 항목은 siteContent.premiumItems (5장 · 동일 4:3) */
      items: [],
      sections: []
    },
    siteplan: {
      enabled: true, category: "단지안내", title: "단지배치도",
      description: "",
      layoutType: "detailImages",
      media: { enabled: false },
      /* [이미지] 공식 단지배치도 (1100×1134 · 원본 비율 · 클릭 시 확대 보기) */
      images: [{ src: "./assets/images/pages/site-plan.jpg", alt: "site-plan.jpg", width: 1100, height: 1134, zoom: true }],
      notes: [
        "※ 단지 내 시설물(에어컨 실외기, 쓰레기분리수거함, D·A, 등)의 설치위치 및 개소는 실제 시공시 일부 변경될 수 있습니다.",
        "※ 옥외 노출 실외기(근린생활시설, CLUB CLOUD 등) 및 D·A로 인하여 인접동에 소음 및 진동이 전달되거나 조망권이 침해될 수 있으니 유의하시기 바랍니다.",
        "※ 대지경계선 외부의 주변 기반시설, 경관녹지, 완충녹지, 도로, 옹벽, 식재 등은 현재 상황 및 설치 계획을 보여주는 것으로 향후 실제와 다를 수 있으며, 이는 본건 건축물의 시공 범위가 아닙니다.",
        "※ 이동통신설비는 일부 이동 설치 될 수 있습니다."
      ],
      sections: []
    },
    unitmap: {
      enabled: true, category: "단지안내", title: "동·호수배치도",
      description: "",
      layoutType: "detailImages",
      media: { enabled: false },
      /* [이미지] 공식 동·호수배치도 (1100×1568 · 원본 비율 · 클릭 시 확대 보기) */
      images: [{ src: "./assets/images/pages/building-plan.jpg", alt: "building-plan.jpg", width: 1100, height: 1568, zoom: true }],
      notes: ["※ 동·호수 표는 소비자의 이해를 돕기 위한 것으로 편집 과정상 오류가 있을 수 있으니 반드시 견본주택에서 확인하시기 바랍니다."],
      sections: []
    },
    design: {
      enabled: true, category: "단지안내", title: "단지설계",
      description: "",
      layoutType: "complexDesign",      /* 내용은 siteContent.complexDesign */
      media: { enabled: false },
      sections: []
    },
    nedkahn: {
      enabled: true, category: "단지안내", title: "네드칸",
      description: "",
      layoutType: "detailImages",
      media: { enabled: false },
      /* [이미지] 공식 네드칸 상세 이미지 (1100×1695) */
      images: [{ src: "./assets/images/pages/nedkahn-pc.jpg", mobileSrc: "./assets/images/pages/nedkahn-mobile.jpg", alt: "nedkahn-pc.jpg", width: 1100, height: 1695 }],
      notes: [
        "※ 상기 작품 이미지는 참고용으로만 사용되었으며, 작가 Ned Kahn의 과거 작업 일부를 보여줍니다.",
        "※ 해당 작품들에 대한 저작권은 작가 및 기타 관련 권리자에게 있습니다. 이미지는 작가 제공 또는 별도 표기된 출처에 따라 수록되었습니다.",
        "※ 상기 이미지는 소비자의 이해를 돕기 위해 제작된 것으로 실제와 상이할 수 있습니다."
      ],
      sections: []
    },
    rooftop: {
      enabled: true, category: "단지안내", title: "루프탑 가든",
      description: "",
      layoutType: "detailImages",
      media: { enabled: false },
      /* [이미지] 공식 루프탑 가든 상세 이미지 (1100×2224) */
      images: [{ src: "./assets/images/pages/rooftop-garden-pc.jpg", mobileSrc: "./assets/images/pages/rooftop-garden-mobile.jpg", alt: "rooftop-garden-pc.jpg", width: 1100, height: 2224 }],
      notes: [
        "※ 상기 이미지는 소비자의 이해를 돕기 위해 제작된 것으로 실제와 상이할 수 있습니다.",
        "※ 본 홈페이지는 소비자의 이해를 돕기 위해 사전홍보용으로 제작된 것으로 상기 시설 및 내용은 변동될 수 있으니 계약 전 확인하시기 바랍니다."
      ],
      sections: []
    },
    clubcloud: {
      enabled: true, category: "단지안내", title: "CLUB CLOUD",
      description: "",
      layoutType: "detailImages",
      media: { enabled: false },
      /* [이미지] 공식 CLUB CLOUD 상세 이미지 (1100×2877) */
      images: [{ src: "./assets/images/pages/club-cloud-pc.jpg", mobileSrc: "./assets/images/pages/club-cloud-mobile.jpg", alt: "club-cloud-pc.jpg", width: 1100, height: 2877 }],
      notes: [
        "※ 상기 이미지는 소비자의 이해를 돕기 위해 제작된 것으로 실제와 차이가 있을 수 있습니다.",
        "※ 상기 이미지에는 스케일이 미반영되어 있습니다.",
        "※ CLUB CLOUD 내 이동식 가구 및 조명, 소품류는 별도 제공되지 않습니다.",
        "※ 102동의 2, 3, 4호 라인 최상층에는 CLUB CLOUD(스카이 커뮤니티)가, 102동 9층 1호 라인에는 EDU LOUNGE가 계획되어 있으며, 인접한 동 및 실내에는 내부 조명 및 경관조명으로 인한 빛의 산란이나, 설비의 가동으로 인한 소음 및 진동 등 생활의 불편함이 발생할 수 있습니다.",
        "※ CLUB CLOUD 및 EDU LOUNGE의 이용자들로 인하여 해당 동 및 인접 동 호실에서는 소음 및 진동, 사생활 침해 등이 있을 수 있습니다.",
        "※ CLUB CLOUD 전용 엘리베이터는 9층과 47층만 운행됩니다.",
        "※ CLUB CLOUD 내 각 시설들의 명칭, 용도 및 운영방식 등은 사업주체, 입주자관리단 및 전문위탁관리업체의 협의 과정에서 변경될 수 있습니다."
      ],
      sections: []
    },
    concord: {
      enabled: true, category: "단지안내", title: "콩코드 클럽 바이 조선",
      description: "조선호텔앤리조트가 운영하는 프리미엄 멤버십 피트니스 클럽",
      layoutType: "tabImages",
      media: { enabled: false },
      /* [이미지] 층별 탭 → 공식 상세 이미지 (원본 비율) */
      tabs: [
        { label: "B1F", image: { src: "./assets/images/pages/concord-b1f-pc.jpg", mobileSrc: "./assets/images/pages/concord-b1f-mobile.jpg", alt: "concord-b1f-pc.jpg", width: 1100, height: 1834 } },
        { label: "B2F", image: { src: "./assets/images/pages/concord-b2f-pc.jpg", mobileSrc: "./assets/images/pages/concord-b2f-mobile.jpg", alt: "concord-b2f-pc.jpg", width: 1100, height: 1733 } },
        { label: "B3F", image: { src: "./assets/images/pages/concord-b3f-pc.jpg", mobileSrc: "./assets/images/pages/concord-b3f-mobile.jpg", alt: "concord-b3f-pc.jpg", width: 1100, height: 1621 } }
      ],
      notes: [],
      sections: []
    },
    system: {
      enabled: true, category: "단지안내", title: "SYSTEM",
      description: "",
      layoutType: "tabImages",
      media: { enabled: false },
      /* [이미지] 시스템 탭 → 공식 상세 이미지 (원본 비율) */
      tabs: [
        { label: "스마트&안전 시스템", image: { src: "./assets/images/pages/system-smart-safety-pc.jpg", mobileSrc: "./assets/images/pages/system-smart-safety-mobile.jpg", alt: "system-smart-safety-pc.jpg", width: 1100, height: 2325 } },
        { label: "에너지 시스템",     image: { src: "./assets/images/pages/system-energy-pc.jpg", mobileSrc: "./assets/images/pages/system-energy-mobile.jpg", alt: "system-energy-pc.jpg", width: 1100, height: 1864 } },
        { label: "편의 시스템",       image: { src: "./assets/images/pages/system-convenience-pc.jpg", mobileSrc: "./assets/images/pages/system-convenience-mobile.jpg", alt: "system-convenience-pc.jpg", width: 1100, height: 1963 } }
      ],
      notes: [],
      sections: []
    },
    telecom: {
      enabled: true, category: "단지안내", title: "이동통신설비협의결과서",
      description: "",
      layoutType: "documentPage",
      media: { enabled: false },
      intro: "목동윤슬자이 이동통신설비 협의 결과서입니다. 아래 안내 이미지를 확인하시거나 원본 파일을 열어 보실 수 있습니다.",
      /* [문서] 공식 협의결과서 이미지 (1100×3114 · 안내 이미지와 문서 미리보기가 같은 가로 폭) */
      document: { type: "image", src: "./assets/images/pages/telecom-result.jpg", alt: "telecom-result.jpg", width: 1100, height: 3114, fileName: "목동윤슬자이_이동통신설비협의결과서.jpg" },
      viewLabel: "문서 보기", downloadLabel: "다운로드",
      officialUrl: "https://xi.co.kr/mdx/view?cmsMenuSeq=29749",
      sections: []
    },

    /* =============== 세대안내 =============== */
    items: {
      enabled: true, category: "세대안내", title: "기본제공품목",
      description: "",
      layoutType: "detailImages",
      media: { enabled: false },
      /* [이미지] 공식 기본제공품목 상세 이미지 (1100×1010) */
      images: [{ src: "./assets/images/pages/basic-items-pc.jpg", mobileSrc: "./assets/images/pages/basic-items-mobile.jpg", alt: "basic-items-pc.jpg", width: 1100, height: 1010 }],
      notes: [],
      sections: []
    },
    floorplan: {
      enabled: true, category: "세대안내", title: "평면정보",
      description: "",
      layoutType: "floorPlan",          /* 탭 · 이미지는 siteContent.unitTypes (11종) · ?type=115A 로 특정 타입 바로 열기 */
      media: { enabled: false },
      tabs: [],
      notes: [],
      sections: []
    },
    emodel: {
      enabled: true, category: "세대안내", title: "E-모델하우스",
      description: "유니트 내부를 360° VR 로 둘러보실 수 있습니다.",
      layoutType: "vr",
      vrUrl: "https://www.xi-event.com/templete/mdx/vr3/tour.html",   /* 공식 E-모델하우스 VR (새 창) */
      buttonLabel: "E-모델하우스 보기 (새 창)",
      media: { enabled: false },
      sections: []
    },

    /* =============== 분양안내 (문서형 : 제목 → 안내 → 미리보기/PDF 뷰어 → 문서 보기 · 다운로드) =============== */
    schedule: {
      enabled: true, category: "분양안내", title: "분양일정",
      description: "",
      layoutType: "documentPage",
      media: { enabled: false },
      document: { type: "image", src: "./assets/images/pages/sales-schedule.jpg", alt: "sales-schedule.jpg", width: 1100, height: 627, fileName: "목동윤슬자이_분양일정.jpg" },
      officialUrl: "https://xi.co.kr/mdx/view?cmsMenuSeq=29764",
      sections: []
    },
    supply: {
      enabled: true, category: "분양안내", title: "공급안내",
      description: "",
      layoutType: "documentPage",
      media: { enabled: false },
      document: { type: "image", src: "./assets/images/pages/sales-supply.jpg", alt: "sales-supply.jpg", width: 1100, height: 1635, fileName: "목동윤슬자이_공급안내.jpg" },
      officialUrl: "https://xi.co.kr/mdx/view?cmsMenuSeq=29765",
      sections: []
    },
    stamptax: {
      enabled: true, category: "분양안내", title: "인지세 납부안내",
      description: "",
      layoutType: "documentPage",
      media: { enabled: false },
      document: { type: "image", src: "./assets/images/pages/sales-stamp-tax.jpg", alt: "sales-stamp-tax.jpg", width: 1100, height: 1556, fileName: "목동윤슬자이_인지세납부안내.jpg" },
      officialUrl: "https://xi.co.kr/mdx/view?cmsMenuSeq=29778",
      sections: []
    },
    contract: {
      enabled: true, category: "분양안내", title: "정당계약 안내문",
      description: "",
      layoutType: "documentPage",
      media: { enabled: false },
      document: { type: "image", src: "./assets/images/pages/sales-contract-guide.jpg", alt: "sales-contract-guide.jpg", width: 1100, height: 1557, fileName: "목동윤슬자이_정당계약안내문.jpg" },
      officialUrl: "https://xi.co.kr/mdx/view?cmsMenuSeq=29779",
      sections: []
    },

    /* =============== 홍보센터 =============== */
    tv: {
      enabled: true, wide: true, category: "홍보센터", title: "자이TV",
      description: "",
      layoutType: "video",
      media: { enabled: false },
      /* [영상] 공식 자이TV 7개 (YouTube ID) — 카드는 img.youtube.com 썸네일(16:9) + 재생 버튼, 클릭 시 모달에서 youtube-nocookie 재생 */
      items: [
        { enabled: true, title: "성시경이 소개하는 목동윤슬자이 DOCENT TOUR",                    videoUrl: "https://youtu.be/5U1yM7jFCZk", videoType: "youtube", ratio: "16 / 9" },
        { enabled: true, title: "목동윤슬자이 It’s Orchestrated : 완벽하게 조율된 삶",             videoUrl: "https://youtu.be/rTN_IxGmrQA", videoType: "youtube", ratio: "16 / 9" },
        { enabled: true, title: "목동윤슬자이 x 콩코드 클럽 바이 조선 (CONCORD CLUB BY JOSUN)",  videoUrl: "https://youtu.be/jwyRyVEuWrk", videoType: "youtube", ratio: "16 / 9" },
        { enabled: true, title: "목동윤슬자이 x 네드 칸(Ned Kahn)",                                videoUrl: "https://youtu.be/jjX3i3_mG_k", videoType: "youtube", ratio: "16 / 9" },
        { enabled: true, title: "목동윤슬자이 티저필름_Short Version",                             videoUrl: "https://youtu.be/MSglnMNEqLY", videoType: "youtube", ratio: "16 / 9" },
        { enabled: true, title: "모든 순간 차이가 되다",                                           videoUrl: "https://youtu.be/wkAFplENXVo", videoType: "youtube", ratio: "16 / 9" },
        { enabled: true, title: "Recreate, Every Moment 당신으로부터 차이가 되다",                  videoUrl: "https://youtu.be/ZtsXOJ8pBcI", videoType: "youtube", ratio: "16 / 9" }
      ],
      sections: []
    },

    press: {
      enabled: true, category: "홍보센터", title: "언론보도",
      description: "관련 기사를 모아 확인하실 수 있습니다.",
      layoutType: "news",
      perPage: 10,                      /* 한 페이지당 기사 수 */
      /* 게시판형 목록이므로 대표 이미지는 사용하지 않습니다. */
      media: { enabled: false, src: "", mobileSrc: "", alt: "", href: "", target: "_self", ratio: "21 / 9", objectFit: "cover", objectPosition: "center center", position: "top" },
      /* 자이 공식 언론보도 게시판(https://xi.co.kr/mdx/view?cmsMenuSeq=29485)의 76건 · url 은 각 언론사 실제 기사 주소
         (url 이 비어 있으면 링크 없이 제목만 표시됩니다 — 임의 주소를 넣지 마세요) */
      items: [
        { enabled: true, number: 76, title: "‘목동윤슬자이’ 견본주택 인산인해… 목동 하이엔드 주거 새 기준 제시", publisher: "아시아경제", date: "2026.09.07", url: "https://n.news.naver.com/mnews/article/277/0005812629?sid=101" },
        { enabled: true, number: 75, title: "\"목동에서 호텔급 라이프스타일 경험\"... '목동윤슬자이' 8일부터 청약", publisher: "파이낸셜뉴스", date: "2026.09.07", url: "https://n.news.naver.com/mnews/article/014/0005571882?sid=101" },
        { enabled: true, number: 74, title: "성시경이 들려주는 유니트 설명… ‘셀럽 오디오 도슨트’, ‘목동윤슬자이’ 견본주택에 도입", publisher: "디지털타임스", date: "2026.09.04", url: "https://n.news.naver.com/mnews/article/029/0003046166?sid=101" },
        { enabled: true, number: 73, title: "조선호텔앤리조트, 목동윤슬자이 웰니스 시설 운영", publisher: "한국일보", date: "2026.09.02", url: "https://www.hankookilbo.com/news/article/A2026090210430001900?did=NA" },
        { enabled: true, number: 72, title: "아파트에 조선호텔 서비스를...'목동윤슬자이', 프리미엄 웰니스 '콩코드 클럽' 품는다", publisher: "파이낸셜뉴스", date: "2026.09.02", url: "https://www.fnnews.com/news/202609021057585552" },
        { enabled: true, number: 71, title: "조선호텔앤리조트, ‘목동윤슬자이’ 웰니스 시설 위탁운영", publisher: "한경머니", date: "2026.09.02", url: "https://magazine.hankyung.com/money/article/202609029063c" },
        { enabled: true, number: 70, title: "비슷한 가격인데 보유세 5배 차이? 고가 주택 시장, '보유비용 경쟁력'", publisher: "E동아", date: "2026.08.25", url: "https://edu.donga.com/news/articleView.html?idxno=111239" },
        { enabled: true, number: 69, title: "종부세 개편에 자산가 셈법 복잡… 보유비용 적은 대형 오피스텔", publisher: "아시아경제", date: "2026.08.25", url: "https://view.asiae.co.kr/article/2026082514242178670" },
        { enabled: true, number: 68, title: "세제개편 앞둔 서울, 아파트•오피스텔 보유세 구조 차이 부각", publisher: "AP신문", date: "2026.08.25", url: "https://www.apnews.kr/news/articleView.html?idxno=3050663" },
        { enabled: true, number: 67, title: "관리비 줄이는 주거설계… 효율적 에너지 관리 적용 '목동윤슬자이'", publisher: "AP신문", date: "2026.08.25", url: "https://www.apnews.kr/news/articleView.html?idxno=3050666" },
        { enabled: true, number: 66, title: "관리비 부담까지 고려한 주거설계 에너지·운영 혁신 적용한 ‘목동윤슬자이’ 눈길", publisher: "아시아경제", date: "2026.08.25", url: "https://view.asiae.co.kr/article/2026082514452179241" },
        { enabled: true, number: 65, title: "목동윤슬자이, 관리비 절감 주거 설계 적용", publisher: "뉴스핌", date: "2026.08.25", url: "https://www.newspim.com/news/view/20260825000744" },
        { enabled: true, number: 64, title: "고가 주거상품, 매입가만큼 ‘보유비용’도 변수…대형 주거형 오피스텔 주목", publisher: "이코노미스트", date: "2026.08.21", url: "https://economist.co.kr/article/view/ecn202608210015" },
        { enabled: true, number: 63, title: "값 비슷한데 보유세는 5배 격차?… 고가 주택 시장서 ‘보유비용 경쟁력’ 갖춘 대형 오피스텔 눈길", publisher: "서울신문", date: "2026.08.21", url: "https://www.seoul.co.kr/news/economy/2026/08/21/20260821500069?wlog_tag3=naver" },
        { enabled: true, number: 62, title: "목동 재건축 속 오목교역 생활권 주목…‘목동윤슬자이’ 651실 공급", publisher: "이코노미스트", date: "2026.08.21", url: "https://n.news.naver.com/mnews/article/243/0000101796?sid=101" },
        { enabled: true, number: 61, title: "오목교역 일대 고층 주거시설 거래가 상승, ‘목동윤슬자이’ 공급", publisher: "조선비즈", date: "2026.08.21", url: "https://n.news.naver.com/mnews/article/366/0001186781?sid=101" },
        { enabled: true, number: 60, title: "목동 옛 KT부지에 ‘목동윤슬자이’ 공급…오목교역 인프라 연계 관심", publisher: "서울신문", date: "2026.08.21", url: "https://www.seoul.co.kr/news/economy/2026/08/07/20260807500035?wlog_tag3=naver" },
        { enabled: true, number: 59, title: "‘서남권 골든웨이’ 뜬다, 목동윤슬자이 수혜", publisher: "경상일보", date: "2026.08.21", url: "https://www.ksilbo.co.kr/news/articleView.html?idxno=1063982" },
        { enabled: true, number: 58, title: "새 개발 이어져도 중심은 쉽게 안 바뀐다… 주목받는 ‘중심지 락인 효과’", publisher: "헤럴드경제", date: "2026.08.06", url: "" },
        { enabled: true, number: 57, title: "주상복합 관리비 부담 낮췄다...‘목동윤슬자이’ 차별화된 운영 방식 눈길", publisher: "헤럴드경제", date: "2026.07.23", url: "https://n.news.naver.com/mnews/article/016/0002674040?sid=101" },
        { enabled: true, number: 56, title: "\"주상복합 관리비는 비싸다\" 편견 깨나… '목동윤슬자이' 친환경 기술과 新 운영 모델로 관리비 거품 낮춰", publisher: "파이낸셜뉴스", date: "2026.07.23", url: "https://n.news.naver.com/mnews/article/014/0005551935?sid=101" },
        { enabled: true, number: 55, title: "“샤론코치가 왜 거기서”...목동윤슬자이 사업설명회, 스타강사들이 '입시·재테크 강연'", publisher: "파이낸셜뉴스", date: "2026.07.20", url: "https://n.news.naver.com/mnews/article/014/0005550149?sid=101" },
        { enabled: true, number: 54, title: "호텔에서 배우고, 홍보관에서 직접 만들고…'목동윤슬자이' 이색 마케팅 눈길", publisher: "전자신문", date: "2026.07.20", url: "https://n.news.naver.com/mnews/article/030/0003449031?sid=101" },
        { enabled: true, number: 53, title: "[카드] \"도로가 숲 되니\" 여의도 금융·목동 교육 묶는 서남권 골든웨이 완성", publisher: "프라임경제", date: "2026.07.02", url: "https://www.newsprime.co.kr/news/article/?no=738875" },
        { enabled: true, number: 52, title: "국회대로 녹지 조성 추진…오목교역 일대 변화 주목", publisher: "한국경제", date: "2026.07.02", url: "https://n.news.naver.com/mnews/article/015/0005305530" },
        { enabled: true, number: 51, title: "서울 분양가 급등… 재건축 본궤도 오른 목동, 신축 희소성 부각", publisher: "리얼캐스트", date: "2026.06.30", url: "https://www.rcast.co.kr/news/articleView.html?idxno=31157" },
        { enabled: true, number: 50, title: "서울 분양가 상승 속 재건축 진행 중인 목동 지역 신축 공급 주목", publisher: "서울신문", date: "2026.06.30", url: "https://n.news.naver.com/mnews/article/081/0003657065?sid=101" },
        { enabled: true, number: 49, title: "외래어 붙는 아파트 단지...순우리말 눈길 가네", publisher: "파이낸셜뉴스", date: "2026.06.26", url: "https://n.news.naver.com/mnews/article/014/0005540035?sid=101" },
        { enabled: true, number: 48, title: "아파트 단지명 ‘순우리말’로 차별화", publisher: "디지털타임스", date: "2026.06.26", url: "https://n.news.naver.com/mnews/article/029/0003033842?sid=101" },
        { enabled: true, number: 47, title: "신축 공급 더해지는 목동… 새 주거지 변화 주목", publisher: "헤럴드경제", date: "2026.06.23", url: "https://n.news.naver.com/mnews/article/016/0002660091?sid=101" },
        { enabled: true, number: 46, title: "목동 세 번째 대전환 ‘목동 3.0’ 본격화", publisher: "이코노믹 리뷰", date: "2026.06.23", url: "https://www.econovill.com/news/articleView.html?idxno=743126" },
        { enabled: true, number: 45, title: "‘마이크로’에서 ‘메가’로… 전용 100㎡ 이상 중대형 주거상품 뜬다", publisher: "디지털타임스", date: "2026.06.16", url: "https://n.news.naver.com/mnews/article/029/0003032004" },
        { enabled: true, number: 44, title: "중대형 오피스텔 가격 상승세…주거형 상품으로 영역 확대", publisher: "한국경제", date: "2026.06.16", url: "https://n.news.naver.com/article/015/0005299248?sid=101" },
        { enabled: true, number: 43, title: "\"국평 50억 시대 온다\"… 목동 재건축 '미래 신축' 선점 치열", publisher: "리얼캐스트", date: "2026.06.12", url: "https://www.rcast.co.kr/news/articleView.html?idxno=31034" },
        { enabled: true, number: 42, title: "목동 재건축 본격화에 집값 재평가…신규 주거상품 관심 확대", publisher: "한국경제", date: "2026.06.12", url: "https://n.news.naver.com/mnews/article/015/0005298030?sid=101" },
        { enabled: true, number: 41, title: "목동윤슬자이 외관, 네드 칸의 '키네틱 파사트'로 꾸민다", publisher: "뉴시스", date: "2026.06.09", url: "https://n.news.naver.com/mnews/article/003/0013994947?sid=101" },
        { enabled: true, number: 40, title: "\"바람 불면 아파트 외벽 '출렁'\"…목동 새 단지에 들어서는 작품", publisher: "한국경제", date: "2026.06.09", url: "https://n.news.naver.com/mnews/article/015/0005296521?sid=101" },
        { enabled: true, number: 39, title: "양천구 입주 공백 속 서울 서남권 신축 희소성 부각", publisher: "헤럴드경제", date: "2026.05.29", url: "https://n.news.naver.com/mnews/article/016/0002649722?sid=101" },
        { enabled: true, number: 38, title: "서울 서남권 신축 희소성 확대…신규 분양 단지 관심 이어져", publisher: "한국경제", date: "2026.05.29", url: "https://n.news.naver.com/mnews/article/015/0005292729?sid=101" },
        { enabled: true, number: 37, title: "GS건설, 목동윤슬자이에 조선호텔 멤버십 피트니스 클럽 도입", publisher: "뉴시스", date: "2026.05.20", url: "https://www.newsis.com/view/NISX20260520_0003637296" },
        { enabled: true, number: 36, title: "목동윤슬자이, 조선호텔앤리조트와 호텔급 피트니스 클럽 운영", publisher: "리얼캐스트", date: "2026.05.20", url: "https://www.rcast.co.kr/news/articleView.html?idxno=30831" },
        { enabled: true, number: 35, title: "GS건설, 목동에 웰니스 주거 선보인다", publisher: "비욘드포스트", date: "2026.05.20", url: "https://www.beyondpost.co.kr/view.php?ud=202605201220326238205868f676_30" },
        { enabled: true, number: 34, title: "목동윤슬자이', 3000평 규모 조선호텔 멤버십 피트니스 클럽 도입", publisher: "더팩트", date: "2026.05.20", url: "https://news.tf.co.kr/read/economy/2324614.htm" },
        { enabled: true, number: 33, title: "GS건설, 조선호텔앤리조트와 맞손…목동윤슬자이에 호텔급", publisher: "팍스경제TV", date: "2026.05.20", url: "https://www.paxetv.com/news/articleView.html?idxno=272563" },
        { enabled: true, number: 32, title: "GS건설, 옛 KT부지 ‘목동윤슬자이’에 조선호텔앤리조트 ‘프리미엄’ 내세워", publisher: "이뉴스투데이", date: "2026.05.20", url: "https://www.enewstoday.co.kr/news/articleView.html?idxno=2431334" },
        { enabled: true, number: 31, title: "GS건설 '목동윤슬자이'에 조선호텔 웰니스 '콩코드 클럽' 도입", publisher: "현대경제신문", date: "2026.05.20", url: "https://www.finomy.com/news/articleView.html?idxno=254649" },
        { enabled: true, number: 30, title: "GS건설, 목동윤슬자이에 조선호텔 웰니스 도입⋯7월 분양 예정", publisher: "이투데이", date: "2026.05.20", url: "https://www.etoday.co.kr/news/view/2586280" },
        { enabled: true, number: 29, title: "GS건설, 목동 옛 KT부지…총 651실 오피스텔", publisher: "매일경제", date: "2026.05.18", url: "https://www.mk.co.kr/news/realestate/12050264" },
        { enabled: true, number: 28, title: "GS건설, 명문학원가·생활인프라 강점 '목동윤슬자이' 6월 분양", publisher: "우먼타임스", date: "2026.05.13", url: "https://www.womentimes.co.kr/news/articleView.html?idxno=102928" },
        { enabled: true, number: 27, title: "GS건설, ‘목동윤슬자이’ 6월 분양…총 651실 규모", publisher: "디지틀조선TV", date: "2026.05.13", url: "https://www.dizzotv.com/site/data/html_dir/2026/05/13/2026051380040.html" },
        { enabled: true, number: 26, title: "신규 공급 드문 목동에 ‘자이’ 들어선다…GS건설, 6월 분양", publisher: "조세금융신문", date: "2026.05.13", url: "https://www.tfmedia.co.kr/news/article.html?no=204475" },
        { enabled: true, number: 25, title: "GS건설, ‘목동윤슬자이’ 6월 분양…스카이커뮤니티 조성", publisher: "헤럴드경제", date: "2026.05.13", url: "https://biz.heraldcorp.com/article/10736835" },
        { enabled: true, number: 24, title: "\"학군·교통 다 잡았다\"…GS건설, '목동윤슬자이' 내달 분양", publisher: "아이뉴스24", date: "2026.05.13", url: "https://www.inews24.com/view/1968029" },
        { enabled: true, number: 23, title: "GS건설, 목동윤슬자이 다음달 분양… “학군지 핵심 입지에 실용", publisher: "서울신문", date: "2026.05.13", url: "https://www.seoul.co.kr/news/economy/industry/2026/05/13/20260513500087" },
        { enabled: true, number: 22, title: "[카드] 新 주거모델 '하이퍼트' 목동윤슬자이, 지역 랜드마크 자신감", publisher: "프라임경제", date: "2026.05.13", url: "https://www.newsprime.co.kr/news/article/?no=733308" },
        { enabled: true, number: 21, title: "GS건설, 실용성과 하이엔드 공존 '목동윤슬자이' 6월 분양 예정", publisher: "CATCH NEWS", date: "2026.05.13", url: "https://www.newscape.co.kr/news/articleView.html?idxno=122175" },
        { enabled: true, number: 20, title: "GS건설, 실용성과 하이엔드 공존 '목동윤슬자이' 6월 분양 예정", publisher: "뉴스케이프", date: "2026.05.13", url: "https://www.newscape.co.kr/news/articleView.html?idxno=122175" },
        { enabled: true, number: 19, title: "'실용성과 하이엔드의 조화' GS건설 '목동윤슬자이' 공급", publisher: "파이낸셜뉴스", date: "2026.05.13", url: "https://www.fnnews.com/news/202605131536308976" },
        { enabled: true, number: 18, title: "GS건설, 옛 KT부지에 ‘목동윤슬자이’ 6월 분양", publisher: "FETV", date: "2026.05.13", url: "https://www.fetv.co.kr/news/articleView.html?idxno=302322" },
        { enabled: true, number: 17, title: "오피스텔 '발코니 설치' 허용…아파트와 주거 경계 허문다", publisher: "한국경제", date: "2026.04.28", url: "https://n.news.naver.com/mnews/article/015/0005280579?sid=101" },
        { enabled: true, number: 16, title: "오피스텔 발코니 설치 전면 허용…주거 기준 변화 본격화", publisher: "이코노미스트", date: "2026.04.28", url: "https://n.news.naver.com/mnews/article/243/0000097133?sid=101" },
        { enabled: true, number: 15, title: "‘오피스텔’ 발코니 전면 허용…주거시장 새 기준 열린다", publisher: "로이슈", date: "2026.04.28", url: "https://www.lawissue.co.kr/view.php?ud=20260428155156982567191f6c6e_12" },
        { enabled: true, number: 14, title: "오피스텔에도 '발코니' 설치···규제 완화로 실수요자 '주목'", publisher: "이뉴스투데이", date: "2026.04.28", url: "https://www.enewstoday.co.kr/news/articleView.html?idxno=2424155" },
        { enabled: true, number: 13, title: "'투자상품'에서 '실거주 선택지'로…발코니 허용이 바꾼 오피스텔 시장", publisher: "리얼캐스트", date: "2026.04.28", url: "https://www.rcast.co.kr/news/articleView.html?idxno=30627" },
        { enabled: true, number: 12, title: "목동 ‘금싸라기’ 옛 KT 부지, 48층 복합개발 시작", publisher: "동아일보", date: "2026.04.21", url: "https://www.donga.com/news/Economy/article/all/20260421/133780671/1" },
        { enabled: true, number: 11, title: "목동 '공급 가뭄' 속 재편 기대감…신규 단지에도 관심 집중", publisher: "한국경제", date: "2026.04.21", url: "https://www.hankyung.com/article/2026042146406" },
        { enabled: true, number: 10, title: "공급 막힌 목동 재편 신호탄… 서울 서남권 핵심축 위상 강화", publisher: "디지털타임스", date: "2026.04.21", url: "https://www.dt.co.kr/article/12058561?ref=naver" },
        { enabled: true, number: 9, title: "'준공 40년' 목동...주거 노후화, 서울 최고 수준", publisher: "팝콘뉴스", date: "2026.04.21", url: "https://www.popcornnews.net/news/articleView.html?idxno=118988" },
        { enabled: true, number: 8, title: "공급 막힌 ‘목동’ 재편…서울 서남권 핵심축 위상 강화 ‘주목’", publisher: "로이슈", date: "2026.04.21", url: "https://www.lawissue.co.kr/view.php?ud=20260421150504682467191f6c6e_12" },
        { enabled: true, number: 7, title: "\"노후 97%·신규 공급 '제로'\"…목동, 신축 갈증 속 기대감 커진다", publisher: "뉴스락", date: "2026.04.21", url: "https://www.newslock.co.kr/news/articleView.html?idxno=129032" },
        { enabled: true, number: 6, title: "공급 막힌 목동...GS건설, 막힌 혈 뚫는다... '목동윤슬자이' 공급", publisher: "비즈워크", date: "2026.04.21", url: "https://www.bizwork.co.kr/news/articleView.html?idxno=414850" },
        { enabled: true, number: 5, title: "목동 공급 공백 속 옛 kt부지 등 신규 공급 관심", publisher: "인더뉴스", date: "2026.04.21", url: "https://www.inthenews.co.kr/news/article.html?no=85830" },
        { enabled: true, number: 4, title: "[분양 포커스] 15년 이상 낡은 아파트 숲, 구도심 스카이라인", publisher: "브릿지경제", date: "2026.04.21", url: "https://www.viva100.com/article/20260421500327" },
        { enabled: true, number: 3, title: "목동 아파트 '노후화·공급 공백' 심화…신축 수요 확대", publisher: "직썰", date: "2026.04.21", url: "https://www.ziksir.com/news/articleView.html?idxno=131431" },
        { enabled: true, number: 2, title: "\"노후화 97%\" 신축 갈증 극심한 목동, \"옛 kt부지 등 신규 공급\"", publisher: "이코노미톡뉴스", date: "2026.04.21", url: "https://www.economytalk.kr/news/articleView.html?idxno=420673" },
        { enabled: true, number: 1, title: "노후화 심화 서울 '목동' 재편···서남권 핵심축 강화 '주목'", publisher: "이뉴스투데이", date: "2026.04.21", url: "https://www.enewstoday.co.kr/news/articleView.html?idxno=2421538" }
      ],
      sections: []
    },

    /* =============== 방문예약 · 이용안내 =============== */
    register: {
      enabled: true, category: "방문예약", title: "방문예약",
      description: "편안한 관람과 원활한 상담을 위해 사전 방문예약을 신청해 주세요.",
      layoutType: "form",
      sections: []
    },
    privacy: {
      enabled: true, category: "이용안내", title: "개인정보처리방침",
      description: "",
      layoutType: "text",
      media: { enabled: false },
      content: "목동윤슬자이 홈페이지의 개인정보처리방침은 GS건설 자이 공식 홈페이지의 개인정보처리방침을 따릅니다. 아래 버튼을 눌러 전문을 확인하실 수 있습니다.",
      links: [{ label: "개인정보처리방침 전문 보기", url: "http://www.xi.co.kr/rules/privacy", target: "_blank" }],
      sections: []
    },
    terms: {
      enabled: true, category: "이용안내", title: "이용약관",
      description: "",
      layoutType: "text",
      media: { enabled: false },
      content: "목동윤슬자이 홈페이지의 이용약관은 GS건설 자이 공식 홈페이지의 이용약관을 따릅니다. 아래 버튼을 눌러 전문을 확인하실 수 있습니다.",
      links: [{ label: "이용약관 전문 보기", url: "http://www.xi.co.kr/rules/use", target: "_blank" }],
      sections: []
    }
  }
};

/* =========================================================================
   복제용 편집 가이드 (다른 아파트 현장으로 옮길 때 이 순서대로 수정하세요)
   ------------------------------------------------------------------------
   [파일 구성]
     index.html              메인페이지
     subpage.html            모든 서브메뉴가 사용하는 공통 페이지
     assets/css/style.css    전체 디자인 (컬러·폰트 기본값)
     assets/js/site-data.js  모든 데이터 (이 파일) ← 대부분 여기만 고치면 됩니다
     assets/js/common.js     헤더 · 메가메뉴 · 팝업 · 퀵메뉴 · 푸터 · 폼 · 스크롤 효과
     assets/js/main.js       메인페이지 섹션
     assets/js/subpage.js    서브페이지 (subpage.html?page=페이지ID)
     assets/fonts/           Pretendard 폰트 (Regular/Medium/SemiBold/Bold)
     assets/images/          모든 이미지

   1) 현장명 · 로고 · 전화번호 → site
      로고는 이미지 한 장만 사용합니다. (헤더에 한글·영문 텍스트를 따로 출력하지 않음)
      logo.imageLight  : 어두운 헤더(조감도 위)용 화이트 로고
      logo.imageDark   : 흰색 헤더용 네이비 로고
      logo.width       : 로고 가로 크기(px) · logo.alt : 대체 텍스트
      ※ 로고 이미지 파일이 아직 없을 때만 fallbackText 가 임시로 표시됩니다.

   2) 컬러 · 폰트 · 글자 크기/굵기/자간/행간 → theme
      컬러는 theme.colors 의 --color-* 토큰 하나만 바꾸면
      헤더 · 메뉴 · 버튼 · 링크 · 팝업 탭 · 퀵메뉴 · 방문예약 · 푸터까지 모두 바뀝니다.
      (CSS 안에는 색상값을 직접 쓰지 않고 이 토큰만 참조합니다)
      theme.colors / theme.fonts / theme.typography / theme.layout
      (CSS 를 고치지 않아도 CSS 변수로 자동 적용됩니다.)
      한글 폰트 파일을 바꾸려면 assets/fonts 에 파일을 넣고
      style.css 최상단 @font-face 의 url 만 수정하세요.

   3) 헤더 메뉴 · 소메뉴 → menu
      메가메뉴는 메인 메뉴 바로 아래에 소메뉴 열이 자동 정렬됩니다.
      링크 규칙은 pageUrl (기본 subpage.html?page=페이지ID)
      메인페이지 섹션으로 바로 보내고 싶은 메뉴만 sectionMap 에 추가하세요.

   4) 메인 첫 화면 → mainSlider (5장 이미지 슬라이드 · 문구 없음)
      · 이미지 : slides[].src (PC) · slides[].mobileSrc (모바일) · alt
      · 동작   : interval(자동 전환 간격) · duration(페이드 시간)
      · 파일   : assets/images/main-slider/slide-01~05-pc.jpg (PC 1920×1080) · slide-01~05-mobile.jpg (공식 모바일 전용 640×645)

   5) SUMMARY → summaryScene(오버레이 색 · 제목 · 유의 문구) — 첫 화면 슬라이드 위 오버레이로 표시 (내용은 siteContent.businessOverview)
      rows 를 추가·삭제하면 정보 그리드가 자동으로 3열/2열/1열로 정렬됩니다.

   6) PREMIUM → premiumSection + premium 배열
      배열 개수만큼 화면이 자동 분할(3개=3분할, 6개=6분할)됩니다.
      제목 영역을 숨기려면 premiumSection.showHeading = false

   7) 입지환경 → environmentSection + environment 배열
      세 카드의 기준선은 항상 동일하며, 이미지 규격은
      environmentSection.imageAspectRatio / imageHeight / imageGap / cardGap 로
      한 번에 변경합니다. 개별 이미지는 image.position(초점), image.objectFit 로 조정합니다.

   8) 타입안내 → unitSection + units 배열
      unitSection.title 이 메인 TYPE 섹션 제목입니다. (기본 "타입안내")
      한 화면에 보이는 개수는 unitSection.perView (기본 3, 태블릿 2, 모바일 1)
      버튼(links.floorPlan / interior / modelHouse)이 비면 자동으로 숨겨지고,
      버튼 개수가 달라도 이미지 상·하단 기준선은 자동으로 맞춰집니다.

   9) 방문예약 → reserve (섹션 id 는 #visit-reservation)
      fields 배열 : text / phone(010-입력-입력) / date / time / select / textarea
      visitTimes 배열 : 방문 시간 선택 목록
      신청 내용은 통합웹빌더 서버로 전송되어 관리자(통합웹빌더관리자.html) › 방문예약 관리에 저장됩니다.
      서버 주소 · 사이트 식별값은 assets/js/cms-config.js 에서 설정합니다. (안내 문구를 바꾸려면 reserve.messages { offline, network, fail, busy })

  10) 좌측 팝업 → popupOptions + popups
      팝업은 이미지 전용입니다. (제목 · 설명 · 버튼 · 하단 문구 없음)
      popupBanners[] 한 배열의 src · alt · href 만 넣으면 PC 3열과 모바일 슬라이드에 동시에 반영됩니다.
      이미지 비율은 popupOptions.aspectRatio(기본 3 / 4), 높이는 desktopHeight 로 조절합니다.
      닫기는 패널 우측 상단 ✕ 또는 세로형 POPUP 탭으로 하며,
      한 번 닫으면 같은 탭에서 다른 페이지로 이동해도 자동으로 다시 열리지 않습니다.
      배너는 데스크톱에서 가로 한 줄로 모두 펼쳐집니다. (슬라이드·도트 없음)
      columns(기본 3) · aspectRatio(기본 3 / 2) · gap · objectFit 으로 크기를 맞추고,
      너비는 widthMode(full·medium·custom) 와 fullWidth / mediumWidth / customWidth,
      최대 높이는 desktopMaxHeight(기본 68vh) 로 조절합니다.
      배너별로 aspectRatio · objectFit · image.position(초점)을 따로 지정할 수 있습니다.
      모바일에서는 한 장씩 가로 스와이프로 표시됩니다.
      팝업 너비는 우측 퀵메뉴와 quickGap(기본 24px) 이상 떨어지도록 자동 계산되며,
      패널 우측 상단 ✕ 버튼 · 하단 닫기 · 세로형 POPUP 탭 어느 것으로도 닫을 수 있습니다.
      닫힘 상태는 sessionStorage(일반 닫기) · localStorage(오늘 하루 보지 않기)에 저장되어
      메인과 모든 소메뉴 페이지에서 공통으로 유지됩니다.
      닫기 상태 : 일반 닫기는 sessionStorage, 오늘 하루 보지 않기는 localStorage 에
      저장되어 서브페이지로 이동해도 다시 자동으로 열리지 않습니다.

  11) 우측 퀵메뉴 → quickMenu + quickMenuTitle + settings.quickMobile
      icon : home / unit / mail / phone / map / calendar / premium / top
      type:"section" → 같은 페이지 섹션 이동 / type:"page" + page:"페이지ID" → 메뉴와 같은 소메뉴 페이지 이동 / type:"link" + url → 임의 주소

  12) 서브페이지 → pages
      layoutType 으로 페이지마다 본문 구조가 달라집니다.
        overview · featureGrid · locationMap · vr · directions · brandStory ·
        premium · sitePlan · unitMap · imageStory · tabsGallery · gallery ·
        system · floorPlan · table · document · schedule · news · video · form · text
      (이전·다음 페이지 이동 영역은 사용하지 않습니다.)
      큰 한글 제목 위의 작은 영문(PROJECT · LOCATION 등)은 표시하지 않습니다.
      사업개요(overview)는 왼쪽 이미지 + 오른쪽 정보표 2열이며,
      layoutRatio(예 "1.2fr 1fr") · image.ratio · details[] · notice 로 편집합니다.
      모든 페이지의 sections 배열에 아래 유형을 자유롭게 추가할 수 있습니다.
        { type:"image",     enabled:true, image, alt, ratio, objectFit, objectPosition, maxWidth }
        { type:"imageText", enabled:true, layout:"image-left"|"image-right", title, description, image, ratio }
        { type:"gallery",   enabled:true, columns:3, images:[{ src, alt }] }
      enabled:false 로 두면 여백 없이 완전히 사라집니다.
      · iframe : pages[].iframe 에 주소 입력 (항공 VR · e모델하우스 · 영상)
      · document : pages[].documents 에 { label, meta, url }
      · 숫자 요약 : pages[].stats 에 { value, unit, label }
      · 하단 주의문구 : pages[].note
      · 넓은 화면이 필요하면 pages[].wide = true
      등록되지 않은 page 값으로 접근하면 같은 디자인의 안내 화면이 표시됩니다.

  13) 푸터 → footer
      notices 배열(※ 유의사항) · phoneLabel · phoneDisplay · phoneLink 로 수정하며
      모든 페이지 하단에 동일하게 출력됩니다.

  14) 섹션 순서 · 노출 → sections (배열 순서대로 표시, enabled:false 면 제거)
      스크롤 효과 → animation (enabled / replay / duration / stagger / threshold / parallax)

  15) [이미지] 모든 이미지는 media 한 가지 형식으로 관리하며, 화면에는 항상 실제 <img> 가 출력됩니다.
      media: {
        enabled: true,
        src: "./assets/images/a.jpg" | "/images/a.jpg" | "https://example.com/a.jpg",
        mobileSrc: "",            // 모바일(767px 이하) 전용 (없으면 src 사용) → <picture><source> 로 출력
        alt: "이미지 설명",
        href: "",                 // 클릭 시 이동 주소 (비우면 링크 없음) → 있으면 <a class="editable-image">
        target: "_self",          // _blank 이면 rel="noopener noreferrer" 자동
        ratio: "4 / 3",           // 16 / 9 · 21 / 9 · 4 / 3 · 3 / 2 · 3 / 4 · 1 / 1 · 4 / 5
        objectFit: "cover",       // cover | contain
        objectPosition: "center center" // 잘릴 때 초점만 조절
      }
      · src 가 비어 있거나 로딩에 실패하면 글자 없는 (없음) 가 같은 크기로 표시됩니다. (영역이 사라지지 않음)
      · media 를 아예 지우면 placeholder 로 자동 생성되고, enabled:false 로 두면 영역 + 여백이 함께 제거됩니다.
      · 생성 DOM : <a|div class="editable-image"><picture><source media="(max-width:767px)"><img src alt></picture></a|div>
      · 적용 위치 : (메인 슬라이드는 mainSlider.slides[] 의 src / mobileSrc / alt 를 그대로 출력) ·
        프리미엄 배경(premium[].media) · 입지환경 3종(environment[].media) · 타입 배경/카드(unitSection.media, units[].media) ·
        팝업 배너(popupBanners[].src, PC · 모바일 공용) ·
        모든 소메뉴의 대표 이미지(pages[ID].media) 와 항목별 이미지(items[].media · tabs[].media · documents[].media 등)
      · 새 페이지를 pages 에 추가하면 media 를 넣지 않아도 대표 이미지 영역(placeholder)이 자동 생성됩니다.

  16) [메인 원스크롤] 데스크톱에서 휠 한 번에 한 섹션씩 이동합니다.
      CSS 스크롤 스냅은 사용하지 않고 JavaScript 한 곳에서만 이동을 처리합니다.
      fullPageScroll.duration(기본 1800ms) · lockDuration · wheelThreshold ·
      revealDelay · revealDuration · staggerDelay 로 속도를 조절합니다.
      순서는 sections 배열을 따르며, 각 섹션은 화면 한 장을 채웁니다.
      입력창 · 셀렉트 · 팝업 · 메가메뉴 위에서는 동작하지 않고,
      섹션에 도착한 뒤에 제목 → 설명 → 이미지 순으로 나타납니다.
      (태블릿 · 모바일 · prefers-reduced-motion 환경에서는 일반 스크롤)
   ========================================================================= */
