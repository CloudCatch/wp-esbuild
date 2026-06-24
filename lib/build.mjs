/**
 * Build orchestrator for WordPress blocks, JS, modules, and SCSS assets.
 */

import path from 'path';
import chokidar from 'chokidar';
import { loadProjectConfig } from './load-config.mjs';
import { getEntriesForChangedPath } from './normalize-config.mjs';
import { runEntry } from './handlers/index.mjs';
import { buildBlocksManifest } from './build-blocks-manifest.mjs';

/**
 * @param {string} projectRoot
 * @param {object} config
 * @param {object[]} [entries]
 * @return {Promise<void>}
 */
async function runUserPlugins( projectRoot, config, entries = config.entries ) {
	for ( const plugin of config.plugins || [] ) {
		if ( typeof plugin.build === 'function' ) {
			await plugin.build( { projectRoot, config, entries } );
		}
	}
}

/**
 * @param {string} projectRoot
 * @param {object} config
 * @param {object[]} entries
 * @return {Promise<void>}
 */
async function runEntries( projectRoot, config, entries ) {
	const buildContext = {
		minify: config.minify,
		sourcemap: config.sourcemap,
		projectRoot,
		globalEsbuild: config.esbuild,
		wordpressExternals: config.wordpressExternals,
		postcss: config.postcss,
		rtl: config.rtl,
	};

	for ( const entry of entries ) {
		await runEntry( projectRoot, entry, buildContext );
	}

	const hasBlocksEntry = entries.some( ( entry ) => entry.type === 'blocks' );
	if ( hasBlocksEntry && config.blocksManifest?.enabled ) {
		await buildBlocksManifest( {
			projectRoot,
			inputDir: config.blocksManifest.input,
			outputFile: config.blocksManifest.output,
		} );
	}

	await runUserPlugins( projectRoot, config, entries );
}

/**
 * @param {string} projectRoot
 * @param {object} [options]
 * @param {boolean} [options.watch]
 * @return {Promise<void>}
 */
export async function build( projectRoot, options = {} ) {
	const config = await loadProjectConfig( projectRoot );

	const runBuild = async ( entries = config.entries ) => {
		console.log( `Building ${ projectRoot }...` );
		await runEntries( projectRoot, config, entries );
		console.log( 'Build complete.' );
	};

	await runBuild();

	if ( options.watch ) {
		const watchPaths = config.watchPaths.map( ( watchPath ) =>
			path.join( projectRoot, watchPath )
		);

		console.log( 'Watching for changes...' );

		const watcher = chokidar.watch( watchPaths, {
			ignoreInitial: true,
			ignored: ( p ) => /(^|[/\\])\../.test( p ),
		} );

		let debounceTimer;
		const scheduleRebuild = ( changedPath ) => {
			clearTimeout( debounceTimer );
			debounceTimer = setTimeout( () => {
				const entries = changedPath
					? getEntriesForChangedPath( changedPath, projectRoot, config )
					: config.entries;

				runBuild( entries ).catch( ( error ) => {
					console.error( error );
				} );
			}, 100 );
		};

		watcher.on( 'all', ( eventName, changedPath ) => {
			scheduleRebuild( changedPath );
		} );

		await new Promise( () => {} );
	}
}

export { normalizeConfig } from './normalize-config.mjs';
export { defineConfig } from './define-config.mjs';
