export default {
	rtl: true,
	entries: [
		{
			name: 'theme',
			type: 'scss',
			src: 'src/scss',
			out: 'build/css',
			glob: '*.scss',
			assetPhp: true,
		},
	],
};
