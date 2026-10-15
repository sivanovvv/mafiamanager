/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.controlStrip.js - Handles functionality for control strips (button rows) in the AdminCP
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.controlStrip', function(){

		var respond = function (elem, options) {
			if( !$( elem ).data('_controlStrip') ){
				$( elem ).data('_controlStrip', controlStripObj( elem ) );
			}
		};

		ips.ui.registerWidget( 'controlStrip', ips.ui.controlStrip );

		return {
			respond: respond
		};
	});

	/**
	 * Control strip instance
	 *
	 * @param	{element} 	elem 		The element this widget is being created on
	 * @returns {void}
	 */
	var controlStripObj = function (elem) {

		/**
		 * Sets up this instance
		 *
		 * @returns 	{void}
		 */
		var init = function () {
			// Set up the events we'll handle here
			elem
				.on( 'click', '[data-replace], [data-remove], [data-bubble]', _remoteAction );
		},

		_remoteAction = function (e) {
			e.preventDefault();
			var link = $( e.currentTarget );
			var url = link.attr('href');

			ips.getAjax()( url, {
				dataType: 'json',
				showLoading: true
			})
				.done( function (response) {
					if( link.is('[data-replace]') ){
						_replaceButton( link, response );
					} else if( link.is('[data-remove]') ){
						_removeButton( link, response );
					} else if( link.is('[data-bubble]') ){
						_bubbleAction( link, response );
					}
				})
				.fail( function () {
					window.location = url;
				});
		},

		/**
		 * Simply triggers an event that bubbles up, which can be caught by page controllers/widgets.
		 *
		 * @param	{element}	link 		Link element that was clicked
		 * @param	{object} 	response 	Response object from the ajax request
		 * @returns {void}
		 */
		_bubbleAction = function (link, response) {
			link.trigger( 'buttonAction', response );
		},

		/**
		 * Event handler for a button that replaces itself with a different button when clicked
		 *
		 * @param	{element}	link 		Link element that was clicked
		 * @param	{object} 	response 	Response object from the ajax request
		 * @returns {void}
		 */
		_replaceButton = function (link, response) {
			ips.ui.flashMsg.show( response );

			var item = link.closest('.ipsControlStrip_button, .ipsControlStrip_menuItem');
			var newItem = $('#' + link.attr('data-replacewith') );

			if( item.hasClass('ipsControlStrip_button') ){
				item.hide();
				newItem.show();
			} else {
				if( !newItem.hasClass('ipsControlStrip_menuItem') ){
					var newHTML = _getMenuItemFromButton( newItem );
					item.hide().after( newHTML );
				} else {
					item.hide();
					newItem.show();
				}
			}
		},

		/**
		 * Event handler for a button that removes itself after being clicked
		 *
		 * @param	{element} 	link 		Link element that was clicked
		 * @param	{object} 	response	Response object from the ajax request
		 * @returns {void}
		 */
		_removeButton = function (link, response) {
			ips.ui.flashMsg.show( response );

			var dropdown = $( elem ).find('[data-dropdown]');

			// Do we have any others to remove too?
			if( link.attr('data-alsoremove') ){
				var also = ips.utils.getIDsFromList( link.attr('data-alsoremove') );
			}

			// Get a jquery object containing the buttons or menu items for each item to remove
			var toRemove = $( link ).add( also || '' ).closest('.ipsControlStrip_button, .ipsControlStrip_menuItem');
			// .. and then remove them.
			toRemove.remove();

			// See if we need to remove the menu & dropdown
			if( dropdown.length ){
				var menu = $( dropdown.attr('id') + '_menu' );

				if( !menu.find('.ipsControlStrip_menuItem').length ){
					menu.remove();
					dropdown.remove();
				}
			}
		},

		/**
		 * Builds an individual menu item from a provided button
		 *
		 * @param	{element} 	button 	Button element to build from
		 * @returns {string} 	Menu item HTML
		 */
		_getMenuItemFromButton = function (button) {
			$( button ).find('[data-ipsTooltip]').removeAttr('data-ipsTooltip');

			return ips.templates.render('core.controlStrip.menuItem', {
				id: $( button ).attr('id') || '',
				item: $( button ).html()
			});
		};

		init();

		return {
		
		};
	};
}(jQuery));