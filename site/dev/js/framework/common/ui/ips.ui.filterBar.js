/* global ips, _ */
/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.filterBar.js - Filter bar widget
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.filterBar', function(){

		var defaults = {
			on: 'phone,tablet',
			viewDefault: 'filterContent'
		};

		/**
		 * Respond to a menu trigger being clicked
		 *
		 * @param	{element} 	elem 		The element this widget is being created on
		 * @param	{object} 	options 	The options passed into this instance
		 * @param	{event} 	e 		 	The event object
		 * @returns {void}
		 */
		var respond = function (elem, options) {
			if( !$( elem ).data('_filterBar') ){
				$( elem ).data('_filterBar', filterBarObj(elem, { ...defaults, ...options } ) );
			}
		},

		/**
		 * Retrieve the filterBar instance (if any) on the given element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {mixed} 	The filterBar instance or undefined
		 */
		getObj = function (elem) {
			if( $( elem ).data('_filterBar') ){
				return $( elem ).data('_filterBar');
			}

			return undefined;
		},

		/**
		 * Destruct this widget on this element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {void}
		 */
		destruct = function (elem) {
			var obj = getObj( elem );

			if( obj !== undefined ){
				obj.destruct();
			}
		};

		ips.ui.registerWidget( 'filterBar', ips.ui.filterBar, [ 'on', 'viewDefault' ] );

		return {
			respond: respond,
			destruct: destruct,
			getObj: getObj
		};
	});

	/**
	 * Filter bar instance
	 *
	 * @param	{element} 	elem 		The element this widget is being created on
	 * @param	{object} 	options 	The options passed into this instance
	 * @returns {void}
	 */
	var filterBarObj = function (elem, options) {

		var filterBar = null;
		var filterContent = null;
		var currentlyShowing = null;

		/**
		 * Sets up this instance
		 *
		 * @returns 	{void}
		 */
		var init = function () {
			
			filterBar = elem.find('[data-role="filterBar"]');
			filterContent = elem.find('[data-role="filterContent"]');

			// Widget events
			elem
				.on( 'switchTo.filterBar', function (e, data) {				
					_switchView( data.switchTo );
				})
				.on( 'click', '[data-action="filterBarSwitch"]', _switchToggle );


			_setUpBar();
		},

		/**
		 * Destruct the instance
		 *
		 * @returns {void}
		 */
		destruct = function () {
			
		},

		/**
		 * Sets up the filter bar on widget initialization
		 *
		 * @returns 	{void}
		 */
		_setUpBar = function () {
			if( options.viewDefault == 'filterBar' ){
				currentlyShowing = 'filterBar';
			} else {
				currentlyShowing = 'filterContent';
			}
		},

		/**
		 * A manual toggle by the user (e.g. clicking a link)
		 *
		 * @param 		{event} 	e 	Event object
		 * @returns 	{void}
		 */
		_switchToggle = function (e) {
			_switchView( $( e.currentTarget ).attr('data-switchTo') == 'filterBar' ? 'filterBar' : 'filterContent' );
		},

		/**
		 * Toggles the current view from filters to content or vice-versa
		 *
		 * @param 		{string} 	switchTo 	The view to switch to (filterBar or filterContent)
		 * @returns 	{void}
		 */
		_switchView = function (switchTo) {
			if( switchTo == currentlyShowing ){
				return;
			}

			// View transition
			if (document.startViewTransition) {
				document.startViewTransition(() => {
					elem.attr('data-ipsfilterbar-viewing', switchTo);
				});
			} else {
				// Fallback
				elem.attr('data-ipsfilterbar-viewing', switchTo);
			}

			currentlyShowing = switchTo;
		};

		init();

		return {
			init: init,
			destruct: destruct
		};
	};
}(jQuery));