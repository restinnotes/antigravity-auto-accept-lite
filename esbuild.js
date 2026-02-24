const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');
const isSourcemap = process.argv.includes('--sourcemap');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: isSourcemap,
    minify: !isWatch,
};

async function main() {
    if (isWatch) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('[esbuild] watching...');
    } else {
        await esbuild.build(buildOptions);
        console.log('[esbuild] build complete');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
