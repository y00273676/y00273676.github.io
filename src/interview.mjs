import { readFileSync, readdirSync } from 'node:fs';
import { dirname, basename, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { escapeHtml } from './components.mjs';
import { collectedSource, collectedDocuments, collectedAnchorAliases } from './interview-sources.mjs';

export const interviewRoot = fileURLToPath(new URL('./notes/agent-interview/', import.meta.url));
export const interviewBase = '/agent-interview/';
export const interviewGroups = [
  ['01-架构设计', 'architecture', '架构设计', '从基础概念到可靠运行，理解系统的职责与边界。', 'grid'],
  ['02-工具调用', 'tools', '工具调用', '工具契约、编排、动态生成与执行安全。', 'code'],
  ['03-记忆系统', 'memory', '记忆系统', '上下文、长期记忆、压缩与遗忘。', 'book'],
  ['04-规划推理', 'reasoning', '规划推理', '规划、反思、搜索与复杂任务求解。', 'arrow'],
  ['05-多模态', 'multimodal', '多模态', '跨模态理解与音频处理的工程实践。', 'grid'],
  ['06-框架对比', 'frameworks', '框架对比', '理解框架分工，用约束和验证完成选型。', 'folder'],
  ['07-应用场景', 'applications', '应用场景', '从研发到行业落地，明确业务责任。', 'diagonal'],
  ['08-安全伦理', 'safety', '安全伦理', '注入、隐私、对齐与权限控制。', 'check'],
  ['09-高级架构与技术负责人', 'senior', '高级架构与技术负责人', '24 道场景题与 120 分钟笔试，练习决策与取舍。', 'book'],
  ['10-笔试代码', 'code', '笔试代码', 'Agent loop、重试、并发执行器与 RRF 参考实现。', 'code'],
  [null, 'rag', 'RAG 与检索', '文档处理、混合检索、重排序与效果评估。', 'search'],
  [null, 'llm', '大模型基础', 'Transformer、推理优化、微调与对齐。', 'grid'],
  [null, 'career', '求职准备', '学习路线、招聘分析、简历模板与 STAR 表达。', 'book'],
  [null, 'practice', '项目实战与问答', '开源项目分析、92 道问答与三种语言的项目源码。', 'code'],
].map(([directory, slug, title, description, icon]) => ({ directory, slug, title, description, icon }));

const specialRoutes = {
  'README.md': 'guide',
  '00-Agent开发岗位面试与笔试全题库.md': 'question-bank',
  '99-更新说明与资料来源.md': 'sources',
  '归档/README.md': 'archive',
  '09-高级架构与技术负责人/高级面试题.md': 'senior/interview',
  '09-高级架构与技术负责人/高级笔试与评分标准.md': 'senior/exam',
  '10-笔试代码/README.md': 'code',
};
const files = [];
function walk(directory = '') {
  for (const entry of readdirSync(`${interviewRoot}${directory}`, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))) {
    const file = posix.join(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__pycache__') walk(`${file}/`);
    else if (entry.isFile() && (/\.(md|py|zip|png)$/.test(entry.name) || entry.name === 'LICENSE')) files.push(file);
  }
}
walk();

const plain = text => text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target.split('/').at(-1))
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*_#>]/g, '').replace(/\s+/g, ' ').trim();
const slugify = text => plain(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
const encodePath = path => path.split('/').map(encodeURIComponent).join('/');

export const interviewNotes = files.filter(file => file.endsWith('.md')).map(file => {
  const collected = collectedDocuments.find(document => document.file === file);
  const raw = readFileSync(`${interviewRoot}${file}`, 'utf8');
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const markdown = raw.slice(frontmatter?.[0].length || 0);
  const heading = markdown.match(/^# (.+)$/m)?.[1];
  const title = frontmatter?.[1].match(/^title:\s*(.+)$/m)?.[1] || heading || basename(file, '.md');
  const group = interviewGroups.find(group => collected ? group.slug === collected.group : group.directory && file.startsWith(`${group.directory}/`));
  const route = collected?.route || specialRoutes[file] || `${group.slug}/${basename(file, '.md')}`;
  const text = plain(markdown);
  const questionIds = [...markdown.matchAll(/^#{2,3}\s+(Q\d+|S\d+|SD\d+|D\d+|C\d+|P\d+|B\d+)[：:、\s]/gm)].map(match => match[1]);
  return {
    file, markdown, title, group: group?.slug || 'resources',
    source: collected ? collectedSource.id : 'personal', sourcePath: collected?.sourcePath,
    category: group?.title || '复习指南', shortTitle: collected?.shortTitle || (basename(file) === 'README.md' ? title : basename(file, '.md')),
    date: collected ? collectedSource.imported : frontmatter?.[1].match(/^updated:\s*(.+)$/m)?.[1] || markdown.match(/校订：(\d{4}-\d{2}-\d{2})/)?.[1] || '2026-09-21',
    url: `${interviewBase}${encodePath(route)}/`, route, text, questionIds,
    readingTime: `${Math.max(1, Math.ceil(text.length / 450))} 分钟`,
  };
});
const byFile = new Map(interviewNotes.map(note => [note.file, note]));
export const interviewAttachments = files.filter(file => !file.endsWith('.md')).map(file => ({
  file, url: `${interviewBase}${file.endsWith('.png') ? 'media' : 'downloads'}/${encodePath(file)}`,
}));

function resolveLink(href, current, wiki = false) {
  if (/^(https?:|mailto:)/i.test(href)) return href;
  const decoded = decodeURIComponent(href).replace(/^Agent面试题\//, '');
  const [path, fragment] = decoded.split('#');
  let target;
  if (!path) target = current.file;
  else {
    const candidates = [posix.normalize(posix.join(dirname(current.file), path)), path];
    target = candidates.flatMap(path => [path, `${path}.md`]).find(path => byFile.has(path) || files.includes(path));
    if (!target && wiki) {
      const matches = interviewNotes.filter(note => basename(note.file, '.md') === path);
      if (matches.length === 1) target = matches[0].file;
    }
  }
  if (!target) throw new Error(`Unresolved note link in ${current.file}: ${href}`);
  const note = byFile.get(target);
  const url = note?.url || interviewAttachments.find(item => item.file === target).url;
  const anchor = fragment ? slugify(fragment) : '';
  const resolvedAnchor = collectedAnchorAliases[note?.route]?.[anchor] || anchor;
  return `${url}${resolvedAnchor ? `#${encodeURIComponent(resolvedAnchor)}` : ''}`;
}

function renderNote(note) {
  const md = new MarkdownIt({ html: false, linkify: false });
  // Parse Obsidian links as inline tokens: fenced code and inline code remain untouched.
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    if (state.src.slice(state.pos, state.pos + 2) !== '[[') return false;
    const end = state.src.indexOf(']]', state.pos + 2);
    if (end < 0) return false;
    const [target, alias] = state.src.slice(state.pos + 2, end).split('|');
    if (!silent) {
      const open = state.push('link_open', 'a', 1);
      open.attrSet('href', resolveLink(target, note, true));
      const text = state.push('text', '', 0);
      text.content = alias || byFile.get(target.replace(/^Agent面试题\//, '') + '.md')?.shortTitle || target.split('/').at(-1);
      state.push('link_close', 'a', -1);
    }
    state.pos = end + 2;
    return true;
  });
  const originalLink = md.renderer.rules.link_open || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const href = token.attrGet('href');
    if (href && !href.startsWith(interviewBase)) token.attrSet('href', resolveLink(href, note));
    if (token.attrGet('href')?.startsWith(`${interviewBase}downloads/`)) token.attrSet('download', '');
    return originalLink(tokens, index, options, env, self);
  };
  const originalImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const src = resolveLink(token.attrGet('src'), note);
    token.attrSet('src', src);
    const attachment = interviewAttachments.find(attachment => attachment.url === src && attachment.file.endsWith('.png'));
    if (attachment) {
      const png = readFileSync(`${interviewRoot}${attachment.file}`);
      token.attrSet('width', String(png.readUInt32BE(16)));
      token.attrSet('height', String(png.readUInt32BE(20)));
    }
    token.attrSet('loading', 'lazy');
    token.attrSet('decoding', 'async');
    return originalImage(tokens, index, options, env, self);
  };
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    return `<div class="code-block"><div class="code-header"><span>${escapeHtml(token.info || 'text')}</span><button type="button" class="copy-code" aria-label="复制代码">复制</button></div><pre tabindex="0"><code>${escapeHtml(token.content)}</code></pre></div>`;
  };
  md.renderer.rules.table_open = () => '<div class="table-scroll" role="region" aria-label="资料表格" tabindex="0"><table>';
  md.renderer.rules.table_close = () => '</table></div>';
  // Obsidian callout markers become a readable heading inside the blockquote.
  const markdown = note.markdown.replace(/^> \[!\w+\][+-]?\s*(.*)$/gm, '> **$1**');
  const tokens = md.parse(markdown, {});
  const firstHeading = tokens.findIndex(token => token.type === 'heading_open' && token.tag === 'h1');
  if (firstHeading >= 0) tokens.splice(firstHeading, 3);
  const hasParts = tokens.some(token => token.type === 'heading_open' && token.tag === 'h1');
  const ids = new Map();
  note.headings = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!['heading_open', 'heading_close'].includes(token.type)) continue;
    if (hasParts) token.tag = `h${Math.min(6, Number(token.tag.slice(1)) + 1)}`;
    if (token.type !== 'heading_open') continue;
    const title = plain(tokens[i + 1].content);
    const base = slugify(title) || 'section';
    const count = ids.get(base) || 0;
    ids.set(base, count + 1);
    const id = count ? `${base}-${count + 1}` : base;
    token.attrSet('id', id);
    const level = Number(token.tag.slice(1));
    if (level === 2 || ((hasParts || note.route === 'collected/project-qa') && level === 3)) note.headings.push({ id, title, level });
  }
  note.body = md.renderer.render(tokens, md.options, {});
}
interviewNotes.forEach(renderNote);

export const interviewSearchIndex = interviewNotes.filter(note => note.route !== 'archive').map(note => ({
  title: note.title, url: note.url, description: note.category, category: 'Agent 面试',
  tags: ['Agent', note.source === 'collected' ? '网络资料' : '个人笔记', note.category, ...note.questionIds], text: note.text, readingTime: note.readingTime,
}));
