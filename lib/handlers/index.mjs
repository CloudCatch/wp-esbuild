/**
 * Handler registry for wp-esbuild pipelines.
 */

import { blocksHandler } from './blocks.mjs';
import { copyHandler } from './copy.mjs';
import { scssHandler } from './scss.mjs';
import { scriptHandler } from './script.mjs';

/** @type {Record<string, { type: string, run: Function }>} */
export const handlersByType = {
	blocks: blocksHandler,
	script: scriptHandler,
	scss: scssHandler,
	copy: copyHandler,
};

/**
 * @param {object} entry
 * @return {{ type: string, run: Function }|undefined}
 */
export function getHandlerForEntry( entry ) {
	return handlersByType[ entry.type ];
}

/**
 * @param {string} projectRoot
 * @param {object} entry
 * @param {object} buildContext
 * @return {Promise<void>}
 */
export async function runEntry( projectRoot, entry, buildContext ) {
	const handler = getHandlerForEntry( entry );
	if ( ! handler ) {
		throw new Error( `Unknown entry type "${ entry.type }" for entry "${ entry.name }".` );
	}

	if ( entry.type === 'copy' ) {
		await handler.run( projectRoot, entry );
		return;
	}

	await handler.run( projectRoot, entry, buildContext );
}
