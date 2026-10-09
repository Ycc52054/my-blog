#!/usr/bin/env node
// 生成网页 + 启动本地预览（start.cmd 就是调用它）
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

console.log("正在生成网页……");
const build = spawnSync(process.execPath, [path.join(ROOT, "build.js")], {
  cwd: ROOT,
  stdio: "inherit",
});

if (build.status !== 0) {
  console.error("\n生成失败，上面的信息说明了原因。");
  process.exit(build.status ?? 1);
}

await import("./serve.js");
