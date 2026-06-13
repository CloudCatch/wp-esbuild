/**
 * esbuild plugin: externalize WordPress packages and vendors; emit .asset.php files.
 */

import { writeFile, readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { camelCase } from 'change-case';
import { defaultWordpressBundledPackages } from './config.mjs';

const defaultVendorExternals = {
	react: { global: 'React', handle: 'react' },
	'react-dom': { global: 'ReactDOM', handle: 'react-dom' },
	'react-dom/client': { global: 'ReactDOM', handle: 'react-dom' },
	'react/jsx-runtime': { global: 'ReactJSXRuntime', handle: 'react-jsx-runtime' },
	'react/jsx-dev-runtime': { global: 'ReactJSXRuntime', handle: 'react-jsx-runtime' },
	moment: { global: 'moment', handle: 'moment' },
	lodash: { global: 'lodash', handle: 'lodash' },
	'lodash-es': { global: 'lodash', handle: 'lodash' },
	jquery: { global: 'jQuery', handle: 'jquery' },
};

const wordpressPackages = [
	{ pattern: /^@wordpress\/a11y$/, global: 'wp.a11y', handle: 'wp-a11y' },
	{ pattern: /^@wordpress\/api-fetch$/, global: 'wp.apiFetch', handle: 'wp-api-fetch' },
	{ pattern: /^@wordpress\/autop$/, global: 'wp.autop', handle: 'wp-autop' },
	{ pattern: /^@wordpress\/blob$/, global: 'wp.blob', handle: 'wp-blob' },
	{ pattern: /^@wordpress\/block-editor$/, global: 'wp.blockEditor', handle: 'wp-block-editor' },
	{ pattern: /^@wordpress\/blocks$/, global: 'wp.blocks', handle: 'wp-blocks' },
	{ pattern: /^@wordpress\/components$/, global: 'wp.components', handle: 'wp-components' },
	{ pattern: /^@wordpress\/compose$/, global: 'wp.compose', handle: 'wp-compose' },
	{ pattern: /^@wordpress\/core-data$/, global: 'wp.coreData', handle: 'wp-core-data' },
	{ pattern: /^@wordpress\/data$/, global: 'wp.data', handle: 'wp-data' },
	{ pattern: /^@wordpress\/date$/, global: 'wp.date', handle: 'wp-date' },
	{ pattern: /^@wordpress\/deprecated$/, global: 'wp.deprecated', handle: 'wp-deprecated' },
	{ pattern: /^@wordpress\/dom$/, global: 'wp.dom', handle: 'wp-dom' },
	{ pattern: /^@wordpress\/dom-ready$/, global: 'wp.domReady', handle: 'wp-dom-ready' },
	{ pattern: /^@wordpress\/element$/, global: 'wp.element', handle: 'wp-element' },
	{ pattern: /^@wordpress\/escape-html$/, global: 'wp.escapeHtml', handle: 'wp-escape-html' },
	{ pattern: /^@wordpress\/hooks$/, global: 'wp.hooks', handle: 'wp-hooks' },
	{ pattern: /^@wordpress\/html-entities$/, global: 'wp.htmlEntities', handle: 'wp-html-entities' },
	{ pattern: /^@wordpress\/i18n$/, global: 'wp.i18n', handle: 'wp-i18n' },
	{ pattern: /^@wordpress\/notices$/, global: 'wp.notices', handle: 'wp-notices' },
	{ pattern: /^@wordpress\/primitives$/, global: 'wp.primitives', handle: 'wp-primitives' },
	{ pattern: /^@wordpress\/rich-text$/, global: 'wp.richText', handle: 'wp-rich-text' },
	{ pattern: /^@wordpress\/server-side-render$/, global: 'wp.serverSideRender', handle: 'wp-server-side-render' },
	{ pattern: /^@wordpress\/url$/, global: 'wp.url', handle: 'wp-url' },
];

/**
 * @param {object} [externalsConfig]
 * @return {Set<string>}
 */
function resolveBundledPackages( externalsConfig = {} ) {
	return new Set( [
		...defaultWordpressBundledPackages,
		...( externalsConfig.bundle || [] ),
	] );
}

/**
 * @param {object} [externalsConfig]
 * @return {Record<string, object>}
 */
function resolveVendorExternals( externalsConfig = {} ) {
	return {
		...defaultVendorExternals,
		...( externalsConfig.vendors || {} ),
	};
}

/**
 * @param {string} assetBaseName e.g. "index" or "view"
 * @param {string[]} extraDependencies
 * @param {object} [externalsConfig]
 * @return {import('esbuild').Plugin}
 */
export function wordpressExternalsPlugin(
	assetBaseName = 'index',
	extraDependencies = [],
	externalsConfig = {}
) {
	return {
		name: 'wordpress-externals',
		setup( build ) {
			const dependencies = new Set( extraDependencies );
			const bundledPackages = resolveBundledPackages( externalsConfig );
			const vendorExternals = resolveVendorExternals( externalsConfig );
			const forcedExternal = new Set( externalsConfig.external || [] );

			for ( const [ packageName, config ] of Object.entries( vendorExternals ) ) {
				build.onResolve(
					{ filter: new RegExp( `^${ packageName.replace( '/', '\\/' ) }$` ) },
					() => {
						dependencies.add( config.handle );
						return {
							path: packageName,
							namespace: 'vendor-external',
							pluginData: { global: config.global },
						};
					}
				);
			}

			for ( const wpPackage of wordpressPackages ) {
				build.onResolve( { filter: wpPackage.pattern }, ( args ) => {
					if ( forcedExternal.has( args.path ) ) {
						return null;
					}

					dependencies.add( wpPackage.handle );
					return {
						path: args.path,
						namespace: 'wordpress-external',
						pluginData: { global: wpPackage.global },
					};
				} );
			}

			build.onResolve( { filter: /^@wordpress\// }, ( args ) => {
				if ( bundledPackages.has( args.path ) ) {
					return null;
				}

				if ( forcedExternal.has( args.path ) ) {
					return null;
				}

				const shortName = args.path.split( '/' )[ 1 ];
				const handle = `wp-${ shortName }`;
				const global = `wp.${ camelCase( shortName ) }`;
				dependencies.add( handle );
				return {
					path: args.path,
					namespace: 'wordpress-external',
					pluginData: { global },
				};
			} );

			build.onLoad( { filter: /.*/, namespace: 'vendor-external' }, ( args ) => ( {
				contents: `module.exports = window.${ args.pluginData.global };`,
				loader: 'js',
			} ) );

			build.onLoad( { filter: /.*/, namespace: 'wordpress-external' }, ( args ) => ( {
				contents: `module.exports = window.${ args.pluginData.global };`,
				loader: 'js',
			} ) );

			build.onEnd( async ( result ) => {
				if ( result.errors.length > 0 || ! build.initialOptions.outfile ) {
					return;
				}

				const outputFile = build.initialOptions.outfile;
				const content = await readFile( outputFile );
				const version = createHash( 'sha256' )
					.update( content )
					.digest( 'hex' )
					.slice( 0, 20 );

				const depsString = Array.from( dependencies )
					.sort()
					.map( ( dep ) => `'${ dep }'` )
					.join( ', ' );

				const assetPath = outputFile.replace( /\.m?js$/, '.asset.php' );
				const assetContent = `<?php return array(
	'dependencies' => array( ${ depsString } ),
	'version' => '${ version }',
);
`;

				await writeFile( assetPath, assetContent );
			} );
		},
	};
}

/**
 * Externalize WordPress script module imports and emit view.asset.php matching
 * @wordpress/dependency-extraction-webpack-plugin module output.
 *
 * @param {string} assetBaseName
 * @param {object} [externalsConfig]
 * @return {import('esbuild').Plugin}
 */
export function wordpressModuleExternalsPlugin( assetBaseName = 'view', externalsConfig = {} ) {
	return {
		name: 'wordpress-module-externals',
		setup( build ) {
			/** @type {Set<string>} */
			const staticDependencies = new Set();
			/** @type {Set<string>} */
			const dynamicDependencies = new Set();
			const bundledPackages = resolveBundledPackages( externalsConfig );

			build.onResolve( { filter: /^@wordpress\// }, ( args ) => {
				if ( bundledPackages.has( args.path ) ) {
					return null;
				}

				if ( args.kind === 'dynamic-import' ) {
					dynamicDependencies.add( args.path );
				} else {
					staticDependencies.add( args.path );
				}

				return {
					path: args.path,
					external: true,
				};
			} );

			build.onEnd( async ( result ) => {
				if ( result.errors.length > 0 || ! build.initialOptions.outfile ) {
					return;
				}

				const outputFile = build.initialOptions.outfile;
				const content = await readFile( outputFile );
				const version = createHash( 'sha256' )
					.update( content )
					.digest( 'hex' )
					.slice( 0, 20 );

				const dependencyEntries = [
					...Array.from( staticDependencies ).sort().map( ( id ) => ( {
						type: 'static',
						id,
					} ) ),
					...Array.from( dynamicDependencies ).sort().map( ( id ) => ( {
						type: 'dynamic',
						id,
					} ) ),
				];

				const depsString = dependencyEntries
					.map( ( dep ) =>
						dep.type === 'dynamic'
							? `array( 'id' => '${ dep.id }', 'import' => 'dynamic' )`
							: `'${ dep.id }'`
					)
					.join( ', ' );

				const assetPath = outputFile.replace( /\.m?js$/, '.asset.php' );
				const assetContent = `<?php return array(
	'dependencies' => array( ${ depsString } ),
	'version' => '${ version }',
	'type' => 'module',
);
`;

				await writeFile( assetPath, assetContent );
			} );
		},
	};
}

/**
 * Strip SCSS/CSS imports from JS bundles; styles are compiled separately.
 *
 * @return {import('esbuild').Plugin}
 */
export function stripStyleImportsPlugin() {
	return {
		name: 'strip-style-imports',
		setup( build ) {
			build.onResolve( { filter: /\.(scss|css)$/ }, () => ( {
				path: 'empty-style',
				namespace: 'empty-style',
			} ) );

			build.onLoad( { filter: /.*/, namespace: 'empty-style' }, () => ( {
				contents: '',
				loader: 'js',
			} ) );
		},
	};
}

/**
 * Compile imported SCSS in JS bundles when extractCss is enabled.
 *
 * @return {import('esbuild').Plugin}
 */
export function extractStyleImportsPlugin() {
	return {
		name: 'extract-style-imports',
		setup( build ) {
			build.onResolve( { filter: /\.css$/ }, ( args ) => {
				if ( args.namespace === 'file' ) {
					return null;
				}
				return {
					path: args.path,
					namespace: 'css-file',
				};
			} );

			build.onLoad( { filter: /.*/, namespace: 'css-file' }, async ( args ) => ( {
				contents: await readFile( args.path, 'utf8' ),
				loader: 'css',
			} ) );

			build.onResolve( { filter: /\.scss$/ }, ( args ) => ( {
				path: args.path,
				namespace: 'scss-file',
			} ) );

			build.onLoad( { filter: /.*/, namespace: 'scss-file' }, async ( args ) => {
				const sass = await import( 'sass-embedded' );
				const result = sass.compile( args.path );
				return {
					contents: result.css,
					loader: 'css',
				};
			} );
		},
	};
}
