import { registerBlockType } from '@wordpress/blocks';

registerBlockType( 'test/hello', {
	edit: () => null,
	save: () => null,
} );
