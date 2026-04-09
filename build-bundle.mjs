#!/usr/bin/env node
/**
 * Build a zero-dependency bundled version of scripts/render.mjs from src/render.mjs.
 *
 * MAINTAINER TOOL. Run this whenever src/lib/* or src/render.mjs changes.
 *
 * Usage:   node build-bundle.mjs
 * Input:   src/render.mjs (+ transitively: src/lib/* + node_modules/unified etc)
 * Output:  scripts/render.mjs (single file, no external imports)
 *
 * After running, scripts/render.mjs can be executed by end users with zero
 * npm install — it inlines all unified/remark/mdast/hast dependencies.
 */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const entry = join(__dirname, 'src', 'render.mjs');
  const out = join(__dirname, 'scripts', 'render.mjs');

  await build({
    entryPoints: [entry],
    bundle: true,
    outfile: out,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    minify: false,
    legalComments: 'none',
    banner: {
      js:
        '// ============================================================\n' +
        '// GENERATED BUNDLE — do not edit.\n' +
        '// Source: src/render.mjs (+ src/lib/*)\n' +
        '// Regenerate: node build-bundle.mjs\n' +
        '// ============================================================\n',
    },
  });

  // Size reporting
  const buf = await readFile(out);
  console.log(`bundled: ${out}`);
  console.log(`size:    ${(buf.length / 1024).toFixed(1)} KiB`);
}

main().catch((e) => { console.error('[build-bundle]', e); process.exit(1); });
