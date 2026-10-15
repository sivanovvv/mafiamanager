/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.color.js - Utilities for working with colors
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.color', function () {

		/**
		 * Initialize color module
		 *
		 * @returns 	{void}
		 */
		var init = function () {};

		/**
		 * Changes the provided hex value to have the provided hue/saturation levels
		 *
		 * @param		{string}	hex 	Hex color to start with
		 * @param 		{number}	toHue	New hue level
		 * @param 		{number}	toSat 	New saturation level
		 * @returns 	{string} 	New hex color
		 */
		var convertHex = function (hex, toHue, toSat) {
			hex = hex.replace( '#', '' );
			
			// Check for shorthand hex
			if( hex.length === 3 ){
				hex = hex.slice( 0, 1 ) + hex.slice( 0, 1 ) + hex.slice( 1, 2 ) + hex.slice( 1, 2 ) + hex.slice( 2, 3) + hex.slice( 2, 3 );
			}
			
			if( hex.length !== 6 ){
				Debug.write( hex + " isn't a valid hex color");
				return false;
			}
			
			// Split the hex into pieces, convert to RGB, and create fraction
			var r = ( hexToRGB( hex.slice( 0, 2 ) ) / 255 );
			var g = ( hexToRGB( hex.slice( 2, 4 ) ) / 255 );
			var b = ( hexToRGB( hex.slice( 4, 6 ) ) / 255 );

			// Convert to HSL
			var hsl = RGBtoHSL( r, g, b );

			// Change our hue to a fraction
			hsl[0] = (1 / 360) * toHue;			
			hsl[1] = (1 / 100) * toSat;

			// Back to RGB
			var rgb = HSLtoRGB( hsl[0], hsl[1], hsl[2] );

			return RGBtoHex( rgb[0], rgb[1], rgb[2] );
		},
		
		/**
		 * Converts the provided HSL values to their RGB versions
		 *
		 * @param		{number}	h 	Hue
		 * @param 		{number}	s	Saturation
		 * @param 		{number}	l 	Luminosity
		 * @returns 	{array} 	[ red, green, blue ]
		 */
		HSLtoRGB = function( h, s, l ){			
			var red = 0;
			var green = 0;
			var blue = 0;
			var v2 = 0;

			if( s == 0 ){
				red = l * 255;
				green = l * 255;
				blue = l * 255;
			} else {
				if( l < 0.5 ){
					v2 = l * ( 1 + s );
				} else {
					v2 = ( l + s ) - ( s * l );
				}
				
				var v1 = 2 * l - v2;
				
				red = 255 * hueToRGB( v1, v2, (h + ( 1 / 3 ) ) );
				green = 255 * hueToRGB( v1, v2, h );
				blue = 255 * hueToRGB( v1, v2, (h - ( 1 / 3 ) ) );
			}

			return [ Math.round( red ), Math.round( green ), Math.round( blue ) ];
		},
		
		/**
		 * Changes the provided hue values into an RGB value
		 *
		 * @returns 	{number} 	New RGB value
		 */
		hueToRGB = function( v1, v2, h ){
			if( h < 0 ){ 
				h += 1; 
			}

			if( h > 1 ){
				h -= 1; 
			}
			
			if( ( 6 * h ) < 1 ){
				return ( v1 + ( v2 - v1 ) * 6 * h );
			}

			if( ( 2 * h ) < 1 ){
				return v2;
			}

			if( ( 3 * h ) < 2 ){
				return ( v1 + ( v2 - v1 ) * ( ( 2 / 3 ) - h ) * 6 );
			}
			
			return v1;
		},
		
		/**
		 * Converts the provided RGB values to their HSL versions
		 *
		 * @param		{number}	r 	Red
		 * @param 		{number}	g	Green
		 * @param 		{number}	b 	Blue
		 * @returns 	{array} 	[ hue, saturation, lightness ]
		 */
		RGBtoHSL = function (r, g, b) {
			var lightness, hue, saturation = 0;

			var min = Math.min(r, g, b);
			var max = Math.max(r, g, b);

			var delta = max - min;
			
			lightness = ( max + min ) / 2;
			
			if( delta == 0 ){ 	// Grey
				hue = 0;
				saturation = 0;
			} else {
				if( lightness < 0.5 ){
					saturation = delta / ( max + min );
				} else {
					saturation = delta / ( 2 - max - min );
				}
				
				var delta_r = ( ( ( max - r ) / 6 ) + ( delta / 2 ) ) / delta;
				var delta_g = ( ( ( max - g ) / 6 ) + ( delta / 2 ) ) / delta;
				var delta_b = ( ( ( max - b ) / 6 ) + ( delta / 2 ) ) / delta;
				
				if( r == max ){
					hue = delta_b - delta_g;
				} else if( g == max ){
					hue = ( 1 / 3 ) + delta_r - delta_b;
				} else if( b == max ){
					hue = ( 2 / 3 ) + delta_g - delta_r;
				}
				
				if( hue < 0 ){
					hue += 1;
				}
				
				if( hue > 1 ){
					hue -= 1;
				}
			}
			
			return [ hue, saturation, lightness ];
		},
		
		/**
		 * Converts the provided hex into an RGB value
		 *
		 * @param		{string}	hex 	Hex value
		 * @returns 	{number} 	RGB value (0-255)
		 */
		hexToRGB = function (hex) {
			if( hex.length === 2 ){
				return parseInt( hex,16 );
			}

			hex = hex.replace( '#', '' );

			if( hex.length === 3 ){
				hex = hex.slice( 0, 1 ) + hex.slice( 0, 1 ) + hex.slice( 1, 2 ) + hex.slice( 1, 2 ) + hex.slice( 2, 3) + hex.slice( 2, 3 );
			}

			if( hex.length !== 6 ){
				Debug.write( hex + " isn't a valid hex color");
				return [0,0,0];
			}

			return [ hexToRGB( hex.slice( 0, 2 ) ) / 255, hexToRGB( hex.slice( 2, 4 ) ) / 255, hexToRGB( hex.slice( 4, 6 ) ) / 255 ];
		},
		
		/**
		 * Converts the provided RGB values to their Hex version
		 *
		 * @param		{number}	r 	Red
		 * @param 		{number}	g	Green
		 * @param 		{number}	b 	Blue
		 * @returns 	{string} 	Hex
		 */
		RGBtoHex = function (r, g, b) {
			var hex = [ r.toString(16), g.toString(16), b.toString(16) ];

			for (const [nr, val] of hex.entries()) {
				if( val.length == 1 ){
					hex[ nr ] = '0' + val;
				}
			};

			return hex.join('');
		};

		let iroState = 'unloaded';
		const iroCallbacks = new Set();

		return {
			convertHex: convertHex,
			HSLtoRGB: HSLtoRGB,
			hueToRGB: hueToRGB,
			RGBtoHSL: RGBtoHSL,
			hexToRGB: hexToRGB,
			RGBtoHex: RGBtoHex,
			/**
			 *
			 * @return {Promise<void>}
			 */
			loadIro() {
				return new Promise((resolve, reject) => {
					if (iroState === 'loaded' || ips.utils.iro) {
						iroState = 'loaded';
						resolve();
						return;
					}

					iroCallbacks.add([resolve, reject]);
					if (iroState === 'loading') {
						return;
					}

					iroState = 'loading';

					function failed(e) {
						if (iroState === 'loading') {
							iroState = 'error';
						}

						iroCallbacks.forEach(cb => cb[1](e || new Error('Could not load iro js dependency after 10s')));
						iroCallbacks.clear();
					}

					window.addEventListener('ips:iroLoaded', () => {
						iroState = 'loaded';
						Debug.log("Loaded color picker");
						iroCallbacks.forEach(cb => cb[0]());
						iroCallbacks.clear();
					}, {once: true});

					if (document.querySelector('script[data-iro-loader]')) {
						iroState = 'loading';
					} else {
						const manifestURL = ips.getSetting('baseURL').replace(/\/+$/, '') + `/applications/core/interface/static/iro/manifest.json?antiCache=${encodeURIComponent(ips.getSetting('jsAntiCache'))}`;
						ips.fetch(manifestURL)
							.then(response => {
								for (const detail of Object.values(response)) {
									if (detail.isEntry) {
										const script = document.createElement('script');
										script.setAttribute('data-iro-loader', '');
										script.setAttribute('type', 'module')
										document.body.appendChild(script);
										script.src = ips.getSetting('baseURL').replace(/\/+$/, '') + '/applications/core/interface/static/iro/' + detail.file + "?antiCache=" + encodeURIComponent(ips.getSetting('jsAntiCache'));
									}
								}
							})
							.catch(failed);
					}

					setTimeout(() => failed(), 10000);
				});
			}
		};
	});

}(jQuery));