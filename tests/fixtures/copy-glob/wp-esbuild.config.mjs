export default {
	entries: [
		{
			name: 'icons',
			type: 'copy',
			from: 'src/icons/**/*.svg',
			to: 'build/icons',
			flatten: true,
		},
		{
			name: 'assets-dir',
			type: 'copy',
			from: 'src/static',
			to: 'build/static',
		},
	],
};
