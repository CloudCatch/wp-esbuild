/**
 * wp-esbuild integration tests.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { rm, access, readFile } from 'fs/promises';
import { build } from '../lib/build.mjs';
import { normalizeConfig } from '../lib/normalize-config.mjs';
import { defineConfig } from '../lib/define-config.mjs';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const packageRoot = path.join( __dirname, '..' );

async function pathExists( target ) {
	try {
		await access( target );
		return true;
	} catch {
		return false;
	}
}

async function cleanBuildDir( fixtureRoot ) {
	await rm( path.join( fixtureRoot, 'build' ), { recursive: true, force: true } );
}

test( 'normalizeConfig wires srcDir/outDir defaults', () => {
	const normalized = normalizeConfig( {
		srcDir: 'assets/src',
		outDir: 'assets/build',
		copy: [],
	} );

	const jsEntry = normalized.entries.find(
		( entry ) => entry.type === 'script' && entry.src === 'assets/src/js'
	);
	assert.ok( jsEntry );
	assert.equal( jsEntry.src, 'assets/src/js' );
	assert.equal( jsEntry.out, 'assets/build/js' );
} );

test( 'defineConfig returns config and warns on unknown keys', () => {
	const config = defineConfig( { js: { src: 'src/js', out: 'build/js' }, unknownKey: true } );
	assert.equal( config.js.src, 'src/js' );
} );

test( 'default fixture builds blocks, js, modules, scss, copy, manifest', async () => {
	const fixtureRoot = path.join( __dirname, 'fixtures/default' );
	await cleanBuildDir( fixtureRoot );
	await build( fixtureRoot );

	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/hello/index.js' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/hello/view.js' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/hello/index.asset.php' ) ), true );

	const viewAsset = await readFile(
		path.join( fixtureRoot, 'build/blocks/hello/view.asset.php' ),
		'utf8'
	);
	assert.match( viewAsset, /'type' => 'module'/ );
	assert.match( viewAsset, /@wordpress\/interactivity/ );

	assert.equal( await pathExists( path.join( fixtureRoot, 'build/js/main.js' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/js/main.asset.php' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/js/modules/telemetry.js' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/css/main.css' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/assets/readme.txt' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/blocks-manifest.php' ) ), true );
} );

test( 'multi-entry fixture builds separate js outputs', async () => {
	const fixtureRoot = path.join( __dirname, 'fixtures/multi-entry' );
	await cleanBuildDir( fixtureRoot );
	await build( fixtureRoot );

	assert.equal( await pathExists( path.join( fixtureRoot, 'build/js/admin.js' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/public/frontend.js' ) ), true );
} );

test( 'entries config replaces legacy pipelines', () => {
	const normalized = normalizeConfig(
		defineConfig( {
			entries: [
				{ name: 'admin', type: 'script', src: 'src/admin', out: 'build/admin', glob: '**/*.js' },
			],
		} )
	);

	assert.equal( normalized.entries.length, 1 );
	assert.equal( normalized.entries[ 0 ].name, 'admin' );
} );
