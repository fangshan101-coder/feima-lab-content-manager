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
    $schema_version: '1.0',
    slug: args.slug,
    title: '',
    description: '',
    author: '',
    category: '',
    subCategory: '',
    tags: [],
    coverImage: '',
    publishTime: new Date().toISOString(),
    readTime: '',
    tint: 'tint-blue',
    components_used: [],
    render: { last_rendered_at: null, snapshot_version: null, feima_lab_commit: null },
    source: { original_input: 'plain_text', source_md_exists: false },
    publish: { status: 'draft', published_at: null, published_slug: null, api_response: null },
  };
  await writeFile(join(postDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  console.log(postDir);
}

main().catch((e) => { console.error(e); process.exit(1); });
