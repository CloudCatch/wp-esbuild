# @cloudcatch/wp-esbuild

[![npm version](https://img.shields.io/npm/v/@cloudcatch/wp-esbuild.svg)](https://www.npmjs.com/package/@cloudcatch/wp-esbuild)
[![npm downloads](https://img.shields.io/npm/dm/@cloudcatch/wp-esbuild.svg)](https://www.npmjs.com/package/@cloudcatch/wp-esbuild)
[![Node.js](https://img.shields.io/node/v/@cloudcatch/wp-esbuild.svg)](https://www.npmjs.com/package/@cloudcatch/wp-esbuild)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Fast esbuild-based builds for WordPress plugins and themes.**

wp-esbuild is a build tool for modern WordPress development. It compiles your blocks, JavaScript, and styles into optimized assets your plugin or theme can enqueue in PHP — with sensible defaults and a config file when you need more control.

Works with the standard `src/` → `build/` layout out of the box. Supports TypeScript, script modules, SCSS, custom directory structures, and multiple build pipelines.

## Installation

```bash
npm install --save-dev @cloudcatch/wp-esbuild
```

Requires Node.js >= 18.

```json
{
  "scripts": {
    "build": "NODE_ENV=production wp-esbuild",
    "start": "wp-esbuild --watch"
  }
}
```

Use `NODE_ENV=production` for minified output; omit it during development for source maps.

## Quick start

### Project layout

With no config file, wp-esbuild uses this structure:

```
my-plugin/
├── wp-esbuild.config.mjs   # optional
├── package.json
├── src/
│   ├── blocks/
│   │   └── my-block/
│   │       ├── block.json
│   │       ├── index.js
│   │       ├── style.scss      → build/blocks/my-block/style-index.css
│   │       ├── editor.scss     → build/blocks/my-block/index.css
│   │       ├── view.js         → build/blocks/my-block/view.js
│   │       └── render.php
│   ├── js/
│   │   ├── admin.js
│   │   └── modules/
│   │       └── my-module.js
│   └── scss/
│       └── main.scss
└── build/
```

Run `npm run build`. Each JS bundle gets a sibling `*.asset.php` with `dependencies` and `version`.

### Minimal config

```js
// wp-esbuild.config.mjs
import { defineConfig } from '@cloudcatch/wp-esbuild/config';

export default defineConfig( {
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
} );
```

## CLI

```bash
npx wp-esbuild                          # build
npx wp-esbuild --watch                  # watch and rebuild
npx wp-esbuild --root ./path/to/plugin  # build a specific project
npx wp-esbuild --blocks-manifest        # regenerate blocks-manifest.php only
```

| Flag | Alias | Description |
| --- | --- | --- |
| `--root <path>` | `-r` | Project root (default: current directory). |
| `--watch` | `-w` | Watch for changes and rebuild. |
| `--blocks-manifest` | | Generate the blocks manifest only. |

## Configuration

Add `wp-esbuild.config.mjs` to your project root. Export a config object or a function:

```js
export default ( { env } ) => ( {
  minify: env.NODE_ENV === 'production',
} );
```

`defineConfig` from `@cloudcatch/wp-esbuild/config` is optional; it warns about unknown keys and invalid entry definitions.

### Two ways to define pipelines

**Shorthand keys** — `blocks`, `js`, `modules`, `scss`, and `copy`. Each accepts an object or an array of objects. These are merged with defaults and run automatically when no `entries` array is set.

**`entries` array** — explicit, named pipelines. When `entries` is provided, shorthand keys are ignored.

### Global options

| Key | Default | Description |
| --- | --- | --- |
| `srcDir` | `'src'` | Default source root for shorthand paths. |
| `outDir` | `'build'` | Default output root for shorthand paths. |
| `entries` | — | Unified pipeline list (see below). |
| `blocks` | see defaults | Block compilation pipeline. |
| `js` | `{ src: 'src/js', out: 'build/js' }` | IIFE script bundles. |
| `modules` | `{ src: 'src/js/modules', out: 'build/js/modules' }` | ESM script modules. |
| `scss` | `{ src: 'src/scss', out: 'build/css' }` | Standalone stylesheets. |
| `copy` | `[]` | Static file copy tasks. |
| `minify` | `NODE_ENV === 'production'` | Minify JS and CSS output. |
| `sourcemap` | `NODE_ENV !== 'production'` | Emit source maps. |
| `esbuild` | `{}` | Global esbuild options (`target`, `define`, `alias`, `plugins`, `loader`). |
| `wordpressExternals` | `{}` | Dependency extraction settings. |
| `postcss` | `true` | PostCSS processing for CSS (see [PostCSS](#postcss)). |
| `rtl` | `false` | Generate `-rtl.css` files for SCSS output. |
| `plugins` | `[]` | Custom build hooks (see [Build plugins](#build-plugins)). |
| `blocksManifest` | enabled | `blocks-manifest.php` generation (see [Blocks manifest](#blocks-manifest)). |

#### `blocksManifest`

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Generate manifest after block builds. |
| `input` | `{outDir}/blocks` | Directory containing built `block.json` files. |
| `output` | `{outDir}/blocks/blocks-manifest.php` | Output file path. |

### Custom source and output roots

Set `srcDir` and `outDir` to avoid repeating paths:

```js
export default defineConfig( {
  srcDir: 'client',
  outDir: 'public',
  // shorthand defaults become client/blocks → public/blocks, etc.
} );
```

Explicit `src` / `out` on any pipeline override these defaults.

### Shorthand pipelines

Default behavior when using shorthand keys:

| Key | Source | Output | Notes |
| --- | --- | --- | --- |
| `blocks` | `{srcDir}/blocks` | `{outDir}/blocks` | Discovers `*/block.json` |
| `js` | `{srcDir}/js` | `{outDir}/js` | IIFE, all `*.{js,jsx,mjs,ts,tsx}` |
| `modules` | `{srcDir}/js/modules` | `{outDir}/js/modules` | ESM, recursive glob |
| `scss` | `{srcDir}/scss` | `{outDir}/css` | Ignores partials (`**/_*`) |
| `copy` | — | — | `{ from, to }` paths |

Override a single admin bundle and copy static assets:

```js
export default defineConfig( {
  js: {
    src: 'src/js',
    out: 'build/js',
    glob: 'admin.js',
  },
  copy: [
    { from: 'src/assets', to: 'build/assets' },
    { from: 'src/icons/**/*.svg', to: 'build/icons', flatten: true },
  ],
} );
```

Multiple JS output directories:

```js
export default defineConfig( {
  js: [
    { src: 'src/js', out: 'build/js', glob: '*.{js,jsx}' },
    { src: 'src/admin', out: 'build/admin', glob: '**/*.{js,ts,tsx}' },
  ],
} );
```

### Entries API

Use `entries` for full control over directory layout, nested blocks, or mixed pipeline types:

```js
export default defineConfig( {
  entries: [
    {
      name: 'blocks',
      type: 'blocks',
      src: 'src/blocks',
      out: 'build/blocks',
      discover: '*/block.json',
      copy: [ 'block.json', 'render.php' ],
    },
    {
      name: 'admin',
      type: 'script',
      src: 'src/js',
      out: 'build/js',
      glob: '**/*.{js,ts,tsx}',
      format: 'iife',
    },
    {
      name: 'modules',
      type: 'script',
      src: 'src/js/modules',
      out: 'build/js/modules',
      glob: '**/*.{js,ts}',
      format: 'esm',
    },
    {
      name: 'styles',
      type: 'scss',
      src: 'src/scss',
      out: 'build/css',
      glob: '**/*.scss',
      ignore: [ '**/_*' ],
    },
    {
      name: 'assets',
      type: 'copy',
      from: 'src/assets',
      to: 'build/assets',
    },
  ],
} );
```

Shared entry fields: `name`, `type`, `enabled` (set `false` to skip), `esbuild` (per-entry overrides).

## Entry types

### Blocks

Discovers block directories via a glob, then compiles each block:

| Source | Output |
| --- | --- |
| `index.js` | `index.js` + `index.asset.php` |
| `view.js` | `view.js` + `view.asset.php` (ESM when `viewScriptModule` is set in `block.json`) |
| `style.scss` | `style-index.css` |
| `editor.scss` | `index.css` |
| `block.json`, `render.php`, … | Copied as-is |

The block entry file must be named `index.js` (it can import `.ts` / `.tsx` files). Output slug is the block folder name. Nested discovery (`**/block.json`) flattens to the directory basename.

| Option | Default | Description |
| --- | --- | --- |
| `discover` | `'*/block.json'` | Glob under `src` for block.json files. |
| `copy` | `[ 'block.json', 'render.php' ]` | Files to copy from each block directory. |
| `rtl` | global setting | Generate RTL CSS for block styles. |

Reference compiled assets in `block.json` with `file:./index.js`, `file:./style-index.css`, etc.

### Scripts

Compiles files matching `glob` in `src` to `.js` in `out`.

| Option | Default | Description |
| --- | --- | --- |
| `glob` | `*.{js,jsx,mjs,ts,tsx}` | Entry file pattern. |
| `format` | `'iife'` | `'iife'` or `'esm'`. |
| `wordpressExternals` | `true` (IIFE) | Externalize `@wordpress/*` and emit `.asset.php`. |
| `assetPhp` | `true` | Write dependency file beside each bundle. |
| `extractCss` | `false` | Compile imported styles into the bundle instead of stripping them. |

Recursive globs preserve directory structure in the output.

### SCSS

Compiles standalone stylesheets (block styles are handled by the blocks pipeline).

| Option | Default | Description |
| --- | --- | --- |
| `glob` | `*.{scss,sass}` | Entry file pattern. |
| `ignore` | `[ '**/_*' ]` | Skip partials. |
| `outName` | `'preserve'` or `'flat'` | Output naming (see below). |
| `assetPhp` | `false` | Write `{name}.asset.php` with a content hash version. |
| `assetDependencies` | `[]` | Dependencies listed in CSS `.asset.php`. |
| `rtl` | global setting | Write `{name}-rtl.css` alongside each file. |

**`outName` values:**

| Value | Example input | Output |
| --- | --- | --- |
| `'preserve'` | `blocks/core/button.scss` | `blocks/core/button.css` |
| `'flat'` | `blocks/core/button.scss` | `button.css` |
| `{ join: '-', tail: 2 }` | `blocks/core/button.scss` | `core-button.css` |
| `{ join: '-' }` | `blocks/core/button.scss` | `blocks-core-button.css` |

Use `tail` to take the last N path segments (filename included) and `join` to flatten them into a single output filename. Handy when PHP expects flat CSS files derived from nested source paths.

### Copy

| Option | Description |
| --- | --- |
| `from` | Source path or glob, relative to project root. |
| `to` | Destination path, relative to project root. |
| `flatten` | When `true`, glob matches are copied flat into `to`. |

## Blocks manifest

When a blocks pipeline runs and `blocksManifest.enabled` is `true`, wp-esbuild writes a PHP file mapping block slugs to their `block.json` contents.

Register blocks in WordPress 6.7+:

```php
$blocks_dir = plugin_dir_path( __FILE__ ) . 'build/blocks';

wp_register_block_metadata_collection(
    $blocks_dir,
    $blocks_dir . '/blocks-manifest.php'
);

$manifest = require $blocks_dir . '/blocks-manifest.php';
foreach ( array_keys( $manifest ) as $slug ) {
    register_block_type( $blocks_dir . '/' . $slug );
}
```

Custom manifest paths:

```js
blocksManifest: {
  input: 'public/features',
  output: 'public/features/blocks-manifest.php',
},
```

## WordPress externals

IIFE bundles externalize `@wordpress/*` imports to `window.wp.*` globals and list script handles in `*.asset.php`. Common npm packages map to WordPress globals:

| Import | Handle |
| --- | --- |
| `react` | `react` |
| `react-dom` | `react-dom` |
| `lodash` / `lodash-es` | `lodash` |
| `jquery` | `jquery` |
| `moment` | `moment` |

### Bundling packages

Some `@wordpress/*` packages have no script handle and are bundled by default (`@wordpress/icons`, `@wordpress/dataviews`, and others). Add more to the bundle list:

```js
wordpressExternals: {
  bundle: [ '@wordpress/icons', '@wordpress/dataviews' ],
},
```

Force a bundled package back to external, or map custom vendors:

```js
wordpressExternals: {
  external: [ '@wordpress/icons' ],
  vendors: {
    'my-lib': { global: 'MyLib', handle: 'my-lib' },
  },
},
```

### Script modules

ESM bundles (`format: 'esm'`) emit module-compatible `.asset.php` files for `wp_register_script_module()`:

```php
return array(
    'dependencies' => array( '@wordpress/interactivity' ),
    'version'      => '…',
    'type'         => 'module',
);
```

Set `"viewScriptModule": "file:./view.js"` in `block.json` to build block view scripts as modules.

## PostCSS

| Value | Behavior |
| --- | --- |
| `true` | Load `postcss.config.mjs` / `.js` / `.cjs`, or use Autoprefixer. |
| `false` | Skip PostCSS. |
| `[ plugins ]` | Use a custom plugin array. |

### RTL

```js
export default defineConfig( { rtl: true } );
```

Generates `main-rtl.css` next to each `main.css`. Enqueue when `is_rtl()`:

```php
wp_enqueue_style( 'my-admin', $url . 'main.css', [], $ver );
if ( is_rtl() ) {
    wp_enqueue_style( 'my-admin-rtl', $url . 'main-rtl.css', [ 'my-admin' ], $ver );
}
```

## TypeScript and JSX

`.ts`, `.tsx`, `.js`, and `.jsx` are supported out of the box. Block registration uses `index.js` as the entry point; admin and module pipelines can target `**/*.{ts,tsx}` directly.

## esbuild options

```js
export default defineConfig( {
  esbuild: {
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"production"' },
    alias: { '@': './src' },
    loader: { '.svg': 'text' },
  },
} );
```

Defaults: `bundle: true`, `platform: 'browser'`, `target: 'es2018'`, automatic JSX, and file loaders for images and fonts.

Per-entry `esbuild` options merge on top of global settings.

## Enqueueing in PHP

**Script bundle:**

```php
$asset = require __DIR__ . '/build/js/admin.asset.php';

wp_enqueue_script(
    'my-plugin-admin',
    plugins_url( 'build/js/admin.js', __FILE__ ),
    $asset['dependencies'],
    $asset['version'],
    true
);
```

**Script module:**

```php
$asset = require __DIR__ . '/build/js/modules/my-module.asset.php';

wp_register_script_module(
    'my-plugin/my-module',
    plugins_url( 'build/js/modules/my-module.js', __FILE__ ),
    $asset['dependencies'],
    $asset['version']
);
```

## Watch mode

`wp-esbuild --watch` debounces file changes and rebuilds affected pipelines. The blocks manifest regenerates when block output changes.

## Build plugins

Run custom steps after each build:

```js
export default defineConfig( {
  plugins: [
    {
      name: 'my-plugin',
      watch: [ 'config/schema.json' ],
      async build( { projectRoot, config, entries } ) {
        // custom build logic
      },
    },
  ],
} );
```

## Programmatic API

```js
import { build, defineConfig } from '@cloudcatch/wp-esbuild';
import { buildBlocksManifest } from '@cloudcatch/wp-esbuild/blocks-manifest';

await build( process.cwd(), { watch: false } );

await buildBlocksManifest( {
  projectRoot: process.cwd(),
  inputDir: 'build/blocks',
  outputFile: 'build/blocks/blocks-manifest.php',
} );
```

| Import | Exports |
| --- | --- |
| `@cloudcatch/wp-esbuild` | `build`, `defineConfig`, `normalizeConfig` |
| `@cloudcatch/wp-esbuild/config` | `defineConfig` |
| `@cloudcatch/wp-esbuild/blocks-manifest` | `buildBlocksManifest` |
| `@cloudcatch/wp-esbuild/wordpress-externals` | Externals esbuild plugins |

## Migrating from `@wordpress/scripts`

1. Replace `wp-scripts build` with `wp-esbuild` in your scripts.
2. Add `wp-esbuild.config.mjs` if you use custom paths or multiple bundles.
3. Keep block sources under `src/blocks/*/block.json` (or set `discover`).
4. Enqueue assets using the generated `*.asset.php` files — same format as `@wordpress/scripts`.

| `@wordpress/scripts` | wp-esbuild |
| --- | --- |
| Default entries | `blocks`, `js`, `modules`, `scss` shorthand keys |
| `build-blocks-manifest` | `blocksManifest.enabled` |
| Dependency extraction | `wordpressExternals` |
| PostCSS | `postcss: true` + optional config file |
| RTL | `rtl: true` |

## License

MIT
