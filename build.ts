// build.ts — 從 src/ 的 markdown 生成 HTML（文章 + 索引）

import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const ROOT = path.resolve('.');
const SRC = path.join(ROOT, 'src');
const ARTICLE_TEMPLATE = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
const INDEX_TEMPLATE = fs.readFileSync(path.join(SRC, 'index-template.html'), 'utf8');

interface FrontMatter {
  title: string;
  meta?: string;
  date?: string;
  desc?: string;
  slug?: string;
}

function parseFrontMatter(content: string): { fm: FrontMatter; body: string } {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) return { fm: { title: 'Untitled' }, body: content };
  const fm: any = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    fm[key.trim()] = rest.join(':').trim();
  }
  return { fm, body: match[2] };
}

function renderArticle(fm: FrontMatter, body: string, section: string): string {
  const html = marked.parse(body, { async: false }) as string;
  return ARTICLE_TEMPLATE
    .replace(/\{\{title\}\}/g, fm.title)
    .replace(/\{\{meta\}\}/g, fm.meta || '')
    .replace(/\{\{section\}\}/g, section)
    .replace(/\{\{content\}\}/g, html);
}

function renderIndex(section: string, items: FrontMatter[]): string {
  // 按日期新到舊
  const sorted = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const itemsHtml = sorted.map(fm => `  <li>
    <a href="${fm.slug}.html">${fm.title}</a>
    <div class="date">${fm.date || ''}</div>
    <div class="desc">${fm.desc || ''}</div>
  </li>`).join('\n');

  return INDEX_TEMPLATE
    .replace(/\{\{section\}\}/g, section)
    .replace(/\{\{items\}\}/g, itemsHtml);
}

function buildSection(name: string, sectionLabel: string) {
  const srcDir = path.join(SRC, name);
  const outDir = path.join(ROOT, name);
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(outDir, { recursive: true });

  const collected: FrontMatter[] = [];

  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const { fm, body } = parseFrontMatter(content);

    // 文章頁
    const html = renderArticle(fm, body, sectionLabel);
    const outFile = file.replace(/\.md$/, '.html');
    fs.writeFileSync(path.join(outDir, outFile), html);
    console.log(`${name}/${outFile}`);

    // 收集給索引用
    collected.push({ ...fm, slug: fm.slug || file.replace(/\.md$/, '') });
  }

  // 索引頁
  const indexHtml = renderIndex(sectionLabel, collected);
  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml);
  console.log(`${name}/index.html`);
}

buildSection('writing', '寫的');
buildSection('thoughts', '想的');
buildNovels();

console.log('done');

// ---------- novels ----------

interface NovelMeta {
  title: string;
  desc?: string;
  date?: string;
  slug?: string;
  start_scene: string;
}

function buildNovels() {
  const srcDir = path.join(SRC, 'novels');
  const outDir = path.join(ROOT, 'novels');
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(outDir, { recursive: true });

  // copy runtime + style 到 novels/（template 從 novels/<slug>/ 用 ../ 引用）
  fs.copyFileSync(path.join(SRC, 'novel-runtime.js'), path.join(outDir, 'novel-runtime.js'));
  fs.copyFileSync(path.join(SRC, 'novel-style.css'), path.join(outDir, 'novel-style.css'));

  const tmpl = fs.readFileSync(path.join(SRC, 'novel-template.html'), 'utf8');
  const collected: NovelMeta[] = [];

  for (const slug of fs.readdirSync(srcDir)) {
    const slugDir = path.join(srcDir, slug);
    if (!fs.statSync(slugDir).isDirectory()) continue;

    const metaPath = path.join(slugDir, 'meta.json');
    const scenesPath = path.join(slugDir, 'scenes.json');
    if (!fs.existsSync(metaPath) || !fs.existsSync(scenesPath)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as NovelMeta;
    const scenesRaw = fs.readFileSync(scenesPath, 'utf8');
    // 直接內嵌（會 escape `</script>` 等敏感 token）
    const safeScenes = scenesRaw.replace(/<\/script/gi, '<\\/script');

    const html = tmpl
      .replace(/\{\{title\}\}/g, meta.title)
      .replace(/\{\{desc\}\}/g, meta.desc || '')
      .replace(/\{\{meta\}\}/g, meta.date || '')
      .replace(/\{\{slug\}\}/g, slug)
      .replace(/\{\{start\}\}/g, meta.start_scene)
      .replace(/\{\{scenes\}\}/g, safeScenes);

    const slugOut = path.join(outDir, slug);
    fs.mkdirSync(slugOut, { recursive: true });
    fs.writeFileSync(path.join(slugOut, 'index.html'), html);
    console.log(`novels/${slug}/index.html`);

    // copy assets/ 若存在
    const assetsSrc = path.join(slugDir, 'assets');
    if (fs.existsSync(assetsSrc)) {
      const assetsOut = path.join(slugOut, 'assets');
      fs.mkdirSync(assetsOut, { recursive: true });
      for (const f of fs.readdirSync(assetsSrc)) {
        fs.copyFileSync(path.join(assetsSrc, f), path.join(assetsOut, f));
      }
    }

    collected.push({ ...meta, slug });
  }

  // 索引頁（novel link 是 <slug>/、不是 <slug>.html）
  const sorted = [...collected].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const itemsHtml = sorted.map(m => `  <li>
    <a href="${m.slug}/">${m.title}</a>
    <div class="date">${m.date || ''}</div>
    <div class="desc">${m.desc || ''}</div>
  </li>`).join('\n');
  const indexHtml = INDEX_TEMPLATE
    .replace(/\{\{section\}\}/g, '互動')
    .replace(/\{\{items\}\}/g, itemsHtml);
  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml);
  console.log('novels/index.html');
}
