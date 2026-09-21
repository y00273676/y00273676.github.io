import { renderMarkdown, validateNote, validateNotebook } from './notes.mjs';
import { publishNote } from './publish.mjs';
import { escapeHtml } from './components.mjs';

const prefix = 'bazaar-draft-v1:';
const $ = selector => document.querySelector(selector);
const fields = Object.fromEntries(['title', 'date', 'category', 'tags', 'description', 'slug', 'body'].map(name => [name, $(`#note-${name}`)]));
let current, savedRaw = null, dirty = false, timer, publishing = false, interacted = false;
let notebook = { version: 1, notes: [] };

function message(text = '') { $('#editor-message').textContent = text; $('#editor-message').hidden = !text; }
function blank() {
  const now = new Date(), id = crypto.randomUUID();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return { note: { id, slug: `note-${date}-${id.slice(0, 8)}`, title: '', date, category: 'Notes', tags: [], description: '', markdown: '', published: now.toISOString(), updatedAt: now.toISOString() }, baseUpdatedAt: null };
}
function validateDraft(draft) {
  if (!draft?.note || !(draft.baseUpdatedAt === null || (typeof draft.baseUpdatedAt === 'string' && Number.isFinite(Date.parse(draft.baseUpdatedAt))))) throw new Error('备份格式不正确。');
  const note = draft.note;
  if (typeof note.title !== 'string' || typeof note.markdown !== 'string' || typeof note.category !== 'string') throw new Error('备份格式不正确。');
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(note.id)) throw new Error('备份编号不正确。');
  for (const [key, limit] of Object.entries({ slug: 80, title: 120, category: 40, description: 300, markdown: 200000, date: 10, published: 40, updatedAt: 40 })) {
    if (typeof note[key] !== 'string' || note[key].length > limit) throw new Error('备份字段不正确。');
  }
  if (!Array.isArray(note.tags) || note.tags.some(tag => typeof tag !== 'string')) throw new Error('备份标签不正确。');
  return { note: Object.fromEntries(['id', 'slug', 'title', 'category', 'description', 'markdown', 'date', 'published', 'updatedAt', 'tags'].map(key => [key, note[key]])), baseUpdatedAt: draft.baseUpdatedAt };
}
function drafts() {
  const values = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(prefix)) continue;
    const draft = validateDraft(JSON.parse(localStorage.getItem(key)));
    if (key !== prefix + draft.note.id) throw new Error('草稿编号不一致。');
    values.push(draft);
  }
  return values.sort((a, b) => b.note.updatedAt.localeCompare(a.note.updatedAt));
}
function renderLists() {
  try {
    const saved = drafts();
    $('#draft-count').textContent = saved.length;
    $('#draft-list').innerHTML = saved.length ? saved.map(({ note, baseUpdatedAt }) => `<button type="button" data-draft="${note.id}" ${note.id === current?.note.id ? 'aria-current="true"' : ''}><strong>${escapeHtml(note.title || '未命名笔记')}</strong><small>${baseUpdatedAt ? '已发布的本地副本' : '未发布草稿'} · ${escapeHtml(note.date)}</small></button>`).join('') : '<p class="editor-hint">还没有草稿，写下第一个想法吧。</p>';
  } catch { message('无法读取浏览器草稿。请下载当前笔记备份，检查浏览器存储设置后再试。'); }
  $('#published-list').innerHTML = notebook.notes.length ? notebook.notes.map(note => `<button type="button" data-published="${note.id}"><strong>${escapeHtml(note.title)}</strong><small>${escapeHtml(note.date)} · 点击编辑</small></button>`).join('') : '<p class="editor-hint">这里会显示通过编辑器发布的笔记。</p>';
}
function collect() {
  current.note = { ...current.note, title: fields.title.value, date: fields.date.value, category: fields.category.value, tags: [...new Set(fields.tags.value.split(/[,，]/).map(tag => tag.trim()).filter(Boolean))], description: fields.description.value, slug: fields.slug.value, markdown: fields.body.value };
  return current.note;
}
function preview() {
  const note = collect();
  $('#preview-title').textContent = note.title || '未命名笔记';
  $('#preview-meta').textContent = `${note.category || 'Notes'} · ${note.date}${note.tags.length ? ` · ${note.tags.join(' / ')}` : ''}`;
  $('#preview-description').textContent = note.description;
  $('#preview-body').innerHTML = note.markdown ? renderMarkdown(note.markdown).body : '<p>文字会在这里慢慢成形。</p>';
  $('#word-count').textContent = `${note.markdown.length.toLocaleString()} 字`;
}
function save() {
  clearTimeout(timer);
  collect();
  if (!dirty) return true;
  const key = prefix + current.note.id;
  try {
    if (localStorage.getItem(key) !== savedRaw) throw new Error('这篇草稿已在另一个标签页更改。请下载当前内容备份，再刷新页面合并修改。');
    const serialized = JSON.stringify(current);
    localStorage.setItem(key, serialized);
    savedRaw = serialized;
    dirty = false;
    $('#save-status').textContent = `草稿已保存在此浏览器 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    message();
    renderLists();
    return true;
  } catch (error) {
    $('#save-status').textContent = '草稿未保存';
    message(error.message.includes('标签页') ? error.message : '浏览器存储不可用或空间不足。当前内容还在页面中，请下载备份后再离开。');
    return false;
  }
}
function open(draft) {
  clearTimeout(timer);
  current = draft;
  dirty = false;
  try { savedRaw = localStorage.getItem(prefix + current.note.id); } catch { savedRaw = null; }
  for (const [key, input] of Object.entries(fields)) input.value = key === 'tags' ? draft.note.tags.join(', ') : key === 'body' ? draft.note.markdown : draft.note[key];
  fields.slug.readOnly = Boolean(draft.baseUpdatedAt);
  $('#save-status').textContent = draft.baseUpdatedAt ? '正在编辑已发布笔记，修改后需重新发布' : savedRaw ? '已恢复浏览器草稿' : '开始写作，草稿会自动保存';
  message(); preview(); renderLists();
}
function changed() {
  interacted = true;
  current.note.updatedAt = new Date().toISOString();
  dirty = true; $('#save-status').textContent = '正在保存草稿…';
  preview(); clearTimeout(timer); timer = setTimeout(save, 450);
}
$('#note-form').addEventListener('submit', event => { event.preventDefault(); save(); });
$('#note-form').addEventListener('input', changed);
$('#save-note').addEventListener('click', () => { if (!dirty && !savedRaw) dirty = true; save(); });
$('#new-note').addEventListener('click', () => { interacted = true; if (save()) { open(blank()); fields.title.focus(); history.replaceState(null, '', '/editor/'); } });
$('#draft-list').addEventListener('click', event => {
  const id = event.target.closest('[data-draft]')?.dataset.draft;
  if (!id || !save()) return;
  interacted = true;
  try { open(validateDraft(JSON.parse(localStorage.getItem(prefix + id)))); } catch { message('无法打开这篇草稿，请检查浏览器存储。'); }
});
$('#published-list').addEventListener('click', event => {
  const id = event.target.closest('[data-published]')?.dataset.published;
  if (!id || !save()) return;
  interacted = true;
  const note = notebook.notes.find(note => note.id === id);
  try {
    if (localStorage.getItem(prefix + id) && !confirm('打开已发布版本会替换这篇笔记在当前页面的编辑内容。需要保留的修改请先下载备份。继续吗？')) return;
  } catch { /* Reading published notes still works without storage. */ }
  open({ note: { ...note }, baseUpdatedAt: note.updatedAt });
  history.replaceState(null, '', `/editor/?edit=${note.slug}`);
});
$('#delete-draft').addEventListener('click', () => {
  if (!confirm('删除当前浏览器中的这篇草稿？已发布的文章不会删除。')) return;
  try { interacted = true; clearTimeout(timer); localStorage.removeItem(prefix + current.note.id); open(blank()); }
  catch { message('无法删除草稿，请检查浏览器存储设置。'); }
});
$('#export-note').addEventListener('click', () => {
  collect();
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, draft: current }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${current.note.slug || 'note'}-backup.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#import-note').addEventListener('change', async event => {
  const file = event.target.files[0];
  try {
    if (!file) return;
    if (file.size > 1500000) throw new Error('备份文件过大，请选择单篇笔记的 JSON 备份。');
    const value = JSON.parse(await file.text());
    if (value.version !== 1) throw new Error('不支持这个备份版本。');
    const draft = validateDraft(value.draft);
    if (!save()) return;
    if (localStorage.getItem(prefix + draft.note.id) && !confirm('已有同一篇笔记的草稿，确认用此备份替换吗？')) return;
    interacted = true; open(draft); dirty = true; save();
  } catch { message('导入失败。请选择从此编辑器下载的有效笔记备份。'); }
  finally { event.target.value = ''; }
});
document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
  const input = fields.body, start = input.selectionStart, end = input.selectionEnd;
  const selected = input.value.slice(start, end);
  const text = { heading: `\n## ${selected || '小标题'}\n`, bold: `**${selected || '重点文字'}**`, list: `\n- ${selected || '列表项目'}\n`, link: `[${selected || '链接文字'}](https://example.com)`, code: `\n\`\`\`\n${selected || '代码'}\n\`\`\`\n` }[button.dataset.format];
  input.setRangeText(text, start, end, 'select'); input.focus(); changed();
}));
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); } });
window.addEventListener('beforeunload', event => { if (dirty || publishing) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pagehide', () => { if (dirty) save(); });
window.addEventListener('storage', event => { if (event.key?.startsWith(prefix)) renderLists(); });

const dialog = $('#publish-dialog');
$('#publish-note').addEventListener('click', () => {
  if (!$('#note-form').reportValidity()) return;
  try { validateNote(collect()); }
  catch (error) { message(error.message); return; }
  save();
  $('#publish-summary').textContent = `${current.note.title} · /post/${current.note.slug}/`;
  $('#publish-status').hidden = true; $('#github-token').value = '';
  dialog.showModal(); $('#github-token').focus();
});
dialog.addEventListener('close', () => { $('#github-token').value = ''; $('#publish-note').focus(); });
dialog.addEventListener('cancel', event => { if (publishing) event.preventDefault(); });
$('#publish-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (publishing) return;
  publishing = true;
  const token = $('#github-token').value.trim(); $('#github-token').value = '';
  const controls = [...document.querySelectorAll('#notebook-editor button, #note-form input, #note-form textarea, #publish-form input, #publish-form button, #publish-dialog [data-close-dialog]')];
  controls.forEach(control => { control.disabled = true; });
  const progress = text => { $('#publish-status').textContent = text; $('#publish-status').hidden = false; };
  try {
    const result = await publishNote({ ...collect() }, current.baseUpdatedAt, token, progress);
    notebook = result.notebook;
    current.note = result.note; current.baseUpdatedAt = result.note.updatedAt;
    dirty = true; save(); fields.slug.readOnly = true; renderLists();
    progress('已提交到 GitHub，网站正在更新。通常几分钟后所有访客即可看到。');
    const link = document.createElement('a'); link.href = result.commitUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '查看提交'; link.className = 'text-link';
    $('#publish-status').append(document.createElement('br'), link);
    $('#save-status').textContent = '已提交发布 · 等待网站更新';
  } catch (error) { progress(error.message); }
  finally { publishing = false; controls.forEach(control => { control.disabled = false; }); }
});

let first = blank();
try { first = drafts()[0] || first; } catch { /* Show a storage warning after opening. */ }
open(first);
$('#notebook-editor').dataset.ready = 'true';
fetch('/notes.json', { cache: 'no-store' }).then(async response => {
  if (!response.ok) throw new Error('无法读取已发布笔记，草稿编辑仍可使用。请检查网络后刷新。');
  notebook = validateNotebook(await response.json()); renderLists();
  const slug = new URLSearchParams(location.search).get('edit');
  const note = notebook.notes.find(note => note.slug === slug);
  if (note && !dirty && !interacted) {
    let draft;
    try { draft = JSON.parse(localStorage.getItem(prefix + note.id)); } catch { /* Open published version. */ }
    open(draft ? validateDraft(draft) : { note: { ...note }, baseUpdatedAt: note.updatedAt });
  }
}).catch(() => { $('#published-list').innerHTML = '<p class="editor-hint">已发布笔记读取失败，请刷新重试。草稿仍可编辑。</p>'; });
