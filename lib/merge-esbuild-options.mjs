/**
 * Merge default, global, and per-entry esbuild options.
 */

import path from 'path';
import { getDefaultEsbuildOptions } from './config.mjs';

/**
 * @param {object} params
 * @param {boolean} params.minify
 * @param {boolean} params.sourcemap
 * @param {object} [params.globalEsbuild]
 * @param {object} [params.entryEsbuild]
 * @param {string} [params.projectRoot]
 * @return {import('esbuild').BuildOptions}
 */
export function mergeEsbuildOptions( {
	minify,
	sourcemap,
	globalEsbuild = {},
	entryEsbuild = {},
	projectRoot,
} ) {
	const defaults = getDefaultEsbuildOptions( { minify, sourcemap } );
	const merged = {
		...defaults,
		...globalEsbuild,
		...entryEsbuild,
		loader: {
			...defaults.loader,
			...globalEsbuild.loader,
			...entryEsbuild.loader,
		},
		define: {
			...defaults.define,
			...globalEsbuild.define,
			...entryEsbuild.define,
		},
	};

	if ( merged.alias && projectRoot ) {
		merged.alias = Object.fromEntries(
			Object.entries( merged.alias ).map( ( [ key, value ] ) => [
				key,
				path.isAbsolute( value ) ? value : path.join( projectRoot, value ),
			] )
		);
	}

	return merged;
}
