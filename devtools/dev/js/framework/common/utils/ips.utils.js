/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.js - General utilities
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils', function (options) {

		/**
		 * Converts an arguments object to an array
		 *
		 * @param	{object} 	obj 	Arguments object
		 * @returns {array}
		 */
		var argsToArray = function (obj) {
			return Array.prototype.slice.call( obj );
		},

		/**
		 * Mimics the _.debounce function from Underscore JS
		 * Creates and returns a debounced version of the passed function which will delay its execution
		 * until after `wait` milliseconds have elapsed since the last time it was invoked.
		 * Optionally executes immediately on the leading edge instead of the trailing.
		 *
		 * @param   {Function} func        The function to debounce
		 * @param   {number}   wait        Number of milliseconds to delay
		 * @param   {boolean}  [immediate] If true, trigger the function on the leading edge instead of the trailing
		 * @returns {Function}            A new debounced function
		 */
		debounce = function(func, wait, immediate) {
			var timeout;
			function debounced() {
				var context = this, args = arguments;
				clearTimeout(timeout);
				if (immediate && !timeout) func.apply(context, args);
				timeout = setTimeout(function() {
					timeout = null;
					if (!immediate) func.apply(context, args);
				}, wait);
			}
			// Add cancel method from Lodash (used in ips.ui.editorv5)
			debounced.cancel = function() {
				if (timeout) {
					clearTimeout(timeout);
					timeout = null;
				}
			};
			return debounced;
		},

		/**
		 * Mimics the _.throttle function from Underscore JS
		 * Creates and returns a throttled version of the passed function which will only execute
		 * once per specified time frame.
		 *
		 * @param   {Function} func       The function to throttle
		 * @param   {number}   timeFrame  The number of milliseconds to wait between allowed executions.
		 * @param 	{Object} [options]
		 * @param 	{boolean} [options.leading=true]	Whether to invoke the function on the leading edge of the timeout.
		 * @param 	{boolean} [options.trailing=true]	Whether to invoke the function on the trailing edge of the timeout.
		 * @returns {Function}	The throttled function. Includes a `cancel()` method.
		 */
		throttle = function(func, wait, options) {
			var timeout, context, args, result;
			var previous = 0;
			if (!options) options = {};

			var later = function() {
				previous = options.leading === false ? 0 : Date.now();
				timeout = null;
				result = func.apply(context, args);
				if (!timeout) context = args = null;
			};

			var throttled = function() {
				var _now = Date.now();
				if (!previous && options.leading === false) previous = _now;
				var remaining = wait - (_now - previous);
				context = this;
				args = arguments;
				if (remaining <= 0 || remaining > wait) {
				if (timeout) {
					clearTimeout(timeout);
					timeout = null;
				}
				previous = _now;
				result = func.apply(context, args);
				if (!timeout) context = args = null;
				} else if (!timeout && options.trailing !== false) {
				timeout = setTimeout(later, remaining);
				}
				return result;
			};

			throttled.cancel = function() {
				clearTimeout(timeout);
				previous = 0;
				timeout = context = args = null;
			};

			return throttled;
		},

		/**
		 * Uppercases the first letter in a string
		 *
		 * @param 	{string} 	fromString 		String to use
		 * @returns {string}	String with first letter uppercased
		 */
		uppercaseFirst = function (fromString) {
			return fromString.charAt(0).toUpperCase() + fromString.slice(1);
		},

		/**
		 * Given a comma-delimited string, returns a string that can be used as a selector for IDs
		 *
		 * @param	{array,string} 	list 	Array of values, or comma-delimited string
		 * @returns {mixed}	 Selector string in format: #value1, #value2, or false if no values
		 */
		getIDsFromList = function (list) {
			if( !list ){
				return '';
			}
			
			if( !Array.isArray( list ) ){
				list = list.toString().split(',');
			}

			list = list.filter(Boolean);

			if( !list.length ){
				return false;
			}

			return list.map(val => '#' + val).join(',');
		},
		
		/**
		 * Get a citation for a quote
		 *
		 * @param	{object} 	data 			The quote data
		 * @param	{bool}		[html]			If this can include HTML
		 * @param	{string}	[defaultValue]	The default value of the quote
		 *
		 * @returns {string}
		 */
		getCitation = function(data, html, defaultValue) {
			let citation = defaultValue || ips.getString('editorQuote');

			if (data.username) {
				let username = data.username;
				if ( html && data.userid && ips.getSetting('viewProfiles') ) {
					username = ips.templates.render( 'core.editor.citationLink', {
						baseURL: ips.getSetting('baseURL'),
						userid: data.userid,
						username: data.username
					} );
				} else {
					username = ips.utils.escapeHTML( username );
				}
				if (data.timestamp) {
					citation = ips.getString( 'editorQuoteLineWithTime', {
						date: ips.utils.time.readable( data.timestamp ),
						username: username
					});
				} else {
					citation = ips.getString( 'editorQuoteLine', { username: username } );
				}
			}
			return citation;
		},

		escapeRegexp = function (toEscape) {
			return toEscape.replace( /[.*+?^${}()|[\]\\]/g, "\\$&" );
		},

		/**
		 * A replacement for _.escape from Underscore JS
		 * Escapes a HTML string
		 * 
		 * @param {string} toEscape - The HTML string.
 		 * @returns {string} The escaped string.
		 */
		escapeHTML = function (toEscape) {
			return String(toEscape)
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#x27;");
		},

		/**
		 * A replacement for _.unescape from Underscore JS
		 * Converts HTML-escaped entities back into their character equivalents.
		 * 
		 * @param {string} toEscape - The escaped HTML string.
 		 * @returns {string} The unescaped string.
		 */
		unescapeHTML = function (toEscape) {
			return String(toEscape)
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#x27;");
		},

		/**
		 * urlBase64ToUint8Array
		 * 
		 * @param {string} base64String a public vavid key
		 */
		urlBase64ToUint8Array = function (base64String) {
			var padding = '='.repeat((4 - base64String.length % 4) % 4);
			var base64 = (base64String + padding)
				.replace(/\-/g, '+')
				.replace(/_/g, '/');

			var rawData = window.atob(base64);
			var outputArray = new Uint8Array(rawData.length);

			for (var i = 0; i < rawData.length; ++i) {
				outputArray[i] = rawData.charCodeAt(i);
			}
			return outputArray;
		};

		return {
			argsToArray: argsToArray,
			debounce: debounce,
			throttle: throttle,
			uppercaseFirst: uppercaseFirst,
			getIDsFromList: getIDsFromList,
			getCitation: getCitation,
			escapeRegexp: escapeRegexp,
			escapeHTML: escapeHTML,
			unescapeHTML: unescapeHTML,
			urlBase64ToUint8Array: urlBase64ToUint8Array
		};
	});
}(jQuery));