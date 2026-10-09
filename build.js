#!/usr/bin/env node
/**
 * 极简静态知识库生成器（零依赖，只用 Node 内置模块）
 *
 *   content/posts/*.md  →  dist/
 *     index.html            首页：最近更新 + 主题一览
 *     posts/<文件名>.html   每篇笔记（含目录、反向链接、同主题）
 *     tags/index.html       全部主题
 *     tags/<主题>.html      某个主题下的笔记
 *     archive.html          按时间归档
 *     search.html           全文搜索（纯浏览器端，不需要服务器）
 *     search.json           搜索索引
 *     feed.xml              RSS
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(ROOT, "content", "posts");
const ASSETS_DIR = path.join(ROOT, "assets");
const OUT_DIR = path.join(ROOT, "dist");

// ===== 改这里 =====
const SITE = {
  title: "我的知识库",
  description: "学过的东西记在这里，方便以后回头翻。",
  author: "我",
  // 上线后换成你的域名，RSS 才会是绝对链接。
  // 也可以在部署平台里设环境变量 SITE_URL，就不用来改代码了。
  url: process.env.SITE_URL || "https://example.com",
  relatedLimit: 5, // 每篇底部最多列几条「同主题」笔记
};
// ==================

let COUNT = 0;

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** 去掉 Markdown 标记，留纯文本（用于摘要、目录、搜索索引） */
function stripMd(s) {
  return String(s)
    .replace(WIKILINK_RE, (_, t, l) => (l || t).trim())
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}.-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "") || "section";

/** 主题名 → 文件名（去掉路径里不能用的字符） */
const tagFile = (t) =>
  t
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/^\.+/, "")
    .trim() || "topic";

// ---------- Markdown ----------

function renderInline(s, ctx) {
  return s
    .replace(WIKILINK_RE, (_, target, label) => {
      const t = target.trim();
      const text = (label || t).trim();
      const slug = ctx.resolve(t);
      if (slug) return `<a class="wikilink" href="${ctx.base}posts/${slug}.html">${text}</a>`;
      return `<span class="wikilink missing" title="还没有这篇笔记，写一篇标题相同的就会自动连上">${text}</span>`;
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/**
 * 支持：标题、段落、有序/无序列表、引用、代码块、分割线、行内样式、[[双链]]
 * 同时收集 h2/h3 生成目录。
 */
function markdownToHtml(md, ctx) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const usedIds = new Set();
  let para = [];
  let i = 0;

  const flush = () => {
    if (para.length) {
      out.push(`<p>${renderInline(escapeHtml(para.join(" ")), ctx)}</p>`);
      para = [];
    }
  };

  const uniqueId = (base) => {
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      flush();
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\s*$/.test(line)) {
      flush();
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = uniqueId(slugify(stripMd(text)));
      if (level === 2 || level === 3) ctx.toc.push({ level, id, text: stripMd(text) });
      out.push(`<h${level} id="${id}">${renderInline(escapeHtml(text), ctx)}</h${level}>`);
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      flush();
      out.push("<hr>");
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      }
      out.push(`<blockquote>${renderInline(escapeHtml(buf.join(" ")), ctx)}</blockquote>`);
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, ""));
      }
      const tag = ordered ? "ol" : "ul";
      out.push(
        `<${tag}>${items
          .map((t) => `<li>${renderInline(escapeHtml(t), ctx)}</li>`)
          .join("")}</${tag}>`,
      );
      continue;
    }

    para.push(line.trim());
    i++;
  }

  flush();
  return out.join("\n");
}

// ---------- 读取笔记 ----------

function splitFrontmatter(raw) {
  let body = raw.replace(/\r\n/g, "\n");
  const meta = {};
  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = body.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (m) meta[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return { meta, body };
}

function readNotes() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`找不到笔记目录：${POSTS_DIR}`);
    process.exit(1);
  }
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const { meta, body } = splitFrontmatter(fs.readFileSync(path.join(POSTS_DIR, f), "utf8"));
      const slug = f.replace(/\.md$/, "");
      const links = [...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1].trim());
      return {
        slug,
        title: meta.title || slug,
        date: meta.date || "",
        updated: meta.updated || "",
        tags: meta.tags
          ? meta.tags
              .split(/[,，]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        draft: /^(true|yes|1)$/i.test(meta.draft || ""),
        body,
        links,
      };
    })
    .filter((n) => !n.draft)
    .sort(
      (a, b) =>
        (b.updated || b.date).localeCompare(a.updated || a.date) || a.slug.localeCompare(b.slug),
    );
}

