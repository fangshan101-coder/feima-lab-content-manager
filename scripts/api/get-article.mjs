#!/usr/bin/env node
/**
 * 按 slug 查询后端文章详情。
 *
 * 用途：
 * - 编辑前拉最新远程状态（避免基于过时本地 meta.json 操作）
 * - 发布后确认发布状态
 * - 检查某个 slug 是否已被占用
 *
 * Usage:
 *   node scripts/api/get-article.mjs --slug <slug>
 *   node scripts/api/get-article.mjs --post-dir <path-to-posts/slug>
 *
 * --post-dir 模式下会从 meta.json 读取 slug。
 *
 * Env:
 *   FX_AI_API_KEY   必填
 *
 * Output (json): ArticleEditResult 完整字段
 *
 * Exit: 0 success / 1 error / 2 not found（slug 在后端不存在）
 */
import { apiGet, failWith, parseCliArgs, printJson, loadMeta } from './_lib.mjs';

const HELP = `按 slug 查询 feima-lab 文章

Usage:
  node scripts/api/get-article.mjs --slug <slug>
  node scripts/api/get-article.mjs --post-dir <path>

Options:
  --slug <slug>        文章的 slug 标识
  --post-dir <path>    从 posts/<slug>/meta.json 读取 slug
  --help, -h           显示此帮助

Output (json):
  ArticleEditResult — 包含 id / title / description / contentMarkdown /
  contentHtml / publishStatus / publishTime / tags 等完整字段

Exit codes:
  0 found
  1 error (auth / network / invalid args)
  2 not found (slug 在后端不存在)

Auth:
  设置环境变量 FX_AI_API_KEY=<your-key>
`;

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return; }

  let slug = args.slug;
  if (!slug && args['post-dir']) {
    const meta = await loadMeta(String(args['post-dir']));
    slug = meta.slug;
    if (!slug) {
      failWith('invalid_meta', 'meta.json 没有 slug 字段', '检查 meta.json');
    }
  }
  if (!slug) {
    failWith('invalid_argument', '需要 --slug 或 --post-dir 参数', HELP);
  }

  try {
    const data = await apiGet(`/content/api/article/by-slug/${encodeURIComponent(slug)}`);
    if (data == null) {
      process.stderr.write(JSON.stringify({
        status: 'error',
        error_type: 'not_found',
        message: `slug "${slug}" 在后端不存在`,
        suggestion: '先用 save-article.mjs 创建，或检查 slug 拼写。',
      }) + '\n');
      process.exit(2);
    }
    printJson(data);
  } catch (e) {
    // failWith exits synchronously; if we reach here something else threw
    throw e;
  }
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
