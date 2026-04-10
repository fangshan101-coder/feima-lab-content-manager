#!/usr/bin/env node
/**
 * Create a new post skeleton directory.
 * Usage: node scripts/new-post.mjs --slug <YYYY-MM-DD-kebab> [--cwd <dir>]
 * Exit: 0 success / 1 error
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--slug') args.slug = argv[++i];
    else if (a === '--cwd') args.cwd = argv[++i];
  }
  return args;
}

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug) {
    console.error('Usage: node scripts/new-post.mjs --slug <slug> [--cwd <dir>]');
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(args.slug)) {
    console.error(`Invalid slug "${args.slug}". Expected YYYY-MM-DD-<kebab>.`);
    process.exit(1);
  }

  const cwd = resolve(args.cwd || process.cwd());
  const postDir = join(cwd, 'posts', args.slug);

  if (await exists(postDir)) {
    console.error(`Directory already exists: ${postDir}`);
    process.exit(1);
  }

  await mkdir(join(postDir, 'images'), { recursive: true });

  const meta = {
    $schema_version: '1.1',
    slug: args.slug,
    title: '',
    description: '',
    author: '',
    category: '',           // 人类可读的分类名（save-article 会按名字查 id）
    categoryId: null,       // v1.1 新增：后端 categoryId；留空则自动按 category 名字查
    subCategory: '',
    tags: [],               // v1.1 save-article 暂时忽略此字段
    coverImage: '',         // 本地路径（如 ./images/cover.webp），save 时自动上传
    coverImageUrl: '',      // v1.1 新增：远程 URL；save 成功上传 coverImage 后会自动填
    publishTime: new Date().toISOString(),
    readTime: '',
    tint: 'tint-blue',
    components_used: [],
    render: { last_rendered_at: null, snapshot_version: null, feima_lab_commit: null },
    source: { original_input: 'plain_text', source_md_exists: false },
    publish: {
      status: 'draft',
      remote_id: null,      // v1.1 新增：后端返回的 articleId
      last_saved_at: null,  // v1.1 新增：最近一次 save-article 成功的时间
      published_at: null,
      published_slug: null,
      api_response: null,
    },
  };
  await writeFile(join(postDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  console.log(postDir);
}

main().catch((e) => { console.error(e); process.exit(1); });