// ---------- 页面骨架 ----------

const NAV = [
  ["index.html", "全部笔记"],
  ["tags/index.html", "主题"],
  ["archive.html", "归档"],
  ["search.html", "搜索"],
];

function layout({ title, description, body, base = "", nav = "index.html" }) {
  const navHtml = NAV.map(
    ([href, label]) =>
      `<a href="${base}${href}"${href === nav ? ' class="active"' : ""}>${label}</a>`,
  ).join("");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="${base}assets/style.css">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.title)}" href="${base}feed.xml">
</head>
<body>
<div class="wrap">
  <header class="site-header">
    <div class="brand">
      <a class="site-title" href="${base}index.html">${escapeHtml(SITE.title)}</a>
      <p class="site-desc">${escapeHtml(SITE.description)}</p>
    </div>
    <nav class="site-nav">${navHtml}</nav>
  </header>
  <main>
${body}
  </main>
  <footer class="site-footer">
    <span>© ${new Date().getFullYear()} ${escapeHtml(SITE.author)}</span>
    <span>${COUNT} 篇笔记 · <a href="${base}feed.xml">RSS</a></span>
  </footer>
</div>
</body>
</html>
`;
}

const tagChips = (tags, base = "") =>
  tags.length
    ? `<span class="tags">${tags
        .map(
          (t) =>
            `<a class="tag" href="${base}tags/${encodeURIComponent(tagFile(t))}.html">${escapeHtml(t)}</a>`,
        )
        .join("")}</span>`
    : "";

const dateLine = (n) => {
  const parts = [];
  if (n.date) parts.push(`<time>${escapeHtml(n.date)}</time>`);
  if (n.updated && n.updated !== n.date)
    parts.push(`<span class="updated">更新于 ${escapeHtml(n.updated)}</span>`);
  return parts.join("");
};

// ---------- 生成 ----------

function build() {
  const notes = readNotes();
  COUNT = notes.length;

  // 标题 → 文件名，供 [[双链]] 解析
  const byTitle = new Map();
  const bySlug = new Map();
  for (const n of notes) {
    bySlug.set(n.slug, n.slug);
    bySlug.set(n.slug.toLowerCase(), n.slug);
    byTitle.set(n.title, n.slug);
    byTitle.set(n.title.toLowerCase(), n.slug);
  }
  const resolve = (target) =>
    byTitle.get(target) ??
    byTitle.get(target.toLowerCase()) ??
    bySlug.get(target) ??
    bySlug.get(target.toLowerCase()) ??
    null;

  // 渲染正文
  for (const n of notes) {
    n.toc = [];
    n.html = markdownToHtml(n.body, { resolve, base: "../", toc: n.toc });
    const firstLine =
      n.body
        .replace(/```[\s\S]*?```/g, " ")
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !/^#{1,6}\s/.test(l)) || n.title;
    n.summary = stripMd(firstLine);
  }

  // 反向链接：谁提到了我
  const backlinks = new Map(notes.map((n) => [n.slug, []]));
  for (const n of notes) {
    for (const target of n.links) {
      const slug = resolve(target);
      if (slug && slug !== n.slug) backlinks.get(slug)?.push(n);
    }
  }

  // 主题 → 笔记
  const byTag = new Map();
  for (const n of notes) {
    for (const t of n.tags) {
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t).push(n);
    }
  }
  const sortedTags = [...byTag.keys()].sort(
    (a, b) => byTag.get(b).length - byTag.get(a).length || a.localeCompare(b, "zh"),
  );

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT_DIR, "posts"), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, "tags"), { recursive: true });
  fs.cpSync(ASSETS_DIR, path.join(OUT_DIR, "assets"), { recursive: true });

  const write = (rel, html) => fs.writeFileSync(path.join(OUT_DIR, rel), html);

  // 首页
  const cloud = sortedTags
    .map(
      (t) =>
        `<a class="cloud-item" href="tags/${encodeURIComponent(tagFile(t))}.html">${escapeHtml(t)}<span class="count">${byTag.get(t).length}</span></a>`,
    )
    .join("");
  const list = notes
    .map(
      (n) => `    <article class="note-item">
      <h2><a href="posts/${n.slug}.html">${escapeHtml(n.title)}</a></h2>
      <p class="meta">${dateLine(n)} ${tagChips(n.tags)}</p>
      <p class="summary">${escapeHtml(n.summary)}</p>
    </article>`,
    )
    .join("\n");
  write(
    "index.html",
    layout({
      title: SITE.title,
      description: SITE.description,
      body: `    <section class="cloud">
      <p class="section-title">按主题翻</p>
      <div class="cloud-items">${
        cloud || '<span class="hint">还没有主题标签。</span>'
      }</div>
    </section>
    <section class="note-list">
      <p class="section-title">最近更新</p>
