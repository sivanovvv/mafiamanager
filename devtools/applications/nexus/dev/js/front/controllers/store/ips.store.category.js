/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.store.category.js - Category screen
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('nexus.front.store.category', {

		_ajaxObj: null,

		initialize: function () {
			this.on( 'click', '[data-action="filter"],[data-page]', this.changeView );
			this.setup();
		},

		/**
		 * Controller setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			ips.utils.history.replaceState( { controller: 'storeCategoryView' }, 'nexus.front.store.category', window.location.href );
			window.addEventListener('historychange:nexus.front.store.category', e => this.stateChange(e) );
		},

		/**
		 * Changes the calendar view dynamically
		 *
		 * @param 	{Event} 	e 	Event object
		 * @returns {void}
		 */
		changeView: function (e) {
			e.preventDefault();

			if ( $(e.target).hasClass('ipsSideMenu_item') ) {
				$(e.target).toggleClass('ipsSideMenu_itemActive');
			}

			// Load the url via ajax instead
			const url = $( e.currentTarget ).attr('href');

			ips.utils.history.pushState( { controller: 'storeCategoryView' }, 'nexus.front.store.category', $(e.currentTarget).attr('href') );
		},

		/**
		 * Event handler for history state changes
		 *
		 * @returns {void}
		 */
		stateChange: function () {
			const url = window.location.href;

			if (!('nexus.front.store.category' in ips.utils.history.getState())) {
				return;
			}

			// Track page view
			ips.utils.analytics.trackPageView( url );

			this._updateView( url )
		},

		/**
		 * Loads a new view
		 *
		 * @param 	{string} 	url 	URL to load
		 *
		 * @returns {Promise<void>}
		 */
		async _updateView(url) {
			if( this._ajaxObj && (typeof this._ajaxObj.abort === "function" ) ){
				this._ajaxObj.abort();
			}

			this._setLoading( true );

			try {
				const response = await ips.fetch(url)
				$('[data-role="packageListContainer"]').html(response.contents);
				$('[data-role="categorySidebar"]').html(response.sidebar);
				$(document).trigger('contentChange', [$('[data-role="packageListContainer"]'), $('[data-role="categorySidebar"]')]);
			} catch (e) {
				Debug.log(`Failed to fetch data for a nexus store category after a filter/sort/view update from ${url}`)
				Debug.warn(e)
			}
			this._setLoading(false)
		},

		/**
		 * Toggles the loading state on the view
		 *
		 * @param 	{boolean} 	state 		Enable the loading state?
		 * @returns {void}
		 */
		_setLoading: function (state) {
			if( state ){
				$('[data-role="packageList"]').css( 'height', $('[data-role="packageList"]').height() ).html('').addClass('ipsLoading');
			} else {
				$('[data-role="packageList"]').css( 'height', 'auto' ).removeClass('ipsLoading');
			}
		}
	});
}(jQuery));