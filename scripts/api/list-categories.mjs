#!/usr/bin/env node
/**
 * 列出 feima-lab 后端所有文章分类。
 *
 * 用途：save-article 需要 categoryId（数字），但用户 meta.json 里一般只写
 * 分类名字（"AI 实战"）。本脚本返回 id↔name 映射表，save-article 内部会
 * 自动调用；用户也可以直接跑来看有哪些分类可选。
 *
 * Usage:
 *   node scripts/api/list-categories.mjs [--format json|table]
 *
 * Env:
 *   FX_AI_API_KEY     必填。Bearer token。
 *   FX_AI_BASE_URL    可选。默认 https://api-ai-brain.fenxianglife.com/fenxiang-ai-brain
 *
 * Exit codes:
 *   0  success (JSON to stdout)
 *   1  error  (JSON to stderr)
 */
import { apiGet, parseCliArgs, printJson } from './_lib.mjs';

const HELP = `列出 feima-lab 后端分类

Usage:
  node scripts/api/list-categories.mjs [--format json|table]

Options:
  --format <json|table>   输出格式，默认 json
  --help, -h              显示此帮助

Output (json):
  [
    { "id": 1, "categoryName": "AI 实战", "description": "...", "configJson": "..." },
    ...
  ]

Auth:
  设置环境变量 FX_AI_API_KEY=<your-key>
`;

function renderTable(rows) {
  if (!rows || rows.length === 0) {
    return '(no categories)';
  }
  const cols = ['id', 'categoryName', 'description'];
  const widths = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length)));
  const fmt = (cells) => cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ');
  const header = fmt(cols);
  const sep = widths.map(w => '-'.repeat(w)).join('  ');
  const lines = rows.map(r => fmt(cols.map(c => r[c] ?? '')));
  return [header, sep, ...lines].join('\n');
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return; }

  const data = await apiGet('/content/api/category/list');
  const list = Array.isArray(data) ? data : [];

  if (args.format === 'table') {
    process.stdout.write(renderTable(list) + '\n');
  } else {
    printJson(list);
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