${
  list ||
  '      <p class="hint">还没有笔记。试试 <code>node new.js flex-layout "Flex 布局速查" 前端,CSS</code></p>'
}
    </section>`,
    }),
  );

  // 每篇笔记
  for (const n of notes) {
    const back = backlinks.get(n.slug) || [];
    const related = notes
      .filter((o) => o.slug !== n.slug && o.tags.some((t) => n.tags.includes(t)))
      .sort((a, b) => (b.updated || b.date).localeCompare(a.updated || a.date))
      .slice(0, SITE.relatedLimit);

    const tocHtml =
      n.toc.length >= 3
        ? `      <nav class="toc">
        <p class="toc-title">本篇目录</p>
        <ul>${n.toc
          .map(
            (t) =>
              `<li class="lvl-${t.level}"><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`,
          )
          .join("")}</ul>
      </nav>`
        : "";

    const footerBlocks = [];
    if (back.length) {
      footerBlocks.push(`      <section class="note-block">
        <p class="section-title">哪些笔记提到了它</p>
        <ul class="link-list">${back
          .map((b) => `<li><a href="${b.slug}.html">${escapeHtml(b.title)}</a></li>`)
          .join("")}</ul>
      </section>`);
    }
    if (related.length) {
      footerBlocks.push(`      <section class="note-block">
        <p class="section-title">同主题笔记</p>
        <ul class="link-list">${related
          .map((r) => `<li><a href="${r.slug}.html">${escapeHtml(r.title)}</a></li>`)
          .join("")}</ul>
      </section>`);
    }
    if (!n.tags.length) {
      footerBlocks.push(
        `      <p class="hint">这篇还没打主题标签，加一行 <code>tags: 前端, CSS</code> 就会出现在主题页里。</p>`,
      );
    }

    write(
      `posts/${n.slug}.html`,
      layout({
        title: `${n.title} · ${SITE.title}`,
        description: n.summary,
        base: "../",
        nav: "",
        body: `    <article class="post">
      <h1>${escapeHtml(n.title)}</h1>
      <p class="meta">${dateLine(n)} ${tagChips(n.tags, "../")}</p>
${tocHtml}
${n.html}
    </article>
    <div class="note-footer">
${footerBlocks.join("\n")}
      <p class="back"><a href="../index.html">← 回到全部笔记</a></p>
    </div>`,
      }),
    );
  }

  // 主题总览
  write(
    "tags/index.html",
    layout({
      title: `主题 · ${SITE.title}`,
      description: "按主题浏览全部笔记",
      base: "../", // 这一页在 tags/ 子目录里，链接都要往上一层
      nav: "tags/index.html",
      body: `    <h1 class="page-title">主题</h1>
${
  sortedTags
    .map(
      (t) => `    <section class="tag-group">
      <h2><a href="${encodeURIComponent(tagFile(t))}.html">${escapeHtml(t)}</a> <span class="count">${byTag.get(t).length}</span></h2>
      <ul class="link-list">${byTag
        .get(t)
        .map((n) => `<li><a href="../posts/${n.slug}.html">${escapeHtml(n.title)}</a></li>`)
        .join("")}</ul>
    </section>`,
    )
    .join("\n") || '    <p class="hint">还没有主题标签。</p>'
}`,
    }),
  );

  // 单个主题
  for (const t of sortedTags) {
    const tagNotes = byTag.get(t);
    write(
      `tags/${tagFile(t)}.html`,
      layout({
        title: `${t} · ${SITE.title}`,
        description: `${t} 主题下的 ${tagNotes.length} 篇笔记`,
        base: "../",
        nav: "tags/index.html",
        body: `    <h1 class="page-title">${escapeHtml(t)}</h1>
    <p class="meta">${tagNotes.length} 篇笔记 · <a href="index.html">全部主题</a></p>
