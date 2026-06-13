/**
 * Shared filesystem utilities.
 */

import { access } from 'fs/promises';

/**
 * @param {string} filePath
 * @return {Promise<boolean>}
 */
export async function fileExists( filePath ) {
	try {
		await access( filePath );
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} filePath
 * @param {string} projectRoot
 * @return {boolean}
 */
export function isPathInside( filePath, projectRoot ) {
	const normalizedFile = filePath.replace( /\\/g, '/' );
	const normalizedRoot = projectRoot.replace( /\\/g, '/' ).replace( /\/$/, '' );
	return normalizedFile === normalizedRoot || normalizedFile.startsWith( `${ normalizedRoot }/` );
}
