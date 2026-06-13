/**
 * Resolve SCSS output paths for the scss handler.
 */

import path from 'path';

/**
 * @param {string} relativeEntryPath Path relative to the entry src dir.
 * @param {object} options
 * @param {string} [options.join]
 * @param {number|string} [options.tail]
 * @return {string} CSS filename including extension.
 */
export function joinScssSegments( relativeEntryPath, { join = '-', tail } ) {
	const withoutExt = relativeEntryPath.replace( /\.(scss|sass)$/, '' );
	const segments = withoutExt.split( path.sep ).filter( Boolean );

	if ( segments.length === 0 ) {
		return 'style.css';
	}

	let selected = segments;

	if ( tail !== undefined && tail !== 'all' ) {
		const count = Math.max( 1, Number( tail ) );
		selected = segments.slice( -Math.min( count, segments.length ) );
	}

	return `${ selected.join( join ) }.css`;
}

/**
 * @param {object} options
 * @param {string} options.srcDir Absolute source directory.
 * @param {string} options.outDir Absolute output directory.
 * @param {string} options.entry Absolute path to the SCSS entry file.
 * @param {object} options.entryConfig
 * @return {string} Absolute path for the compiled CSS file.
 */
export function resolveScssOutfile( { srcDir, outDir, entry, entryConfig } ) {
	const relativeEntryPath = path.relative( srcDir, entry );
	const baseName = path.basename( relativeEntryPath, path.extname( relativeEntryPath ) );
	const outRelativePath = relativeEntryPath.replace( /\.(scss|sass)$/, '.css' );
	const globPattern = entryConfig.glob || '*.{scss,sass}';
	const preserveStructure = globPattern.includes( '**' );
	const outName = entryConfig.outName ?? ( preserveStructure ? 'preserve' : 'flat' );

	if ( outName === 'flat' ) {
		return path.join( outDir, `${ baseName }.css` );
	}

	if ( outName === 'style-entry' ) {
		const parentDir = path.dirname( relativeEntryPath );
		const cssName =
			parentDir === '.'
				? `${ baseName }.css`
				: `style-${ parentDir.split( path.sep ).join( '-' ) }.css`;
		return path.join( outDir, cssName );
	}

	if ( outName === 'preserve' ) {
		return path.join( outDir, outRelativePath );
	}

	if ( typeof outName === 'object' && outName !== null ) {
		const cssName = joinScssSegments( relativeEntryPath, outName );
		return path.join( outDir, cssName );
	}

	if ( preserveStructure ) {
		return path.join( outDir, outRelativePath );
	}

	return path.join( outDir, `${ baseName }.css` );
}