${tagNotes
  .map(
    (n) => `    <article class="note-item">
      <h2><a href="../posts/${n.slug}.html">${escapeHtml(n.title)}</a></h2>
      <p class="meta">${dateLine(n)}</p>
      <p class="summary">${escapeHtml(n.summary)}</p>
    </article>`,
  )
  .join("\n")}`,
      }),
    );
  }

  // 归档
  const byYear = new Map();
  for (const n of notes) {
    const year = (n.date || "未标日期").slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(n);
  }
  write(
    "archive.html",
    layout({
      title: `归档 · ${SITE.title}`,
      description: "按时间回看写过的笔记",
      nav: "archive.html",
      body: `    <h1 class="page-title">归档</h1>
${[...byYear.keys()]
  .sort((a, b) => b.localeCompare(a))
  .map(
    (y) => `    <section class="archive-year">
      <h2>${escapeHtml(y)} <span class="count">${byYear.get(y).length}</span></h2>
      <ul class="link-list">${byYear
        .get(y)
        .map(
          (n) =>
            `<li><span class="date">${escapeHtml(n.date || "—")}</span> <a href="posts/${n.slug}.html">${escapeHtml(n.title)}</a></li>`,
        )
        .join("")}</ul>
    </section>`,
  )
  .join("\n")}`,
    }),
  );

  // 搜索页
  write(
    "search.html",
    layout({
      title: `搜索 · ${SITE.title}`,
      description: "在自己的笔记里搜东西",
      nav: "search.html",
      body: `    <h1 class="page-title">搜索</h1>
    <form class="search-form" id="search-form" role="search">
      <input id="q" name="q" type="search" placeholder="搜标题、主题、正文……" autocomplete="off" autofocus>
    </form>
    <p class="hint" id="hint">多个词用空格分隔，需要全都出现。例如：<code>布局 居中</code></p>
    <ul class="results" id="results"></ul>
    <script src="assets/search.js"></script>`,
    }),
  );

  // 404：任何静态托管（Cloudflare Pages / GitHub Pages / Netlify）都会自动用它
  write(
    "404.html",
    layout({
      title: `页面不存在 · ${SITE.title}`,
      description: "这个地址没有对应的页面",
      body: `    <h1 class="page-title">这里没有东西</h1>
    <p>地址可能写错了，也可能是这篇笔记改了文件名。</p>
    <p class="hint">可以去 <a href="index.html">全部笔记</a> 或 <a href="search.html">搜索</a> 找找看。</p>`,
    }),
  );

  // GitHub Pages 用它跳过 Jekyll 处理，避免下划线开头的文件被吃掉
  fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "");

  // 搜索索引
  fs.writeFileSync(
    path.join(OUT_DIR, "search.json"),
    JSON.stringify(
      notes.map((n) => ({
        title: n.title,
        slug: n.slug,
        url: `posts/${n.slug}.html`,
        date: n.date,
        tags: n.tags,
        text: stripMd(n.body.replace(/```[\s\S]*?```/g, " ")).slice(0, 6000),
      })),
    ),
  );

  // RSS
  const items = notes
    .slice(0, 30)
    .map(
      (n) => `    <item>
      <title>${escapeHtml(n.title)}</title>
      <link>${SITE.url.replace(/\/$/, "")}/posts/${n.slug}.html</link>
      <guid>${SITE.url.replace(/\/$/, "")}/posts/${n.slug}.html</guid>
      <pubDate>${n.date ? new Date(n.date).toUTCString() : new Date().toUTCString()}</pubDate>
      <description>${escapeHtml(n.summary)}</description>
    </item>`,
    )
    .join("\n");
  fs.writeFileSync(
    path.join(OUT_DIR, "feed.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(SITE.title)}</title>
    <link>${SITE.url}</link>
    <description>${escapeHtml(SITE.description)}</description>
${items}
  </channel>
</rss>
`,
  );

  console.log(`已生成 ${notes.length} 篇笔记 → ${path.relative(process.cwd(), OUT_DIR)}`);
  for (const n of notes) {
    console.log(`  · ${n.date || "无日期"}  ${n.title}${n.tags.length ? `  [${n.tags.join(", ")}]` : ""}`);
  }
  if (sortedTags.length) console.log(`主题：${sortedTags.join("、")}`);
}

build();
