export default {
	blocksManifest: { enabled: true },
	entries: [
		{
			name: 'blocks',
			type: 'blocks',
			src: 'src/blocks',
			out: 'build/blocks',
			discover: '**/block.json',
			copy: [ 'block.json', 'render.php' ],
		},
	],
};
