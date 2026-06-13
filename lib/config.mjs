/**
 * Default esbuild and project configuration for @cloudcatch/wp-esbuild.
 */

export const defaultProjectConfig = {
	srcDir: 'src',
	outDir: 'build',
	blocks: {
		src: 'src/blocks',
		out: 'build/blocks',
	},
	js: {
		src: 'src/js',
		out: 'build/js',
	},
	modules: {
		src: 'src/js/modules',
		out: 'build/js/modules',
	},
	scss: {
		src: 'src/scss',
		out: 'build/css',
	},
	blocksManifest: {
		enabled: true,
		input: 'build/blocks',
		output: 'build/blocks/blocks-manifest.php',
	},
	minify: process.env.NODE_ENV === 'production',
	sourcemap: process.env.NODE_ENV !== 'production',
};

/**
 * Default esbuild options for WordPress browser bundles.
 *
 * @param {object} options
 * @param {boolean} options.minify
 * @param {boolean} options.sourcemap
 * @return {import('esbuild').BuildOptions}
 */
export function getDefaultEsbuildOptions( { minify, sourcemap } ) {
	return {
		bundle: true,
		platform: 'browser',
		target: 'es2018',
		jsx: 'automatic',
		jsxImportSource: 'react',
		loader: {
			'.js': 'jsx',
			'.jsx': 'jsx',
		},
		minify,
		sourcemap,
		logLevel: 'info',
	};
}
