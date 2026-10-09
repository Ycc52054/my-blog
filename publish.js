#!/usr/bin/env node
// 一键发布：生成网页 → 提交 → 推送（GitHub Actions 会自动重新部署）
// 用法：
//   node publish.js
//   node publish.js "新增：Flex 布局速查"
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const today = new Date().toLocaleDateString("sv-SE");
const message = process.argv.slice(2).join(" ").trim() || `更新笔记 ${today}`;

const git = (args, options = {}) =>
  spawnSync("git", args, { cwd: ROOT, encoding: "utf8", shell: false, ...options });

// 1. 先本地生成一遍，写错了就在这里暴露，不会把坏内容推上去
console.log("① 生成网页……");
const build = spawnSync(process.execPath, [path.join(ROOT, "build.js")], {
  cwd: ROOT,
  stdio: "inherit",
});
if (build.status !== 0) {
  console.error("\n生成失败，先按上面的提示修好，再重新发布。");
  process.exit(build.status ?? 1);
}

// 2. 看看有没有改动
const status = git(["status", "--porcelain"]);
if (status.status !== 0) {
  console.error("\n这里似乎不是 Git 仓库，或者 Git 不可用。");
  console.error(status.stderr?.trim() || "");
  process.exit(1);
}

if (!status.stdout.trim()) {
  console.log("\n没有检测到改动 —— 笔记内容和线上的一致，不需要发布。");
  process.exit(0);
}

console.log("\n② 本次要发布的改动：");
console.log(
  status.stdout
    .trim()
    .split("\n")
    .map((l) => "   " + l)
    .join("\n"),
);

// 3. 提交
console.log("\n③ 提交……");
const add = git(["add", "-A"], { stdio: "inherit" });
if (add.status !== 0) process.exit(add.status ?? 1);

const commit = git(["commit", "-m", message], { stdio: "inherit" });
if (commit.status !== 0) {
  console.error("\n提交失败，上面是 Git 给出的原因。");
  process.exit(commit.status ?? 1);
}

// 4. 推送
console.log("\n④ 推送到 GitHub……");
const push = git(["push"], { stdio: "inherit" });
if (push.status !== 0) {
  console.error("\n推送失败。如果提示要登录，在弹出窗口里完成授权后再双击一次。");
  process.exit(push.status ?? 1);
}

console.log("\n✅ 发布完成。等一两分钟，GitHub 会自动重新部署：");
console.log("   https://ycc52054.github.io/my-blog/");
