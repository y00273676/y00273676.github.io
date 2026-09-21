import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function openEditor(page) {
  await page.goto('/editor/');
  await expect(page.locator('#notebook-editor')).toHaveAttribute('data-ready', 'true');
}
async function writeNote(page, title = '我的新笔记') {
  await page.getByLabel('笔记标题', { exact: true }).fill(title);
  await page.getByLabel('正文 · Markdown', { exact: true }).fill('## 今天的发现\n\n记录 **值得分享** 的想法。\n\n- 第一个项目\n\n```js\nconst answer = 42;\n```');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.locator('#save-status')).toContainText('草稿已保存在此浏览器');
}
async function github(page, request, { fail, notes = [], staleVersion = false } = {}) {
  const version = await (await request.get('/assets/editor-version.json')).json();
  const captured = { calls: [], files: new Map() };
  await page.route('https://api.github.com/repos/y00273676/y00273676.github.io/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.split('/y00273676.github.io')[1], method = req.method();
    captured.calls.push({ method, path });
    const json = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
    if (fail === 'auth' || (fail === 'conflict' && method === 'PATCH')) return route.fulfill({ status: fail === 'auth' ? 401 : 422, contentType: 'application/json', body: '{}' });
    if (path === '/git/ref/heads/master') return json({ object: { sha: 'original-head' } });
    if (path === '/git/commits/original-head') return json({ tree: { sha: 'original-tree' } });
    if (path.startsWith('/contents/')) {
      expect(new URL(req.url()).searchParams.get('ref')).toBe('original-head');
      const value = path.endsWith('notes.json') ? { version: 1, notes } : staleVersion ? { version: 'old-version' } : version;
      return json({ encoding: 'base64', content: Buffer.from(JSON.stringify(value)).toString('base64') });
    }
    if (path === '/git/trees') {
      const body = req.postDataJSON(); expect(body.base_tree).toBe('original-tree');
      captured.files = new Map(body.tree.map(file => [file.path, file.content]));
      expect(JSON.stringify(body)).not.toContain('test-token-only');
      return json({ sha: 'new-tree' });
    }
    if (path === '/git/commits') {
      expect(req.postDataJSON()).toMatchObject({ tree: 'new-tree', parents: ['original-head'] });
      return json({ sha: 'new-commit' });
    }
    if (path === '/git/refs/heads/master') {
      expect(req.postDataJSON()).toEqual({ sha: 'new-commit', force: false });
      return json({ object: { sha: 'new-commit' } });
    }
    throw new Error(`Unexpected API call: ${method} ${path}`);
  });
  return captured;
}
async function publish(page) {
  await page.getByRole('button', { name: '发布到网站', exact: true }).click();
  await page.getByLabel('GitHub 发布令牌', { exact: true }).fill('test-token-only');
  await page.getByRole('button', { name: '确认发布', exact: true }).click();
}

test('drafts survive reload, support multiple notes, and round-trip through backup', async ({ page }) => {
  await openEditor(page); await writeNote(page);
  await expect(page.locator('#preview-body h2')).toHaveText('今天的发现');
  await expect(page.locator('#preview-body strong')).toHaveText('值得分享');
  await page.reload(); await expect(page.locator('#note-title')).toHaveValue('我的新笔记');
  await expect(page.locator('#note-body')).toHaveValue(/今天的发现/);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载备份', exact: true }).click();
  const download = await downloadPromise;
  const backup = await readFile(await download.path());
  await page.getByRole('button', { name: '新建笔记', exact: true }).click();
  await writeNote(page, '第二篇笔记');
  await expect(page.locator('#draft-list button')).toHaveCount(2);
  await page.locator('#draft-list button').filter({ hasText: '我的新笔记' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '删除草稿', exact: true }).click();
  await expect(page.locator('#draft-list button')).toHaveCount(1);
  await page.locator('#import-note').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await expect(page.locator('#note-title')).toHaveValue('我的新笔记');
  await expect(page.locator('#draft-list button')).toHaveCount(2);
});

