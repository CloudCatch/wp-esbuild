import { defineConfig } from '@cloudcatch/wp-esbuild/config';

export default defineConfig( {
	entries: [
		{
			name: 'joined-block-styles',
			type: 'scss',
			src: 'src/scss/blocks',
			out: 'build/css/blocks',
			glob: '**/*.scss',
			outName: { join: '-', tail: 2 },
			assetPhp: true,
			assetDependencies: [ 'wp-block-library' ],
		},
		{
			name: 'preserved-styles',
			type: 'scss',
			src: 'src/scss/preserve',
			out: 'build/css/preserved',
			glob: '**/*.scss',
			outName: 'preserve',
		},
		{
			name: 'flat-styles',
			type: 'scss',
			src: 'src/scss/flat',
			out: 'build/css/flat',
			glob: '*.scss',
			outName: 'flat',
		},
	],
} );
