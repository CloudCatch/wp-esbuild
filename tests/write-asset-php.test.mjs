/**
 * Unit tests for *.asset.php generation.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { writeAssetPhp } from '../lib/write-asset-php.mjs';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

test( 'writeAssetPhp writes version hash and dependencies', async () => {
	const tempDir = await mkdtemp( path.join( tmpdir(), 'wp-esbuild-asset-' ) );
	const cssPath = path.join( tempDir, 'main.css' );

	try {
		await writeFile( cssPath, '.main { color: red; }' );
		const assetPath = await writeAssetPhp( cssPath, {
			dependencies: [ 'wp-components' ],
		} );

		assert.equal( assetPath, path.join( tempDir, 'main.asset.php' ) );

		const asset = await readFile( assetPath, 'utf8' );
		assert.match( asset, /'dependencies' => array\( 'wp-components' \)/ );
		assert.match( asset, /'version' => '[a-f0-9]{20}'/ );
		assert.doesNotMatch( asset, /'type' =>/ );
	} finally {
		await rm( tempDir, { recursive: true, force: true } );
	}
} );

test( 'writeAssetPhp includes module type when requested', async () => {
	const tempDir = await mkdtemp( path.join( tmpdir(), 'wp-esbuild-asset-' ) );
	const jsPath = path.join( tempDir, 'view.js' );

	try {
		await writeFile( jsPath, 'export {};' );
		await writeAssetPhp( jsPath, {
			dependencies: [ '@wordpress/interactivity' ],
			type: 'module',
		} );

		const asset = await readFile( path.join( tempDir, 'view.asset.php' ), 'utf8' );
		assert.match( asset, /'type' => 'module'/ );
		assert.match( asset, /@wordpress\/interactivity/ );
	} finally {
		await rm( tempDir, { recursive: true, force: true } );
	}
} );

test( 'writeAssetPhp version changes when file content changes', async () => {
	const tempDir = await mkdtemp( path.join( tmpdir(), 'wp-esbuild-asset-' ) );
	const cssPath = path.join( tempDir, 'style.css' );

	try {
		await writeFile( cssPath, 'v1' );
		await writeAssetPhp( cssPath );
		const first = await readFile( path.join( tempDir, 'style.asset.php' ), 'utf8' );

		await writeFile( cssPath, 'v2' );
		await writeAssetPhp( cssPath );
		const second = await readFile( path.join( tempDir, 'style.asset.php' ), 'utf8' );

		assert.notEqual( first, second );
	} finally {
		await rm( tempDir, { recursive: true, force: true } );
	}
} );
