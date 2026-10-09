---
title: Flex 布局速查
date: 2026-10-09
tags: 前端, CSS
---

一行 `display: flex` 就能解决大部分「怎么对齐」的问题，但主轴和交叉轴老是记混。

## 一句话总结

`justify-content` 管主轴，`align-items` 管交叉轴；谁的方向取决于 `flex-direction`。

## 核心内容

- `display: flex` 让子元素变成「弹性项目」，默认横向排列
- `flex-direction: column` 会把主轴改成纵向，此时 `justify-content` 就变成管上下
- `justify-content`：主轴上的分布（`flex-start` / `center` / `space-between` / `space-around`）
- `align-items`：交叉轴上的对齐（`stretch` / `center` / `flex-start`）
- `flex: 1` 是 `flex-grow:1; flex-shrink:1; flex-basis:0%` 的简写，常用来自动平分宽度
- `gap` 控制间距，比用 margin 干净得多

## 例子

```css
/* 居中：最常用的两行 */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 左右两端：左边标题，右边按钮 */
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

/* 侧边栏固定 + 内容占满剩余宽度 */
.layout { display: flex; }
.sidebar { width: 220px; flex: none; }
.content { flex: 1; min-width: 0; } /* min-width:0 防止内容把布局撑破 */
```

## 我踩过的坑

- 纵向排列时忘了 `justify-content` 的意思会变，还在纠结为什么没居中
- 长文本（比如一段代码、一个长链接）会把 flex 子项撑破，加 `min-width: 0` 才治得住
- 老的 `align-content` 只在多行（`flex-wrap: wrap`）时才有意义，单行没效果

## 相关

- [[Git 常用命令速查]]
