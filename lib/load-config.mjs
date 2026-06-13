/**
 * Load and merge project wp-esbuild.config.mjs.
 */

import path from 'path';
import { pathToFileURL } from 'url';
import { defaultProjectConfig } from './config.mjs';
import { normalizeConfig } from './normalize-config.mjs';

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

		return normalizeConfig( mergeConfig( defaultProjectConfig, userConfig || {} ) );
	} catch ( error ) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'ERR_MODULE_NOT_FOUND'
		) {
			return normalizeConfig( { ...defaultProjectConfig } );
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
	const merged = {
		...base,
		...override,
	};

	if ( override.blocks !== undefined ) {
		merged.blocks = Array.isArray( override.blocks )
			? override.blocks
			: { ...base.blocks, ...override.blocks };
	}

	if ( override.js !== undefined ) {
		merged.js = Array.isArray( override.js )
			? override.js
			: { ...base.js, ...override.js };
	}

	if ( override.modules !== undefined ) {
		merged.modules = Array.isArray( override.modules )
			? override.modules
			: { ...base.modules, ...override.modules };
	}

	if ( override.scss !== undefined ) {
		merged.scss = Array.isArray( override.scss )
			? override.scss
			: { ...base.scss, ...override.scss };
	}

	if ( override.copy !== undefined ) {
		merged.copy = Array.isArray( override.copy ) ? override.copy : override.copy;
	}

	if ( override.blocksManifest ) {
		merged.blocksManifest = { ...base.blocksManifest, ...override.blocksManifest };
	}

	if ( override.wordpressExternals ) {
		merged.wordpressExternals = {
			...base.wordpressExternals,
			...override.wordpressExternals,
		};
	}

	if ( override.esbuild ) {
		merged.esbuild = { ...base.esbuild, ...override.esbuild };
	}

	if ( override.plugins ) {
		merged.plugins = override.plugins;
	}

	if ( override.entries ) {
		merged.entries = override.entries;
	}

	return merged;
}
