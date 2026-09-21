import { site } from './content.mjs';
import { validateNote, validateNotebook, notebookPosts } from './notes.mjs';
import { renderSiteFiles } from './site-files.mjs';

const base = `https://api.github.com/repos/${site.publishing.owner}/${site.publishing.repo}`;
const branch = site.publishing.branch.split('/').map(encodeURIComponent).join('/');
const version = typeof __BAZAAR_EDITOR_VERSION__ === 'undefined' ? 'development' : __BAZAAR_EDITOR_VERSION__;

export async function publishNote(note, baseUpdatedAt, token, onProgress = () => {}) {
  note = validateNote(note);
  async function api(path, method = 'GET', body) {
    let response;
    try {
      response = await fetch(`${base}${path}`, {
        method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2026-03-10' },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000), cache: 'no-store',
      });
    } catch { throw new Error('网络连接中断。草稿仍然保留，请检查网络后重试；若提交已完成，重试会识别已有内容。'); }
    if (!response.ok) {
      const messages = {
        401: '令牌无效或已过期，请重新创建。',
        403: '没有发布权限或请求受限。请检查令牌的仓库授权和 Contents 写入权限。',
        404: '找不到仓库、分支或编辑器文件。请先部署此版本，并检查令牌是否授权了网站仓库。',
        409: '网站已有新的提交，请重试以读取最新内容。',
        422: '提交被拒绝：网站可能刚被更新，或分支规则禁止直接发布。请重试或检查仓库设置。',
      };
      throw new Error(messages[response.status] || `发布未完成（${response.status}）。草稿仍然保留，请稍后重试。`);
    }
    return response.json();
  }
  async function readJSON(path, ref) {
    const file = await api(`/contents/${path}?ref=${encodeURIComponent(ref)}`);
    if (file.encoding !== 'base64' || !file.content) throw new Error('网站数据过大或格式不正确，已停止发布。');
    try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), c => c.charCodeAt(0)))); }
    catch { throw new Error('网站数据无法读取，已停止发布以保护现有内容。'); }
  }

  onProgress('正在读取网站最新版本…');
  const head = await api(`/git/ref/heads/${branch}`);
  const [commit, notebook, deployedVersion] = await Promise.all([
    api(`/git/commits/${head.object.sha}`), readJSON('notes.json', head.object.sha), readJSON('assets/editor-version.json', head.object.sha),
  ]);
  if (deployedVersion.version !== version) throw new Error('编辑器版本已更新。请保留草稿并刷新页面后再发布；本地预览需先部署当前版本。');
  const current = validateNotebook(notebook);
  const previous = current.notes.find(item => item.id === note.id);
  const sameContent = previous && ['slug', 'title', 'date', 'description', 'category', 'markdown', 'tags'].every(key => JSON.stringify(previous[key]) === JSON.stringify(note[key]));
  if (sameContent) return { note: previous, notebook: current, commitUrl: `https://github.com/${site.publishing.owner}/${site.publishing.repo}/commit/${head.object.sha}` };
  if ((previous?.updatedAt || null) !== (baseUpdatedAt || null)) throw new Error('这篇笔记已有其他版本。请下载当前草稿备份，再从“已发布”列表打开最新版本合并修改。');
  if (previous && previous.slug !== note.slug) throw new Error('已发布笔记的文章地址不能修改。');
  if (previous) note.published = previous.published;
  const updated = validateNotebook({ version: 1, notes: [...current.notes.filter(item => item.id !== note.id), note] });
  // Keep the Contents API read below its 1 MB inline content limit.
  const notebookJSON = `${JSON.stringify(updated, null, 2)}\n`;
  if (new TextEncoder().encode(notebookJSON).length > 900000) throw new Error('笔记库已接近当前发布容量，请下载备份并通过源码管理后续内容。');
  onProgress('正在生成文章、目录和 RSS…');
  const files = renderSiteFiles(notebookPosts(updated));
  files.set('notes.json', notebookJSON);
  const tree = await api('/git/trees', 'POST', {
    base_tree: commit.tree.sha,
    tree: [...files].map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
  });
  const next = await api('/git/commits', 'POST', { message: `${previous ? 'Update' : 'Publish'} note: ${note.title}`, tree: tree.sha, parents: [head.object.sha] });
  onProgress('正在提交到网站…');
  // One atomic, non-forced ref update; concurrent commits are never overwritten.
  await api(`/git/refs/heads/${branch}`, 'PATCH', { sha: next.sha, force: false });
  return { note, notebook: updated, commitUrl: `https://github.com/${site.publishing.owner}/${site.publishing.repo}/commit/${next.sha}` };
}
