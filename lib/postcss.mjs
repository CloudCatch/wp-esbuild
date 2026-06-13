/**
 * Load PostCSS plugins from project config or postcss.config.*.
 */

import path from 'path';
import { pathToFileURL } from 'url';
import autoprefixer from 'autoprefixer';
import { fileExists } from './utils.mjs';

/** @type {Map<string, import('postcss').AcceptedPlugin[]|false>} */
const cache = new Map();

/**
 * @param {string} projectRoot
 * @param {boolean|import('postcss').AcceptedPlugin[]|object} postcssConfig
 * @return {Promise<import('postcss').AcceptedPlugin[]|false>}
 */
export async function loadPostcssPlugins( projectRoot, postcssConfig = true ) {
	const cacheKey = `${ projectRoot }:${ JSON.stringify( postcssConfig ) }`;
	if ( cache.has( cacheKey ) ) {
		return cache.get( cacheKey );
	}

	if ( postcssConfig === false ) {
		cache.set( cacheKey, false );
		return false;
	}

	if ( Array.isArray( postcssConfig ) ) {
		cache.set( cacheKey, postcssConfig );
		return postcssConfig;
	}

	for ( const fileName of [
		'postcss.config.mjs',
		'postcss.config.js',
		'postcss.config.cjs',
	] ) {
		const configPath = path.join( projectRoot, fileName );
		if ( await fileExists( configPath ) ) {
			const module = await import( pathToFileURL( configPath ).href );
			const config = module.default ?? module;
			const plugins =
				typeof config === 'function'
					? config( { env: process.env.NODE_ENV || 'development' } ).plugins
					: config.plugins;

			if ( Array.isArray( plugins ) ) {
				cache.set( cacheKey, plugins );
				return plugins;
			}
		}
	}

	const fallback = [ autoprefixer ];
	cache.set( cacheKey, fallback );
	return fallback;
}

/**
 * @param {string} css
 * @param {import('postcss').AcceptedPlugin[]|false} plugins
 * @return {Promise<string>}
 */
export async function postprocessCss( css, plugins ) {
	if ( plugins === false ) {
		return css;
	}

	const postcss = ( await import( 'postcss' ) ).default;
	const result = await postcss( plugins ).process( css, { from: undefined } );
	return result.css;
}

/**
 * @param {string} css
 * @return {Promise<string>}
 */
export async function generateRtlCss( css ) {
	const rtlcss = ( await import( 'rtlcss' ) ).default;
	return rtlcss.process( css );
}
