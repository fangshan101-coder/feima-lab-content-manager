#!/usr/bin/env node
/**
 * 保存（创建/更新）文章到 feima-lab 后端。
 *
 * 工作流程：
 *   1. 读 posts/<slug>/meta.json 和 article.mdx
 *   2. 如果 meta.categoryId 为空，用 meta.category 名字查 list-categories
 *      得到对应 id；找不到报错并列出可选分类
 *   3. 如果 meta.coverImageUrl 为空且 meta.coverImage 是本地路径，
 *      自动上传该图片，并把返回的 URL 写回 meta.coverImageUrl
 *   4. 构造 SaveArticleRequest 并 POST /content/api/article/save
 *   5. 把返回的 articleId 写回 meta.publish.remote_id
 *
 * v1 限制（有意简化）：
 * - tags: 完全忽略 meta.tags 字段，不上传 tagIds。v2 再加。
 * - subCategory: 不上传（API 无对应字段）
 * - contentHtml: 不传（服务端自己渲染 markdown）
 *
 * Usage:
 *   node scripts/api/save-article.mjs --post-dir <path-to-posts/slug>
 *   node scripts/api/save-article.mjs --post-dir <path> --dry-run
 *
 * Env:
 *   FX_AI_API_KEY   必填
 *
 * Output (json to stdout on success):
 *   { "articleId": 123, "slug": "...", "mode": "create|update" }
 *
 * Exit: 0 success / 1 error (JSON to stderr)
 */
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, isAbsolute } from 'node:path';
import {
  apiGet,
  apiPostJson,
  apiPostMultipart,
  failWith,
  loadMeta,
  parseCliArgs,
  printJson,
  saveMeta,
} from './_lib.mjs';

const HELP = `保存文章到 feima-lab 后端

Usage:
  node scripts/api/save-article.mjs --post-dir <path> [--dry-run]

Options:
  --post-dir <path>   posts/<slug>/ 目录路径（必填）
  --dry-run           只打印将要发送的请求体，不实际调用
  --help, -h          显示此帮助

前置条件：
  1. posts/<slug>/meta.json 已包含 title / description / author / category / slug
  2. posts/<slug>/article.mdx 已存在（作为 contentMarkdown 上传）
  3. 封面图本地路径 meta.coverImage（./images/xxx）会自动上传到 OSS

v1 限制：
  - tags 字段被忽略，不会上传到后端（v2 支持）
  - 如果 meta.categoryId 已填，直接使用；否则按 meta.category 名字查找

Output (json):
  { "articleId": 123, "slug": "2026-04-09-x", "mode": "create" }

Auth:
  export FX_AI_API_KEY=<your-key>
`;

/**
 * Resolve meta.category (name) to a categoryId by listing from the backend.
 * Exits with invalid_meta on mismatch.
 */
async function resolveCategoryId(meta) {
  if (meta.categoryId && Number.isInteger(meta.categoryId)) {
    return meta.categoryId;
  }
  if (!meta.category || !String(meta.category).trim()) {
    failWith(
      'invalid_meta',
      'meta.json 缺少 category 或 categoryId 字段',
      '在 meta.json 填 `"category": "AI 实战"`（名字）或 `"categoryId": 3`（数字）'
    );
  }
  const list = await apiGet('/content/api/category/list');
  const rows = Array.isArray(list) ? list : [];
  const match = rows.find(r => r.categoryName === meta.category);
  if (!match) {
    const available = rows.map(r => `  - ${r.categoryName} (id=${r.id})`).join('\n');
    failWith(
      'invalid_meta',
      `meta.category "${meta.category}" 在后端分类列表中不存在`,
      `可选分类：\n${available || '  (后端返回空列表)'}`
    );
  }
  return match.id;
}

/**
 * If meta.coverImageUrl is empty AND meta.coverImage is a local path,
 * upload the local file and return the remote url. Otherwise return
 * meta.coverImageUrl as-is (may be empty string).
 *
 * Mutates meta.coverImageUrl on successful upload.
 */
