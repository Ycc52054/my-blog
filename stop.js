#!/usr/bin/env node
// 关闭本地预览（stop.cmd 就是调用它）
// 只关闭 serve.js 自己记下来的那个进程，不会误伤别的程序。
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(ROOT, ".preview.pid");
const PORT = Number(process.env.PORT || 4321);

const isRunning = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
};

const nameOf = (pid) => {
  try {
    return execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(",")[0]
      .replace(/"/g, "")
      .trim();
  } catch {
    return ""; // 权限不足时查不到名字，交给下面的逻辑处理
  }
};

if (!fs.existsSync(PID_FILE)) {
  console.log("预览没有在运行（没有找到启动记录）。");
  console.log(`如果 http://localhost:${PORT} 确实打得开，那说明它是在别的窗口里启动的，`);
  console.log("回到那个黑色窗口按 Ctrl+C，或者直接关掉它就行。");
  process.exit(0);
}

const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim().split(/\s+/)[0]);

if (!Number.isInteger(pid) || pid <= 0) {
  fs.rmSync(PID_FILE, { force: true });
  console.log("启动记录的内容不对，已经清掉了。预览没有在运行。");
  process.exit(0);
}

if (!isRunning(pid)) {
  fs.rmSync(PID_FILE, { force: true });
  console.log("预览已经不在运行了（记录里的进程早就退出了），顺手清掉了记录文件。");
  process.exit(0);
}

const name = nameOf(pid);
if (name && name.toLowerCase() !== "node.exe") {
  fs.rmSync(PID_FILE, { force: true });
  console.log(`记录里的进程号 ${pid} 现在是 ${name}，不是预览服务，所以没有动它。`);
  console.log("记录文件已经清掉了，下次 start.cmd 会重新开始。");
  process.exit(0);
}

try {
  process.kill(pid, "SIGKILL"); // Windows 上等同于强制结束进程
  console.log(`已关闭预览（进程 ${pid}）。`);
  fs.rmSync(PID_FILE, { force: true });
} catch (e) {
  console.log(`关闭失败：${e.message}`);
  console.log(`可以打开任务管理器，结束那个 node.exe（进程号 ${pid}），然后再点一次 stop.cmd。`);
  console.log("（记录文件先留着，方便重试。）");
}
