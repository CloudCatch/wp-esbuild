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
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/css/main.asset.php' ) ), false );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/assets/readme.txt' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/blocks-manifest.php' ) ), true );

	const manifest = await readFile(
		path.join( fixtureRoot, 'build/blocks/blocks-manifest.php' ),
		'utf8'
	);
	assert.match( manifest, /'hello' =>/ );
	assert.match( manifest, /'name' => 'test\/hello'/ );
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

test( 'scss outName modes and assetPhp integration', async () => {
	const fixtureRoot = path.join( __dirname, 'fixtures/scss-names' );
	await cleanBuildDir( fixtureRoot );
	await build( fixtureRoot );

	const joinedCss = path.join( fixtureRoot, 'build/css/blocks/core-button.css' );
	const joinedAsset = path.join( fixtureRoot, 'build/css/blocks/core-button.asset.php' );
	const postTemplateCss = path.join( fixtureRoot, 'build/css/blocks/core-post-template.css' );
	const preservedCss = path.join( fixtureRoot, 'build/css/preserved/deep/entry.css' );
	const flatCss = path.join( fixtureRoot, 'build/css/flat/theme.css' );

	assert.equal( await pathExists( joinedCss ), true );
	assert.equal( await pathExists( joinedAsset ), true );
	assert.equal( await pathExists( postTemplateCss ), true );
	assert.equal( await pathExists( preservedCss ), true );
	assert.equal( await pathExists( flatCss ), true );

	assert.equal( await pathExists( path.join( fixtureRoot, 'build/css/blocks/core/button.css' ) ), false );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/css/flat/theme/theme.css' ) ), false );

	const asset = await readFile( joinedAsset, 'utf8' );
	assert.match( asset, /'version' => '[a-f0-9]{20}'/ );
	assert.match( asset, /'dependencies' => array\( 'wp-block-library' \)/ );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/css/preserved/deep/entry.asset.php' ) ), false );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/css/flat/theme.asset.php' ) ), false );
} );

test( 'blocks-full fixture discovers nested blocks and builds scss plus copies', async () => {
	const fixtureRoot = path.join( __dirname, 'fixtures/blocks-full' );
	await cleanBuildDir( fixtureRoot );
	await build( fixtureRoot );

	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/card/index.js' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/card/style-index.css' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/card/index.css' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/card/render.php' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/card/block.json' ) ), true );

	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/child/index.js' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/child/block.json' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/blocks/blocks-manifest.php' ) ), true );

	const manifest = await readFile(
		path.join( fixtureRoot, 'build/blocks/blocks-manifest.php' ),
		'utf8'
	);
	assert.match( manifest, /'card' =>/ );
	assert.match( manifest, /'child' =>/ );
	assert.match( manifest, /'name' => 'test\/nested-child'/ );
} );

test( 'copy-glob fixture flattens glob matches and copies directories', async () => {
	const fixtureRoot = path.join( __dirname, 'fixtures/copy-glob' );
	await cleanBuildDir( fixtureRoot );
	await build( fixtureRoot );

	assert.equal( await pathExists( path.join( fixtureRoot, 'build/icons/star.svg' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/icons/moon.svg' ) ), true );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/icons/a/star.svg' ) ), false );
	assert.equal( await pathExists( path.join( fixtureRoot, 'build/static/readme.txt' ) ), true );
} );

test( 'rtl-scss fixture generates rtl css and asset sidecars', async () => {
	const fixtureRoot = path.join( __dirname, 'fixtures/rtl-scss' );
	await cleanBuildDir( fixtureRoot );
	await build( fixtureRoot );

	const ltrCss = path.join( fixtureRoot, 'build/css/theme.css' );
	const rtlCss = path.join( fixtureRoot, 'build/css/theme-rtl.css' );
	const rtlAsset = path.join( fixtureRoot, 'build/css/theme-rtl.asset.php' );

	assert.equal( await pathExists( ltrCss ), true );
	assert.equal( await pathExists( rtlCss ), true );
	assert.equal( await pathExists( rtlAsset ), true );

	const [ ltr, rtl ] = await Promise.all( [
		readFile( ltrCss, 'utf8' ),
		readFile( rtlCss, 'utf8' ),
	] );
	assert.match( ltr, /margin-left:\s*1rem/ );
	assert.match( rtl, /margin-right:\s*1rem/ );
} );
