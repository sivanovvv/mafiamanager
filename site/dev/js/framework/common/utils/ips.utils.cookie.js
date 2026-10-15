/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.cookie.js - Cookie management module
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.cookie', function () {

		var _store = {},
			_init = false;

		/**
		 * Initialize cookie module
		 *
		 * @returns 	{void}
		 */
		var init = function () {

			var cookies = _parseCookies( document.cookie.replace(" ", '') ),
				cookieID = ips.getSetting('cookie_prefix') || false;

			$.each( cookies, function (key, cookie) {
				
				if( cookieID ){
					if( key.startsWith( cookieID ) ){
						key = key.replace( cookieID, '' );
						_store[ key ] = unescape( cookie || '' );
					}
				}				
			});

			_init = true;
		},

		/**
		 * Return a cookie value
		 *
		 * @param	{string} 	cookieKey 	Cookie value to get, passed without the prefix
		 * @returns {mixed}		Cookie value or undefined
		 */
		get = function (cookieKey) {
			if( !_init ){
				init();
			}

			if( _store[ cookieKey ] ){
				return _store[ cookieKey ];
			}

			return undefined;
		},

		/**
		 * Set a cookie value
		 *
		 * @param	{string} 	cookieKey 	Key to set
		 * @param 	{mixed} 	value 		Value to set in this cookie
		 * @param 	{boolean} 	sticky 		Whether to make this a long-lasting cookie
		 * @returns {void}
		 */
		set = function( cookieKey, value, sticky ) {

			var expires = '',
				path = '/',
				domain = '',
				ssl = '',
				prefix = '';
			
			if( !cookieKey ){
				return;
			}
			
			// Exit if we want to skip optional cookies
			let allowOptional = true;

			// Check for optional cookies, but only on the frontend.
			if( ips.getSetting('cookieConsent') === 1 && !ipsSettings.isAcp )
			{
				allowOptional = !!(ips.utils.cookie.get('cookie_consent') && ips.utils.cookie.get('cookie_consent_optional'));
			}

			// If this isn't an essential cookie, return early
			if( !allowOptional && ips.getSetting('essential_cookies').indexOf( cookieKey ) === -1 )
			{
				return;
			}

			if( sticky !== undefined ){	
				if( sticky === true ){
					var expirationDate = new Date();
					expirationDate.setFullYear( expirationDate.getFullYear() + 100 );

					expires = "; expires=" + expirationDate.toUTCString();
				} else if( sticky === -1 ){
					expires = "; expires=Thu, 01-Jan-1970 00:00:01 GMT";
				} else if( sticky.length > 10 ){
					expires = "; expires=" + sticky;
				}
			}

			if( ips.getSetting('cookie_domain') !== undefined && ips.getSetting('cookie_domain') != '' ){
				domain = "; domain=" + ips.getSetting('cookie_domain');
			}

			if( ips.getSetting('cookie_path') !== undefined && ips.getSetting('cookie_path') != '' ){
				path = ips.getSetting('cookie_path');
			}

			if( ips.getSetting('cookie_prefix') !== undefined && ips.getSetting('cookie_prefix') != '' ){
				prefix = ips.getSetting('cookie_prefix');
			}

			if( ips.getSetting('cookie_ssl') !== undefined && ips.getSetting('cookie_ssl') != '' ){
				ssl = '; secure';
			}
			
			document.cookie = prefix + cookieKey + "=" + escape( value ) + "; path=" + path + expires + domain + ssl + ';';

			_store[ cookieKey ] = value;
		},

		/**
		 * Deletes a cookie
		 *
		 * @param	{string} 	cookieKey 	Key to delete
		 * @returns {void}
		 */
		unset = function (cookieKey) {
			if( _store[ cookieKey ] ){
				set( cookieKey, '', -1 );
			}
		},

		/**
		 * Parses the provided string as a query string and returns an object representation
		 *
		 * @param	{string} 	cookieString 	Query string to parse
		 * @returns {object}
		 */
		_parseCookies = function (cookieString) {
			var pairs = cookieString.split(";"),
				cookies = {};
			
			for ( var i=0; i<pairs.length; i++ ){
				var pair = pairs[i].split("=");
				cookies[ pair[0].trim() ] = unescape( pair[1] ).trim();
			}

			return cookies;
		};

		return {
			init: init,
			get: get,
			set: set,
			unset: unset
		};
	});

}(jQuery));