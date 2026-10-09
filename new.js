#!/usr/bin/env node
/**
 * 命令行新建一篇笔记
 *
 *   node new.js flex-layout "Flex 布局速查" 前端,CSS
 *
 * 第 1 个参数是文件名（也就是网址），第 2 个是标题，第 3 个是主题标签。
 */
import path from "node:path";
import { createNote, isValidName, noteExists } from "./note.js";

const [name, title, tags] = process.argv.slice(2);

if (!name || name === "-h" || name === "--help") {
  console.log(`用法：
  node new.js <文件名> [标题] [标签]

例子：
  node new.js flex-layout "Flex 布局速查" 前端,CSS

文件名决定网址，建议用英文或拼音，例如 flex-layout。
标签用逗号分隔，可以不写，之后在文件里补也行。

不想敲命令，就双击「写新笔记.cmd」，会一步步问你。`);
  process.exit(name ? 0 : 1);
}

if (!isValidName(name)) {
  console.error(`文件名不能包含空格或这些符号： \\ / : * ? " < > |`);
  process.exit(1);
}

if (noteExists(name)) {
  console.error(`已经存在：${path.join("content", "posts", `${name}.md`)}`);
  console.error("想接着写就把它打开，或者换个文件名。");
  process.exit(1);
}

const file = createNote({
  name,
  title,
  tags: (tags || "").split(/[,，]/).map((t) => t.trim()).filter(Boolean),
});

console.log(`已创建 ${path.relative(process.cwd(), file)}`);
console.log("写完后双击「发布上线.cmd」，或者运行： node build.js");
