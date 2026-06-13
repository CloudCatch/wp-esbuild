import { registerBlockType } from '@wordpress/blocks';

registerBlockType( 'test/nested-child', {
	edit: () => null,
	save: () => null,
} );
