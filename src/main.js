import { animate, inView, stagger } from 'motion';
import { searchIndex } from './content.mjs';
import { icon, escapeHtml, emptyState } from './components.mjs';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const themeButton = document.querySelector('[data-theme-toggle]');
function syncTheme() {
  const dark = root.dataset.theme === 'dark';
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#151a17' : '#f7f8f5';
}
syncTheme();
themeButton.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('bazaar-theme', root.dataset.theme); } catch { /* Theme still works without storage. */ }
  syncTheme();
  window.dispatchEvent(new Event('themechange'));
});

const mobileMenuButton = document.querySelector('.menu-trigger');
const mobileNav = document.querySelector('#main-nav');
function closeMenu() {
  mobileNav.classList.remove('is-open');
  mobileMenuButton.setAttribute('aria-expanded', 'false');
  mobileMenuButton.setAttribute('aria-label', 'Open navigation');
}
mobileMenuButton.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('is-open');
  mobileMenuButton.setAttribute('aria-expanded', String(open));
  mobileMenuButton.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation`);
});
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });

let returnFocus;
function openDialog(dialog) {
  if (document.querySelector('dialog[open]')) return;
  returnFocus = document.activeElement;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  if (!reduceMotion.matches) animate(dialog, { opacity: [0, 1], y: [8, 0] }, { duration: .2 });
}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; returnFocus?.focus(); });
});

const searchDialog = document.querySelector('#search-dialog');
const searchInput = document.querySelector('#search-input');
const searchResults = document.querySelector('#search-results');
let selected = -1;
let allSearchIndex = searchIndex;
let interviewSearchRequest;
let interviewSearchError = false;
function loadInterviewSearch() {
  if (!interviewSearchRequest) {
    interviewSearchError = false;
    interviewSearchRequest = fetch('/assets/interview-search.json')
      .then(response => { if (!response.ok) throw new Error('Search unavailable'); return response.json(); })
      .then(notes => { allSearchIndex = [...searchIndex, ...notes]; renderSearch(); })
      .catch(() => { interviewSearchError = true; interviewSearchRequest = undefined; renderSearch(); });
  }
}
function renderSearch() {
  const words = searchInput.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = allSearchIndex.filter(post => words.every(word => `${post.title} ${post.description} ${post.tags.join(' ')} ${post.category} ${post.text}`.toLocaleLowerCase().includes(word)));
  if (words.length) matches.sort((a, b) => words.filter(word => b.title.toLocaleLowerCase().includes(word)).length - words.filter(word => a.title.toLocaleLowerCase().includes(word)).length);
  selected = -1;
  searchResults.innerHTML = matches.length
    ? matches.map(post => `<a class="search-result" href="${post.url}"><span><strong>${escapeHtml(post.title)}</strong><small>${escapeHtml(post.tags.slice(0, 3).join(' · '))} · ${post.readingTime}</small></span>${icon('arrow')}</a>`).join('')
    : emptyState('No notes found.', 'Try a different keyword, like “Go”, “tools”, or “hello”.');
  if (interviewSearchError) searchResults.insertAdjacentHTML('afterbegin', '<p class="muted">面试笔记搜索暂时无法加载，请重新打开搜索重试，或前往 <a href="/agent-interview/">专题目录</a>。</p>');
}
function openSearch() { renderSearch(); openDialog(searchDialog); searchInput.focus(); loadInterviewSearch(); }
document.querySelectorAll('[data-open-search]').forEach(button => button.addEventListener('click', openSearch));
searchInput.addEventListener('input', renderSearch);
searchDialog.addEventListener('keydown', event => {
  const links = [...searchResults.querySelectorAll('a')];
  if (['ArrowDown', 'ArrowUp'].includes(event.key) && links.length) {
    event.preventDefault();
    selected = event.key === 'ArrowDown' ? (selected + 1) % links.length : (selected <= 0 ? links.length - 1 : selected - 1);
    links.forEach((link, i) => link.toggleAttribute('data-selected', i === selected));
    links[selected].focus();
  } else if (event.key === 'Enter' && event.target === searchInput && links.length) {
    event.preventDefault();
    links[Math.max(0, selected)].click();
  }
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  if (event.key === '/' && !event.target.closest('input, textarea, [contenteditable]') && !document.querySelector('dialog[open]')) { event.preventDefault(); openSearch(); }
  if (event.key === 'Escape') closeMenu();
});
if (!/Mac|iPhone|iPad/.test(navigator.platform)) document.querySelector('.search-trigger kbd').textContent = 'Ctrl K';

let toastTimeout;
function toast(message) {
  const element = document.querySelector('#toast');
  element.querySelector('span').textContent = message;
  // A toast must be in the dialog's top layer while a modal is open.
  (document.querySelector('dialog[open]') || document.body).append(element);
  element.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { element.hidden = true; document.body.append(element); }, 3200);
}
async function copy(text, success) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      (document.querySelector('dialog[open]') || document.body).append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (!copied) throw new Error('Clipboard unavailable');
    }
    toast(success);
  } catch { toast('Couldn’t copy automatically. Please select and copy the text.'); }
}
document.querySelectorAll('[data-open-rss]').forEach(button => button.addEventListener('click', () => openDialog(document.querySelector('#rss-dialog'))));
document.querySelector('[data-copy-feed]').addEventListener('click', () => copy(document.querySelector('#feed-url').value, 'RSS feed link copied.'));
document.querySelectorAll('.copy-code').forEach(button => button.addEventListener('click', () => copy(button.closest('.code-block').querySelector('code').textContent, 'Code copied to clipboard.')));
document.querySelector('[data-share]')?.addEventListener('click', () => copy(document.querySelector('link[rel="canonical"]').href, 'Article link copied.'));

const filterButtons = [...document.querySelectorAll('[data-filter]')];
if (filterButtons.length) {
  const rows = [...document.querySelectorAll('[data-post]')];
  function applyFilter(value, type, updateUrl = true) {
    let count = 0;
    rows.forEach(row => {
      const visible = value === 'All' || (type === 'tag' ? row.dataset.tags.split('|').includes(value) : row.dataset.category === value);
      row.hidden = !visible;
      if (visible) count++;
    });
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === value)));
    document.querySelector('#result-count').textContent = `${count} article${count === 1 ? '' : 's'}`;
    document.querySelector('#archive-empty').hidden = count > 0;
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.delete('tag'); url.searchParams.delete('category');
      if (value !== 'All') url.searchParams.set(type, value);
      history.pushState({}, '', url);
    }
  }
  const fromUrl = () => {
    const params = new URLSearchParams(location.search);
    const type = params.has('tag') ? 'tag' : 'category';
    applyFilter(params.get(type) || 'All', type, false);
  };
  filterButtons.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter, button.dataset.filterType || 'category')));
  document.querySelector('[data-reset-filter]')?.addEventListener('click', () => applyFilter('All', 'category'));
  window.addEventListener('popstate', fromUrl);
  fromUrl();
}

const studyFilter = document.querySelector('#study-filter');
if (studyFilter) {
  document.querySelectorAll('[data-study-controls]').forEach(element => { element.hidden = false; });
  const groups = [...document.querySelectorAll('[data-study-group]')];
  const buttons = [...document.querySelectorAll('[data-study-topic]')];
  const sourceButtons = [...document.querySelectorAll('[data-study-source]')];
  let topic = 'all';
  let source = 'all';
  function filterStudy(updateUrl = true) {
    const query = studyFilter.value.trim().toLocaleLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    let count = 0;
    groups.forEach(group => {
      let visible = 0;
      group.querySelectorAll('[data-note]').forEach(row => {
        const text = `${group.querySelector('h3').textContent} ${row.dataset.noteSearch}`.toLocaleLowerCase();
        row.hidden = (topic !== 'all' && group.dataset.studyGroup !== topic) || (source !== 'all' && row.dataset.noteSource !== source) || !words.every(word => text.includes(word));
        if (!row.hidden) visible++;
      });
      group.hidden = visible === 0;
      count += visible;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.studyTopic === topic)));
    sourceButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.studySource === source)));
    document.querySelector('#study-count').textContent = `${count} 篇专题笔记`;
    document.querySelector('#study-empty').hidden = count > 0;
    if (updateUrl) {
      const url = new URL(location.href);
      if (query) url.searchParams.set('q', studyFilter.value.trim()); else url.searchParams.delete('q');
      if (topic !== 'all') url.searchParams.set('topic', topic); else url.searchParams.delete('topic');
      if (source !== 'all') url.searchParams.set('source', source); else url.searchParams.delete('source');
      history.replaceState({}, '', url);
    }
  }
  function readStudyUrl() {
    const params = new URLSearchParams(location.search);
    studyFilter.value = params.get('q') || '';
    topic = params.get('topic') || 'all';
    source = params.get('source') || 'all';
    filterStudy(false);
  }
  studyFilter.addEventListener('input', () => filterStudy());
  buttons.forEach(button => button.addEventListener('click', () => { topic = button.dataset.studyTopic; filterStudy(); }));
  sourceButtons.forEach(button => button.addEventListener('click', () => { source = button.dataset.studySource; filterStudy(); }));
  document.querySelector('[data-study-reset]').addEventListener('click', () => { topic = 'all'; source = 'all'; studyFilter.value = ''; filterStudy(); studyFilter.focus(); });
  addEventListener('popstate', readStudyUrl);
  readStudyUrl();
}

const runningAnimations = new Set();
function track(animation) { runningAnimations.add(animation); animation.finished?.then(() => runningAnimations.delete(animation)); return animation; }
if (!reduceMotion.matches) {
  const intro = [...document.querySelectorAll('[data-intro]')];
  if (intro.length) track(animate(intro, { opacity: [0, 1], y: [10, 0] }, { duration: .55, delay: stagger(.07), ease: [.2, .7, .3, 1] }));
  inView('[data-reveal]', element => {
    if (reduceMotion.matches) return;
    track(animate(element, { opacity: [.5, 1], y: [12, 0] }, { duration: .5, ease: [.2, .7, .3, 1] }));
  }, { margin: '0px 0px -25px 0px' });
}
reduceMotion.addEventListener('change', () => {
  if (reduceMotion.matches) { runningAnimations.forEach(animation => animation.complete()); runningAnimations.clear(); }
});

const progress = document.querySelector('.reading-progress');
if (progress) {
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 1})`;
  };
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();
  const toc = [...document.querySelectorAll('.article-toc nav a')];
  const observer = new IntersectionObserver(entries => {
    const active = entries.find(entry => entry.isIntersecting);
    if (active) toc.forEach(link => {
      if (decodeURIComponent(link.hash) === `#${active.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-100px 0px -60% 0px' });
  document.querySelectorAll('.article-body h2[id]').forEach(heading => observer.observe(heading));
}

// The atmosphere is optional: never block content or interaction on WebGL.
if (document.querySelector('#orb-scene') && !navigator.connection?.saveData) {
  const startOrb = () => import('./orb.js').then(({ mountOrb }) => mountOrb(document.querySelector('#orb-scene'))).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(startOrb, { timeout: 2000 });
  else setTimeout(startOrb, 300);
}
