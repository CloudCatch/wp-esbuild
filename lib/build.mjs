/**
 * Build orchestrator for WordPress blocks, JS, modules, and SCSS assets.
 */

import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import glob from 'fast-glob';
import chokidar from 'chokidar';
import path from 'path';
import { copyFile, mkdir, readFile, writeFile, access } from 'fs/promises';
import { getDefaultEsbuildOptions } from './config.mjs';
import { loadProjectConfig } from './load-config.mjs';
import {
	stripStyleImportsPlugin,
	wordpressExternalsPlugin,
	wordpressModuleExternalsPlugin,
} from './wordpress-externals-plugin.mjs';
import { buildBlocksManifest } from './build-blocks-manifest.mjs';

/**
 * @param {string} filePath
 * @return {Promise<boolean>}
 */
async function fileExists( filePath ) {
	try {
		await access( filePath );
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} css
 * @return {Promise<string>}
 */
async function postprocessCss( css ) {
	const result = await postcss( [ autoprefixer ] ).process( css, { from: undefined } );
	return result.css;
}

/**
 * @param {object} options
 * @param {string} options.entry
 * @param {string} options.outfile
 * @param {boolean} options.minify
 * @param {boolean} options.sourcemap
 * @param {boolean} options.wordpressExternals
 * @param {string} options.assetBaseName
 * @return {Promise<import('esbuild').BuildResult>}
 */
async function buildJsBundle( {
	entry,
	outfile,
	minify,
	sourcemap,
	wordpressExternals = false,
	assetBaseName = 'index',
} ) {
	const plugins = [ stripStyleImportsPlugin() ];

	if ( wordpressExternals ) {
		plugins.push( wordpressExternalsPlugin( assetBaseName ) );
	}

	await mkdir( path.dirname( outfile ), { recursive: true } );

	return esbuild.build( {
		...getDefaultEsbuildOptions( { minify, sourcemap } ),
		entryPoints: [ entry ],
		outfile,
		format: 'iife',
		plugins,
	} );
}

/**
 * @param {object} options
 * @param {string} options.entry
 * @param {string} options.outfile
 * @param {boolean} options.minify
 * @param {boolean} options.sourcemap
 * @param {string} options.assetBaseName
 * @return {Promise<import('esbuild').BuildResult>}
 */
async function buildModuleBundle( {
	entry,
	outfile,
	minify,
	sourcemap,
	assetBaseName = 'view',
} ) {
	await mkdir( path.dirname( outfile ), { recursive: true } );

	return esbuild.build( {
		...getDefaultEsbuildOptions( { minify, sourcemap } ),
		entryPoints: [ entry ],
		outfile,
		format: 'esm',
		plugins: [
			stripStyleImportsPlugin(),
			wordpressModuleExternalsPlugin( assetBaseName ),
		],
	} );
}

/**
 * @param {object} options
 * @param {string} options.entry
 * @param {string} options.outfile
 * @param {boolean} options.minify
 * @param {boolean} options.sourcemap
 * @return {Promise<void>}
 */
async function buildScssFile( { entry, outfile, minify, sourcemap } ) {
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
	const processed = await postprocessCss( css );
	await writeFile( outfile, processed );
}

/**
 * @param {string} projectRoot
 * @param {object} config
 * @return {Promise<string[]>}
 */
async function discoverBlocks( projectRoot, config ) {
	const blocksSrc = path.join( projectRoot, config.blocks.src );
	if ( ! ( await fileExists( blocksSrc ) ) ) {
		return [];
	}

	const blockJsonFiles = await glob( '*/block.json', {
		cwd: blocksSrc,
		absolute: true,
	} );

	return blockJsonFiles.map( ( blockJsonPath ) => path.dirname( blockJsonPath ) );
}

/**
 * @param {string} blockDir
 * @param {string} blocksOut
 * @param {object} buildOptions
 * @return {Promise<void>}
 */
async function readBlockMetadata( blockDir ) {
	const blockJsonPath = path.join( blockDir, 'block.json' );
	if ( ! ( await fileExists( blockJsonPath ) ) ) {
		return {};
	}

	return JSON.parse( await readFile( blockJsonPath, 'utf8' ) );
}

async function buildBlock( blockDir, blocksOut, buildOptions ) {
	const slug = path.basename( blockDir );
	const outDir = path.join( blocksOut, slug );
	const metadata = await readBlockMetadata( blockDir );
	await mkdir( outDir, { recursive: true } );

	const indexJs = path.join( blockDir, 'index.js' );
	if ( await fileExists( indexJs ) ) {
		await buildJsBundle( {
			entry: indexJs,
			outfile: path.join( outDir, 'index.js' ),
			...buildOptions,
			wordpressExternals: true,
			assetBaseName: 'index',
		} );
	}

	const styleScss = path.join( blockDir, 'style.scss' );
	if ( await fileExists( styleScss ) ) {
		await buildScssFile( {
			entry: styleScss,
			outfile: path.join( outDir, 'style-index.css' ),
			...buildOptions,
		} );
	}

	const editorScss = path.join( blockDir, 'editor.scss' );
	if ( await fileExists( editorScss ) ) {
		await buildScssFile( {
			entry: editorScss,
			outfile: path.join( outDir, 'index.css' ),
			...buildOptions,
		} );
	}

	const viewJs = path.join( blockDir, 'view.js' );
	if ( await fileExists( viewJs ) ) {
		const viewOut = path.join( outDir, 'view.js' );

		if ( metadata.viewScriptModule ) {
			await buildModuleBundle( {
				entry: viewJs,
				outfile: viewOut,
				...buildOptions,
				assetBaseName: 'view',
			} );
		} else {
			await buildJsBundle( {
				entry: viewJs,
				outfile: viewOut,
				...buildOptions,
				wordpressExternals: true,
				assetBaseName: 'view',
			} );
		}
	}

	for ( const fileName of [ 'block.json', 'render.php' ] ) {
		const source = path.join( blockDir, fileName );
		if ( await fileExists( source ) ) {
			await copyFile( source, path.join( outDir, fileName ) );
		}
	}
}

/**
 * @param {string} projectRoot
 * @param {object} config
 * @param {object} buildOptions
 * @return {Promise<void>}
 */
async function buildBlocks( projectRoot, config, buildOptions ) {
	const blocksOut = path.join( projectRoot, config.blocks.out );
	const blockDirs = await discoverBlocks( projectRoot, config );

	for ( const blockDir of blockDirs ) {
		await buildBlock( blockDir, blocksOut, buildOptions );
	}
}

/**
 * @param {string} projectRoot
 * @param {object} config
 * @param {object} buildOptions
 * @return {Promise<void>}
 */
async function buildThemeJs( projectRoot, config, buildOptions ) {
	const jsSrc = path.join( projectRoot, config.js.src );
	const jsOut = path.join( projectRoot, config.js.out );

	if ( ! ( await fileExists( jsSrc ) ) ) {
		return;
	}

	const entries = await glob( '*.{js,jsx,mjs}', { cwd: jsSrc, absolute: true } );

	for ( const entry of entries ) {
		const baseName = path.basename( entry ).replace( /\.(mjs|jsx|js)$/, '' );
		await buildJsBundle( {
			entry,
			outfile: path.join( jsOut, `${ baseName }.js` ),
			...buildOptions,
			wordpressExternals: true,
			assetBaseName: baseName,
		} );
	}
}

/**
 * @param {string} projectRoot
 * @param {object} config
 * @param {object} buildOptions
 * @return {Promise<void>}
 */
async function buildThemeModules( projectRoot, config, buildOptions ) {
	const modulesSrc = path.join( projectRoot, config.modules.src );
	const modulesOut = path.join( projectRoot, config.modules.out );

	if ( ! ( await fileExists( modulesSrc ) ) ) {
		return;
	}

	const entries = await glob( '**/*.{js,jsx,mjs}', {
		cwd: modulesSrc,
		absolute: true,
	} );

	for ( const entry of entries ) {
		const relativeEntryPath = path.relative( modulesSrc, entry );
		const outRelativePath = relativeEntryPath.replace( /\.(mjs|jsx|js)$/, '.js' );
		const assetBaseName = path.basename( outRelativePath, '.js' );

		await buildModuleBundle( {
			entry,
			outfile: path.join( modulesOut, outRelativePath ),
			...buildOptions,
			assetBaseName,
		} );
	}
}

/**
 * @param {string} projectRoot
 * @param {object} config
 * @param {object} buildOptions
 * @return {Promise<void>}
 */
async function buildThemeScss( projectRoot, config, buildOptions ) {
	const scssSrc = path.join( projectRoot, config.scss.src );
	const scssOut = path.join( projectRoot, config.scss.out );

	if ( ! ( await fileExists( scssSrc ) ) ) {
		return;
	}

	const entries = await glob( '*.scss', {
		cwd: scssSrc,
		absolute: true,
		ignore: [ '**/_*.scss' ],
	} );

	for ( const entry of entries ) {
		const baseName = path.basename( entry, '.scss' );
		await buildScssFile( {
			entry,
			outfile: path.join( scssOut, `${ baseName }.css` ),
			...buildOptions,
		} );
	}
}

/**
 * @param {string} projectRoot
 * @param {object} [options]
 * @param {boolean} [options.watch]
 * @return {Promise<void>}
 */
export async function build( projectRoot, options = {} ) {
	const config = await loadProjectConfig( projectRoot );
	const buildOptions = {
		minify: config.minify,
		sourcemap: config.sourcemap,
	};

	const runBuild = async () => {
		console.log( `Building ${ projectRoot }...` );
		await buildBlocks( projectRoot, config, buildOptions );
		await buildThemeJs( projectRoot, config, buildOptions );
		await buildThemeModules( projectRoot, config, buildOptions );
		await buildThemeScss( projectRoot, config, buildOptions );

		if ( config.blocksManifest?.enabled ) {
			await buildBlocksManifest( {
				projectRoot,
				inputDir: config.blocksManifest.input,
				outputFile: config.blocksManifest.output,
			} );
		}

		console.log( 'Build complete.' );
	};

	await runBuild();

	if ( options.watch ) {
		const watchPaths = [
			path.join( projectRoot, config.blocks.src ),
			path.join( projectRoot, config.js.src ),
			path.join( projectRoot, config.modules.src ),
			path.join( projectRoot, config.scss.src ),
		];

		console.log( 'Watching for changes...' );

		const watcher = chokidar.watch( watchPaths, {
			ignoreInitial: true,
			ignored: /(^|[/\\])\../,
		} );

		let debounceTimer;
		const scheduleRebuild = () => {
			clearTimeout( debounceTimer );
			debounceTimer = setTimeout( () => {
				runBuild().catch( ( error ) => {
					console.error( error );
				} );
			}, 100 );
		};

		watcher.on( 'all', scheduleRebuild );

		await new Promise( () => {} );
	}
}
