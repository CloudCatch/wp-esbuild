/**
 * defineConfig helper with basic validation warnings.
 */

const KNOWN_KEYS = new Set( [
	'srcDir',
	'outDir',
	'entries',
	'blocks',
	'js',
	'modules',
	'scss',
	'copy',
	'blocksManifest',
	'minify',
	'sourcemap',
	'esbuild',
	'wordpressExternals',
	'postcss',
	'rtl',
	'plugins',
] );

/**
 * @param {object} config
 * @return {object}
 */
export function defineConfig( config ) {
	if ( config && typeof config === 'object' ) {
		for ( const key of Object.keys( config ) ) {
			if ( ! KNOWN_KEYS.has( key ) ) {
				console.warn( `[wp-esbuild] Unknown config key "${ key }".` );
			}
		}

		if ( Array.isArray( config.entries ) ) {
			for ( const entry of config.entries ) {
				if ( ! entry.type ) {
					console.warn( '[wp-esbuild] entries item missing "type".' );
				}
				if ( entry.type !== 'copy' && ! entry.src && ! entry.from ) {
					console.warn(
						`[wp-esbuild] entry "${ entry.name || '(unnamed)' }" missing src/from.`
					);
				}
			}
		}
	}

	return config;
}
