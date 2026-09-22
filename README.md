# 새한신용정보(saehanccm.com) SEO & GEO 자동 포스팅 시스템

본 시스템은 호스팅어(Hostinger) 일반 웹 호스팅에서 운영 중인 **새한신용정보(`saehanccm.com`)** 웹사이트에 **검색엔진(Google, 네이버) 및 차세대 AI 검색(ChatGPT Search, Perplexity, Google AI Overviews), 전국 지역별 로컬 검색에 최적화된 전문 칼럼/정보마당을 구축**하고, **Google Gemini AI를 통해 고품질 실무 글을 매일 무인 자동으로 생성하여 배포하는 파이프라인**입니다.

---

## 🌟 핵심 특장점

### 1. 차세대 AI 검색 최적화 (GEO: Generative Engine Optimization)
- **Direct Answer 요약 블록**: ChatGPT, Perplexity 등 LLM이 사용자 질의에 답변할 때 가장 먼저 인용할 수 있는 3줄 핵심 요약(`geo-summary-box`) 제공.
- **실전 Q&A FAQ 섹션**: 실제 검색 질의 형태의 대화형 질문과 팩트 중심의 답변 구성.
- **법적 근거 및 권위성(E-E-A-T)**: 상법 제64조(상사시효 5년), 민법 제163조(3년 단기소멸시효), 민사집행법 등 법률 조항 및 합법적 추심 절차 명시.
- **비교표 및 체크리스트**: `지급명령 vs 채권추심 위임`, `내용증명 vs 가압류` 등 구조화된 HTML 테이블 자동 생성.

### 2. 전국 산업단지 거점 로컬 SEO (Geographic Local Targeting)
- 화성·평택(반도체·건설 하도급), 안산·시흥(반월시화공단 금형/도금), 인천(남동공단), 구로·가산(IT 용역비), 천안·아산(자동차부품), 창원(기계·중공업), 부산(물류·선박), 광주, 대구 등 **전국 주요 산업단지별 미수금 회수 특화 키워드 Matrix 자동 순환 적용**.

### 3. 검색엔진 최적화 (SEO) & Schema.org 구조화 데이터
- 완벽한 메타태그(`title`, `description`, `keywords`, `canonical`, `og:image`)
- **JSON-LD Schema.org** 3중 마크업:
  1. `Article`: 검색엔진에 정식 전문 아티클로 인식
  2. `FAQPage`: 구글 검색결과에 질문-답변 아코디언 형태로 리치 노출
  3. `BreadcrumbList`: `홈 > 정보마당 > [카테고리] > [글 제목]` 계층 링크 노출
- **Sitemap & Robots**: 새 글 생성 시 `sitemap.xml` 자동 갱신 및 AI 수집봇(GPTBot, PerplexityBot 등) 맞춤 `robots.txt` 구성.

### 4. 고전환 상담 유도 (CTA: 1666-5970)
- 독자가 신뢰를 얻은 후 즉시 문의할 수 있도록 본문 내 무료 진단 배너 및 모바일 하단 플로팅 전화상담 바(`tel:1666-5970`) 탑재.

---

## 📁 디렉토리 구조

