import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const LIVE_URL = 'https://saehanccm.com';

async function fetchAndSave(urlPath, localRelativePath) {
  try {
    const targetUrl = `${LIVE_URL}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
    console.log(`다운로드 중: ${targetUrl} -> ${localRelativePath}`);
    const res = await fetch(targetUrl);
    if (!res.ok) {
      console.warn(`경고: ${targetUrl} 응답 상태 코드 ${res.status}`);
      return false;
    }
    const contentType = res.headers.get('content-type') || '';
    const destPath = path.join(rootDir, localRelativePath);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (contentType.includes('text') || contentType.includes('javascript') || contentType.includes('json') || contentType.includes('xml')) {
      const text = await res.text();
      fs.writeFileSync(destPath, text, 'utf-8');
    } else {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destPath, buffer);
    }
    console.log(`저장 완료: ${destPath}`);
    return true;
  } catch (err) {
    console.error(`에러 발생 (${urlPath}):`, err.message);
    return false;
  }
}

async function main() {
  console.log('=== saehanccm.com 라이브 사이트 백업 및 동기화 시작 ===');
  
  // 1. robots.txt
  await fetchAndSave('/robots.txt', 'robots.txt');

  // 2. sitemap.xml
  await fetchAndSave('/sitemap.xml', 'sitemap.xml');

  // 3. index.html
  await fetchAndSave('/', 'index.html');

  // 4. assets 확인 및 다운로드 (index.html 파싱)
  const indexPath = path.join(rootDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf-8');
    const assetMatches = html.match(/\/assets\/[a-zA-Z0-9_\-\.]+\.(?:js|css|png|jpg|jpeg|svg|webp)/g) || [];
    const uniqueAssets = [...new Set(assetMatches)];
    console.log(`발견된 정적 에셋 (${uniqueAssets.length}개):`, uniqueAssets);

    for (const assetPath of uniqueAssets) {
      await fetchAndSave(assetPath, assetPath.replace(/^\//, ''));
    }
  }

  console.log('=== 라이브 사이트 동기화 완료 ===');
}

main();
