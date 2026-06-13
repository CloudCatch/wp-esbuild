/**
 * Default esbuild and project configuration for @cloudcatch/wp-esbuild.
 */

export const defaultWordpressBundledPackages = [
	'@wordpress/admin-ui',
	'@wordpress/dataviews',
	'@wordpress/fields',
	'@wordpress/global-styles-engine',
	'@wordpress/global-styles-ui',
	'@wordpress/grid',
	'@wordpress/icons',
	'@wordpress/image-cropper',
	'@wordpress/interface',
	'@wordpress/ui',
	'@wordpress/views',
];

export const defaultProjectConfig = {
	srcDir: 'src',
	outDir: 'build',
	blocks: {
		src: 'src/blocks',
		out: 'build/blocks',
		discover: '*/block.json',
		copy: [ 'block.json', 'render.php' ],
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
	copy: [],
	blocksManifest: {
		enabled: true,
		input: 'build/blocks',
		output: 'build/blocks/blocks-manifest.php',
	},
	wordpressExternals: {
		bundle: [],
		external: [],
		vendors: {},
	},
	postcss: true,
	rtl: false,
	esbuild: {},
	plugins: [],
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
			'.ts': 'tsx',
			'.tsx': 'tsx',
			'.png': 'file',
			'.jpg': 'file',
			'.jpeg': 'file',
			'.gif': 'file',
			'.svg': 'file',
			'.webp': 'file',
			'.woff': 'file',
			'.woff2': 'file',
			'.ttf': 'file',
			'.eot': 'file',
		},
		assetNames: 'assets/[name]-[hash]',
		minify,
		sourcemap,
		logLevel: 'info',
		define: {},
	};
}
