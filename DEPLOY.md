# 上线操作清单

目标：让这个博客有一个能发给别人的地址。全程不用买服务器，用免费托管即可。

三条路，按省事程度排。**想最快看到链接，直接走方案 A。**

---

## 方案 A：Cloudflare Pages 直接上传（最快，约 2 分钟，不需要 Git）

1. 打开 https://dash.cloudflare.com/sign-up ，用邮箱注册（免费，不需要信用卡，不需要域名）。
2. 登录后左侧找 **Workers & Pages** → **Create** → 选 **Pages** → **Upload assets**。
3. 项目名填一个，比如 `my-notes`。这个名字会变成你的网址：`https://my-notes.pages.dev`。
4. 把 `dist` 文件夹整个拖进上传框（或用同目录下打包好的 `blog-site.zip`）。
5. 点 **Deploy**，几秒后就会给你一个 `https://xxx.pages.dev` 的地址。

这个地址就是你的专属链接，手机、别人电脑都能打开，HTTPS 自动配好。

缺点：以后写新笔记要重新上传一次。想省掉这一步就看方案 B 或 C。

---

## 方案 B：GitHub 仓库 + 自动部署（推荐长期使用，已配置好）

仓库里的 `.github/workflows/deploy.yml` 已经写好，推代码就自动发布。

1. 注册 GitHub：https://github.com/signup
2. 新建仓库：https://github.com/new
   - 名字填 `my-blog`（会变成网址的一部分）
   - 选 **Public**（免费账号的 Pages 只对公开仓库开放）
   - 不要勾选 Add README / .gitignore，保持空仓库
3. 在本机执行（把 `你的用户名` 换掉）：

   ```powershell
   cd C:\Users\lenovo\Documents\Codex\2026-10-09\wo-2\outputs\blog
   git remote add origin https://github.com/你的用户名/my-blog.git
   git push -u origin main
   ```

   第一次会弹出浏览器让你登录 GitHub 授权。

4. 回到仓库页面 → **Settings** → 左侧 **Pages** → Source 选 **GitHub Actions**。
5. 等一两分钟，Actions 跑完，地址是：`https://你的用户名.github.io/my-blog/`

以后写完笔记只要：

```powershell
git add .
git commit -m "新增：某某笔记"
git push
```

---

## 方案 C：Cloudflare Pages 连接 Git 仓库（自动部署，且支持私有仓库）

和方案 B 一样先建一个 GitHub 仓库并 push，然后在 Cloudflare：

**Workers & Pages** → **Create** → **Pages** → **Connect to Git** → 选你的仓库，
构建命令填 `node build.js`，输出目录填 `dist`。之后每次 push 自动重新发布。

好处是仓库可以是 **Private**（笔记源码不公开，只有生成出来的网页公开）。

---

## 上线之后建议改一下「网站地址」

生成 RSS 时需要一个绝对地址，现在默认是占位的 `https://example.com`。两种改法：

- 改 `build.js` 最上面的 `SITE.url` 为你的真实地址；
- 或者在托管平台里加一个环境变量 `SITE_URL=https://你的地址`，这样不用动代码。

改完重新构建（本地 `node build.js`，或平台会自动重建）。

---

## 换成自己的域名（可选，之后随时能加）

买域名（约 30–90 元/年）之后：

- **Cloudflare Pages**：项目 → **Custom domains** → 输入域名 → 按提示去域名服务商加一条 CNAME 记录。HTTPS 自动签发。
- **GitHub Pages**：仓库 → Settings → Pages → **Custom domain** 填域名，并在域名服务商加 CNAME 记录指向 `你的用户名.github.io`。

价格以注册商报价为准，常见后缀（`.com`）通常几十元一年，`.top` / `.xyz` 之类更便宜。

---

## 两个要知道的现实问题

**国内访问速度。** GitHub Pages 和 Cloudflare Pages 在国内都可能时快时慢。想要国内稳定又快、并且绑自己的域名，需要用国内云（腾讯云 EdgeOne、阿里云 OSS 等），那时**自定义域名必须 ICP 备案**，需要国内云资源，流程约 1–3 周。用境外托管则完全不需要备案。

**公开范围。** GitHub 免费账号的 Pages 要求仓库公开，也就是说笔记的源码文件别人也能看到（博客内容本来就是公开的，问题不大）。如果在意，用方案 C 配私有仓库，或者用方案 A 直接上传（不上传源码）。
