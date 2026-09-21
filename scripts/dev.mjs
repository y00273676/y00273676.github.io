import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
process.chdir(root);
const port = Number(process.env.PORT || 5173);
let building = false, queued = false, timer;
async function rebuild() {
  if (building) { queued = true; return; }
  building = true;
  await new Promise(resolve => {
    const child = spawn(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });
    child.on('exit', code => { if (code) console.error('Build failed. Fix the error and save to retry.'); resolve(); });
  });
  building = false;
  if (queued) { queued = false; await rebuild(); }
}
await rebuild();
const types = { '.json': 'application/json; charset=utf-8', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    const relativePath = relative(root, file);
    if (relativePath.split(sep).some(part => part.startsWith('.')) || /^(node_modules|src|scripts|tests)(\/|$)/.test(relativePath)) { response.writeHead(403); response.end('Forbidden'); return; }
    try { if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html'); }
    catch { /* Use the site's actual 404 page below. */ }
    try { const body = await readFile(file); response.writeHead(200, { 'Content-Type': types[extname(file)] || 'text/plain', 'Cache-Control': 'no-store' }); response.end(body); }
    catch { response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(await readFile(resolve(root, '404.html'))); }
  } catch { response.writeHead(400); response.end('Bad request'); }
}).listen(port, '127.0.0.1', () => console.log(`bazaar → http://127.0.0.1:${port}\nWatching src/. Save, then refresh to see changes.`));
watch(resolve(root, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 150); });

watch(resolve(root, 'notes.json'), () => { clearTimeout(timer); timer = setTimeout(rebuild, 150); });
