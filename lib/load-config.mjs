/**
 * Load and merge project wp-esbuild.config.mjs.
 */

import path from 'path';
import { pathToFileURL } from 'url';
import { defaultProjectConfig } from './config.mjs';

const CONFIG_FILENAME = 'wp-esbuild.config.mjs';

/**
 * @param {string} projectRoot
 * @return {Promise<object>}
 */
export async function loadProjectConfig( projectRoot ) {
	const configPath = path.join( projectRoot, CONFIG_FILENAME );

	try {
		const module = await import( pathToFileURL( configPath ).href );
		const userConfig =
			typeof module.default === 'function'
				? module.default( { env: process.env } )
				: module.default;

		return mergeConfig( defaultProjectConfig, userConfig || {} );
	} catch ( error ) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'ERR_MODULE_NOT_FOUND'
		) {
			return { ...defaultProjectConfig };
		}
		throw error;
	}
}

/**
 * @param {object} base
 * @param {object} override
 * @return {object}
 */
function mergeConfig( base, override ) {
	return {
		...base,
		...override,
		blocks: { ...base.blocks, ...override.blocks },
		js: { ...base.js, ...override.js },
		modules: { ...base.modules, ...override.modules },
		scss: { ...base.scss, ...override.scss },
		blocksManifest: { ...base.blocksManifest, ...override.blocksManifest },
	};
}