```
c:\antigravity\site\saehanccm.com\
├── index.html                   # 메인 랜딩페이지 (플로팅 칼럼 바로가기 버튼 탑재)
├── robots.txt                   # 검색 및 AI 크롤러 허용 설정
├── sitemap.xml                  # 실시간 자동 갱신되는 사이트맵
├── assets\                      # 메인 사이트 JS/CSS 에셋
│
├── posts\                       # 📚 칼럼/정보마당 허브 및 개별 글
│   ├── index.html               # 칼럼 목록 허브 (검색, 카테고리 필터, 반응형 카드 그리드)
│   ├── assets\
│   │   ├── style.css            # 모던 타이포그래피, 반응형 레이아웃, GEO 전용 박스 스타일
│   │   └── script.js           # 실시간 검색 및 카테고리 필터링 스크립트
│   └── [slug]\
│       └── index.html           # 개별 아티클 페이지 (SEO + GEO + FAQ Schema + 전화상담 CTA)
│
├── data\
│   ├── posts.json               # 전체 발행 포스트 메타데이터 DB
│   ├── topics_seo_geo.json      # 채권유형 × 법률절차 × 전국 산단 결합 Matrix
│   └── site_config.json         # 사이트 기본 정보 및 상담 대표번호(1666-5970)
│
├── scripts\
│   ├── generate_post.mjs        # Gemini AI 기반 자동 글 작성 엔진 (Node.js)
│   ├── upload_to_hostinger.py   # 호스팅어 FTP 자동 배포 스크립트 (Python 내장 ftplib)
│   └── sync_live_site.mjs       # 현재 라이브 사이트 백업 도구
│
├── .github\workflows\
│   └── daily-post.yml           # [클라우드 무인 자동화] 매일 아침 자동 글 생성 & 배포
│
├── .env                         # API 키 및 FTP 접속 정보
└── package.json                 # 실행 명령어 설정
```

---

## 🚀 사용 및 운영 방법

### 방법 1. 로컬에서 수동/원클릭 포스팅 (터미널)

프로젝트 폴더(`c:\antigravity\site\saehanccm.com`)에서 아래 명령어를 실행합니다:

```bash
# 1. 새 글 1편 즉시 생성 (Gemini AI 호출 -> posts/ 생성 -> sitemap.xml 갱신)
npm run post

# 2. 생성된 파일들을 호스팅어로 배포 (FTP 업로드)
npm run deploy

# 3. 글 생성과 호스팅어 배포를 한 번에 실행
npm run post:deploy
```

---

### 방법 2. 클라우드 완전 무인 자동 포스팅 (GitHub Actions - 추천 ⭐)

컴퓨터를 켜둘 필요 없이 **매일 아침 08:30 (KST)에 자동으로 새 글을 작성하고 호스팅어에 자동 배포**되도록 설정할 수 있습니다.

1. 본 폴더의 코드를 GitHub 저장소(Private 또는 Public)에 푸시합니다.
2. GitHub 저장소의 **Settings > Secrets and variables > Actions** 메뉴로 이동합니다.
3. **Repository secrets**에 다음 4개 항목을 추가합니다:
   - `GEMINI_API_KEY`: 본인의 Gemini API 키
   - `FTP_SERVER`: 호스팅어 FTP 서버 주소 (예: `ftp.saehanccm.com` 또는 Hostinger 서버 IP)
   - `FTP_USERNAME`: 호스팅어 FTP 사용자명
   - `FTP_PASSWORD`: 호스팅어 FTP 비밀번호
4. 설정이 완료되면 `.github/workflows/daily-post.yml` 스케줄러에 의해 매일 아침 자동으로 글이 발행되고 호스팅어에 업로드됩니다.
   - *(GitHub Actions 탭에서 언제든지 'Run workflow' 버튼을 눌러 즉시 수동 실행도 가능합니다.)*

---

## ⚙️ 호스팅어 FTP 정보 확인 방법

1. [호스팅어(Hostinger)](https://hpanel.hostinger.com) 로그인 후 `hPanel`로 이동합니다.
2. `웹사이트` > `saehanccm.com 관리` 클릭
3. 좌측 메뉴에서 `파일` > `FTP 계정` 선택
4. 화면에 표시된 **FTP 호스트**, **사용자명**, **비밀번호**를 확인하여 `.env` 파일(또는 GitHub Secrets)에 입력하시면 됩니다.

---

## 📞 고객 지원 및 문의 연동

- 본 사이트 및 칼럼에서 발행되는 모든 글은 **새한신용정보(주) 개인/법인사업부 상담접수센터(`1666-5970`)**로 바로 연결되도록 고도화되어 있습니다.
