export const site = {
  name: 'bazaar',
  author: 'ks',
  url: 'https://y00273676.github.io',
  github: 'https://github.com/y00273676',
  repository: 'https://github.com/y00273676/ksitigarbha',
  publishing: { owner: 'y00273676', repo: 'y00273676.github.io', branch: 'master' },
  description: 'A personal collection of code, ideas, and things worth keeping.',
};

export const features = [
  ['cmd', 'exec shell command'], ['expvars', 'parse cli params'],
  ['freeport', 'get free port'], ['identifier', 'object uuid in int64'],
  ['meta', 'meta in context'], ['pprof', 'go pprof'],
  ['signals', 'handle signals in go'], ['timezone', 'timezone in go'],
  ['xcast', 'cast provides easy and safe casting in Go'], ['xcycle', 'cycle job'],
  ['xerrors', 'errors group'], ['xfile', 'file handler'],
  ['xgo', 'go and goroutine with try and exception'],
  ['xhttp', 'http request and response handler'], ['xip', 'ip address conversion'],
  ['xjsonpb', 'json marshaler'], ['xmap', 'map editor'],
  ['xmath', 'mathematical operations'], ['xset', 'set and hash set'],
  ['xslice', 'slice editor'], ['xstrings', 'string editor'],
  ['xtime', 'parse and format time'], ['xtoml', 'parse toml file to struct'],
];

export const posts = [
  {
    slug: 'helloworld', title: 'Helloworld', category: 'Notes', tags: ['Personal', 'Web'],
    date: '2022-02-18', published: '2022-02-18T21:11:35+08:00', readingTime: '1 min read',
    description: 'hello world — this is my first html',
    sections: [['hello-world', 'Hello world']],
    body: '<h2 id="hello-world">hello world</h2><div class="code-block"><div class="code-header"><span>shell</span><button type="button" class="copy-code" aria-label="Copy code">Copy</button></div><pre><code>this is my first html</code></pre></div>',
  },
  {
    slug: 'ksitigarbha', title: 'Ksitigarbha', category: 'Projects', tags: ['Go', 'Open source'],
    date: '2022-02-18', published: '2022-02-18T15:02:27+08:00', readingTime: '2 min read',
    description: 'A collection of practical Go utilities. Small tools for the everyday work of building for the web.',
    sections: [['ksitigarbha', 'Overview'], ['repo', 'Repository'], ['supported-features', 'Supported features'], ['usage', 'Usage']],
    body: `<h2 id="ksitigarbha">ksitigarbha</h2><p>go web assist tools</p><h2 id="repo">Repo</h2><p><a href="${site.repository}" target="_blank" rel="noopener noreferrer">github.com/ksitigarbha</a></p><h2 id="supported-features">Supported Features</h2><dl class="feature-list">${features.map(([name, description]) => `<div><dt><code>${name}</code></dt><dd>${description}</dd></div>`).join('')}</dl><h2 id="usage">Usage</h2><p>the usage is in the test file</p><a class="button button-secondary" href="${site.repository}" target="_blank" rel="noopener noreferrer">Browse the repository <span aria-hidden="true">↗</span></a>`,
  },
];

export const makeSearchIndex = entries => entries.map(({ body, sections, ...post }) => ({
  ...post,
  url: `/post/${post.slug}/`,
  text: body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
}));
export const searchIndex = makeSearchIndex(posts);
