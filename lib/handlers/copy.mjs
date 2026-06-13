/**
 * Static copy handler.
 */

import glob from 'fast-glob';
import path from 'path';
import { cp, copyFile, mkdir } from 'fs/promises';
import { fileExists } from '../utils.mjs';

/**
 * @param {string} projectRoot
 * @param {object} entryConfig
 * @return {Promise<void>}
 */
export async function runCopyHandler( projectRoot, entryConfig ) {
	const fromPath = path.join( projectRoot, entryConfig.from );
	const toPath = path.join( projectRoot, entryConfig.to );

	if ( ! entryConfig.from ) {
		return;
	}

	const hasGlob = /[*?[\]]/.test( entryConfig.from );

	if ( ! hasGlob ) {
		if ( ! ( await fileExists( fromPath ) ) ) {
			return;
		}

		await mkdir( path.dirname( toPath ), { recursive: true } );
		await cp( fromPath, toPath, { recursive: true, force: true } );
		return;
	}

	const matchedFiles = await glob( entryConfig.from, {
		cwd: projectRoot,
		absolute: true,
		onlyFiles: true,
	} );

	const baseDir = path.dirname(
		path.join( projectRoot, entryConfig.from.split( '*' )[ 0 ] )
	);

	for ( const sourceFile of matchedFiles ) {
		const relativePath = path.relative( baseDir, sourceFile );
		const destination = entryConfig.flatten
			? path.join( toPath, path.basename( sourceFile ) )
			: path.join( toPath, relativePath );

		await mkdir( path.dirname( destination ), { recursive: true } );
		await copyFile( sourceFile, destination );
	}
}

export const copyHandler = {
	type: 'copy',
	run: runCopyHandler,
};
