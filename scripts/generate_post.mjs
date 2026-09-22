import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 순수 내장 파일 시스템을 활용한 경량 .env 파서
function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eqIdx = trimmed.indexOf('=');
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
}

// 1. 환경변수 로드 (.env 및 인접 폴더 fallback)
loadEnv(path.join(rootDir, '.env'));
loadEnv(path.join(rootDir, '..', 'news-wide', '.env'));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ 오류: GEMINI_API_KEY 환경변수가 설정되지 않았습니다. .env 파일에 키를 입력해주세요.');
  process.exit(1);
}

// 2. 기존 포스트 목록 및 토픽 데이터 로드
const postsFilePath = path.join(rootDir, 'data', 'posts.json');
let existingPosts = [];
try {
  if (fs.existsSync(postsFilePath)) {
    existingPosts = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'));
  }
} catch (e) {
  console.warn('⚠️ posts.json 읽기 실패, 신규 초기화:', e.message);
}

const topicsFilePath = path.join(rootDir, 'data', 'topics_seo_geo.json');
const topicsData = JSON.parse(fs.readFileSync(topicsFilePath, 'utf-8'));

const siteConfigFilePath = path.join(rootDir, 'data', 'site_config.json');
const siteConfig = JSON.parse(fs.readFileSync(siteConfigFilePath, 'utf-8'));

console.log(`📊 현재 등록된 칼럼 수: ${existingPosts.length}개`);

// 3. 중복되지 않는 새로운 토픽 조합 선정
const existingTitles = existingPosts.map(p => p.title).join(' | ');
const existingSlugs = new Set(existingPosts.map(p => p.id));

// 랜덤 채권 유형 및 지역 선택
const randomDebtGroup = topicsData.debtTypes[Math.floor(Math.random() * topicsData.debtTypes.length)];
const randomSubtype = randomDebtGroup.subtypes[Math.floor(Math.random() * randomDebtGroup.subtypes.length)];
const randomRegion = topicsData.regions[Math.floor(Math.random() * topicsData.regions.length)];
const randomTemplate = topicsData.curatedTopicTemplates[Math.floor(Math.random() * topicsData.curatedTopicTemplates.length)];

// 오늘 날짜 (KST 기준)
const now = new Date();
const kstOffset = 9 * 60; // UTC+9
const kstTime = new Date(now.getTime() + (now.getTimezoneOffset() + kstOffset) * 60000);
const yyyy = kstTime.getFullYear();
const mm = String(kstTime.getMonth() + 1).padStart(2, '0');
const dd = String(kstTime.getDate()).padStart(2, '0');
const todayIso = `${yyyy}-${mm}-${dd}`;
const todayFormatted = `${yyyy}년 ${Number(mm)}월 ${Number(dd)}일`;