async function resolveCoverImageUrl(meta, postDir) {
  if (meta.coverImageUrl && String(meta.coverImageUrl).trim()) {
    return meta.coverImageUrl;
  }
  const local = meta.coverImage;
  if (!local || !String(local).trim()) {
    return ''; // no cover image at all — that's fine, it's optional
  }
  // Normalize local path (relative to postDir)
  const absLocal = isAbsolute(local) ? local : resolve(postDir, local);
  try {
    await stat(absLocal);
  } catch {
    failWith(
      'file_not_found',
      `meta.coverImage 指向的本地文件不存在: ${absLocal}`,
      '先跑 scripts/image-localize.mjs 拷贝图片到 posts/<slug>/images/，或手动填 meta.coverImageUrl 为远程 URL。'
    );
  }
  process.stderr.write(`[upload] 自动上传封面图: ${absLocal}\n`);
  const result = await apiPostMultipart('/content/api/upload', absLocal);
  if (!result || !result.url) {
    failWith('api_error', '封面图上传响应缺少 url 字段', `原始响应: ${JSON.stringify(result)}`);
  }
  meta.coverImageUrl = result.url;
  return result.url;
}

async function loadArticleMarkdown(postDir) {
  const mdxPath = join(postDir, 'article.mdx');
  try {
    return await readFile(mdxPath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      failWith(
        'file_not_found',
        `article.mdx 不存在: ${mdxPath}`,
        '先写 article.mdx 再调用 save-article。'
      );
    }
    throw e;
  }
}

function validateRequiredMetaFields(meta) {
  const required = ['slug', 'title', 'description', 'author'];
  const missing = required.filter(k => !meta[k] || !String(meta[k]).trim());
  if (missing.length > 0) {
    failWith(
      'invalid_meta',
      `meta.json 缺少必填字段: ${missing.join(', ')}`,
      '补全后重试。参考 references/meta-schema.md'
    );
  }
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return; }
  if (!args['post-dir']) {
    failWith('invalid_argument', '缺少 --post-dir 参数', HELP);
  }

  const postDir = resolve(String(args['post-dir']));
  const meta = await loadMeta(postDir);
  validateRequiredMetaFields(meta);

  const categoryId = await resolveCategoryId(meta);
  const coverImageUrl = await resolveCoverImageUrl(meta, postDir);
  const contentMarkdown = await loadArticleMarkdown(postDir);

  // Warn about v1-ignored fields
  if (Array.isArray(meta.tags) && meta.tags.length > 0) {
    process.stderr.write(
      `[warn] meta.tags 在 v1 中被忽略（${meta.tags.length} 个标签），v2 将支持自动查询/创建。\n`
    );
  }

  const existingRemoteId = meta.publish?.remote_id;
  const mode = existingRemoteId ? 'update' : 'create';

  const request = {
    articleId: existingRemoteId || null,
    categoryId,
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    coverImageUrl,
    contentMarkdown,
    author: meta.author,
    tint: meta.tint || 'tint-blue',
    sortOrder: meta.sortOrder ?? null,
    // tagIds 故意不传，v1 忽略
  };

  if (args['dry-run']) {
    process.stderr.write('[dry-run] 将要发送的请求体：\n');
    printJson(request);
    return;
  }

  process.stderr.write(`[save] mode=${mode} slug=${meta.slug} categoryId=${categoryId}\n`);
  const articleId = await apiPostJson('/content/api/article/save', request);
  if (articleId == null) {
    failWith('api_error', '后端返回 articleId 为 null', '检查后端日志');
  }

  // Write back to meta.json
  meta.categoryId = categoryId;
  meta.coverImageUrl = coverImageUrl;
  meta.publish = meta.publish || {};
  meta.publish.remote_id = Number(articleId);
  meta.publish.last_saved_at = new Date().toISOString();
  await saveMeta(postDir, meta);

  printJson({
    articleId: Number(articleId),
    slug: meta.slug,
    mode,
  });
}

main().catch((e) => {
  process.stderr.write(JSON.stringify({
    status: 'error',
    error_type: 'unexpected',
    message: e.message,
    stack: e.stack,
  }) + '\n');
  process.exit(1);
});
