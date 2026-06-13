/**
 * Script bundle handler (IIFE and ESM).
 */

import esbuild from 'esbuild';
import glob from 'fast-glob';
import path from 'path';
import { mkdir } from 'fs/promises';
import { mergeEsbuildOptions } from '../merge-esbuild-options.mjs';
import { fileExists } from '../utils.mjs';
import {
	extractStyleImportsPlugin,
	stripStyleImportsPlugin,
	wordpressExternalsPlugin,
	wordpressModuleExternalsPlugin,
} from '../wordpress-externals-plugin.mjs';

/**
 * @param {object} options
 * @param {string} options.entry
 * @param {string} options.outfile
 * @param {object} options.buildContext
 * @param {object} options.entryConfig
 * @return {Promise<import('esbuild').BuildResult>}
 */
export async function buildScriptFile( { entry, outfile, buildContext, entryConfig } ) {
	const {
		minify,
		sourcemap,
		projectRoot,
		globalEsbuild,
		wordpressExternals: globalExternals,
	} = buildContext;

	const format = entryConfig.format || 'iife';
	const extractCss = entryConfig.extractCss === true;
	const assetPhp = entryConfig.assetPhp !== false;
	const assetBaseName = path.basename( outfile, path.extname( outfile ) );

	const stylePlugin = extractCss ? extractStyleImportsPlugin() : stripStyleImportsPlugin();
	const plugins = [ stylePlugin, ...( entryConfig.esbuild?.plugins || [] ), ...( globalEsbuild?.plugins || [] ) ];

	if ( assetPhp ) {
		if ( format === 'esm' ) {
			plugins.push(
				wordpressModuleExternalsPlugin( assetBaseName, globalExternals )
			);
		} else if ( entryConfig.wordpressExternals !== false ) {
			plugins.push(
				wordpressExternalsPlugin( assetBaseName, [], globalExternals )
			);
		}
	}

	await mkdir( path.dirname( outfile ), { recursive: true } );

	const esbuildOptions = mergeEsbuildOptions( {
		minify,
		sourcemap,
		globalEsbuild,
		entryEsbuild: entryConfig.esbuild,
		projectRoot,
	} );

	return esbuild.build( {
		...esbuildOptions,
		entryPoints: [ entry ],
		outfile,
		format,
		plugins: [ ...plugins, ...( esbuildOptions.plugins || [] ) ].filter(
			( plugin, index, all ) =>
				all.findIndex( ( item ) => item.name === plugin.name ) === index
		),
	} );
}

/**
 * @param {string} projectRoot
 * @param {object} entryConfig
 * @param {object} buildContext
 * @return {Promise<void>}
 */
export async function runScriptHandler( projectRoot, entryConfig, buildContext ) {
	const srcDir = path.join( projectRoot, entryConfig.src );
	const outDir = path.join( projectRoot, entryConfig.out );

	if ( ! ( await fileExists( srcDir ) ) ) {
		return;
	}

	const globPattern = entryConfig.glob || '*.{js,jsx,mjs,ts,tsx}';
	const entries = await glob( globPattern, {
		cwd: srcDir,
		absolute: true,
	} );

	const preserveStructure = globPattern.includes( '**' );

	for ( const entry of entries ) {
		const relativeEntryPath = path.relative( srcDir, entry );
		const outRelativePath = relativeEntryPath.replace( /\.(tsx|ts|mjs|jsx|js)$/, '.js' );
		const outfile = preserveStructure
			? path.join( outDir, outRelativePath )
			: path.join( outDir, `${ path.basename( outRelativePath, '.js' ) }.js` );

		await buildScriptFile( {
			entry,
			outfile,
			buildContext,
			entryConfig,
		} );
	}
}

export const scriptHandler = {
	type: 'script',
	run: runScriptHandler,
};