test('untrusted Markdown stays inert and storage failure preserves editable content', async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.startsWith('bazaar-draft')) throw new DOMException('Full', 'QuotaExceededError'); return set.call(this, key, value); };
  });
  await openEditor(page);
  await page.locator('#note-title').fill('<img src=x onerror=alert(1)>');
  await page.locator('#note-body').fill('<script>window.attacked = true</script>\n\n[bad](javascript:alert(1))\n\n![bad](data:text/html,evil)');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.locator('#editor-message')).toContainText('浏览器存储不可用');
  expect(await page.evaluate(() => window.attacked)).toBeUndefined();
  await expect(page.locator('#preview-body script, #preview-body a, #preview-body img, #preview-title img')).toHaveCount(0);
  await expect(page.locator('#note-body')).toHaveValue(/window.attacked/);
  const download = page.waitForEvent('download'); await page.locator('#export-note').click(); await download;
});

test('publishing generates static articles, search, taxonomy and feeds in one atomic commit', async ({ page, request, browser }) => {
  const captured = await github(page, request);
  await openEditor(page); await writeNote(page, '发布测试 & 新发现');
  await page.getByLabel('标签（逗号分隔）').fill('新标签, 技术');
  await publish(page);
  await expect(page.locator('#publish-status')).toContainText('已提交到 GitHub');
  await expect(page.locator('#github-token')).toHaveValue('');
  const notebook = JSON.parse(captured.files.get('notes.json'));
  expect(notebook.notes).toHaveLength(1);
  const note = notebook.notes[0], path = `/post/${note.slug}/`;
  expect(captured.files.get('index.xml')).toContain('发布测试 &amp; 新发现');
  expect(captured.files.get('sitemap.xml')).toContain(path);
  expect(JSON.parse(captured.files.get('assets/search-index.json')).find(p => p.slug === note.slug).text).toContain('今天的发现');
  expect(captured.files.get('tags/index.html')).toContain('新标签');
  expect(captured.calls.filter(call => call.method === 'PATCH')).toHaveLength(1);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain('test-token-only');
  // A fresh visitor can read the generated article even with JavaScript disabled.
  const visitor = await browser.newContext({ javaScriptEnabled: false });
  const reader = await visitor.newPage();
  await reader.route('http://127.0.0.1:5173/**', route => {
    let file = new URL(route.request().url()).pathname.slice(1); if (!file || file.endsWith('/')) file += 'index.html';
    return captured.files.has(file) ? route.fulfill({ contentType: 'text/html; charset=utf-8', body: captured.files.get(file) }) : route.continue();
  });
  await reader.goto('http://127.0.0.1:5173/');
  await reader.getByRole('link', { name: '发布测试 & 新发现', exact: true }).click();
  await expect(reader.locator('.article-body h2').first()).toHaveText('今天的发现');
  await expect(reader.locator('.article-meta time')).not.toHaveText('February 18, 2022');
  await visitor.close();
});

for (const [failure, expected] of [['auth', '令牌无效'], ['conflict', '提交被拒绝'], ['version', '编辑器版本已更新']]) {
  test(`failed publication preserves drafts: ${failure}`, async ({ page, request }) => {
    const captured = await github(page, request, { fail: failure, staleVersion: failure === 'version' });
    await openEditor(page); await writeNote(page); await publish(page);
    await expect(page.locator('#publish-status')).toContainText(expected);
    await expect(page.locator('#publish-status')).not.toContainText('已提交到 GitHub');
    await expect(page.locator('#github-token')).toHaveValue('');
    if (failure === 'version') expect(captured.calls.some(call => call.method === 'POST')).toBe(false);
    await page.getByRole('button', { name: '关闭发布窗口' }).click();
    await page.reload(); await expect(page.locator('#note-title')).toHaveValue('我的新笔记');
  });
}