// 4. Gemini 프롬프트 구성 (SEO & GEO & E-E-A-T 신뢰도 극대화)
const prompt = `
당신은 대한민국 최고의 신용정보 회사인 "새한신용정보(주) (상담접수센터: 1666-5970)"의 채권추심 및 미수금 회수 법률 실무 수석 컨설턴트입니다.
Google 검색, 네이버 서치어드바이저, 그리고 Perplexity, ChatGPT Search, Google AI Overviews 등 최신 생성형 AI 검색(GEO)에 완벽하게 최적화된 심층 실무 칼럼 아티클을 1편 작성해주세요.

[추천 타겟 주제]:
- 핵심 채권 유형: ${randomDebtGroup.type} (${randomSubtype})
- 카테고리: ${randomDebtGroup.category}
- 주요 타겟 지역/산단: ${randomRegion.name} (${randomRegion.type} - ${randomRegion.focus})
- 주제 템플릿 참고: ${randomTemplate.titleTemplate}

[기존 발행된 글 목록 (동일하거나 유사한 제목 절대 중복 금지)]:
${existingTitles || '없음'}

[핵심 작성 가이드라인 (SEO & GEO & E-E-A-T 준수)]:
1. **타이틀(title)**: 검색엔진 클릭률(CTR)과 AI 질의에 부합하는 명확하고 권위 있는 제목 (30~50자). [지역명 또는 산단명]과 [채권/미수금 키워드]를 자연스럽게 포함하세요.
2. **요약문(summary)**: 2~3문장(100~140자)으로 작성. AI 검색 엔진(Perplexity, ChatGPT 등)이 즉각 인용할 수 있는 핵심 결론(Direct Answer) 형태로 서술.
3. **slug(id)**: 영문 소문자, 숫자, 하이픈(-)만 사용하여 3~5단어로 구성 (예: hwaseong-construction-receivable-guide-2026).
4. **본문 HTML(contentHtml)**:
   - 본문 시작 부분에 반드시 <div class="geo-summary-box"><div class="geo-summary-title">💡 3줄 핵심 요약 (AI Direct Answer)</div><p class="geo-summary-desc">...</p></div> 포함
   - 각 소주제는 <h2>, 세부 항목은 <h3> 사용
   - 상법(제64조 상사시효 5년), 민법(제163조 단기소멸시효 3년), 민사집행법, 공정한 채권추심법 등 명확한 법률 조항 및 합법적 절차 명시
   - <div class="geo-table-wrapper"><table>...</table></div> 형태로 절차별 비교표(예: 내용증명 vs 지급명령 vs 채권추심 전문 위임, 또는 단계별 소요기간 및 비용) 필수 포함
   - <div class="notice-box warning"><div class="notice-title">⚠️ 주의사항 / 골든타임 경고</div><p>...</p></div> 강조 블록 1개 이상 포함
   - 실제 채권추심 현장에서 발생하는 거래처 폐업, 대표자 잠적, 통장 가압류 등의 실전 해결책 제시
   - 본문 중간 및 말미에 "새한신용정보 무료 상담접수센터(1666-5970)를 통한 신속한 신용조사 및 회수 전략 수립" 권장 문맥 자연스럽게 배치
5. **자주 묻는 질문(faqs)**:
   - 실제 사용자가 검색창이나 AI에 질문하는 구체적 구어체 질문 3~4개와 각 2~3문장의 명쾌한 팩트 답변
`;

// 5. 지원 모델 검색 함수
async function getAvailableModel() {
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listRes = await fetch(listUrl);
    if (listRes.ok) {
      const data = await listRes.json();
      const models = (data.models || [])
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      
      console.log('🤖 지원 모델 목록 확인:', models.slice(0, 5).join(', '));
      const priorityOrder = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
      for (const p of priorityOrder) {
        if (models.includes(p)) return p;
      }
      if (models.length > 0) return models[0];
    }
  } catch (e) {
    console.warn('⚠️ 모델 목록 조회 예외, 기본 모델군 시도:', e.message);
  }
  return 'gemini-3.5-flash-lite';
}

function safeJsonParse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, match => {
      if (match === '\n') return '\\n';
      if (match === '\r') return '\\r';
      if (match === '\t') return '\\t';
      return '';
    });
    return JSON.parse(cleaned);
  }
}

