/**
 * Export JSON-serializable values as PHP array literals.
 *
 * @param {unknown} value
 * @param {string} indent
 * @return {string}
 */
export function exportToPhp( value, indent = '\t' ) {
	if ( value === null ) {
		return 'null';
	}

	if ( typeof value === 'boolean' ) {
		return value ? 'true' : 'false';
	}

	if ( typeof value === 'number' ) {
		return Number.isFinite( value ) ? String( value ) : 'null';
	}

	if ( typeof value === 'string' ) {
		return `'${ value
			.replace( /\\/g, '\\\\' )
			.replace( /'/g, "\\'" ) }'`;
	}

	if ( Array.isArray( value ) ) {
		if ( value.length === 0 ) {
			return 'array()';
		}

		const childIndent = indent + '\t';
		const items = value
			.map( ( item ) => `${ childIndent }${ exportToPhp( item, childIndent ) }` )
			.join( ',\n' );

		return `array(\n${ items }\n${ indent })`;
	}

	if ( typeof value === 'object' ) {
		const entries = Object.entries( value );

		if ( entries.length === 0 ) {
			return 'array()';
		}

		const childIndent = indent + '\t';
		const items = entries
			.map(
				( [ key, item ] ) =>
					`${ childIndent }'${ String( key ).replace( /'/g, "\\'" ) }' => ${ exportToPhp(
						item,
						childIndent
					) }`
			)
			.join( ',\n' );

		return `array(\n${ items }\n${ indent })`;
	}

	return 'null';
}
