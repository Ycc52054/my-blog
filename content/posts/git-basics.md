---
title: Git 常用命令速查
date: 2026-10-06
tags: 工具, Git
---

日常真正会敲的 Git 命令其实就那么几条，剩下的用到再查。

## 一句话总结

Git 记录的是「文件的快照」，`commit` 是提交快照，`branch` 只是指向某个快照的便利贴。

## 核心内容

- 工作区 → 暂存区 → 仓库：`git add` 然后 `git commit`
- 看状态永远先 `git status`，它能告诉你现在该干什么
- `git switch -c 分支名` 建分支（老写法是 `git checkout -b`）
- `git log --oneline --graph` 看历史最省事
- `git diff` 看未暂存的改动，`git diff --staged` 看已暂存的
- 撤销：`git restore 文件` 丢弃工作区改动，`git restore --staged 文件` 取消暂存
- 提交信息写「为什么改」比写「改了什么」有用，因为改了什么看 diff 就知道

## 例子

```bash
# 从零到提交
git init
git add .
git commit -m "初始化：整理学习笔记结构"

# 一边写一边看
git status
git diff
git add content/posts/flex-layout.md
git commit -m "补上 Flex 居中的例子"

# 开个分支试新想法，坏了就扔
git switch -c try-search
git switch main
git branch -D try-search
```

> 提交前先 `git status` 看一眼，比后悔省钱。

## 我踩过的坑

- `git add .` 之前没看 `.gitignore`，把 `dist/`、`node_modules/` 一起提交了
- 在错误的分支上提交，切来切去把自己绕晕，最后用 `git cherry-pick` 救回来

## 相关

- [[数据库索引为什么快]]
