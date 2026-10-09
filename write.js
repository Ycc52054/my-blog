#!/usr/bin/env node
// 问答式新建笔记：双击「写新笔记.cmd」会跑这个
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { ROOT, createNote, isValidName, noteExists, notePath, today } from "./note.js";

const NO_EDITOR = process.env.BLOG_NO_EDITOR === "1"; // 测试时跳过打开编辑器

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// 自己缓冲输入：这样「人一行行敲」和「多行一次性灌进来」都不会丢行。
// 输入结束时用 null 表示「没有更多输入了」。
const waiting = [];
const buffered = [];
let inputEnded = false;

rl.on("line", (line) => {
  const resolve = waiting.shift();
  if (resolve) resolve(line.trim());
  else buffered.push(line.trim());
});

rl.on("close", () => {
  inputEnded = true;
  while (waiting.length) waiting.shift()(null); // 提前结束输入：交给调用处决定怎么办
});

const ask = (question) =>
  new Promise((resolve) => {
    process.stdout.write(question);
    if (buffered.length) resolve(buffered.shift());
    else if (inputEnded) resolve(null);
    else waiting.push(resolve);
  });

/** 输入中途断了（或按了 Ctrl+D）：不要稀里糊涂建文件或发布 */
const abortIfEnded = (value, what) => {
  if (value !== null) return value;
  console.log(`\n\n输入结束了（${what} 没回答），什么都没有做。`);
  console.log("想重新来一次，就再双击一次「写新笔记.cmd」。");
  process.exit(0);
};

console.log("");
console.log("========== 写一篇新笔记 ==========");
console.log("直接回车就用方括号里的默认值；想中途放弃，按 Ctrl+C。");
console.log("");

// 1. 文件名
let name = "";
let existed = false;

while (!name) {
  const answer = abortIfEnded(
    await ask(`① 文件名（英文或拼音，它会变成网址）[note-${today()}]: `),
    "文件名",
  );
  const candidate = answer || `note-${today()}`;

  if (!isValidName(candidate)) {
    console.log('   这个名字里有空格或 \\ / : * ? " < > | 这些符号，换一个。');
    continue;
  }
  if (noteExists(candidate)) {
    console.log(`   已经有一篇 ${candidate}.md 了 —— 那就打开它继续写。`);
    existed = true;
  }
  name = candidate;
}

// 2. 已有的话不再改标题，直接打开
let title = name;
let tags = [];

if (!existed) {
  const answerTitle = abortIfEnded(await ask(`② 标题（可以写中文）[${name}]: `), "标题");
  title = answerTitle || name;

  const answerTags = abortIfEnded(
    await ask("③ 主题标签（逗号分隔，可留空，例如 前端,CSS）: "),
    "标签",
  );
  tags = answerTags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const file = existed ? notePath(name) : createNote({ name, title, tags });
const shown = path.relative(ROOT, file);

if (existed) {
  console.log(`\n打开已有的笔记：${shown}`);
} else {
  console.log(`\n已经建好：${shown}`);
  console.log(`  标题：${title}`);
  console.log(`  标签：${tags.length ? tags.join("、") : "（没填，之后也可以在文件里补）"}`);
}

// 3. 用编辑器打开，等它关掉
function findEditor() {
  const candidates = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs", "Microsoft VS Code", "Code.exe"),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Microsoft VS Code", "Code.exe"),
  ].filter(Boolean);

  for (const exe of candidates) {
    if (fs.existsSync(exe)) return { label: "VS Code", exe, args: ["--wait", file] };
  }
  return { label: "记事本", exe: "notepad.exe", args: [file] };
}

if (NO_EDITOR) {
  console.log("\n（测试模式：跳过打开编辑器）");
} else {
  const editor = findEditor();
  console.log(`\n用 ${editor.label} 打开，写完之后把它关掉（VS Code 是关掉这个标签页）。`);
  console.log("等你……");
  spawnSync(editor.exe, editor.args, { stdio: "inherit" });
}

// 4. 问要不要发布
const answer = await ask("\n现在发布到线上吗？(直接回车 = 发布，输入 n = 先不发布): ");
rl.close();

if (answer === null || /^n/i.test(answer)) {
  console.log("\n好，先不发布。想发布的时候双击「发布上线.cmd」就行。");
  console.log("想先在本地看效果，双击「本地预览.cmd」。");
  process.exit(0);
}

console.log("");
const publish = spawnSync(process.execPath, [path.join(ROOT, "publish.js")], {
  cwd: ROOT,
  stdio: "inherit",
});
process.exit(publish.status ?? 0);
