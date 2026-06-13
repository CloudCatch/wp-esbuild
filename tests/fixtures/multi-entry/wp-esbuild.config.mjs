export default {
	js: [
		{ src: 'src/js', out: 'build/js', glob: '*.js' },
		{ src: 'src/public', out: 'build/public', glob: '**/*.js' },
	],
	blocksManifest: { enabled: false },
};
