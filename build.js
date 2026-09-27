import { build } from 'esbuild';

await build({
    entryPoints: ['src/worker.js'],
    bundle: true,
    outfile: 'dist/worker.js',
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    minify: false,
    loader: {
        '.html': 'text',
    },
});

console.log('✅ Build complete → dist/worker.js');