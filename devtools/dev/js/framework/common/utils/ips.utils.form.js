/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.form.js - Form utilities
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.form', function () {

		/**
		 * Serialize a jquery object as an object of values
		 *
		 * @returns object
		 */
		var serializeAsObject = function (jQueryObj, customSerializers) {
			var asArray = jQueryObj.serializeArray();
			var output = {};

			for (const val of asArray ) {
				var outValue = val.value;

				// Do we have a custom serializer function for this field?
				if( customSerializers && customSerializers[ val.name ] !== undefined && typeof customSerializers[ val.name ] === "function" ){
					outValue = customSerializers[ val.name ]( val.name, val.value );
				} 

				var keys = _splitFieldName( val.name );
				_addValueToKey( output, keys, outValue );
			};

			return output;
		};

		/**
		 * Splits a field name into an array of keys
		 * e.e. key[subkey][subsubkey] becomes ['key', 'subkey', 'subsubkey']
		 *
		 * @returns 	{array}
		 */
		var _splitFieldName = function (name) {
			var parts = name.split('[');

			parts = parts.map(part =>
				part.replace(/\]/g, '')
			);

			if( parts[0] === '' ){
				parts.shift(); 
			}

			return parts;
		},

		/**
		 * Takes an array of keys (from _splitFieldName) and creates the deep array in 
		 * output with the specified value
		 *
		 * @returns 	{void}
		 */
		_addValueToKey = function (output, keys, value) {
			if( typeof output !== "object" || output === null ){
				output = {};
			}

			var currentPath = output;

			if( Array.isArray( keys ) ){
				for( var i = 0; i < keys.length; i++ ){
					if( currentPath[ keys[i] ] === undefined ){
						currentPath[ keys[i] ] = ( i == keys.length - 1 ) ? value : {};
					}
					currentPath = currentPath[ keys[i] ];
				}
			} else {
				output[ keys ] = value;
			}
		};

		return {
			serializeAsObject: serializeAsObject		
		};
	});
}(jQuery));