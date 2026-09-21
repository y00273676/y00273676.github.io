import { site } from './content.mjs';

const paths = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  moon: '<path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5 8.5 8.5 0 1 0 20.5 13.2Z"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  tag: '<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  github: '<path d="M9 19c-4.5 1.4-4.5-2.5-6-3m12 6v-3.8a3.3 3.3 0 0 0-.9-2.6c3-.4 6.1-1.5 6.1-6.8a5.3 5.3 0 0 0-1.4-3.6 4.9 4.9 0 0 0-.1-3.6s-1.1-.4-3.7 1.4a12.8 12.8 0 0 0-6.7 0C5.7 1.2 4.6 1.6 4.6 1.6a4.9 4.9 0 0 0-.1 3.6A5.3 5.3 0 0 0 3.1 9c0 5.3 3.1 6.4 6.1 6.8a3.3 3.3 0 0 0-.9 2.5V22"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export const icon = (name, classes = '') => `<svg class="icon ${classes}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const label = (text, number = '') => `<div class="eyebrow">${number ? `<span class="section-number">${number}</span>` : ''}${text}</div>`;
export const tags = values => values.map(tag => `<a class="tag" href="/tags/?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join('');
export const button = (text, href, variant = 'primary', name = 'arrow') => `<a class="button button-${variant}" href="${href}">${text}${icon(name)}</a>`;
export const emptyState = (title, description, action = '') => `<div class="empty-state">${icon('search')}<h2>${title}</h2><p>${description}</p>${action}</div>`;

export function header(active) {
  return `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="shell header-inner">
    <a href="/" class="brand" aria-label="bazaar home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>bazaar<span class="brand-dot">.</span></a>
    <nav id="main-nav" class="main-nav" aria-label="Main navigation">${[['Home', '/'], ['Writing', '/post/'], ['Topics', '/tags/']].map(([name, href]) => `<a href="${href}" ${active === name ? 'aria-current="page"' : ''}>${name}</a>`).join('')}</nav>
    <div class="header-actions"><button type="button" class="search-trigger" data-open-search aria-label="Search articles">${icon('search')}<span>Search</span><kbd>⌘ K</kbd></button><span class="header-divider"></span><button type="button" class="icon-button" data-theme-toggle aria-label="Switch to dark theme">${icon('sun', 'theme-sun')}${icon('moon', 'theme-moon')}</button><button type="button" class="icon-button menu-trigger" aria-label="Open navigation" aria-expanded="false" aria-controls="main-nav">${icon('menu')}</button></div>
  </div></header>`;
}

export function footer() {
  return `<footer class="shell site-footer"><div class="flex items-center gap-3"><span class="footer-brand">bazaar.</span><span>A little corner of the internet.</span></div><div class="flex items-center gap-5"><span>© ${new Date().getFullYear()} ks</span><a href="${site.github}" target="_blank" rel="noopener noreferrer" aria-label="ks on GitHub">${icon('github')}</a><a href="/index.xml" aria-label="RSS feed">${icon('rss')}</a><a href="#top" class="back-top" aria-label="Back to top">↑</a></div></footer>`;
}

export function dialogs() {
  return `<dialog id="search-dialog" class="dialog search-dialog" aria-labelledby="search-title">
    <div class="dialog-heading"><h2 id="search-title">Find something good.</h2><button type="button" class="icon-button" data-close-dialog aria-label="Close search">${icon('close')}</button></div>
    <p class="muted">Search the collection by title, topic, or keyword.</p>
    <div class="search-input-wrap">${icon('search')}<input id="search-input" class="input" type="search" placeholder="Try “Go” or “hello world”" aria-label="Search articles" autocomplete="off" autofocus></div>
    <div id="search-results" class="search-results" aria-live="polite"></div><div class="dialog-footnote"><span><kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></div>
  </dialog>
  <dialog id="rss-dialog" class="dialog rss-dialog" aria-labelledby="rss-title"><div class="dialog-heading"><span class="mini-icon">${icon('rss')}</span><button type="button" class="icon-button" data-close-dialog aria-label="Close subscription dialog">${icon('close')}</button></div><h2 id="rss-title">A quieter way to keep up.</h2><p class="muted">Add this feed to your favorite RSS reader. New writing comes to you, on your terms.</p><label class="input-label" for="feed-url">Feed URL</label><div class="flex gap-2"><input class="input" id="feed-url" value="${site.url}/index.xml" readonly><button type="button" class="button button-primary" data-copy-feed aria-label="Copy RSS feed URL">${icon('copy')} Copy</button></div><a class="text-link" href="/index.xml">Open RSS feed ${icon('diagonal')}</a></dialog>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden>${icon('check')}<span></span></div>`;
}
