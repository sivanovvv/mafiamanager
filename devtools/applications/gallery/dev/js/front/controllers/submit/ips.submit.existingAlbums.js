/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.submit.existingAlbums.js - Allows user to select an existing gallery album
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('gallery.front.submit.existingAlbums', {
		/**
		 * Initialization method
		 *
		 * @returns {void}
		 */
		initialize: function () {
			this.on( 'click', '#elGallerySubmit_albumChooser > li', this.clickAlbum );
			this.clickAlbum();
		},

		/**
		 * Checks whether any radios are selected, and enables/disables the submit button as needed
		 *
		 * @returns {void}
		 */
		clickAlbum: function (e) {
			if( this.scope.find('[name="existing_album"]:checked').length ){
				this.scope.find('[type="submit"]').prop( 'disabled', false );
			} else {
				this.scope.find('[type="submit"]').prop( 'disabled', true );
			}
		}
	});
}(jQuery));