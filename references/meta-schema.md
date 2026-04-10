# meta.json 字段规范（schema_version 1.1）

## 完整示例

    {
      "$schema_version": "1.1",
      "slug": "2026-04-09-feima-lab-content-manager",
      "title": "feima-lab 内容管家：从纯文本到上线的一条龙",
      "description": "不用装工程也能预览，MDX 组件自由组合",
      "author": "黎东",
      "category": "AI 实战",
      "categoryId": 3,
      "subCategory": "Skill 开发",
      "tags": ["Claude Code", "Skill", "MDX"],
      "coverImage": "./images/cover.webp",
      "coverImageUrl": "https://cdn.fenxianglife.com/xxx.webp",
      "publishTime": "2026-04-09T10:30:00+08:00",
      "readTime": "8 分钟",
      "tint": "tint-blue",
      "components_used": ["Callout", "Timeline", "CodeTabs"],
      "render": {
        "last_rendered_at": "2026-04-09T10:31:05+08:00",
        "snapshot_version": "1.0",
        "feima_lab_commit": "abc1234"
      },
      "source": {
        "original_input": "plain_text",
        "source_md_exists": true
      },
      "publish": {
        "status": "draft",
        "remote_id": null,
        "last_saved_at": null,
        "published_at": null,
        "published_slug": null,
        "api_response": null
      }
    }

## 必填字段（save-article 前必须填好）

| 字段 | 类型 | 约束 |
|---|---|---|
| `slug` | string | `YYYY-MM-DD-<kebab>` 格式，URL 友好，max 200 字 |
| `title` | string | 非空，max 300 字 |
| `description` | string | 非空，建议 20-80 字 |
| `author` | string | 非空，从 MEMORY.md 默认 |
| `category` **或** `categoryId` | string / number | `categoryId` 优先；为空时按 `category` 名字自动查找 |

## 可选字段

| 字段 | 默认 | 说明 |
|---|---|---|
| `categoryId` | `null` | 后端分类 id（数字）。留空会自动按 `category` 名字查 `list-categories` |
| `subCategory` | `""` | （API 无对应字段，暂不上传） |
| `coverImage` | `""` | **本地路径**（如 `./images/cover.webp`），save 时自动上传 |
| `coverImageUrl` | `""` | **远程 URL**。save 前若为空会自动上传 `coverImage` 并回写本字段 |
| `tint` | `"tint-blue"` | 列表页卡片背景色块 |
| `sortOrder` | `null` | 排序权重（数字，越大越靠前） |
| `tags` | `[]` | **v1 暂忽略**。v2 会支持自动查询/创建 tagIds |
| `components_used` | `[]` | 由 Claude 根据 article.mdx 统计 |

## 受控字段（脚本自动写回，不要手工改）

| 字段 | 何时写入 |
|---|---|
| `categoryId` | save-article 成功后（自动查到的值） |
| `coverImageUrl` | save-article 触发自动上传后 |
| `publish.remote_id` | save-article 成功，后端返回 articleId |
| `publish.last_saved_at` | save-article 成功的时间 |
| `publish.status` | publish-article 成功后变 `"published"` |
| `publish.published_at` | publish-article 成功的时间 |
| `publish.published_slug` | publish-article 成功的 slug |
| `render.last_rendered_at` | render.mjs 成功后 |

## readTime 预估算法

    字数 / 350 = 分钟数（向上取整）

按 350 字/分钟中文阅读速度估算。汇报时罗列"X 分钟（Y 字）"。

## 校验清单（save-article 前自检）

- [ ] slug 格式 `YYYY-MM-DD-kebab`
- [ ] title / description / author 非空
- [ ] `category`（名字）或 `categoryId`（数字）二选一已填
- [ ] 如果有封面图：`coverImage` 本地路径存在 **或** `coverImageUrl` 已填远程 URL
- [ ] article.mdx 存在且 render.mjs 可以成功渲染

## v1 → v1.1 迁移

旧 meta.json 打开仍然可用——新增字段都有默认值。第一次跑 save-article 会自动写入 `categoryId` / `coverImageUrl` / `publish.remote_id` / `publish.last_saved_at`。
