// build.ts — 從 src/ 的 markdown 生成 HTML
// 跑：npm run build

import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const ROOT = path.resolve('.');
const SRC = path.join(ROOT, 'src');
const TEMPLATE = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');

// front matter：在 .md 最前面用 --- 包起來，key: value
interface FrontMatter {
  title: string;
  meta?: string;
  section?: string;
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

function render(fm: FrontMatter, body: string, section: string): string {
  const html = marked.parse(body, { async: false }) as string;
  return TEMPLATE
    .replace(/\{\{title\}\}/g, fm.title)
    .replace(/\{\{meta\}\}/g, fm.meta || '')
    .replace(/\{\{section\}\}/g, fm.section || section)
    .replace(/\{\{content\}\}/g, html);
}

function buildSection(name: string, sectionLabel: string) {
  const srcDir = path.join(SRC, name);
  const outDir = path.join(ROOT, name);
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const { fm, body } = parseFrontMatter(content);
    const html = render({ ...fm, section: sectionLabel }, body, sectionLabel);
    const outFile = file.replace(/\.md$/, '.html');
    fs.writeFileSync(path.join(outDir, outFile), html);
    console.log(`${name}/${outFile}`);
  }
}

buildSection('writing', '寫的');
// 之後的 section 加在這裡：
// buildSection('thoughts', '想的');

console.log('done');
