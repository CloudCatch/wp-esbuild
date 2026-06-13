/**
 * Write WordPress *.asset.php sidecars for built assets.
 */

import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';

/**
 * @param {string} outfile Absolute path to the built asset (e.g. main.js or main.css).
 * @param {object} [options]
 * @param {string[]} [options.dependencies]
 * @param {string} [options.type] e.g. 'module' for script modules.
 * @return {Promise<string>} Path to the written .asset.php file.
 */
export async function writeAssetPhp( outfile, options = {} ) {
	const { dependencies = [], type } = options;
	const content = await readFile( outfile );
	const version = createHash( 'sha256' ).update( content ).digest( 'hex' ).slice( 0, 20 );

	const depsString = dependencies
		.map( ( dep ) => `'${ dep }'` )
		.join( ', ' );

	const typeLine = type ? `\n\t'type' => '${ type }',` : '';

	const assetPath = outfile.replace( /\.(css|m?js)$/, '.asset.php' );
	const assetContent = `<?php return array(
	'dependencies' => array( ${ depsString } ),${ typeLine }
	'version' => '${ version }',
);
`;

	await writeFile( assetPath, assetContent );
	return assetPath;
}
