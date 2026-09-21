import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, access } from 'node:fs/promises';
import { interviewNotes, interviewAttachments } from '../src/interview.mjs';

test('all imported notes preserve readable content and resolve internal links and anchors', async ({ page }) => {
  await page.goto('/agent-interview/');
  const documents = await Promise.all(interviewNotes.map(async note => ({ url: note.url, html: await readFile(`agent-interview/${note.route}/index.html`, 'utf8') })));
  const parsed = await page.evaluate(documents => documents.map(({ url, html }) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return {
      url, titles: document.querySelectorAll('h1').length,
      text: document.querySelector('.study-prose').textContent,
      ids: [...document.querySelectorAll('[id]')].map(node => node.id),
      links: [...document.querySelectorAll('.study-prose a, .study-toc a')].map(link => link.getAttribute('href')),
    };
  }), documents);
  const byUrl = new Map(parsed.map(document => [decodeURI(document.url), document]));
  expect(parsed).toHaveLength(57);
  for (const document of parsed) {
    expect(document.titles, document.url).toBe(1);
    expect(document.text.length, document.url).toBeGreaterThan(50);
    expect(document.text, document.url).not.toContain('[[');
    expect(new Set(document.ids).size, document.url).toBe(document.ids.length);
    for (const href of document.links) {
      const target = new URL(href, `http://localhost${document.url}`);
      if (target.origin !== 'http://localhost') continue;
      const path = decodeURIComponent(target.pathname);
      await access(`.${path}${path.endsWith('/') ? 'index.html' : ''}`);
      if (target.hash) expect(byUrl.get(path)?.ids, `${document.url} → ${href}`).toContain(decodeURIComponent(target.hash.slice(1)));
    }
  }
  for (const attachment of interviewAttachments) {
    expect(await readFile(`.${decodeURIComponent(attachment.url)}`)).toEqual(await readFile(`src/notes/agent-interview/${attachment.file}`));
  }
});

test('study directory filters by topic and question and can recover from no results', async ({ page }) => {
  await page.goto('/agent-interview/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Agent 面试与笔试');
  await expect(page.locator('[data-note]:visible')).toHaveCount(53);
  await page.getByRole('button', { name: '工具调用', exact: true }).click();
  await expect(page.locator('[data-note]:visible')).toHaveCount(5);
  await page.getByRole('searchbox', { name: '搜索专题、标题或题号' }).fill('Q5');
  await expect(page.locator('[data-note]:visible')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('[data-note]:visible')).toHaveCount(2);
  await page.getByRole('searchbox', { name: '搜索专题、标题或题号' }).fill('no-such-note');
  await expect(page.getByText('没有找到匹配的笔记')).toBeVisible();
  await page.getByRole('button', { name: '查看全部专题' }).click();
  await expect(page.locator('[data-note]:visible')).toHaveCount(53);
  await page.locator('.study-start').first().click();
  await expect(page).toHaveURL(/\/senior\/interview\/$/);
  await expect(page.locator('.study-prose h2')).toHaveCount(24);
});

test('global search finds Chinese body text and code links download the imported files', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search articles', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search articles' }).fill('参数相同与业务意图相同');
  await expect(page.locator('.search-result')).toHaveCount(1);
  await page.locator('.search-result').click();
  await expect(page).toHaveURL(/\/agent-interview\/sources\/$/);
  await page.goto('/agent-interview/code/');
  const file = page.locator('.study-prose a', { hasText: 'reference.py' }).first();
  const response = await request.get(await file.getAttribute('href'));
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('async def');
});

test('interview reading is responsive and accessible in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.goto('/agent-interview/');
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    for (const path of ['/agent-interview/', '/agent-interview/question-bank/', '/agent-interview/senior/exam/', '/agent-interview/architecture/基础概念/']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), `${theme}: ${path}`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/agent-interview/senior/exam/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.study-mobile-toc > summary').click();
  await expect(page.getByRole('navigation', { name: '本页目录（移动端）' })).toBeVisible();
});

test('all study navigation and note bodies remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/agent-interview/');
  await expect(page.locator('[data-note]:visible')).toHaveCount(53);
  await page.locator('.study-start').nth(1).click();
  await expect(page.locator('.study-prose')).toContainText('总分解释与面试追问');
  await context.close();
});
