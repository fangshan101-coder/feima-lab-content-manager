---
name: feima-lab-content-manager
description: 编写 feima-lab 博客、创建 feima-lab 文章、把纯文本/自然语言/已有 md 文档转成 feima-lab 博客样式的 MDX 文章，像素级还原 7 种自定义组件（Callout/CodeTabs/Collapse/CompareCard/Timeline/ImageCarousel/Playground），生成零依赖 preview.html 可离线浏览器预览（交互可用），自动本地化图片（下载/拷贝到 images/）、管理文章元数据（title/author/category/tags/coverImage）。支持分级工作流：简单文档一把生成、复杂文档先出结构提案确认再生成。下一版本将支持一键发布到 feima-lab 后端。触发词：编写 feima-lab 博客、feima-lab 文章、feima-lab 博客管理、feima-lab 样式、把这个整成 feima-lab、blog 写作、博客样式化、feima-lab 发布、feima lab content。
version: 1.0.0
---

# feima-lab 内容管家 (feima-lab-content-manager)

## 能力边界

✅ **做**：
- 纯文本/已 md 输入 → 生成符合 feima-lab 样式的 article.mdx
- 本地像素级 + 交互可用的 preview.html（零依赖，file:// 协议直接打开）
- 图片本地化（下载 URL 图 / 拷贝本地图到 `posts/<slug>/images/`）
- 文章元数据管理（meta.json）
- 分级工作流（简单/复杂）

❌ **不做**：
- PDF/Word/飞书等结构化文档解析（交给其他 skill 先转成 md 或纯文本）
- 发布到 feima-lab 后端（v2 能力）
- 样式定制（样式唯一来源是 `references/feima-style-snapshot.json`）

## 前置条件

**零依赖**——开箱即用，不需要 `npm install`。

`scripts/render.mjs` 是预打包的自包含文件（包含 unified/remark/mdast/hast 等所有依赖），
`scripts/new-post.mjs` 和 `scripts/image-localize.mjs` 只用 Node 内置 API。

**唯一要求**：Node ≥ 18（已普遍满足）。克隆 / 安装本 skill 后直接跑即可。

## User Context

本 skill 的产出依赖以下作者信息：

**读取**：填写 `meta.json` 前先 Read 本目录下的 `MEMORY.md`，存在字段直接使用。

**写入**：若 `MEMORY.md` 不存在或缺字段，引导作者提供后写入：

| 字段 | 示例 |
|---|---|
| `default_author` | 黎东 |
| `default_category` | AI 实战 |
| `default_tags` | ["Claude Code"] |
| `slug_prefix_style` | `date-kebab` (YYYY-MM-DD-xxx) |

**更新**：作者明确要求修改默认作者/分类时，更新 `MEMORY.md`。

## 工作流路由

### Step 1: 识别输入
- 纯文本（会话内粘贴的文字块）
- md 文件路径
- 混合（一段文字 + 图片路径/URL）

### Step 2: 分级判定（告知作者）

| 条件 | 归类 | 动作 |
|---|---|---|
| < 800 字 **且** 无结构信号 | 简单 | Read `references/workflow-simple.md` |
| ≥ 800 字 **或** 有结构信号 | 复杂 | Read `references/workflow-complex.md` |

**结构信号**：标题数 ≥ 3 / "步骤 1/2/3" / "对比 A vs B" / "优缺点" / "时间轴" / 图片数 ≥ 4。**任一命中即归为复杂**。

**必须告知**："识别为[简单/复杂]文档，将走 [一把生成 / 先出结构提案] 流程"，然后继续执行（不提问）。

### Step 3: 骨架创建

    node <skill-dir>/scripts/new-post.mjs --slug <YYYY-MM-DD-kebab> --cwd <作者工作目录>

### Step 4-N: 按 workflow-simple / workflow-complex 执行

详细步骤见对应 reference 文件，**按需 Read**，不预加载。

## 组件白名单

**严禁使用白名单之外的组件**：

    Callout / CodeTabs / Collapse / CompareCard / Timeline / ImageCarousel / Playground

用某个组件前 Read `references/components/<组件名小写>.md` 速查语法。

组件选择决策 Read `references/component-selection.md`。

## 脚本调用约定

    # 创建文章骨架
    node scripts/new-post.mjs --slug <slug> [--cwd <dir>]

    # 图片本地化 + 原位改写 mdx 路径
    node scripts/image-localize.mjs <posts/<slug>>

    # MDX → preview.html（打印路径到 stdout）
    node scripts/render.mjs <posts/<slug>>/article.mdx

所有脚本均为 Node.js `.mjs`，跨平台（macOS/Linux/Windows 均可）。

## 错误处理

### 环境错误
- Node < 18 → 提示作者升级 Node（render.mjs 使用 ESM + 顶层 await）

### 运行时错误 — render.mjs
| 退出码 | 含义 | 处理 |
|---|---|---|
| 1 | MDX 解析失败 | 读 stderr 定位行号，修语法后重跑 |
| 2 | 组件 props 校验失败 | Read `references/components/<组件名>.md`，按语义修 props |
| 3 | 未知组件 `<Foo>` | 立即回到 article.mdx，替换为白名单组件或退回原生 md，重跑 |

### 运行时错误 — image-localize.mjs
- 退出码 1（部分图片失败）→ 按失败清单逐张处理：
  1. URL 可访问性验证
  2. 网络问题 → 建议作者手工下载到 `images/` + 手工改 mdx
  3. 404 → 和作者确认是否删除这张图
- 退出码 2 → post 目录或 article.mdx 不存在

### 运行时错误 — new-post.mjs
- 退出码 1（目录已存在 / slug 格式错）→ 询问作者：追加/覆盖/换 slug

## 渐进式输出

每完成一步**立即告知作者**，不等全部完成再统一汇报：

1. "骨架建好了：posts/<slug>/"
2. "图片处理完成：5 张本地化，0 张失败"
3. "预览已生成：posts/<slug>/preview.html"
4. 最终汇报

## 最终汇报格式

    ✅ 文章已生成：posts/<slug>/
    📄 预览：posts/<slug>/preview.html （请在浏览器打开）
    🧩 用到的组件：Callout×2, Timeline, CodeTabs
    📊 预估阅读时间：8 分钟（1920 字，按 350 字/分钟估算）
    💡 改进建议（仅在有值得说的决策点时输出）：
       - 第 3 段"注意"包成了 Callout warning，觉得多余可告诉我回退
       - coverImage 未设置，meta.json 该字段为空

**改进建议区块按需输出**——有值得说的决策点才写，没有就省略整个区块。

## 设计参考

完整设计文档：主仓库 `docs/plans/2026-04-09-feima-lab-content-manager-design.md`
