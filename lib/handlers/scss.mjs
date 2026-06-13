/**
 * SCSS/CSS handler.
 */

import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
import glob from 'fast-glob';
import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { fileExists } from '../utils.mjs';
import { generateRtlCss, loadPostcssPlugins, postprocessCss } from '../postcss.mjs';
import { resolveScssOutfile } from '../resolve-scss-outfile.mjs';
import { writeAssetPhp } from '../write-asset-php.mjs';

/**
 * @param {object} options
 * @param {string} options.entry
 * @param {string} options.outfile
 * @param {object} options.buildContext
 * @param {object} options.entryConfig
 * @return {Promise<void>}
 */
export async function buildScssFile( { entry, outfile, buildContext, entryConfig } ) {
	const { minify, sourcemap, projectRoot, postcss: postcssSetting, rtl } = buildContext;
	const postcssPlugins = await loadPostcssPlugins( projectRoot, postcssSetting );
	const shouldRtl = entryConfig.rtl ?? rtl;

	await mkdir( path.dirname( outfile ), { recursive: true } );

	const result = await esbuild.build( {
		entryPoints: [ entry ],
		outfile,
		bundle: true,
		minify,
		sourcemap,
		logLevel: 'silent',
		plugins: [
			sassPlugin( {
				type: 'css',
				sourceMap: sourcemap,
			} ),
		],
	} );

	if ( result.errors.length > 0 ) {
		throw new Error( result.errors.map( ( e ) => e.text ).join( '\n' ) );
	}

	const css = await readFile( outfile, 'utf8' );
	const processed = await postprocessCss( css, postcssPlugins );
	await writeFile( outfile, processed );

	if ( shouldRtl ) {
		const rtlCss = await generateRtlCss( processed );
		const rtlOutfile = outfile.replace( /\.css$/, '-rtl.css' );
		await writeFile( rtlOutfile, rtlCss );

		if ( entryConfig.assetPhp ) {
			await writeAssetPhp( rtlOutfile );
		}
	}

	if ( entryConfig.assetPhp ) {
		await writeAssetPhp( outfile, {
			dependencies: entryConfig.assetDependencies || [],
		} );
	}
}

/**
 * @param {string} projectRoot
 * @param {object} entryConfig
 * @param {object} buildContext
 * @return {Promise<void>}
 */
export async function runScssHandler( projectRoot, entryConfig, buildContext ) {
	const srcDir = path.join( projectRoot, entryConfig.src );
	const outDir = path.join( projectRoot, entryConfig.out );

	if ( ! ( await fileExists( srcDir ) ) ) {
		return;
	}

	const globPattern = entryConfig.glob || '*.{scss,sass}';
	const ignore = entryConfig.ignore || [ '**/_*' ];

	const entries = await glob( globPattern, {
		cwd: srcDir,
		absolute: true,
		ignore,
	} );

	for ( const entry of entries ) {
		const outfile = resolveScssOutfile( {
			srcDir,
			outDir,
			entry,
			entryConfig,
		} );

		await buildScssFile( {
			entry,
			outfile,
			buildContext,
			entryConfig,
		} );
	}
}

export const scssHandler = {
	type: 'scss',
	run: runScssHandler,
};
