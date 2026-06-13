/**
 * Gutenberg blocks handler.
 */

import glob from 'fast-glob';
import path from 'path';
import { cp, mkdir, readFile } from 'fs/promises';
import { fileExists } from '../utils.mjs';
import { buildScssFile } from './scss.mjs';
import { buildScriptFile } from './script.mjs';

/**
 * @param {string} blockDir
 * @param {string} projectRoot
 * @param {object} entryConfig
 * @return {Promise<object>}
 */
async function readBlockMetadata( blockDir ) {
	const blockJsonPath = path.join( blockDir, 'block.json' );
	if ( ! ( await fileExists( blockJsonPath ) ) ) {
		return {};
	}

	return JSON.parse( await readFile( blockJsonPath, 'utf8' ) );
}

/**
 * @param {string} projectRoot
 * @param {object} entryConfig
 * @return {Promise<string[]>}
 */
async function discoverBlocks( projectRoot, entryConfig ) {
	const blocksSrc = path.join( projectRoot, entryConfig.src );
	if ( ! ( await fileExists( blocksSrc ) ) ) {
		return [];
	}

	const discoverPattern = entryConfig.discover || '*/block.json';
	const blockJsonFiles = await glob( discoverPattern, {
		cwd: blocksSrc,
		absolute: true,
	} );

	return blockJsonFiles.map( ( blockJsonPath ) => path.dirname( blockJsonPath ) );
}

/**
 * @param {string} blockDir
 * @param {string} blocksOut
 * @param {object} buildContext
 * @param {object} entryConfig
 * @return {Promise<void>}
 */
async function buildBlock( blockDir, blocksOut, buildContext, entryConfig ) {
	const slug = path.basename( blockDir );
	const outDir = path.join( blocksOut, slug );
	const metadata = await readBlockMetadata( blockDir );
	await mkdir( outDir, { recursive: true } );

	const indexJs = path.join( blockDir, 'index.js' );
	if ( await fileExists( indexJs ) ) {
		await buildScriptFile( {
			entry: indexJs,
			outfile: path.join( outDir, 'index.js' ),
			buildContext,
			entryConfig: {
				...entryConfig,
				format: 'iife',
				wordpressExternals: true,
				assetPhp: true,
			},
		} );
	}

	const styleScss = path.join( blockDir, 'style.scss' );
	if ( await fileExists( styleScss ) ) {
		await buildScssFile( {
			entry: styleScss,
			outfile: path.join( outDir, 'style-index.css' ),
			buildContext,
			entryConfig,
		} );
	}

	const editorScss = path.join( blockDir, 'editor.scss' );
	if ( await fileExists( editorScss ) ) {
		await buildScssFile( {
			entry: editorScss,
			outfile: path.join( outDir, 'index.css' ),
			buildContext,
			entryConfig,
		} );
	}

	const viewEntry = await findViewScript( blockDir );
	if ( viewEntry ) {
		const viewOut = path.join( outDir, 'view.js' );
		const isModule = Boolean( metadata.viewScriptModule );

		await buildScriptFile( {
			entry: viewEntry,
			outfile: viewOut,
			buildContext,
			entryConfig: {
				...entryConfig,
				format: isModule ? 'esm' : 'iife',
				wordpressExternals: ! isModule,
				assetPhp: true,
			},
		} );
	}

	const copyList = entryConfig.copy || [ 'block.json', 'render.php' ];
	for ( const fileName of copyList ) {
		const source = path.join( blockDir, fileName );
		if ( ! ( await fileExists( source ) ) ) {
			continue;
		}

		const destination = path.join( outDir, fileName );
		await mkdir( path.dirname( destination ), { recursive: true } );
		await cp( source, destination, { recursive: true, force: true } );
	}
}

/**
 * @param {string} blockDir
 * @return {Promise<string|null>}
 */
async function findViewScript( blockDir ) {
	for ( const fileName of [ 'view.ts', 'view.tsx', 'view.js', 'view.mjs' ] ) {
		const candidate = path.join( blockDir, fileName );
		if ( await fileExists( candidate ) ) {
			return candidate;
		}
	}

	return null;
}

/**
 * @param {string} projectRoot
 * @param {object} entryConfig
 * @param {object} buildContext
 * @return {Promise<void>}
 */
export async function runBlocksHandler( projectRoot, entryConfig, buildContext ) {
	const blocksOut = path.join( projectRoot, entryConfig.out );
	const blockDirs = await discoverBlocks( projectRoot, entryConfig );

	for ( const blockDir of blockDirs ) {
		await buildBlock( blockDir, blocksOut, buildContext, entryConfig );
	}
}

export const blocksHandler = {
	type: 'blocks',
	run: runBlocksHandler,
};
