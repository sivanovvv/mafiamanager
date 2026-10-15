/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.db.js - A module for writing to per-user storage
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.db', function () {

		let enabled = null;
		let sessionStorageSupported = null;
		const expirations = {};

		function init(queryString) {
			enabled = isEnabled();
		}

		/**
		 * Sets a record in storage
		 *
		 * @param	{string} 	type 	 	Category to store in
		 * @param 	{string} 	key 		Key for this value
		 * @param 	{*} 		value 		Value to store - must be JSON serializable
		 * @param	{boolean}		[isPrivate = false]		If TRUE, and the member has not used the "Remember Me" setting to log in, the value will be stored in session storage rather than persistant storage
		 * @param 	{number|null}	[expire=null]			When the value is no longer valid. The value is a UNIX Timestamp (second precision, not ms precision)
		 * @returns {void}
		 */
		function set(type, key, value, isPrivate, expire=null) {
			if( enabled ){
				var storageEngine = localStorage;
				
				if ( isPrivate && ( ips.getSetting('isAcp') !== undefined || ( ips.utils.cookie.get('login_key') === undefined && ( ips.getSetting('cookie_prefix') + ips.utils.cookie.get('login_key') ) === undefined ) ) && sessionStorageIsSupported() ) {
					storageEngine = sessionStorage;
				}
				
				if( value ){
					try {
						storageEngine.setItem( type + '.' + key, JSON.stringify( value ) );
					} catch (err) {}

					if (!type.startsWith('__expirations__:')) {
						setExpiration(type, key, typeof expire === 'number' ? expire : undefined);
					}
				} else {
					storageEngine.removeItem( type + '.' + key );
				}
			}
		}

		/**
		 * Sets a record in storage
		 * If no key is specified, all items in the category are returned
		 *
		 * @param	{string} 	type 	 	Category to get
		 * @param 	{string} 	[key] 		Key of value to get
		 * @returns {*} 	If key is omitted, returns object containing all values, otherwise returns original value
		 */
		function get(type, key) {
			if (!type.startsWith('__expirations__:')) {
				const {[key]: expiration} = getExpirations(type);
				if (typeof expiration === 'number' && expiration < Date.now() / 1000) {
					setExpiration(type, key, expiration);
					return null;
				}
			}

			if( key === undefined ){
				return getByType( type );
			}

			var val = localStorage.getItem( type + '.' + key );
			if ( val === null && sessionStorageIsSupported() ) {
				val = sessionStorage.getItem( type + '.' + key );
			}

			try {
				return JSON.parse( val );
			} catch(err) {
				return val;
			}
		}

		/**
		 * Get the expirations object for a db type
		 *
		 * @param {string}	type
		 *
		 * @return {{[p:string]: number}} Returns an object mapping the type's keys to their expiration values. Keys not in the object are not set to expire
		 */
		function getExpirations(type) {
			if (!expirations[type]) {
				try {
					expirations[type] = get("__expirations__:" + type, '');
					if (!expirations[type] || typeof expirations[type] !== 'object') {
						throw new TypeError();
					}
				} catch (e) {
					expirations[type] = {};
				}
			}
			return expirations[type];
		}

		/**
		 * Set the expiration for a given type and key
		 *
		 * @param {string}	type
		 * @param {string}	key
		 * @param {number|undefined}	expiration
		 */
		function setExpiration(type, key, expiration) {
			const _expirations = getExpirations(type);
			if (typeof expiration === 'number') {
				_expirations[key] = expiration;
				if (expiration < Date.now() / 1000) {
					delete _expirations[key];
					remove(type, key);
				}
			} else {
				delete _expirations[key];
			}

			expirations[type] = _expirations
			if (Object.keys(_expirations).length) {
				set("__expirations__:" + type, '', _expirations);
			} else {
				remove('__expirations__:' + type);
			}
		}

		/**
		 * Removes values from storage
		 * If no key is specified, all items in the category are removed
		 *
		 * @param	{string} 	type 	 	Category to remove
		 * @param 	{string} 	[key] 		Key of value to remove
		 * @returns {void, number} 	If key is omitted, returns count of removed items, otherwise returns void
		 */
		function remove(type, key) {
			if( key === undefined ){
				removeByType( type );
				return;
			}

			localStorage.removeItem( type + '.' + key );
			if ( sessionStorageIsSupported() ) {
				sessionStorage.removeItem( type + '.' + key );
			}
		}

		/**
		 * Returns all values for the given category
		 *
		 * @param	{string} 	type 	 	Category to return
		 * @returns {object} 	Key/value pairs of each value in the category
		 */
		function getByType(type) {
			try {
				var results = {};
				
				if ( sessionStorageIsSupported() && sessionStorage.length ) {
					for( var key in sessionStorage ){
						if( key.startsWith( type + '.' ) ){
							var actualKey = key.replace( type + '.', '' );
							results[ actualKey ] = get( type, actualKey );
						}
					}
				}
				
				if ( localStorage.length ) {
					for( var key in localStorage ){
						if( key.startsWith( type + '.' ) ){
							var actualKey = key.replace( type + '.', '' );
							results[ actualKey ] = get( type, actualKey );
						}
					}
				}
	
				return results;
			} catch(e) {
				return {};
			}
		}

		/**
		 * Removes all values in the given category
		 *
		 * @param	{string} 	type 	 	Category to return
		 * @returns {number} 	Number of values removed
		 */
		function removeByType(type) {
			var count = 0;
						
			for( var key in getByType(type) ){
				remove( type, key );
				count++;
			}

			return count;
		}

		/**
		 * Returns boolean indicating if localStorage is available
		 *
		 * @returns {boolean}
		 */
		function isEnabled() {
			if( typeof enabled !== 'boolean' ){
				try {
					if( 'localStorage' in window && window['localStorage'] !== null && window.JSON ){
						return _testEnabled();
					} else {
						return false;
					}
				} catch (e) {
					return false;
				}
			} else {
				return enabled;
			}
		}

		/**
		 * Tests whether using localstorage will trigger a QuotaExceeded error
		 *
		 * @returns {boolean}
		 */
		function _testEnabled() {
			try {
				localStorage.setItem('test', 1);
				localStorage.removeItem('test');
			} catch (err) {
				Debug.log("Writing to localstorage failed");
				return false;
			}

			return true;
		}
		
		/**
		 * Returns boolean indicating if sessionStorage is available
		 *
		 * @returns {boolean}
		 */
		function sessionStorageIsSupported() {
			if( typeof sessionStorageSupported !== 'boolean' ){
				try {
					sessionStorageSupported = !!('sessionStorage' in window && window['sessionStorage'] !== null && window.JSON);
				} catch (e) {
					sessionStorageSupported = false;
				}
			}
			return sessionStorageSupported;
		}

		init();

		return {
			set,
			get: get,
			getByType: getByType,
			remove: remove,
			removeByType: removeByType,
			enabled: enabled,
			isEnabled: isEnabled
		};
	});
}(jQuery));