// 6. Gemini 호출 및 포스트 생성
async function generateArticle() {
  console.log('🔍 Gemini 최적 모델 탐색 중...');
  const bestModel = await getAvailableModel();
  console.log(`✨ 선택된 AI 모델: ${bestModel}`);

  const candidateModels = [bestModel, 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  const uniqueModels = [...new Set(candidateModels)];

  let rawText = null;
  let lastError = null;

  for (const model of uniqueModels) {
    try {
      console.log(`📡 [${model}] AI 글 생성 요청 전송...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING", description: "영문 소문자와 하이픈으로 구성된 고유 slug" },
                title: { type: "STRING", description: "SEO 및 검색 최적화된 기사 제목" },
                summary: { type: "STRING", description: "2~3문장의 핵심 요약 (AI Direct Answer용)" },
                keywords: { type: "STRING", description: "콤마로 구분된 핵심 키워드 5~7개" },
                category: { type: "STRING", description: "construction, goods, corporate, credit, legal, regional 중 하나" },
                categoryName: { type: "STRING", description: "카테고리 한글명 (예: 공사대금·하도급)" },
                region: { type: "STRING", description: "지역명 (예: 화성·평택, 안산·시흥, 전국 등)" },
                contentHtml: { type: "STRING", description: "섹션, h2, h3, 표, 요약박스, 주의박스가 포함된 본문 HTML" },
                faqs: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      question: { type: "STRING", description: "자주 묻는 질문" },
                      answer: { type: "STRING", description: "명확한 팩트 답변" }
                    },
                    required: ["question", "answer"]
                  }
                }
              },
              required: ["id", "title", "summary", "keywords", "category", "categoryName", "region", "contentHtml", "faqs"]
            }
          }
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`⚠️ [${model}] 응답 에러 (${response.status}): ${errBody.slice(0, 150)}...`);
        lastError = new Error(`Status ${response.status}: ${errBody}`);
        continue;
      }

      const data = await response.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        console.log(`✅ [${model}] 칼럼 콘텐츠 생성 성공!`);
        break;
      }
    } catch (err) {
      console.warn(`⚠️ [${model}] 호출 실패:`, err.message);
      lastError = err;
    }
  }

  if (!rawText) {
    throw lastError || new Error('모든 Gemini 모델 호출에 실패했습니다.');
  }

  const postData = safeJsonParse(rawText);

  // slug 정제 및 중복 방지
  let slug = (postData.id || `receivable-guide-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (existingSlugs.has(slug)) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }
  postData.id = slug;
  postData.date = todayIso;
  postData.formattedDate = todayFormatted;

  console.log(`🎉 생성 완료: [${postData.categoryName} | ${postData.region}] ${postData.title}`);

  // 7. Schema.org FAQ 및 Article JSON-LD 생성
  const faqSchemaItems = (postData.faqs || []).map(item => ({
    "@type": "Question",
    "name": item.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.answer
    }
  }));

  const jsonLdData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": postData.title,
      "description": postData.summary,
      "keywords": postData.keywords,
      "datePublished": `${todayIso}T08:30:00+09:00`,
      "dateModified": `${todayIso}T08:30:00+09:00`,
      "author": {
        "@type": "Organization",
        "name": "새한신용정보(주)",
        "telephone": "1666-5970",
        "url": "https://saehanccm.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "새한신용정보(주)",
        "logo": {
          "@type": "ImageObject",
          "url": "https://cdn.imweb.me/thumbnail/20250520/d5abfd76bb497.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://saehanccm.com/posts/${slug}/`
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqSchemaItems
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "새한신용정보 홈",
          "item": "https://saehanccm.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "채권회수 정보마당",
          "item": "https://saehanccm.com/posts/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": postData.categoryName,
          "item": `https://saehanccm.com/posts/?category=${postData.category}`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": postData.title,
          "item": `https://saehanccm.com/posts/${slug}/`
        }
      ]
    }
  ];

  // FAQ HTML 생성
  const faqHtml = (postData.faqs || []).map(item => `
    <div class="faq-item">
      <div class="faq-question">${item.question}</div>
      <div class="faq-answer">${item.answer}</div>
    </div>
  `).join('');

  // 8. 개별 아티클 정적 HTML 템플릿 생성
  const postDir = path.join(rootDir, 'posts', slug);
  if (!fs.existsSync(postDir)) {
    fs.mkdirSync(postDir, { recursive: true });
  }

  const htmlContent = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${postData.title} | 새한신용정보</title>
  <meta name="description" content="${postData.summary}" />
  <meta name="keywords" content="${postData.keywords}" />
  <link rel="canonical" href="https://saehanccm.com/posts/${slug}/" />

  <!-- 오픈그래프 (SNS / 카카오톡 공유) -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://saehanccm.com/posts/${slug}/" />
  <meta property="og:title" content="${postData.title}" />
  <meta property="og:description" content="${postData.summary}" />
  <meta property="og:image" content="https://cdn.imweb.me/thumbnail/20250520/d5abfd76bb497.png" />

  <!-- 네이버 및 구글 서치콘솔 확인 -->
  <meta name="naver-site-verification" content="5ed147e7b4e728e84c80a31b29438a21eb76b119" />
  <meta name="google-site-verification" content="ASGeLlJYsH9kZZlWyMdx-G5gFtmCebbx1f6QysDiUeg" />

  <!-- Pretendard 웹폰트 및 스타일시트 -->
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
  <link rel="stylesheet" href="/posts/assets/style.css" />

  <!-- Schema.org 구조화 데이터 (Article, FAQPage, BreadcrumbList) -->
  <script type="application/ld+json">
  ${JSON.stringify(jsonLdData, null, 2)}
  </script>
</head>

<body>
  <!-- 상단 헤더 -->
  <header class="site-header">
    <div class="header-container">
      <a href="/" class="brand-logo" title="새한신용정보 메인으로 이동">
        <span class="brand-badge">금융감독원 허가</span>
        <span class="brand-name">새한신용정보</span>
        <span class="brand-sub">채권회수 정보마당</span>
      </a>
      <div class="header-actions">
        <a href="/posts/" class="btn-home">칼럼 목록</a>
        <a href="tel:1666-5970" class="btn-call-header">
          <span>📞</span>
          <span>1666-5970 무료상담</span>
        </a>
      </div>
    </div>
  </header>

  <!-- 아티클 본문 영역 -->
  <article class="article-container">
    <!-- 빵부스러기 (Breadcrumb) -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">홈</a> &gt;
      <a href="/posts/">정보마당</a> &gt;
      <a href="/posts/">${postData.categoryName}</a> &gt;
      <span>${postData.region}</span>
    </nav>

    <!-- 글 헤더 -->
    <header class="article-header">
      <div class="article-meta-tags">
        <span class="badge-cat">${postData.categoryName}</span>
        <span class="badge-region">📍 ${postData.region}</span>
      </div>
      <h1 class="article-title">${postData.title}</h1>
      <div class="article-meta-info">
        <span>✍️ 새한신용정보 채권관리센터</span>
        <span>📅 ${postData.formattedDate}</span>
        <span>⏱️ 소요시간 약 4분</span>
      </div>
    </header>

    <!-- 아티클 본문 -->
    <section class="article-body">
      ${postData.contentHtml}

      <!-- GEO FAQ 섹션 -->
      <div class="geo-faq-section">
        <h3 class="geo-faq-title">❓ 자주 묻는 질문 (FAQ)</h3>
        <div class="faq-list">
          ${faqHtml}
        </div>
      </div>

      <!-- 본문 하단 전환 CTA 배너 -->
      <div class="cta-banner-box">
        <h3>미수금 회수는 '골든타임' 확보가 생명입니다</h3>
        <p>상사소멸시효 및 채무자의 재산 은닉 전에 신속하고 합법적인 신용조사와 채권추심을 진행하세요.</p>
        <div class="cta-buttons">
          <a href="tel:1666-5970" class="btn-cta-phone">
            <span>📞 즉시 전화상담 (1666-5970)</span>
          </a>
          <a href="/" class="btn-cta-main">
            <span>새한신용정보 공식 홈페이지</span>
          </a>
        </div>
      </div>
    </section>
  </article>

  <!-- 푸터 -->
  <footer class="site-footer">
    <div class="footer-container">
      <div class="footer-top">
        <div class="footer-brand">새한신용정보(주) 개인/법인사업부 상담접수센터</div>
        <div class="footer-phone">전국 대표상담: 1666-5970</div>
      </div>
      <p>본 칼럼은 채권자 권리 보호 및 미수금 회수 절차에 관한 유용한 법률·실무 정보를 전달하기 위해 작성되었습니다.</p>
      <p>상사채권은 판결문이 없어도 세금계산서나 거래명세표만으로 즉시 신용조사 및 합법적 추심 착수가 가능합니다.</p>
      <p class="footer-legal">© 새한신용정보(주). All rights reserved.</p>
    </div>
  </footer>

  <!-- 모바일 하단 고정 전화 바 -->
  <aside class="mobile-sticky-bar">
    <a href="tel:1666-5970" class="mobile-call-btn">
      <span>📞</span>
      <span>1666-5970 빠른 전화상담</span>
    </a>
  </aside>

  <script src="/posts/assets/script.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(postDir, 'index.html'), htmlContent, 'utf-8');
  console.log(`💾 HTML 파일 저장 완료: posts/${slug}/index.html`);

  // 9. data/posts.json 업데이트
  const updatedPosts = [
    {
      id: postData.id,
      title: postData.title,
      summary: postData.summary,
      category: postData.category,
      categoryName: postData.categoryName,
      region: postData.region,
      keywords: postData.keywords,
      date: postData.date,
      formattedDate: postData.formattedDate,
      url: `/posts/${slug}/`
    },
    ...existingPosts.filter(p => p.id !== postData.id)
  ];
  fs.writeFileSync(postsFilePath, JSON.stringify(updatedPosts, null, 2), 'utf-8');
  console.log(`💾 data/posts.json 갱신 완료 (총 ${updatedPosts.length}개)`);

  // 10. posts/index.html 카드 그리드 정적 재렌더링
  updateHubPage(updatedPosts);

  // 11. sitemap.xml 자동 업데이트
  updateSitemap(updatedPosts);

  console.log('🏁 모든 포스팅 파이프라인 작업이 완료되었습니다.');
}

