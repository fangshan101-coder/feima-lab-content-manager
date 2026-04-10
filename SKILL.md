---
name: feima-lab-content-manager
description: 编写 feima-lab 博客、创建 feima-lab 文章、把纯文本/自然语言/已有 md 文档转成 feima-lab 博客样式的 MDX 文章，像素级还原 7 种自定义组件（Callout/CodeTabs/Collapse/CompareCard/Timeline/ImageCarousel/Playground），生成零依赖 preview.html 可离线浏览器预览（交互可用），自动本地化图片（下载/拷贝到 images/）、管理文章元数据（title/author/category/tags/coverImage）。**支持发布到 feima-lab 后端**：保存草稿、自动上传封面图到 OSS、列出远程分类、按 slug 查询远程状态、一键发布草稿为已发布（POST /content/api/article/save / publish / upload via fenxiang-ai-brain ContentApiController）。支持分级工作流：简单文档一把生成、复杂文档先出结构提案确认再生成。触发词：编写 feima-lab 博客、feima-lab 文章、feima-lab 博客管理、feima-lab 样式、把这个整成 feima-lab、blog 写作、博客样式化、feima-lab 发布、发布到 feima-lab、推到远程、feima lab content、保存文章、上传封面图。
version: 1.1.0
---

# feima-lab 内容管家 (feima-lab-content-manager)

## 能力边界

✅ **本地构建**：
- 纯文本/已 md 输入 → 生成符合 feima-lab 样式的 article.mdx
- 本地像素级 + 交互可用的 preview.html（零依赖，file:// 协议直接打开）
- 图片本地化（下载 URL 图 / 拷贝本地图到 `posts/<slug>/images/`）
- 文章元数据管理（meta.json）
- 分级工作流（简单/复杂）

✅ **远程 API（v1.1）**—— 通过 fenxiang-ai-brain ContentApiController：
- 列出后端分类（自动做 `category 名字 → categoryId` 映射）
- 上传图片到 OSS（支持任意文件，save 时自动上传封面图）
- 保存文章草稿（创建或更新）
- 按 slug 查询远程文章详情
- 发布草稿为已发布状态

❌ **不做**：
- PDF/Word/飞书等结构化文档解析（交给其他 skill 先转成 md 或纯文本）
- 样式定制（样式唯一来源是 `references/feima-style-snapshot.json`）
- 取消发布 / 删除文章（v2 能力，防止误操作）
- tag 自动查询/创建（v1.1 `meta.tags` 字段上传时被忽略，v2 再加）
- 本地 ↔ 远程自动 diff / sync

## 前置条件

**零 npm 依赖**——开箱即用，不需要 `npm install`。

- `scripts/render.mjs` 是预打包的自包含文件（包含 unified/remark/mdast/hast 等所有 MDX 解析依赖）
- `scripts/new-post.mjs` / `scripts/image-localize.mjs` / `scripts/api/*` 只用 Node 18+ 内置 API（fetch / FormData / Blob 等）

**唯一环境要求**：Node ≥ 18。

**调用远程 API 的额外要求**：必须设置环境变量 `FX_AI_API_KEY`。用户在 shell 中执行：

    export FX_AI_API_KEY=<your-key>

从 https://platform.fenxiang-ai.com/ 登录后获取。**key 不要写入 MEMORY.md 或任何持久化位置**——让用户在 shell 自己管理。

如果只用本地构建能力（render / new-post / image-localize），不需要设置这个 env var。

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

### 本地构建（无需 API Key）

    # 创建文章骨架
    node scripts/new-post.mjs --slug <slug> [--cwd <dir>]

    # 图片本地化 + 原位改写 mdx 路径
    node scripts/image-localize.mjs <posts/<slug>>

    # MDX → preview.html（打印路径到 stdout）
    node scripts/render.mjs <posts/<slug>>/article.mdx

### 远程 API（需要 `FX_AI_API_KEY` 环境变量）

    # 列出后端分类（首次建文章要看有哪些 category 可选）
    node scripts/api/list-categories.mjs [--format json|table]

    # 上传单个文件到 OSS（save-article 内部会自动调用）
    node scripts/api/upload-file.mjs --file <path>

    # 按 slug 查询远程文章（编辑前拉状态 / 发布后确认）
    node scripts/api/get-article.mjs --slug <slug>
    node scripts/api/get-article.mjs --post-dir <posts/slug>

    # 保存文章草稿（自动查 categoryId + 自动上传 coverImage）
    node scripts/api/save-article.mjs --post-dir <posts/slug>
    node scripts/api/save-article.mjs --post-dir <posts/slug> --dry-run

    # 发布（草稿 → 已发布）
    node scripts/api/publish-article.mjs --post-dir <posts/slug>
    node scripts/api/publish-article.mjs --id <articleId>
    node scripts/api/publish-article.mjs --slug <slug>

所有脚本均为 Node.js `.mjs`，跨平台（macOS/Linux/Windows 均可）。

### API 路由表

| 用户意图 | 脚本 | 前置 Read |
|---|---|---|
| "发布这篇文章" / "推到 feima-lab" / "上线" | save-article → publish-article 串行 | `references/api-publish-workflow.md` |
| "更新已发布的文章" / "重新推" | save-article（mode 自动识别为 update） | 同上 |
| "这篇在远程是什么状态" / "查远程版本" | get-article | 同上 |
| "我不知道填哪个 category" / "看看所有分类" | list-categories --format table | 同上 |
| "只想上传封面图/图片，不发文章" | upload-file --file `<path>` | 同上 |
| "API 报错了，怎么处理" | （查 stderr 的 error_type） | `references/api-error-handling.md` |

**强制规则**：
- 调用 API 脚本前**必须 Read** `references/api-publish-workflow.md` 和 `references/api-error-handling.md`（按需）
- 如果 stderr 返回 `{"error_type": "missing_api_key"}` → 立刻停下告诉用户设 env var，**禁止**自动把 key 写 MEMORY.md
- save-article 和 publish-article 的结果（articleId / published_at）会自动回写 meta.json，**不要手工修改** `publish.remote_id` / `publish.published_at`

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

### 运行时错误 — API 脚本（scripts/api/*）

所有 API 脚本的错误都是一行 JSON 到 **stderr**，格式：

    {"status":"error","error_type":"<type>","message":"...","suggestion":"..."}

关键 `error_type`：

| 类型 | 快速处理 |
|---|---|
| `missing_api_key` | 停下，让用户 `export FX_AI_API_KEY=...` |
| `invalid_meta` | 按 message 补全 meta.json 重试 |
| `file_not_found` | 按 suggestion 跑前置脚本（new-post / image-localize） |
| `api_unavailable` | 最多重试 1 次，仍失败则停下 |
| `api_error` | 读 message 按后端提示改输入 |
| `not_found`（仅 get-article，exit 2） | 不是错，说明后端没这篇，换 save 路径 |

详细处理 Read `references/api-error-handling.md`。

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
