import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home, original articles, and all internal links work', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  expect((await page.goto('/')).status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A place for ideas.A space to build.');
  await expect(page.locator('[data-post]')).toHaveCount(2);
  const paths = await page.locator('a[href^="/"]').evaluateAll(links => [...new Set(links.map(a => a.getAttribute('href')))]);
  for (const path of paths) expect((await request.get(path)).status(), path).toBe(200);
  await page.getByRole('link', { name: 'Explore the project' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ksitigarbha.');
  await expect(page.locator('.feature-list > div')).toHaveCount(23);
  await expect(page.locator('#usage + p')).toHaveText('the usage is in the test file');
  await page.goto('/post/helloworld/');
  await expect(page.locator('pre code')).toHaveText('this is my first html');
  expect(errors).toEqual([]);
});

test('search handles keyboard, results, empty states, and focus restoration', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Search articles', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Find something good.' });
  await expect(dialog).toBeVisible();
  const input = page.getByRole('searchbox', { name: 'Search articles' });
  await expect(input).toBeFocused();
  await input.fill('<script>alert(1)</script>');
  await expect(dialog.getByText('No notes found.')).toBeVisible();
  await input.fill('freeport');
  await expect(dialog.locator('.search-result')).toHaveCount(1);
  await input.press('ArrowDown');
  await expect(dialog.getByRole('link', { name: /Ksitigarbha/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/post\/ksitigarbha\/$/);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await page.getByRole('button', { name: 'Close search' }).click();
  await expect(trigger).toBeFocused();
});

test('topic filters follow URLs, back navigation, and an empty collection', async ({ page }) => {
  await page.goto('/tags/?tag=Go');
  await expect(page.locator('[data-post]:visible')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Personal', exact: true }).click();
  await expect(page).toHaveURL(/tag=Personal/);
  await expect(page.locator('[data-post]:visible .writing-title')).toHaveText('Helloworld');
  await page.goBack();
  await expect(page.locator('[data-post]:visible .writing-title')).toHaveText('Ksitigarbha');
  await page.goto('/tags/?tag=missing');
  await expect(page.getByText('Nothing here yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Show all writing' }).click();
  await expect(page.locator('[data-post]:visible')).toHaveCount(2);
  await page.goto('/categories/?category=Projects');
  await expect(page.locator('[data-post]:visible .writing-title')).toHaveText('Ksitigarbha');
});

test('theme persists and RSS clipboard reports success or failure honestly', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Subscribe via RSS' }).click();
  await page.getByRole('button', { name: 'Copy RSS feed URL' }).click();
  await expect(page.getByRole('status')).toHaveText('RSS feed link copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://y00273676.github.io/index.xml');
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('Denied')); });
  await page.getByRole('button', { name: 'Copy RSS feed URL' }).click();
  await expect(page.getByRole('status')).toContainText('Couldn’t copy automatically.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('responsive pages fit the viewport and mobile navigation works', async ({ page, isMobile }) => {
  for (const path of ['/', '/post/', '/tags/', '/categories/', '/post/ksitigarbha/', '/post/helloworld/', '/missing-page/']) {
    await page.goto(path);
    if (path === '/') await expect(page.locator('#orb-scene canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
  if (isMobile) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Writing' }).click();
    await expect(page).toHaveURL(/\/post\/$/);
  }
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('#orb-scene canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px`).toBe(true);
  }
});

test('reduced motion and unavailable WebGL preserve readable content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.includes('webgl')) { window.webglAttempted = true; return null; }
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A place for ideas. A space to build.' })).toBeVisible();
  await page.waitForFunction(() => window.webglAttempted);
  await expect(page.locator('.orb-fallback')).toBeVisible();
  await expect(page.locator('[data-pause-orb]')).toBeHidden();
  await page.getByRole('button', { name: 'Search articles', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('main pages and dialogs meet WCAG AA checks in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const checkAccessibility = async label => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) })), label).toEqual([]);
  };
  for (const theme of ['light', 'dark']) {
    await page.goto('/');
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      await expect(page.locator('.site-footer')).toHaveCSS('color', 'rgb(162, 172, 161)');
    }
    for (const path of ['/', '/post/', '/tags/', '/categories/', '/post/ksitigarbha/', '/post/helloworld/', '/404.html']) {
      await page.goto(path);
      await checkAccessibility(`${theme}: ${path}`);
    }
    await page.goto('/');
    for (const name of ['Search articles', 'Subscribe via RSS']) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await checkAccessibility(`${theme}: ${name}`);
      await page.keyboard.press('Escape');
    }
  }
});

test('scene controls respect motion preferences and recover from WebGL loss', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.locator('#orb-scene canvas')).toBeVisible();
  const pause = page.locator('[data-pause-orb]');
  if (isMobile) await expect(pause).toBeHidden();
  else {
    await pause.click();
    await expect(pause).toHaveText('Resume motion');
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await pause.click();
    await expect(pause).toHaveText('Pause motion');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(pause).toBeHidden();
  await page.locator('#orb-scene canvas').dispatchEvent('webglcontextlost');
  await expect(page.locator('.orb-fallback')).toBeVisible();
  await expect(page.locator('#orb-scene')).toBeHidden();
  await page.getByRole('button', { name: 'Search articles', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
