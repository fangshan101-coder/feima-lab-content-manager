# feima-lab-content-manager

把纯文本/自然语言文档转成 [feima-lab](https://github.com/fangshan101-coder/feima-lab) 博客样式的 MDX 文章，生成零依赖 preview.html 本地预览。

**Claude Code Skill** · 中文

## 能做什么

- 自然语言输入 → feima-lab 样式 MDX 文章
- 本地浏览器像素级 + 交互可用预览（file:// 协议，零依赖）
- 自动本地化图片（下载 URL / 拷贝本地）
- 元数据管理（title / author / category / tags / coverImage）
- 分级工作流：短文一把生成，长文先出结构提案

## 支持的组件

Callout · CodeTabs · Collapse · CompareCard · Timeline · ImageCarousel · Playground

七种 feima-lab 自定义 MDX 组件，像素级还原样式 + 交互。

## 安装

克隆到 Claude Code 的 skills 目录即可（零依赖，开箱即用）：

    cd ~/.claude/skills
    git clone git@github.com:fangshan101-coder/feima-lab-content-manager.git

**不需要 `npm install`**——`scripts/render.mjs` 是预打包的自包含文件，所有 MDX 解析依赖（unified / remark / mdast / hast）都已内联。唯一要求是 Node ≥ 18。

## 使用

在 Claude Code 中自然语言触发：

- "把这段文字整成 feima-lab 样式"
- "帮我写一篇 feima-lab 博客，主题是 XXX"
- "编写 feima-lab 文章"

## 产出结构

    posts/2026-04-09-my-post/
    ├── source.md          # 非 md 输入时生成的中间稿
    ├── article.mdx        # 带组件的最终文章
    ├── preview.html       # 零依赖本地预览
    ├── images/            # 本地化的图片
    └── meta.json          # 文章元数据

## 版本

1.0.0 —— 首版，支持本地预览与元数据管理。下一版本将支持一键发布到 feima-lab 后端。

## 开发

源码位于 `src/`（`src/render.mjs` + `src/lib/*`）。`scripts/render.mjs` 是通过 esbuild 预打包的自包含输出——**用户侧不需要这些源码**，它们只对维护者有用。

    # 开发时：安装 devDependencies，跑测试
    npm install
    npm test

    # 修改源码后：重新打包 scripts/render.mjs
    npm run build

    # 检测 feima-lab 源码是否漂移（maintainer-only，需要本地有 feima-lab 仓库）
    npm run drift

## License

MIT
