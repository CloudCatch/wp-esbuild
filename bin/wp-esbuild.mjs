#!/usr/bin/env node
/**
 * CLI entry point for @cloudcatch/wp-esbuild.
 */
import path from 'path';
import { parseArgs } from 'util';
import { build } from '../lib/build.mjs';
import { buildBlocksManifest } from '../lib/build-blocks-manifest.mjs';
import { loadProjectConfig } from '../lib/load-config.mjs';

const { values } = parseArgs( {
	options: {
		root: { type: 'string', short: 'r' },
		watch: { type: 'boolean', short: 'w', default: false },
		'blocks-manifest': { type: 'boolean', default: false },
	},
	allowPositionals: true,
} );

const projectRoot = path.resolve( values.root || process.cwd() );

try {
	if ( values[ 'blocks-manifest' ] ) {
		const config = await loadProjectConfig( projectRoot );
		await buildBlocksManifest( {
			projectRoot,
			inputDir: config.blocksManifest.input,
			outputFile: config.blocksManifest.output,
		} );
	} else {
		await build( projectRoot, { watch: values.watch } );
	}
} catch ( error ) {
	console.error( error );
	process.exit( 1 );
}
