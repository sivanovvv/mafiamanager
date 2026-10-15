/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.view.changeLog.js - Changelog controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('downloads.front.view.changeLog', {

		initialize: function () {
			this.on( 'menuItemSelected', this.changeVersion );
			this.setup();

			// Primary event that watches for URL changes
			this.on( window, 'historychange:downloads.front.view.changeLog', this.stateChange );
		},

		/**
		 * Setup method
		 * Sets an initial state that we can use to go back to the default state
		 *
		 * @returns 	{void}
		 */
		setup: function () {
			// Update page URL
			ips.utils.history.replaceState( {
				controller: 'changelog'
			}, 'downloads.front.view.changeLog', window.location.href );
		},

		/**
		 * Updates the version changelog being shown
		 *
		 * @param 		{event} 	e 		Event object
		 * @param 		{object} 	data 	Event data object from the menu
		 * @returns 	{void}
		 */
		changeVersion: function (e, data = e.detail) {
			data.originalEvent.preventDefault();

			var url = $(data.menuElem).find('[data-ipsMenuValue="' + data.selectedItemID + '"]').attr('href');

			// Update page URL
			ips.utils.history.pushState( {
				controller: 'changelog',
				version: data.selectedItemID
			}, 'downloads.front.view.changeLog', url );

			this._loadVersion( url, $(data.menuElem).find('[data-ipsMenuValue="' + data.selectedItemID + '"]').attr('data-changelogTitle') );
		},

		/**
		 * Event handler for History.js
		 * When the state changes, we locate that menu item based on the version, and then pull
		 * the version string and URL and load it
		 *
		 * @returns 	{void}
		 */
		stateChange: function () {
			const state = ips.utils.history.getState('downloads.front.view.changeLog')

			// Other things on the page can change the URL, so make sure this is a changelog url
			if (!state || !Object.keys(state).length) {
				return;
			}

			let item;

			if (state.version) {
				item = $('#elChangelog_menu').find('[data-ipsMenuValue="' + state.version + '"]');
			} else {
				item = $('#elChangelog_menu').find('[data-ipsMenuValue]').first();
			}

			this._loadVersion( item.attr('href'), item.attr('data-ipsMenuValue') );
		},

		/**
		 * Loads version information
		 *
		 * @param 		{string} 	url 			URL of the version to load
		 * @param 		{string} 	versionTitle 	Title of version being loaded
		 * @returns 	{void}
		 */
		_loadVersion: function (url, versionTitle) {
			var self = this;

			// Update version
			this.scope.find('[data-role="versionTitle"]').text( versionTitle );

			// Set height on info area and set to loading
			this.scope
				.find('[data-role="changeLogData"]')
					.css( {
						height: this.scope.find('[data-role="changeLogData"]').height() + 'px'
					})
					.addClass('ipsLoading')
					.html('');


			// Load the new data
			ips.getAjax()( url )
				.done( function (response) {
					self.scope
						.find('[data-role="changeLogData"]')
							.html( response )
							.removeClass('ipsLoading')
							.css({
								height: 'auto'
							});
				})
				.fail( function (jqXHR, textStatus, errorThrown) {
					window.location = url;
				});
		}
		
	});
}(jQuery));