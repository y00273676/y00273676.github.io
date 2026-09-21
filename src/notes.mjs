import MarkdownIt from 'markdown-it';
import { posts as originalPosts } from './content.mjs';

// The same parser is used for preview, browser publishing, and local builds.
// Raw HTML is displayed as text; markdown-it rejects unsafe link protocols.
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: false });
export function renderMarkdown(source) {
  const tokens = markdown.parse(source, {});
  const sections = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'heading_open' && tokens[i].tag === 'h2') {
      const id = `section-${sections.length + 1}`;
      tokens[i].attrSet('id', id);
      sections.push([id, tokens[i + 1].content]);
    }
  }
  return { body: markdown.renderer.render(tokens, markdown.options, {}), sections };
}

export function validateNote(note) {
  if (!note || typeof note !== 'object') throw new Error('笔记格式不正确。');
  const limits = { id: 80, slug: 80, title: 120, category: 40, description: 300, markdown: 200000 };
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof note[key] !== 'string' || note[key].length > limit) throw new Error(`笔记字段 ${key} 格式或长度不正确。`);
  }
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(note.id) || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(note.slug)) throw new Error('文章地址只能使用小写字母、数字和短横线。');
  if (!note.title.trim() || !note.markdown.trim() || !note.category.trim()) throw new Error('请填写标题、分类和正文。');
  if (!Array.isArray(note.tags) || note.tags.length > 10 || note.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 40 || tag.includes('|'))) throw new Error('最多填写 10 个标签，每个不超过 40 字，不能包含 |。');
  for (const key of ['published', 'updatedAt']) {
    if (typeof note[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(note[key]) || !Number.isFinite(Date.parse(note[key]))) throw new Error('笔记时间不正确。');
  }
  if (typeof note.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(note.date) || !Number.isFinite(Date.parse(note.date)) || new Date(note.date).toISOString().slice(0, 10) !== note.date) throw new Error('请选择有效日期。');
  // Only public content is serialized; draft state and credentials never enter this object.
  return Object.fromEntries([...Object.keys(limits), 'date', 'published', 'updatedAt', 'tags'].map(key => [key, note[key]]));
}

export function validateNotebook(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.notes)) throw new Error('笔记数据格式不正确，已停止发布以保护现有内容。');
  const notes = value.notes.map(validateNote);
  const ids = new Set(), slugs = new Set(originalPosts.map(post => post.slug));
  for (const note of notes) {
    if (ids.has(note.id) || slugs.has(note.slug)) throw new Error('笔记编号或文章地址重复，请换一个文章地址。');
    ids.add(note.id); slugs.add(note.slug);
  }
  return { version: 1, notes };
}

export function noteToPost(note) {
  const { body, sections } = renderMarkdown(note.markdown);
  return {
    slug: note.slug, title: note.title, category: note.category, tags: note.tags,
    date: note.date, published: note.published,
    description: note.description || note.markdown.replace(/[#*`>\[\]]/g, '').slice(0, 160),
    readingTime: `${Math.max(1, Math.ceil(note.markdown.length / 600))} min read`, body, sections,
    editable: true,
  };
}

export function notebookPosts(notebook) {
  return [...originalPosts, ...validateNotebook(notebook).notes.map(noteToPost)]
    .sort((a, b) => b.date.localeCompare(a.date) || b.published.localeCompare(a.published));
}
