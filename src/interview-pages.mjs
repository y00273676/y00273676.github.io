import { interviewBase, interviewGroups, interviewNotes } from './interview.mjs';
import { icon, label, button, escapeHtml } from './components.mjs';
import { collectedSource, collectedDocuments, collectedProjects } from './interview-sources.mjs';

const getNote = route => interviewNotes.find(note => note.route === route);
const starters = [
  ['senior/interview', '01', '高级场景面试', '24 道场景题，从业务边界到技术领导力。', 'S01—S24'],
  ['senior/exam', '02', '120 分钟模拟笔试', '架构、代码、评测与决策，附分项评分。', '120 MIN / 100 分'],
  ['question-bank', '03', '主线题库与复习计划', '基础热身、系统设计、Debug 与 14 天计划。', 'Q · SD · D · C · P · B'],
  ['code', '04', '动手写，运行验证', '4 项 Python 参考实现与 28 个异常路径测试。', 'PYTHON / 标准库'],
];

export function interviewFeature() {
  return `<section class="card interview-feature" lang="zh-CN" aria-labelledby="interview-feature-title" data-reveal><div>${label('STUDY COLLECTION · 2026')}<h2 id="interview-feature-title">Agent 面试与笔试笔记</h2><p>个人复习笔记与网络资料。专题答案、模拟笔试、项目问答与三语言实战。</p><div class="interview-feature-meta"><span>${interviewGroups.length} 个学习专题</span><span>${interviewNotes.length} 篇资料</span><span>新收录：AI Agent 面试全攻略</span></div></div>${button('进入面试笔记', interviewBase)}</section>`;
}

function noteRow(note) {
  const questions = note.route === 'collected/project-qa' ? '92 题 · 7 类项目问答' : note.questionIds.length > 5 ? `${note.questionIds[0]} · … · ${note.questionIds.at(-1)}` : note.questionIds.join(' · ');
  return `<li data-note data-note-source="${note.source}" data-note-search="${escapeHtml(`${note.shortTitle} ${note.questionIds.join(' ')} ${note.headings.map(heading => heading.title).join(' ')}`.toLocaleLowerCase())}"><a href="${note.url}"><span><strong>${escapeHtml(note.shortTitle)}</strong><small><span class="note-source ${note.source === 'collected' ? 'note-source-collected' : ''}">${note.source === 'collected' ? '网络资料' : '个人笔记'}</span>${escapeHtml(questions || note.readingTime)}</small></span>${icon('arrow')}</a></li>`;
}

function collectedFeature() {
  return `<section class="card collected-feature" aria-labelledby="collected-title">${label('NEW IN THE COLLECTION / 网络资料')}<div class="collected-feature-heading"><div><h2 id="collected-title">AI Agent 面试全攻略</h2><p>从基础入门到项目表达：${collectedDocuments.length} 篇文档、9 大模块、92 道项目问答与 6 张漫画图解。</p></div>${button('浏览收录总览', getNote('collected/overview').url, 'secondary')}</div><div class="collected-quick-links"><a href="${getNote('collected/handbook').url}">九大模块八股文 ${icon('arrow')}</a><a href="${getNote('collected/project-qa').url}">92 道项目问答 ${icon('arrow')}</a><a href="${getNote('collected/roadmap').url}">学习与求职路线 ${icon('arrow')}</a><a href="${interviewBase}?source=collected&topic=practice#study-library-title">Python / Java / Go 实战 ${icon('arrow')}</a></div><p class="collected-credit">来源：<a href="${collectedSource.repository}">bcefghj / ai-agent-interview-guide</a> · 原仓库版本 ${collectedSource.sourceDate} · 与个人笔记独立标注题号。</p></section>`;
}

function attribution(note) {
  if (note.source !== 'collected') return '';
  const original = `${collectedSource.repository}/blob/${collectedSource.revision}/${note.sourcePath.split('/').map(encodeURIComponent).join('/')}`;
  const examples = ['collected/resume', 'collected/star', 'collected/project-qa'].includes(note.route);
  return `<aside class="study-attribution" aria-label="资料来源"><div><span class="note-source note-source-collected">网络收录</span><a href="${collectedSource.repository}">bcefghj / ai-agent-interview-guide</a><a href="${original}">查看原文 ${icon('diagonal')}</a><a href="${interviewBase}downloads/${collectedSource.directory}/LICENSE">MIT 许可</a></div><p>原仓库版本：${collectedSource.sourceDate}。保留原文内容与引用，方便对照学习。${examples ? '文中的项目经历和量化结果来自原资料，练习时请替换为自己的真实经历与指标。' : ''}</p></aside>`;
}

