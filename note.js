// 新建笔记的公共逻辑：new.js（命令行）和 write.js（问答式）都用它
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const POSTS_DIR = path.join(ROOT, "content", "posts");
export const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD

/** 文件名不能有空格和路径里禁止的符号 */
export const isValidName = (name) => !/[\\/:*?"<>|\s]/.test(name);

export const notePath = (name) => path.join(POSTS_DIR, `${name}.md`);
export const noteExists = (name) => fs.existsSync(notePath(name));

/** 照着模板建一篇笔记，返回文件路径 */
export function createNote({ name, title, tags = [] }) {
  const file = notePath(name);
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(
    file,
    `---
title: ${title || name}
date: ${today()}
tags: ${tags.join(",")}
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
  return file;
}
