/**
 * Normalize raw merged config into executable entries + watch metadata.
 */

import path from 'path';
import { defaultProjectConfig } from './config.mjs';

const SCRIPT_GLOB = '*.{js,jsx,mjs,ts,tsx}';
const MODULE_GLOB = '**/*.{js,jsx,mjs,ts,tsx}';
const SCSS_GLOB = '*.{scss,sass}';

/**
 * @param {object|object[]|undefined} value
 * @param {object} defaults
 * @return {object[]}
 */
function toEntryArray( value, defaults ) {
	if ( ! value ) {
		return [];
	}

	if ( Array.isArray( value ) ) {
		return value.map( ( entry, index ) => ( {
			...defaults,
			...entry,
			name: entry.name || `${ defaults.type }-${ index }`,
		} ) );
	}

	return [
		{
			...defaults,
			...value,
			name: value.name || defaults.type,
		},
	];
}

/**
 * @param {object} raw
 * @param {string} srcDir
 * @param {string} outDir
 * @return {object}
 */
function applyRootDirs( raw, srcDir, outDir ) {
	const mapSection = ( section, defaults, relativeSrc, relativeOut ) => {
		if ( Array.isArray( section ) ) {
			return section.map( ( entry ) => ( {
				...entry,
				src: entry.src ?? `${ srcDir }/${ relativeSrc }`,
				out: entry.out ?? `${ outDir }/${ relativeOut }`,
			} ) );
		}

		const merged = {
			...defaults,
			...section,
		};

		const userProvidedSrc = section && typeof section === 'object' && 'src' in section;
		const userProvidedOut = section && typeof section === 'object' && 'out' in section;

		if ( ! userProvidedSrc && ( ! merged.src || merged.src === defaults.src ) ) {
			merged.src = `${ srcDir }/${ relativeSrc }`;
		}

		if ( ! userProvidedOut && ( ! merged.out || merged.out === defaults.out ) ) {
			merged.out = `${ outDir }/${ relativeOut }`;
		}

		return merged;
	};

	return {
		...raw,
		srcDir,
		outDir,
		blocks: mapSection( raw.blocks, defaultProjectConfig.blocks, 'blocks', 'blocks' ),
		js: mapSection( raw.js, defaultProjectConfig.js, 'js', 'js' ),
		modules: mapSection(
			raw.modules,
			defaultProjectConfig.modules,
			'js/modules',
			'js/modules'
		),
		scss: mapSection( raw.scss, defaultProjectConfig.scss, 'scss', 'css' ),
		blocksManifest: {
			...defaultProjectConfig.blocksManifest,
			...raw.blocksManifest,
			input:
				raw.blocksManifest?.input === defaultProjectConfig.blocksManifest.input
					? `${ outDir }/blocks`
					: raw.blocksManifest?.input ?? `${ outDir }/blocks`,
			output:
				raw.blocksManifest?.output === defaultProjectConfig.blocksManifest.output
					? `${ outDir }/blocks/blocks-manifest.php`
					: raw.blocksManifest?.output ??
					  `${ outDir }/blocks/blocks-manifest.php`,
		},
	};
}

/**
 * @param {object} raw
 * @return {object}
 */