// 허브 페이지(posts/index.html)에 최신 카드 리스트 반영
function updateHubPage(posts) {
  const hubPath = path.join(rootDir, 'posts', 'index.html');
  if (!fs.existsSync(hubPath)) return;

  let hubHtml = fs.readFileSync(hubPath, 'utf-8');

  const cardsHtml = posts.map(p => `
      <article class="post-card" data-category="${p.category}" data-region="${p.region}">
        <div class="card-top">
          <span class="badge-cat">${p.categoryName}</span>
          <span class="badge-region">📍 ${p.region}</span>
          <span class="card-date">${p.date}</span>
        </div>
        <h3 class="card-title">
          <a href="/posts/${p.id}/">${p.title}</a>
        </h3>
        <p class="card-summary">${p.summary}</p>
        <div class="card-footer">
          <a href="/posts/${p.id}/">자세히 읽기 <span class="arrow">→</span></a>
        </div>
      </article>
  `).join('\n');

  const startMarker = '<!-- POSTS_CONTAINER_START -->';
  const endMarker = '<!-- POSTS_CONTAINER_END -->';

  const startIndex = hubHtml.indexOf(startMarker);
  const endIndex = hubHtml.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    const newHubHtml = hubHtml.slice(0, startIndex + startMarker.length) +
      '\n' + cardsHtml + '\n      ' +
      hubHtml.slice(endIndex);
    fs.writeFileSync(hubPath, newHubHtml, 'utf-8');
    console.log(`💾 posts/index.html 허브 카드 리스트 갱신 완료 (${posts.length}개 카드)`);
  }
}

// sitemap.xml 자동 갱신
function updateSitemap(posts) {
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  const baseUrl = 'https://saehanccm.com';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 메인 홈페이지 -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- 채권회수 정보마당 허브 -->
  <url>
    <loc>${baseUrl}/posts/</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

  posts.forEach(p => {
    xml += `  <url>
    <loc>${baseUrl}/posts/${p.id}/</loc>
    <lastmod>${p.date || todayIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  });

  xml += `</urlset>\n`;
  fs.writeFileSync(sitemapPath, xml, 'utf-8');
  console.log(`💾 sitemap.xml 갱신 완료 (총 ${posts.length + 2}개 URL 등록)`);
}

generateArticle().catch(err => {
  console.error('❌ 포스트 생성 중 오류 발생:', err);
  process.exit(1);
});
