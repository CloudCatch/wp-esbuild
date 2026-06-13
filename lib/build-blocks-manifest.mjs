/**
 * Generate blocks-manifest.php from block.json files in a build directory.
 *
 * Mirrors @wordpress/scripts/scripts/build-blocks-manifest.js
 */
import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';
import { exportToPhp } from './php-export.mjs';

/**
 * @param {object} options
 * @param {string} options.projectRoot
 * @param {string} options.inputDir Absolute path to scan for block.json files.
 * @param {string} options.outputFile Absolute path for blocks-manifest.php.
 * @return {Promise<string>} Path to the generated manifest file.
 */
export async function buildBlocksManifest( {
	projectRoot,
	inputDir,
	outputFile,
} ) {
	const resolvedInputDir = path.resolve( projectRoot, inputDir );

	if ( ! fs.existsSync( resolvedInputDir ) ) {
		throw new Error(
			`Blocks manifest input directory does not exist: ${ resolvedInputDir }`
		);
	}

	const blockJsonFiles = await glob( './**/block.json', {
		cwd: resolvedInputDir,
		absolute: true,
	} );

	/** @type {Record<string, object>} */
	const blocks = {};

	for ( const file of blockJsonFiles ) {
		const blockJson = JSON.parse( fs.readFileSync( file, 'utf8' ) );
		const directoryName = path.basename( path.dirname( file ) );
		blocks[ directoryName ] = blockJson;
	}

	if ( Object.keys( blocks ).length === 0 ) {
		throw new Error(
			`No block.json files found in blocks manifest input: ${ resolvedInputDir }`
		);
	}

	const phpContent = `<?php
// This file is generated. Do not modify it manually.
return ${ exportToPhp( blocks, '\t' ) };
`;

	const resolvedOutputFile = path.resolve( projectRoot, outputFile );
	fs.mkdirSync( path.dirname( resolvedOutputFile ), { recursive: true } );
	fs.writeFileSync( resolvedOutputFile, phpContent );

	console.log( `Block metadata PHP file generated at: ${ resolvedOutputFile }` );

	return resolvedOutputFile;
}
