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

- `src/content.mjs`: original posts, topics, project features, and site identity.
- `src/components.mjs`: shared buttons, icons, navigation, dialogs, and empty states.
- `src/pages.mjs`: static home, archive, taxonomy, article, and 404 templates.
- `src/styles.css`: Tailwind and shared visual tokens, light/dark themes, responsive layouts.
- `src/main.js`: search, filters, dialogs, clipboard feedback, reading progress, Motion.
- `src/orb.js`: decorative scene; pauses offscreen and in hidden tabs, respects reduced motion, and falls back to CSS without WebGL.
- `src/notes/agent-interview/`: 57 original Markdown notes imported from the Obsidian interview notebook, with Python reference code and the historical backup.
- `src/interview.mjs`: build-time Markdown rendering, Obsidian links, heading anchors, downloads, and the full-text search index.
- `src/interview-pages.mjs`: the `/agent-interview/` study directory and note reading pages.

Run `npm run build` after editing and include generated pages and assets in the same change. Existing article and pagination URLs remain valid. Content is present in HTML without JavaScript; search, topic filtering, dialogs, and theme switching progressively enhance it. Tags and categories are editorial classifications of the two existing articles.

The RSS subscription copies the real feed URL; it does not collect email addresses. Search runs entirely in the browser. Design uses shared shadcn/ui-style visual conventions with native, keyboard-accessible controls.

Implementation references: [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli), [Motion](https://motion.dev/docs/quick-start), [Three.js](https://threejs.org/manual/).

## Agent interview notebook

Open `/agent-interview/` for topic navigation, senior interview scenarios, the written exam, and reference code. The original notes are kept as Markdown under `src/notes/agent-interview/`; edit those files and rebuild. Builds do not depend on access to iCloud or Obsidian. Changes in the Obsidian notebook are not synchronized automatically; copy updated files to this directory before rebuilding.

Obsidian `[[note|label]]` and `[[note#heading]]` links resolve to static pages, and unresolved local links stop the build. Standard relative links to Python files and the historical ZIP become downloads. Headings, lists, callouts, tables, and code blocks render at build time, so the entire collection can be read without JavaScript. Global search loads the interview full-text index when first opened; the study directory also supports topic, title, and question-number filtering. Historical backup content is excluded from search.

Keep the main question bank Q1–Q65 and the topic questions Q1–Q72 as separate numbering schemes. The imported content and its source verification date are preserved; importing does not re-verify external product claims.

After editing notes, run `npm run build` and `npm test`. To verify the reference implementations:

```sh
python3 -m unittest discover -s src/notes/agent-interview/10-笔试代码 -p 'test_*.py' -v
```