function projectDownloads(note) {
  const projects = collectedProjects.filter(project => note.route === 'collected/overview' || note.route === project.route);
  if (!projects.length) return '';
  return `<section class="study-downloads" aria-label="实战项目源码"><h2>配套项目源码</h2><p>保留原项目目录、配置示例、README 与许可。可下载后对照文档学习。</p><div>${projects.map(project => `<a class="button button-secondary" href="${project.download}" download>${icon('code')}${project.title} 源码 ZIP ${icon('arrow')}</a>`).join('')}</div></section>`;
}

export function interviewLanding(layout) {
  const studyOrder = note => note.source === 'collected' ? 1000 + collectedDocuments.findIndex(document => document.file === note.file) : note.route === 'senior/interview' ? 0 : Number(note.questionIds[0]?.replace(/\D/g, '')) || 999;
  const groups = interviewGroups.map(group => ({ ...group, notes: interviewNotes.filter(note => note.group === group.slug).sort((a, b) => studyOrder(a) - studyOrder(b)) }));
  return layout({ title: 'Agent 面试与笔试笔记', description: '按专题整理的 Agent 面试与笔试笔记：基础原理、24 道高级场景题、120 分钟模拟笔试、参考代码与评分标准。', path: interviewBase, active: 'Agent 面试', lang: 'zh-CN', content: `
    <section class="page-intro interview-intro">${label('THE STUDY NOTEBOOK · VOL. 01')}<h1>Agent 面试与笔试<span class="sage-text">笔记。</span></h1><p>理解原理，练习取舍，把答案落到工程实践。<br>汇集个人复习笔记与网络资料，覆盖基础入门、工程进阶与求职表达。</p><div class="interview-intro-meta"><span>${interviewNotes.filter(note => note.source === 'personal').length} 篇个人笔记 + ${collectedDocuments.length} 篇网络资料</span><span>${interviewGroups.length} 个专题</span><span>更新于 <time datetime="2026-09-21">2026.09.21</time></span></div></section>
    ${collectedFeature()}
    <section aria-labelledby="study-start-title"><div class="section-heading"><h2 id="study-start-title">从这里开始</h2><a class="text-link" href="${getNote('guide').url}">完整复习指南 ${icon('arrow')}</a></div><div class="study-start-grid">${starters.map(([route, number, title, description, meta]) => `<a class="card study-start" href="${getNote(route).url}"><div class="study-start-top"><span class="section-number">${number}</span>${icon('diagonal')}</div><h3>${title}</h3><p>${description}</p><span class="study-start-meta">${meta}</span></a>`).join('')}</div></section>
    <div class="study-note">${icon('book')}<p>建议按「结论 → 约束与证据 → 方案取舍 → 失败恢复 → 验证与责任」练习。主线题库 Q1–Q65 与专题 Q1–Q72 是两套编号，同号不表示同一题。</p></div>
    <section class="study-library" aria-labelledby="study-library-title"><div class="section-heading"><h2 id="study-library-title">按专题查漏补缺</h2><button type="button" class="text-link" data-open-search>${icon('search')}搜索全文</button></div><div class="study-toolbar" data-study-controls hidden><div class="search-input-wrap">${icon('search')}<input type="search" class="input" id="study-filter" placeholder="搜索专题、标题或题号，如 MCP、Q5" aria-label="搜索专题、标题或题号"></div><span id="study-count" role="status">${groups.reduce((sum, group) => sum + group.notes.length, 0)} 篇专题笔记</span></div><div class="study-source-filters" data-study-controls hidden role="group" aria-label="筛选资料来源"><span>资料来源</span><button type="button" class="filter-chip" data-study-source="all" aria-pressed="true">全部资料</button><button type="button" class="filter-chip" data-study-source="personal" aria-pressed="false">个人笔记</button><button type="button" class="filter-chip" data-study-source="collected" aria-pressed="false">网络资料</button></div><div class="study-topics" data-study-controls hidden role="group" aria-label="筛选学习专题"><button type="button" class="filter-chip" data-study-topic="all" aria-pressed="true">全部专题</button>${groups.map(group => `<button type="button" class="filter-chip" data-study-topic="${group.slug}" aria-pressed="false">${group.title}</button>`).join('')}</div><div class="study-group-grid">${groups.map(group => `<section class="card study-group" id="${group.slug}" data-study-group="${group.slug}"><div class="study-group-heading"><span class="topic-icon">${icon(group.icon)}</span><h3>${group.title}</h3><span>${group.notes.length} 篇</span></div><p>${group.description}</p><ul>${group.notes.map(noteRow).join('')}</ul></section>`).join('')}</div><div class="empty-state" id="study-empty" hidden><h3>没有找到匹配的笔记</h3><p>换一个题号或关键词，或用「搜索全文」查找正文。</p><button type="button" class="button button-secondary" data-study-reset>查看全部专题</button></div></section>
    <section class="study-resources" aria-label="资料与维护"><a href="${getNote('sources').url}">${icon('folder')}更新说明与官方资料 ${icon('arrow')}</a><a href="${getNote('archive').url}">${icon('clock')}历史版本与备份 ${icon('arrow')}</a><span>保留专业版、白话版与高级追问。</span></section>
  ` });
}

