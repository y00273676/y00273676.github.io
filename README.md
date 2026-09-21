# bazaar

A static personal notebook with a responsive Tailwind layout, Motion interactions, and a lazy-loaded Three.js atmosphere. The generated HTML and `assets/` are committed at the repository root so the existing GitHub Pages branch deployment continues to work. No CDN or runtime service is required.

## Development

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Source changes rebuild automatically; refresh the browser afterward. `PORT=8080 npm run dev` selects another port.

```sh
npm run build
npm test
```

Tests use an installed Google Chrome. To use Playwright Chromium instead, install it with `npx playwright install chromium` and run `PLAYWRIGHT_CHROMIUM=1 npm test`.

## Editing

### 网页写笔记

点击网站右上角的铅笔「写笔记」，或打开 `/editor/`。填写标题、日期、分类和标签，在左侧写 Markdown，右侧实时预览。草稿自动保存在当前浏览器，刷新后可继续编辑；「下载备份」和「导入笔记备份」用于备份或换设备。清理浏览器数据会删除本地草稿，尚未发布的内容不会同步到其他设备。

「发布到网站」会把笔记、静态文章页、文章列表、搜索索引、RSS 和站点地图作为一次 Git 提交写入网站仓库。已发布文章可从编辑器的「已发布」列表或文章里的「编辑笔记」继续修改。删除草稿只删除当前浏览器的副本。

首次使用：

1. 先构建并部署此版本到 GitHub Pages。默认发布目标是 `y00273676/y00273676.github.io` 的 `master` 分支、仓库根目录；配置位于 `src/content.mjs` 的 `site.publishing`，应与仓库的 Pages 发布来源一致。
2. 在 [GitHub 创建 fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)，仅选择网站仓库，授予 **Contents: Read and write**。无需授权其他仓库或工作流。
3. 在发布窗口粘贴令牌并确认发布。令牌仅发送给 GitHub API，不写入 localStorage、备份或仓库。每次发布需重新输入。
4. 页面提示「已提交」表示 Git 提交成功，GitHub Pages 仍需完成部署。可通过「查看提交」确认内容和 GitHub 仓库 Actions/Pages 查看部署状态。

发布采用非强制分支更新；并发修改、版本冲突或权限不足会提示错误并保留草稿。旧版编辑器不能覆盖新版网站，请刷新后重试。新内容保存在 `notes.json`，本地构建也读取同一份数据。**网页发布之后，本地开发前先 `git pull`，避免用旧的本地内容覆盖线上笔记。** 当前笔记库上限约 900 KB，不包括通过外部 URL 引用的图片；图片上传不在此版本范围内。

公开文章是完整静态 HTML，无需 JavaScript 即可阅读。发布所需的接口权限见 [GitHub Git trees API](https://docs.github.com/en/rest/git/trees)，Pages 发布配置见 [GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

### Source files

- `src/content.mjs`: original posts, topics, project features, and site identity.
- `notes.json`: public notes written through the editor, in Markdown.
- `src/editor.js`, `src/editor-page.mjs`: editing, local drafts, backup import/export, and preview.
- `src/notes.mjs`: shared Markdown rendering and public note validation.
- `src/publish.mjs`, `src/site-files.mjs`: GitHub publishing and shared static document generation.
- `src/components.mjs`: shared buttons, icons, navigation, dialogs, and empty states.
- `src/pages.mjs`: static home, archive, taxonomy, article, and 404 templates.
- `src/styles.css`: Tailwind and shared visual tokens, light/dark themes, responsive layouts.
- `src/main.js`: search, filters, dialogs, clipboard feedback, reading progress, Motion.
- `src/orb.js`: decorative scene; pauses offscreen and in hidden tabs, respects reduced motion, and falls back to CSS without WebGL.

Run `npm run build` after editing and include generated pages and assets in the same change. Existing article and pagination URLs remain valid. Content is present in HTML without JavaScript; search, topic filtering, dialogs, and theme switching progressively enhance it. Dates, tags, categories, and article counts are generated from the current collection.

The RSS subscription copies the real feed URL; it does not collect email addresses. Search runs entirely in the browser. Design uses shared shadcn/ui-style visual conventions with native, keyboard-accessible controls.

Implementation references: [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli), [Motion](https://motion.dev/docs/quick-start), [Three.js](https://threejs.org/manual/).
