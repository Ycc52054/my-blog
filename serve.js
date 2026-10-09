#!/usr/bin/env node
// 本地预览服务器：node serve.js 然后打开 http://localhost:4321
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const PORT = Number(process.env.PORT || 4321);
const PID_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), ".preview.pid");

// 记下自己的进程号，stop.cmd 靠它精确关闭，不会误伤别的程序
const forgetMe = () => {
  try {
    if (
      fs.existsSync(PID_FILE) &&
      fs.readFileSync(PID_FILE, "utf8").trim().startsWith(String(process.pid))
    ) {
      fs.rmSync(PID_FILE, { force: true });
    }
  } catch {
    /* 关不掉记录文件也不影响使用 */
  }
};

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    forgetMe();
    process.exit(0);
  });
}
process.on("exit", forgetMe);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".xml": "application/rss+xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, ""));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1><p>页面不存在。<a href='/'>回首页</a></p>");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.log(`端口 ${PORT} 已经有人在用了 —— 预览大概已经在运行。`);
    console.log(`直接打开： http://localhost:${PORT}`);
    console.log("");
    console.log("如果那个地址打不开，说明是别的程序占了这个端口，换个端口再试：");
    console.log(`  $env:PORT = ${PORT + 1}; node serve.js`);
    process.exit(0);
  }
  throw e;
});

server.listen(PORT, () => {
  try {
    fs.writeFileSync(PID_FILE, `${process.pid}\n${PORT}\n`);
  } catch {
    /* 写不了也不影响预览 */
  }
  console.log(`预览地址： http://localhost:${PORT}`);
  console.log("这个窗口不要关，关掉就等于关掉预览。按 Ctrl+C 停止。");

  // 双击 start.cmd 时自动打开浏览器（BLOG_NO_OPEN 用于测试时跳过）
  if (process.env.BLOG_OPEN === "1" && !process.env.BLOG_NO_OPEN) {
    spawn("cmd", ["/c", "start", "", `http://localhost:${PORT}`], {
      detached: true,
      stdio: "ignore",
    }).unref();
  }
});
