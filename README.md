# @cloudcatch/wp-esbuild

A shared [esbuild](https://esbuild.github.io/) toolchain for WordPress development. It builds Gutenberg blocks, theme/plugin JavaScript, script modules, and SCSS while emitting the `*.asset.php` and `blocks-manifest.php` files that WordPress expects — a fast, dependency-light alternative to `@wordpress/scripts`.

## Features

- **Block builds** — discovers `src/blocks/*/block.json` and compiles `index.js`, `view.js`, `style.scss`, and `editor.scss`, copying `block.json` and `render.php` to the output.
- **WordPress externals** — rewrites `@wordpress/*` and common vendor imports (React, lodash, jQuery, moment) to their `window.wp.*` globals and generates matching `*.asset.php` dependency/version files.
- **Script modules** — supports `viewScriptModule` blocks and theme modules with module-aware `*.asset.php` output.
- **SCSS** — compiles SCSS via `sass-embedded` and runs Autoprefixer over the result.
- **Blocks manifest** — generates `blocks-manifest.php` for `wp_register_block_metadata_collection()`.
- **Watch mode** — rebuilds on change with debouncing.

## Installation

```bash
npm install --save-dev @cloudcatch/wp-esbuild
```

Requires Node.js >= 18.

## Usage

### CLI

```bash
# Build using the current working directory as the project root
npx wp-esbuild

# Watch for changes
npx wp-esbuild --watch

# Build from a specific project root
npx wp-esbuild --root ./wp-content/themes/my-theme

# Generate only the blocks manifest
npx wp-esbuild --blocks-manifest
```

Typical `package.json` scripts:

```json
{
  "scripts": {
    "build": "NODE_ENV=production wp-esbuild",
    "start": "wp-esbuild --watch"
  }
}
```

### Options

| Flag | Alias | Description |
| --- | --- | --- |
| `--root <path>` | `-r` | Project root to build (defaults to `cwd`). |
| `--watch` | `-w` | Rebuild on file changes. |
| `--blocks-manifest` | | Only generate `blocks-manifest.php`. |

## Configuration

Defaults work out of the box. To customize, add a `wp-esbuild.config.mjs` file to your project root. It may export a config object or a function that receives `{ env }` and returns one.

```js
// wp-esbuild.config.mjs
export default {
  blocks: { src: 'src/blocks', out: 'build/blocks' },
  js: { src: 'src/js', out: 'build/js' },
  modules: { src: 'src/js/modules', out: 'build/js/modules' },
  scss: { src: 'src/scss', out: 'build/css' },
  blocksManifest: {
    enabled: true,
    input: 'build/blocks',
    output: 'build/blocks/blocks-manifest.php',
  },
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
};
```

User config is deep-merged over the defaults below:

| Key | Default | Description |
| --- | --- | --- |
| `blocks.src` / `blocks.out` | `src/blocks` / `build/blocks` | Block source and output directories. |
| `js.src` / `js.out` | `src/js` / `build/js` | Top-level theme/plugin scripts. |
| `modules.src` / `modules.out` | `src/js/modules` / `build/js/modules` | Script modules (ESM). |
| `scss.src` / `scss.out` | `src/scss` / `build/css` | Standalone SCSS entry points. |
| `blocksManifest.enabled` | `true` | Generate `blocks-manifest.php` after a build. |
| `minify` | `NODE_ENV === 'production'` | Minify output. |
| `sourcemap` | `NODE_ENV !== 'production'` | Emit source maps. |

## Programmatic API

```js
import { build } from '@cloudcatch/wp-esbuild';
import { buildBlocksManifest } from '@cloudcatch/wp-esbuild/blocks-manifest';
import {
  wordpressExternalsPlugin,
  wordpressModuleExternalsPlugin,
  stripStyleImportsPlugin,
} from '@cloudcatch/wp-esbuild/wordpress-externals';

await build(process.cwd(), { watch: false });
```

## License

MIT
