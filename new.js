#!/usr/bin/env node
/**
 * 新建一篇笔记
 *
 *   node new.js flex-layout "Flex 布局速查" 前端,CSS
 *
 * 第 1 个参数是文件名（也就是网址），第 2 个是标题，第 3 个是主题标签。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(ROOT, "content", "posts");

const [name, title, tags] = process.argv.slice(2);

if (!name || name === "-h" || name === "--help") {
  console.log(`用法：
  node new.js <文件名> [标题] [标签]

例子：
  node new.js flex-layout "Flex 布局速查" 前端,CSS

文件名决定网址，建议用英文或拼音，例如 flex-layout。
标签用逗号分隔，可以不写，之后在文件里补也行。`);
  process.exit(name ? 0 : 1);
}

if (/[\\/:*?"<>|\s]/.test(name)) {
  console.error(`文件名不能包含空格或这些符号： \\ / : * ? " < > |`);
  process.exit(1);
}

const file = path.join(POSTS_DIR, `${name}.md`);
if (fs.existsSync(file)) {
  console.error(`已经存在：${path.relative(process.cwd(), file)}`);
  process.exit(1);
}

const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
const finalTitle = title || name;

fs.mkdirSync(POSTS_DIR, { recursive: true });
fs.writeFileSync(
  file,
  `---
title: ${finalTitle}
date: ${today}
tags: ${tags || ""}
---

## 一句话总结

（用一句自己的话写清楚它是什么、解决什么问题。以后回顾只看这一句。）

## 核心内容

（重点、原理、容易搞混的地方。）

## 例子

\`\`\`
（能跑起来的最小例子）
\`\`\`

## 我踩过的坑

-

## 相关

- [[另一篇笔记的标题]]
`,
);

console.log(`已创建 ${path.relative(process.cwd(), file)}`);
console.log("写完后运行： node build.js");
