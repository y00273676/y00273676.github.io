import { build } from 'esbuild';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, readdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPages, routes } from '../src/pages.mjs';
import { site, posts } from '../src/content.mjs';
import { interviewRoot, interviewNotes, interviewAttachments, interviewSearchIndex } from '../src/interview.mjs';
import { escapeHtml } from '../src/components.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
await mkdir('assets', { recursive: true });
await Promise.all([
  build({ entryPoints: ['src/main.js'], outdir: 'assets', bundle: true, splitting: true, format: 'esm', minify: true, target: 'es2022', chunkNames: 'chunks/[name]-[hash]', metafile: true }).then(async result => {
    // Only remove stale generated chunks, never unrelated site assets.
    const current = new Set(Object.keys(result.metafile.outputs).map(path => resolve(path)));
    for (const name of await readdir('assets/chunks')) {
      const file = resolve('assets/chunks', name);
      if (!current.has(file)) await rm(file);
    }
  }),
  promisify(execFile)(process.execPath, ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', 'src/styles.css', '-o', 'assets/site.css', '--minify']),
]);
for (const [file, html] of renderPages()) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, html); }
await writeFile('assets/interview-search.json', JSON.stringify(interviewSearchIndex));
for (const attachment of interviewAttachments) {
  const target = `agent-interview/downloads/${attachment.file}`;
  await mkdir(dirname(target), { recursive: true });
  await copyFile(`${interviewRoot}${attachment.file}`, target);
}
await writeFile('assets/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#f7f8f5"/><g fill="#56705b"><path d="M7 7h8v8H7zm0 10h8v8H7zm10 0h8v8h-8z"/><path opacity=".55" d="M17 5h8v8h-8z"/></g></svg>');
const rss = (title, path, entries) => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${title}</title><link>${site.url}${path}</link><description>${site.description}</description><language>en</language><atom:link href="${site.url}${path}index.xml" rel="self" type="application/rss+xml"/>${entries.map(post => `<item><title>${post.title}</title><link>${site.url}/post/${post.slug}/</link><guid>${site.url}/post/${post.slug}/</guid><pubDate>${new Date(post.published).toUTCString()}</pubDate><description>${escapeHtml(post.description)}</description></item>`).join('')}</channel></rss>`;
await writeFile('index.xml', rss('bazaar', '/', posts));
await writeFile('post/index.xml', rss('Writing — bazaar', '/post/', posts));
await writeFile('tags/index.xml', rss('Topics — bazaar', '/tags/', posts));
await writeFile('categories/index.xml', rss('Categories — bazaar', '/categories/', posts));
await writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.filter(route => route !== '/404.html').map(route => `<url><loc>${site.url}${route}</loc></url>`).join('')}</urlset>`);
await writeFile('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
await writeFile('.nojekyll', '');
console.log(`Built ${9 + interviewNotes.length + 1} static pages, including ${interviewNotes.length} interview notes.`);
