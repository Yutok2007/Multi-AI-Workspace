import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const target = process.argv[2];
if (target !== 'chrome' && target !== 'firefox') {
  throw new Error('Usage: node scripts/build.mjs <chrome|firefox>');
}

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'dist', target);
const productionDefine = {
  'process.env.NODE_ENV': JSON.stringify('production'),
};
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await build({
  root,
  configFile: false,
  plugins: [react()],
  mode: 'production',
  define: productionDefine,
  build: {
    outDir,
    emptyOutDir: false,
    target: ['chrome111', 'firefox114'],
    rollupOptions: {
      input: {
        popup: resolve(root, 'popup.html'),
        options: resolve(root, 'options.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});

await build({
  root,
  configFile: false,
  mode: 'production',
  define: productionDefine,
  build: {
    outDir,
    emptyOutDir: false,
    target: ['chrome111', 'firefox114'],
    lib: {
      entry: resolve(root, 'src/content/mermaidRenderer.ts'),
      formats: ['es'],
      fileName: () => 'mermaid/renderer.js',
    },
    rollupOptions: {
      output: {
        chunkFileNames: 'mermaid/[name]-[hash].js',
        assetFileNames: 'mermaid/[name]-[hash][extname]',
      },
    },
  },
});

for (const entry of ['content', 'background']) {
  await build({
    root,
    configFile: false,
    mode: 'production',
    define: {
      ...productionDefine,
      __BUILD_TARGET__: JSON.stringify(target),
    },
    build: {
      outDir,
      emptyOutDir: false,
      target: ['chrome111', 'firefox114'],
      lib: {
        entry: resolve(root, `src/${entry}/index.${entry === 'content' ? 'tsx' : 'ts'}`),
        name: `MultiAIWorkspace${entry[0].toUpperCase()}${entry.slice(1)}`,
        formats: ['iife'],
        fileName: () => `${entry}.js`,
      },
    },
  });
}

const manifestSource = resolve(root, 'src', 'manifest', `${target}.json`);
const manifest = JSON.parse(await readFile(manifestSource, 'utf8'));
await writeFile(resolve(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const notices = resolve(root, 'THIRD_PARTY_NOTICES.md');
const license = resolve(root, 'LICENSE');
const iconFiles = ['icon.svg', 'icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png'];
await Promise.all([
  cp(notices, resolve(outDir, 'THIRD_PARTY_NOTICES.md')),
  cp(license, resolve(outDir, 'LICENSE')),
  ...iconFiles.map((filename) =>
    cp(resolve(root, 'src', 'assets', filename), resolve(outDir, filename)),
  ),
]);

console.log(`Built ${target} extension at ${outDir}`);
