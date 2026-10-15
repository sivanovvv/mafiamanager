/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.webshare.js - Controller for WebShare API
 *
 * Author: Ryan Ashbrook
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.core.webshare', {
		/**
		 * Initialize controller events
		 * Sets up the events from the view that this controller will handle
		 *
		 * @returns 	{void}
		 */
		initialize: function () {
			if ( navigator.share ){
				this._render();
				this.on( 'click', this.initShare );
			}
		},
		
		/**
		 * Render share API
		 *
		 * @returns	{void}
		 */
		_render: function() {
			$('[data-role="webShare"]').removeClass( 'ipsHide' );
		},
		
		/**
		 * Event handler for WebShare
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		initShare: function (e) {
			try {
				//var data = JSON.parse( this.scope.attr( 'data-webShareData' ) );
				navigator.share( {
					title: this.scope.attr( 'data-webShareTitle' ),
					text: this.scope.attr( 'data-webShareText' ),
					url: this.scope.attr( 'data-webShareUrl' )
				} );
			} catch (err) {
				Debug.log("Failed to use web share API: ", err);
			}
		}

	});

}(jQuery));