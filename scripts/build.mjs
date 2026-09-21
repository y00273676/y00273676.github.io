import { build } from 'esbuild';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm, readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { renderSiteFiles } from '../src/site-files.mjs';
import { site } from '../src/content.mjs';
import { notebookPosts } from '../src/notes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
await mkdir('assets', { recursive: true });
const posts = notebookPosts(JSON.parse(await readFile('notes.json', 'utf8')));
const sourceFiles = (await readdir('src')).sort();
const signature = createHash('sha256');
for (const file of sourceFiles) signature.update(await readFile(`src/${file}`));
signature.update(await readFile('package-lock.json'));
const version = signature.digest('hex');
await Promise.all([
  build({ entryPoints: ['src/main.js'], define: { __BAZAAR_EDITOR_VERSION__: JSON.stringify(version) }, outdir: 'assets', bundle: true, splitting: true, format: 'esm', minify: true, target: 'es2022', chunkNames: 'chunks/[name]-[hash]', metafile: true }).then(async result => {
    // Only remove stale generated chunks, never unrelated site assets.
    const current = new Set(Object.keys(result.metafile.outputs).map(path => resolve(path)));
    for (const name of await readdir('assets/chunks').catch(() => [])) {
      const file = resolve('assets/chunks', name);
      if (!current.has(file)) await rm(file);
    }
  }),
  promisify(execFile)(process.execPath, ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', 'src/styles.css', '-o', 'assets/site.css', '--minify']),
]);
for (const [file, html] of renderSiteFiles(posts)) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, html); }
await writeFile('assets/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#f7f8f5"/><g fill="#56705b"><path d="M7 7h8v8H7zm0 10h8v8H7zm10 0h8v8h-8z"/><path opacity=".55" d="M17 5h8v8h-8z"/></g></svg>');
await writeFile('assets/editor-version.json', JSON.stringify({ version }));
await writeFile('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
await writeFile('.nojekyll', '');
console.log(`Built ${posts.length} articles, the notebook editor, feeds, search, and site assets.`);