function contents(note) {
  let output = '';
  for (let i = 0; i < note.headings.length; i++) {
    const heading = note.headings[i];
    const children = [];
    while (note.headings[i + 1]?.level > heading.level) children.push(note.headings[++i]);
    const link = item => `<a href="#${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a>`;
    output += children.length ? `<details><summary>${escapeHtml(heading.title)}</summary>${link(heading)}${children.map(link).join('')}</details>` : link(heading);
  }
  return output || '<a href="#note-content">正文</a>';
}

export function interviewArticle(layout, note) {
  const peers = interviewNotes.filter(item => item.group === note.group && item.source === note.source);
  const index = peers.indexOf(note);
  const adjacent = [[peers[index - 1], '上一篇'], [peers[index + 1], '下一篇']].filter(([item]) => item);
  const group = interviewGroups.find(group => group.slug === note.group);
  const toc = contents(note);
  return layout({ title: note.title, description: `${note.category} · Agent 面试与笔试笔记。${note.questionIds.length ? `包含 ${note.questionIds.join('、')}。` : ''}`, path: note.url, active: 'Agent 面试', lang: 'zh-CN', content: `
    <div class="reading-progress" aria-hidden="true"></div><nav class="article-back study-breadcrumb" aria-label="面包屑"><a href="${interviewBase}" class="text-link">${icon('back')}Agent 面试笔记</a><span>/</span><a href="${interviewBase}${group ? `#${group.slug}` : 'guide/'}">${note.category}</a></nav>
    <header class="article-header study-article-header">${label('AGENT INTERVIEW / ' + note.category)}<h1>${escapeHtml(note.title)}</h1><div class="article-meta"><span class="author-avatar">${note.source === 'collected' ? '↗' : 'ks'}</span><span>${note.source === 'collected' ? '网络资料 · bcefghj' : 'ks'}</span><span class="meta-separator"></span><time datetime="${note.date}">${note.source === 'collected' ? '收录于' : '更新于'} ${note.date}</time><span class="meta-separator"></span><span>约 ${note.readingTime}</span></div></header>${attribution(note)}${projectDownloads(note)}
    <details class="study-mobile-toc"><summary>本页目录 · ${note.headings.filter(item => item.level === 2).length} 节</summary><nav aria-label="本页目录（移动端）">${toc}</nav></details>
    <div class="article-layout study-article-layout"><article class="article-body study-prose" id="note-content">${note.body}<div class="article-signoff"><a class="text-link" href="${interviewBase}">${icon('back')}返回全部专题</a><button type="button" class="text-link" data-share>${icon('copy')}复制文章链接</button></div><nav class="study-adjacent" aria-label="继续阅读">${adjacent.map(([item, direction]) => `<a class="card" href="${item.url}"><small>${direction} · ${item.category}</small><span>${escapeHtml(item.shortTitle)} ${icon('arrow')}</span></a>`).join('')}</nav></article><aside class="article-toc study-toc"><nav aria-label="本页目录"><div class="eyebrow">ON THIS PAGE / 本页目录</div>${toc}</nav></aside></div>
  ` });
}
