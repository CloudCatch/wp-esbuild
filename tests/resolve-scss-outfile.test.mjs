/**
 * Unit tests for SCSS output path resolution.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { joinScssSegments, resolveScssOutfile } from '../lib/resolve-scss-outfile.mjs';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const fixtureSrc = path.join( __dirname, 'fixtures/scss-names/src/scss/blocks' );
const fixtureOut = path.join( __dirname, 'fixtures/scss-names/build/css/blocks' );

test( 'joinScssSegments joins trailing path segments', () => {
	assert.equal( joinScssSegments( 'core/button.scss', { join: '-', tail: 2 } ), 'core-button.css' );
	assert.equal( joinScssSegments( 'main.scss', { join: '-', tail: 2 } ), 'main.css' );
	assert.equal(
		joinScssSegments( 'blocks/core/button.scss', { join: '-', tail: 3 } ),
		'blocks-core-button.css'
	);
	assert.equal( joinScssSegments( 'a/b/c.scss', { join: '.' } ), 'a.b.c.css' );
	assert.equal( joinScssSegments( 'only.scss', { join: '-' } ), 'only.css' );
} );

test( 'resolveScssOutfile preserve keeps nested directories', () => {
	const entry = path.join( fixtureSrc, 'core/button.scss' );
	const outfile = resolveScssOutfile( {
		srcDir: path.join( __dirname, 'fixtures/scss-names/src/scss/blocks' ),
		outDir: fixtureOut,
		entry,
		entryConfig: { glob: '**/*.scss', outName: 'preserve' },
	} );

	assert.equal( outfile, path.join( fixtureOut, 'core/button.css' ) );
} );

test( 'resolveScssOutfile flat uses basename only', () => {
	const entry = path.join( fixtureSrc, 'core/button.scss' );
	const outDir = path.join( __dirname, 'fixtures/scss-names/build/css/flat' );
	const outfile = resolveScssOutfile( {
		srcDir: path.join( __dirname, 'fixtures/scss-names/src/scss/blocks' ),
		outDir,
		entry,
		entryConfig: { glob: '**/*.scss', outName: 'flat' },
	} );

	assert.equal( outfile, path.join( outDir, 'button.css' ) );
} );

test( 'resolveScssOutfile object outName flattens with join and tail', () => {
	const entry = path.join( fixtureSrc, 'core/post-template.scss' );
	const outfile = resolveScssOutfile( {
		srcDir: path.join( __dirname, 'fixtures/scss-names/src/scss/blocks' ),
		outDir: fixtureOut,
		entry,
		entryConfig: { glob: '**/*.scss', outName: { join: '-', tail: 2 } },
	} );

	assert.equal( outfile, path.join( fixtureOut, 'core-post-template.css' ) );
} );

test( 'resolveScssOutfile defaults recursive globs to preserve', () => {
	const entry = path.join( fixtureSrc, 'core/button.scss' );
	const outfile = resolveScssOutfile( {
		srcDir: path.join( __dirname, 'fixtures/scss-names/src/scss/blocks' ),
		outDir: fixtureOut,
		entry,
		entryConfig: { glob: '**/*.scss' },
	} );

	assert.equal( outfile, path.join( fixtureOut, 'core/button.css' ) );
} );

test( 'resolveScssOutfile defaults non-recursive globs to flat', () => {
	const srcDir = path.join( __dirname, 'fixtures/scss-names/src/scss/flat' );
	const outDir = path.join( __dirname, 'fixtures/scss-names/build/css/flat-root' );
	const entry = path.join( srcDir, 'theme.scss' );
	const outfile = resolveScssOutfile( {
		srcDir,
		outDir,
		entry,
		entryConfig: { glob: '*.scss' },
	} );

	assert.equal( outfile, path.join( outDir, 'theme.css' ) );
} );