export function normalizeConfig( raw ) {
	const srcDir = raw.srcDir ?? defaultProjectConfig.srcDir;
	const outDir = raw.outDir ?? defaultProjectConfig.outDir;
	const rooted = applyRootDirs( raw, srcDir, outDir );

	const withDefaults = {
		...defaultProjectConfig,
		...rooted,
		blocksManifest: {
			...defaultProjectConfig.blocksManifest,
			...rooted.blocksManifest,
		},
		wordpressExternals: {
			bundle: [],
			external: [],
			vendors: {},
			...( raw.wordpressExternals || {} ),
		},
		esbuild: raw.esbuild || {},
		postcss: raw.postcss ?? true,
		rtl: raw.rtl ?? false,
		plugins: raw.plugins || [],
	};

	let entries = [];

	if ( Array.isArray( withDefaults.entries ) && withDefaults.entries.length > 0 ) {
		entries = withDefaults.entries.map( ( entry, index ) => ( {
			enabled: true,
			...entry,
			name: entry.name || `entry-${ index }`,
		} ) );
	} else {
		entries = [
			...toEntryArray( withDefaults.blocks, {
				type: 'blocks',
				src: `${ srcDir }/blocks`,
				out: `${ outDir }/blocks`,
				discover: '*/block.json',
				copy: [ 'block.json', 'render.php' ],
			} ),
			...toEntryArray( withDefaults.js, {
				type: 'script',
				src: `${ srcDir }/js`,
				out: `${ outDir }/js`,
				glob: SCRIPT_GLOB,
				format: 'iife',
				wordpressExternals: true,
				assetPhp: true,
				extractCss: false,
			} ),
			...toEntryArray( withDefaults.modules, {
				type: 'script',
				src: `${ srcDir }/js/modules`,
				out: `${ outDir }/js/modules`,
				glob: MODULE_GLOB,
				format: 'esm',
				wordpressExternals: true,
				assetPhp: true,
				extractCss: false,
			} ),
			...toEntryArray( withDefaults.scss, {
				type: 'scss',
				src: `${ srcDir }/scss`,
				out: `${ outDir }/css`,
				glob: SCSS_GLOB,
				ignore: [ '**/_*' ],
			} ),
			...toEntryArray( withDefaults.copy, {
				type: 'copy',
				from: '',
				to: '',
				flatten: false,
			} ),
		];
	}

	entries = entries.filter( ( entry ) => entry.enabled !== false );

	const watchPaths = [];
	const entryWatchMap = new Map();

	for ( const entry of entries ) {
		const paths = getEntryWatchPaths( entry );
		entryWatchMap.set( entry.name, paths );
		for ( const watchPath of paths ) {
			if ( ! watchPaths.includes( watchPath ) ) {
				watchPaths.push( watchPath );
			}
		}
	}

	for ( const plugin of withDefaults.plugins ) {
		if ( Array.isArray( plugin.watch ) ) {
			for ( const watchPath of plugin.watch ) {
				if ( ! watchPaths.includes( watchPath ) ) {
					watchPaths.push( watchPath );
				}
			}
		}
	}

	return {
		...withDefaults,
		entries,
		watchPaths,
		entryWatchMap,
	};
}

/**
 * @param {object} entry
 * @return {string[]}
 */
function getEntryWatchPaths( entry ) {
	switch ( entry.type ) {
		case 'blocks':
			return [ entry.src ];
		case 'script':
		case 'scss':
			return [ entry.src ];
		case 'copy': {
			const from = entry.from || '';
			if ( from.includes( '*' ) ) {
				return [ path.dirname( from.split( '*' )[ 0 ] ) || '.' ];
			}
			return [ from ];
		}
		default:
			return entry.src ? [ entry.src ] : [];
	}
}

/**
 * @param {string} changedPath
 * @param {string} projectRoot
 * @param {object} normalizedConfig
 * @return {object[]}
 */
export function getEntriesForChangedPath( changedPath, projectRoot, normalizedConfig ) {
	const relativePath = path.relative( projectRoot, changedPath ).replace( /\\/g, '/' );
	const affected = [];

	for ( const entry of normalizedConfig.entries ) {
		const watchPaths = normalizedConfig.entryWatchMap.get( entry.name ) || [];
		const matches = watchPaths.some( ( watchPath ) => {
			const normalizedWatch = watchPath.replace( /\\/g, '/' ).replace( /\/$/, '' );
			return (
				relativePath === normalizedWatch ||
				relativePath.startsWith( `${ normalizedWatch }/` )
			);
		} );

		if ( matches ) {
			affected.push( entry );
		}
	}

	return affected.length > 0 ? affected : normalizedConfig.entries;
}
