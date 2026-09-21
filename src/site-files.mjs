import { renderPages, routesForPosts } from './pages.mjs';
import { site, makeSearchIndex } from './content.mjs';
import { escapeHtml } from './components.mjs';

// Both publishing paths generate exactly the same public documents.
export function renderSiteFiles(posts) {
  const files = renderPages(posts);
  const rss = (title, path) => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeHtml(title)}</title><link>${site.url}${path}</link><description>${escapeHtml(site.description)}</description><language>en</language><atom:link href="${site.url}${path}index.xml" rel="self" type="application/rss+xml"/>${posts.map(post => `<item><title>${escapeHtml(post.title)}</title><link>${site.url}/post/${post.slug}/</link><guid>${site.url}/post/${post.slug}/</guid><pubDate>${new Date(post.published).toUTCString()}</pubDate><description>${escapeHtml(post.description)}</description></item>`).join('')}</channel></rss>`;
  for (const [title, path] of [['bazaar', '/'], ['Writing — bazaar', '/post/'], ['Topics — bazaar', '/tags/'], ['Categories — bazaar', '/categories/']]) files.set(`${path.slice(1)}index.xml`, rss(title, path));
  files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routesForPosts(posts).filter(route => route !== '/404.html').map(route => `<url><loc>${site.url}${route}</loc></url>`).join('')}</urlset>`);
  files.set('assets/search-index.json', JSON.stringify(makeSearchIndex(posts)));
  return files;
}
