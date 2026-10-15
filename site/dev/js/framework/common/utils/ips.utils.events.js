/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.events.js - A module for working with events
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.events', function () {

		/**
		 * Fires a manual event on an element
		 *
		 */
		var manualEvent = function (element, ev) {
			if (element && typeof element.each === 'function') {
				element.each(function () {
					_fireEvent(this, ev);
				});
			} else {
				_fireEvent(element, ev);
			}
		},

		/**
		 * Simple test to determine if this is a touch browser
		 *
		 * @returns	boolean
		 */
		isTouchDevice = function () {
			return ( ('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0) );
		},

		/**
		 * Returns the correct Page Visibility API event
		 *
		 * @returns string
		 */
		getVisibilityEvent = function () {
			if( document.hidden !== undefined ){
				return 'visibilitychange';
			} else if( document.mozHidden !== undefined ){
				return 'mozvisibilitychange';
			} else if( document.msHidden !== undefined ){
				return 'msvisibilitychange';
			} else if( document.webkitHidden !== undefined ){
				return 'webkitvisibilitychange';
			}

			return '_unsupported';
		},

		/**
		 * Returns the correct Page Visibility API property
		 *
		 * @returns string or undefined
		 */
		getVisibilityProp = function () {
			if( document.hidden !== undefined ){
				return 'hidden';
			} else if( document.mozHidden !== undefined ){
				return 'mozHidden';
			} else if( document.msHidden !== undefined ){
				return 'msHidden';
			} else if( document.webkitHidden !== undefined ){
				return 'webkitHidden';
			}

			return undefined;
		},

		/**
		 * Does the actual firing
		 *
		 */
		_fireEvent = function (element, ev) {
			if( document.createEvent ) {
				var evObj = document.createEvent('MouseEvents');
				evObj.initEvent( ev, true, false );
				element.dispatchEvent( evObj );
			} else if ( document.createEventObject ) {
				var evObj = document.createEventObject();
				element.fireEvent( 'on' + evt, evObj );
			}
		};
		
		return {
			manualEvent: manualEvent,
			isTouchDevice: isTouchDevice,
			getVisibilityEvent: getVisibilityEvent,
			getVisibilityProp: getVisibilityProp
		};
	});
}(jQuery));