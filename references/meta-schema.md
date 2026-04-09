# meta.json 字段规范

## 完整示例

    {
      "$schema_version": "1.0",
      "slug": "2026-04-09-feima-lab-content-manager",
      "title": "feima-lab 内容管家：从纯文本到上线的一条龙",
      "description": "不用装工程也能预览，MDX 组件自由组合",
      "author": "黎东",
      "category": "AI 实战",
      "subCategory": "Skill 开发",
      "tags": ["Claude Code", "Skill", "MDX"],
      "coverImage": "./images/cover.webp",
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
        "published_at": null,
        "published_slug": null,
        "api_response": null
      }
    }

## 必填字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `slug` | string | `YYYY-MM-DD-<kebab>` 格式 |
| `title` | string | 非空 |
| `description` | string | 非空，建议 20-80 字 |
| `author` | string | 非空，从 MEMORY.md 默认 |
| `category` | string | 非空，从 MEMORY.md 默认 |
| `tags` | string[] | 可为空数组，元素去重小写 |
| `publishTime` | string | ISO 8601 + 时区（`+08:00`） |
| `readTime` | string | Claude 预估，`"X 分钟"` 格式 |

## 可选字段

| 字段 | 默认 | 说明 |
|---|---|---|
| `subCategory` | `""` | 对应 feima-lab 的 `CategoryInfo.subCategories` |
| `coverImage` | `""` | 文章封面图，本地路径 |
| `tint` | `"tint-blue"` | 列表页卡片背景色块 |
| `components_used` | 自动填 | 由 Claude 根据生成的 article.mdx 统计 |

## readTime 预估算法

    字数 / 350 = 分钟数（向上取整）

按 350 字/分钟中文阅读速度估算。汇报时罗列"X 分钟（Y 字，按 350 字/分钟估算）"。

## 校验清单

- [ ] 所有必填字段非空
- [ ] slug 格式正确
- [ ] publishTime 带时区
- [ ] tags 去重
- [ ] coverImage 若填写则路径以 `./images/` 开头
