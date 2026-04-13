---
name: feima-lab-content-manager 作者默认
description: feima-lab 博客写作默认的作者/分类/tags/slug 风格
type: user
---

# Feima Lab 博客默认元数据

| 字段 | 值 |
|---|---|
| `default_author` | Feima Lab |
| `default_category` | 技术探索 |
| `default_route` | BLOG |
| `default_tags` | ["skill", "提问", "元认知", "思维框架"] |
| `slug_style` | kebab-case（纯 kebab，**不加日期前缀**，英文语义优先） |
| `default_tint` | `bg-tint-blue` |

## 说明

- `default_tags` 仅作为首次写作时的参考基准，每篇文章按实际内容调整
- 作者统一署名 `Feima Lab`（实验室品牌，非个人）
- 分类"技术探索"已在后端验证（route=BLOG，id=1）
- `FX_AI_API_KEY` 已配成 internal 类型，ContentApiController 全端可调
- slug 规则：**纯 kebab，不要 `YYYY-MM-DD-` 日期前缀**（v1.4 起生效）
