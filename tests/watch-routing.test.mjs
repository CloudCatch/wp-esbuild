/**
 * Unit tests for incremental watch entry routing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeConfig, getEntriesForChangedPath } from '../lib/normalize-config.mjs';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const projectRoot = path.join( __dirname, 'fixtures/watch-routing' );

function configForWatchRouting() {
	return normalizeConfig( {
		entries: [
			{
				name: 'blocks',
				type: 'blocks',
				src: 'src/blocks',
				out: 'build/blocks',
			},
			{
				name: 'admin-js',
				type: 'script',
				src: 'src/js',
				out: 'build/js',
			},
			{
				name: 'styles',
				type: 'scss',
				src: 'src/scss',
				out: 'build/css',
			},
			{
				name: 'icons',
				type: 'copy',
				from: 'src/icons/**/*.svg',
				to: 'build/icons',
				flatten: true,
			},
		],
	} );
}

test( 'getEntriesForChangedPath returns only matching entries', () => {
	const config = configForWatchRouting();

	const jsChange = getEntriesForChangedPath(
		path.join( projectRoot, 'src/js/admin.js' ),
		projectRoot,
		config
	);
	assert.deepEqual(
		jsChange.map( ( entry ) => entry.name ),
		[ 'admin-js' ]
	);

	const scssChange = getEntriesForChangedPath(
		path.join( projectRoot, 'src/scss/main.scss' ),
		projectRoot,
		config
	);
	assert.deepEqual(
		scssChange.map( ( entry ) => entry.name ),
		[ 'styles' ]
	);

	const blockChange = getEntriesForChangedPath(
		path.join( projectRoot, 'src/blocks/card/index.js' ),
		projectRoot,
		config
	);
	assert.deepEqual(
		blockChange.map( ( entry ) => entry.name ),
		[ 'blocks' ]
	);
} );

test( 'getEntriesForChangedPath matches copy glob watch roots', () => {
	const config = configForWatchRouting();

	const iconChange = getEntriesForChangedPath(
		path.join( projectRoot, 'src/icons/nested/icon.svg' ),
		projectRoot,
		config
	);
	assert.deepEqual(
		iconChange.map( ( entry ) => entry.name ),
		[ 'icons' ]
	);
} );

test( 'getEntriesForChangedPath rebuilds all entries when path is unmatched', () => {
	const config = configForWatchRouting();

	const affected = getEntriesForChangedPath(
		path.join( projectRoot, 'wp-esbuild.config.mjs' ),
		projectRoot,
		config
	);

	assert.equal( affected.length, config.entries.length );
} );
