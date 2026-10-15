/* global ips, _ */
/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.autoCheck.js -Enables easy 'filtering' of checkboxes in tables
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.autoCheck', function(){

		var defaults = {};

		var respond = function (elem, options) {
			if( !$( elem ).data('_autoCheck') ){
				$( elem ).data('_autoCheck', autoCheckObj(elem, { ...defaults, ...options } ) );
			}
		},

		/**
		 * Destruct the autoCheck widgets in elem
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {void}
		 */
		destruct = function (elem) {
			var obj = getObj( elem );

			if( obj !== undefined ){
				obj.destruct();
			}
		},

		/**
		 * Retrieve the autoCheck instance (if any) on the given element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {mixed} 	The autocheck instance or undefined
		 */
		getObj = function (elem) {
			if( $( elem ).data('_autoCheck') ){
				return $( elem ).data('_autoCheck');
			}

			return undefined;
		};

		ips.ui.registerWidget('autoCheck', ips.ui.autoCheck, 
			[ 'context' ]
		);

		return {
			respond: respond,
			getObj: getObj,
			destruct: destruct
		};
	});

	/**
	 * autoCheck instance
	 *
	 * @param	{element} 	elem 		The element this widget is being created on
	 * @param	{object} 	options 	The options passed into this instance
	 * @returns {void}
	 */
	var autoCheckObj = function (elem, options) {
		/**
		 * Store a count of items from other pages
		 */
		var initialCount = 0;

		/**
		 * Sets up this instance
		 *
		 * @returns 	{void}
		 */
		var init = function () {
			if( options.context && $( options.context ).length ){
				elem.on('menuItemSelected', clickedMenu); // Watch for the menu event
				$( options.context ).on( 'change', 'input[type="checkbox"][data-state]', _updateCount);
			}

			elem.on('refresh.autoCheck', refresh);
			elem.on('setInitialCount.autoCheck', setInitialCount);
			elem.find('[data-role="autoCheckCount"]').hide();
		},

		/**
		 * Destruct
		 * Removes event handlers assosciated with this instance
		 *
		 * @returns {void}
		 */
		destruct = function () {
			if( options.context ){
				$( options.context ).off( 'change', 'input[type="checkbox"][data-state]', _updateCount );
			}
		},

		/**
		 * Refreshes the autocheck
		 *
		 * @returns {void}
		 */
		refresh = function () {
			_updateCount();
		},

		/**
		 * Set the initial count
		 *
		 * @returns {void}
		 */
		setInitialCount = function ( e, data ) {
			initialCount = data.count;
			_updateCount();
		},

		/**
		 * One of the selection options has been chosen from the menu
		 *
		 * @param	{event} 	e 			The event object
		 * @param	{object} 	data 		The event data object from the menu widget
		 * @returns {void}
		 */
		clickedMenu = function (e, data = e.detail) {
			
			if( data.originalEvent !== undefined ){
				data.originalEvent.preventDefault();
			}

			// Make sure we have a value
			if( !data.selectedItemID ){
				return;
			}

			var checkboxes = $( options.context ).find(':checkbox[data-state]');

			if( data.selectedItemID == 'all' ){
				checkboxes.prop( 'checked', true );
			} else if( data.selectedItemID == 'none' ){
				checkboxes.prop( 'checked', false );
			} else {
				checkboxes
					.prop( 'checked', false )
					.filter( '[data-state~="' + data.selectedItemID + '"]' )
						.prop( 'checked', true );
			}

			// Trigger an event
			checkboxes.trigger('change');

			var count = _updateCount();

			// Trigger an event
			elem.trigger('autoChecked', {
				menu: elem,
				currentFilter: data.selectedItemID,
				count: count
			});
		},

		/**
		 * Updates the count of selected items
		 *
		 * @returns {number}	Count of selected items
		 */
		_updateCount = function () {
			var checkboxes = $( options.context ).find(':checkbox[data-state]');

			// Now get an up to date count
			var count = $( options.context ).find(':checkbox[data-state]:checked');

			if( count.length == checkboxes.length && checkboxes.length !== 0 ){
				elem.find('.cAutoCheckIcon').html('<i class="fa-solid fa-check-square"></i>');
			} else if( count.length === 0 ){
				elem.find('.cAutoCheckIcon').html('<i class="fa-regular fa-square"></i>');
			} else {
				elem.find('.cAutoCheckIcon').html('<i class="fa-solid fa-minus-square"></i>');
			}

			var countToDisplay = count.length + initialCount;

			if( countToDisplay ){
				elem.find('[data-role="autoCheckCount"]').text( countToDisplay ).show();
			} else if( elem.find('[data-role="autoCheckCount"]').is(':visible') ) {
				// We use a timeout because more than one setInitialCount call can be sent, so if a 0 comes in and then a 1, the fadeout will take
				// too long and a hide() call will occur after the show() call above since the fadeOut takes time.
				setTimeout( function(){
					if( !initialCount )
					{
						ips.utils.anim.go( 'fadeOut', elem.find('[data-role="autoCheckCount"]') );
					}
				}, 300 );
			}

			return count.length;
		};

		init();

		return {
			destruct: destruct,
			refresh: refresh
		};
	};

}(jQuery));