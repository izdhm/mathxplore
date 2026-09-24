// Bundles a TypeScript test entry with the bundler that ships with Vite, then
// runs it in Node. Keeps the project testable without extra dependencies.
//
// The bundle is written inside node_modules so Node resolves react and friends
// from the project's own dependency tree.
import { rolldown } from 'rolldown';
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const entry = process.argv[2];
if (!entry) {
  console.error('usage: node scripts/run-tests.mjs <entry.ts>');
  process.exit(1);
}

const dir = resolve('node_modules/.mathxplore-tests');
const file = join(dir, 'bundle.mjs');
mkdirSync(dir, { recursive: true });

try {
  const bundle = await rolldown({
    input: entry,
    platform: 'node',
    // React stays external so Node loads the real package, not a copy.
    external: [/^react($|\/)/, /^react-dom($|\/)/, /^react-router/, /^three($|\/)/, /^jsdom$/, /^node:/],
  });
  // Inline dynamic imports so the whole suite is one runnable file.
  await bundle.write({ file, format: 'esm', codeSplitting: false });
  await bundle.close();
  await import(pathToFileURL(file).href);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
