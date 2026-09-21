// Editorial placement and provenance are kept outside the upstream Markdown.
export const collectedSource = {
  id: 'collected',
  label: '网络资料',
  name: 'AI Agent 面试全攻略',
  author: 'bcefghj',
  repository: 'https://github.com/bcefghj/ai-agent-interview-guide',
  revision: '9a987322f2d82ddabe4c1aabc7b4795749fa90a2',
  sourceDate: '2026-04-01',
  imported: '2026-09-21',
  directory: 'collected/ai-agent-interview-guide',
};

// Five upstream table-of-contents links spell their headings differently.
// Repair the rendered destinations while retaining the original Markdown.
export const collectedAnchorAliases = {
  'collected/core-frameworks': { '7-autogen--crewai-等多-agent-框架': '7-autogen-crewai-等多-agent-框架' },
  'collected/tool-calling': { '2-tool-use--tool-calling': '2-tool-use-tool-calling' },
  'collected/memory': {
    '2-短期记忆-short-term--working-memory': '2-短期记忆short-term-working-memory',
    '3-长期记忆-long-term-memory': '3-长期记忆long-term-memory',
  },
  'collected/prompt': { '4-chain-of-thoughtcot-思维链': '4-chain-of-thoughtcot思维链' },
};

export const collectedDocuments = [
  ['README.md', 'overview', 'resources', 'AI Agent 面试全攻略 · 收录总览'],
  ['docs/00-学习路线图/README.md', 'roadmap', 'career', '从零到 Offer · 学习路线图'],
  ['docs/01-面试八股文/README.md', 'handbook', 'resources', '九大模块 · 面试八股文目录'],
  ['docs/01-面试八股文/01-基础概念.md', 'fundamentals', 'architecture', '基础概念 · 面试八股文'],
  ['docs/01-面试八股文/02-核心框架.md', 'core-frameworks', 'frameworks', 'ReAct 与核心框架 · 面试八股文'],
  ['docs/01-面试八股文/03-RAG技术.md', 'rag', 'rag', 'RAG 技术 · 面试八股文'],
  ['docs/01-面试八股文/04-工具调用.md', 'tool-calling', 'tools', '工具调用与 MCP · 面试八股文'],
  ['docs/01-面试八股文/05-记忆系统.md', 'memory', 'memory', '记忆系统 · 面试八股文'],
  ['docs/01-面试八股文/06-多智能体.md', 'multi-agent', 'architecture', '多智能体协作 · 面试八股文'],
  ['docs/01-面试八股文/07-大模型基础.md', 'llm', 'llm', '大模型基础 · 面试八股文'],
  ['docs/01-面试八股文/08-工程化实践.md', 'engineering', 'architecture', '工程化实践 · 面试八股文'],
  ['docs/01-面试八股文/09-Prompt工程.md', 'prompt', 'architecture', 'Prompt 工程 · 面试八股文'],
  ['docs/02-企业招聘分析/README.md', 'jobs', 'career', '企业招聘需求分析'],
  ['docs/03-开源项目学习笔记/README.md', 'open-source', 'practice', '开源项目学习笔记'],
  ['docs/04-简历模板/README.md', 'resume', 'career', 'Agent 项目简历模板'],
  ['docs/05-STAR面试稿/README.md', 'star', 'career', 'STAR 面试稿与表达练习'],
  ['docs/06-面试问答集/README.md', 'project-qa', 'practice', '92 道项目面试问答'],
  ['project-python/README.md', 'python-project', 'practice', 'Python 项目 · FastAPI / LangChain'],
  ['project-java/README.md', 'java-project', 'practice', 'Java 项目 · Spring Boot / Spring AI'],
  ['project-go/README.md', 'go-project', 'practice', 'Go 项目 · Gin / 自研框架'],
].map(([path, slug, group, shortTitle]) => ({
  file: `${collectedSource.directory}/${path}`, sourcePath: path,
  route: `collected/${slug}`, group, shortTitle,
}));

export const collectedProjects = [
  ['python', 'Python', 'FastAPI · LangChain · Milvus · Redis'],
  ['java', 'Java', 'Spring Boot · Spring AI · Milvus'],
  ['go', 'Go', 'Gin · 自研框架 · Milvus · Redis'],
].map(([language, title, stack]) => ({
  language, title, stack, route: `collected/${language}-project`,
  download: `/agent-interview/downloads/${collectedSource.directory}/project-${language}.zip`,
  upstream: `${collectedSource.repository}/tree/${collectedSource.revision}/project-${language}`,
}));
