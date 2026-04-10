# 发布到 feima-lab 后端的完整流程

本 skill 从 v1.1 起支持把本地 `posts/<slug>/` 推到 feima-lab 后端。下面描述的是**Claude 调用脚本的路径**——不是用户手工跑的流程，除非用户明确说"我自己跑命令"。

## 前置：API Key

调用任何 api 脚本前，shell 必须已设置 `FX_AI_API_KEY`：

    export FX_AI_API_KEY=<your-key>

从 https://platform.fenxiang-ai.com/ 登录获取。

脚本第一次调用时如果 env 缺失，会输出：

    {"status":"error","error_type":"missing_api_key",...}

此时必须停下来告诉用户设置 env 后重新运行，**不要**尝试绕过或把 key 写到 MEMORY.md。

## 完整发布路径（从零到已发布）

```
                              ┌──────────────────────────────┐
  render.mjs 成功生成           │ 本地 posts/<slug>/            │
  article.mdx + preview.html   │  ├── article.mdx              │
      ─────────────────►       │  ├── meta.json (draft)        │
                              │  ├── images/cover.webp        │
                              │  └── preview.html             │
                              └──────────────┬────────────────┘
                                             │
                               save-article.mjs --post-dir <path>
                                             │
                              ┌──────────────▼────────────────┐
                              │ 自动步骤（都在一次调用内）：     │
                              │ 1. 读 meta.json + article.mdx │
                              │ 2. 如果 categoryId 空 →        │
                              │    调 list-categories 按       │
                              │    category 名字查 id          │
                              │ 3. 如果 coverImageUrl 空 →     │
                              │    调 upload-file 上传         │
                              │    coverImage 本地路径        │
                              │ 4. POST /article/save          │
                              │ 5. 把 articleId / categoryId / │
                              │    coverImageUrl 写回         │
                              │    meta.json                  │
                              └──────────────┬────────────────┘
                                             │
                              publish-article.mjs --post-dir <path>
                                             │
                              ┌──────────────▼────────────────┐
                              │ 1. 从 meta.publish.remote_id  │
                              │    读 articleId               │
                              │ 2. POST /article/publish/{id} │
                              │ 3. meta.publish.status =      │
                              │    "published"                │
                              │    meta.publish.published_at  │
                              └───────────────────────────────┘
```

## 典型调用序列

**首次创建 + 发布**：

    node <skill>/scripts/api/save-article.mjs    --post-dir posts/2026-04-09-xxx
    # → stdout: {"articleId":123,"slug":"2026-04-09-xxx","mode":"create"}

    node <skill>/scripts/api/publish-article.mjs --post-dir posts/2026-04-09-xxx
    # → stdout: {"articleId":123,"status":"published","slug":"2026-04-09-xxx"}

**更新已发布的文章**：

    # 改动 article.mdx 或 meta.json 后
    node <skill>/scripts/api/save-article.mjs    --post-dir posts/2026-04-09-xxx
    # → mode: "update"（因为 meta.publish.remote_id 已有值）
    # 注意：update 不会自动重新发布。如果该文章原本是"已发布"状态，
    # 后端会根据 save 的逻辑决定是否需要再调 publish（v1 保持保守，
    # 让 Claude 显式决定是否要再次 publish）

**只想看远程状态**：

    node <skill>/scripts/api/get-article.mjs --post-dir posts/2026-04-09-xxx
    # 或
    node <skill>/scripts/api/get-article.mjs --slug 2026-04-09-xxx

**列出所有分类**（首次建文章时用）：

    node <skill>/scripts/api/list-categories.mjs --format table
    # 输出：id / categoryName / description

## 路由建议（Claude 决策）

| 用户意图 | 动作 |
|---|---|
| "发布这篇文章" / "推到 feima-lab" / "上线" | save-article → publish-article 串联跑 |
| "更新这篇已发布的文章" / "改了内容重新推" | save-article（mode=update） |
| "这篇文章在后端是什么状态？" / "看看远程版本" | get-article |
| "列一下所有分类" / "我不知道填哪个 category" | list-categories --format table |
| "上传封面图/图片" / "我有个图要推到 OSS" | upload-file --file `<path>`（save-article 内部会自动调） |
| "取消发布" / "删除这篇文章" | v1 不支持，告诉用户 v2 再做 |

## 渐进式输出规则

每一步完成后立即告知用户进度，不要攒到最后：

    1. "正在查询 category id..."（list-categories）
    2. "正在上传封面图..."（upload）
    3. "保存完成，articleId=123"（save）
    4. "发布完成，状态已变为 published"（publish）

## 错误时的处理

遇到 `error_type`：

| 类型 | 立即动作 |
|---|---|
| `missing_api_key` | 停下，告诉用户设置环境变量 |
| `invalid_meta` | 根据错误信息补全 meta.json 缺的字段，重试 |
| `file_not_found` | 告诉用户先跑 image-localize.mjs 或写 article.mdx |
| `api_unavailable` | 告诉用户服务可能暂时不可用；不要自动重试超过 1 次 |
| `api_error` | 读 message 字段，按后端描述的问题修正 |
| `not_found` (get-article 专属) | 告诉用户"后端没这篇文章，需要先 save" |

详见 `api-error-handling.md`。

## v1.1 不做的事

- **不自动 unpublish/delete**：破坏性操作一律让用户手动跑（v2 再加相应脚本）
- **不自动重试**：save/publish 失败就报错，让用户看日志决定要不要再跑
- **不处理 tags**：meta.tags 字段上传前会被丢弃，出 warning 但继续
- **不处理 subCategory**：API 无对应字段
- **不做本地 ↔ 远程 diff**：没有 sync 能力，用户要自己清楚本地是最新还是远程是最新
