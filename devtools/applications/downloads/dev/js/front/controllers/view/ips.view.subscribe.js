/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.view.subscribe.js - Controller to handle subscribing to new version updates
 *
 * Author: Andrew Millne
 */
;( function($){
	"use strict";

	ips.controller.register('downloads.front.view.subscribe', {

		ajaxObj: null,

		/**
		 * Initialize controller events
		 *
		 * @returns 	{void}
		 */
		initialize: function () {
			this.on( 'click', '[data-action="subscribe"]', this.toggle );
		},

		/**
		 * Subscribe
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		toggle: function (e) {
			e.preventDefault();

			var self = this;
			var clicked = $( e.currentTarget );


			clicked.addClass('i-opacity_3');

			ips.getAjax()( clicked.attr('href') )
				.done( function (response) {
					if( !response.error ) {
						if( response == 'unsubscribed' )
						{
							clicked.removeClass( 'ipsButton--primary' );
							clicked.addClass( 'ipsButton--text' );
							clicked.text( ips.getString('file_subscribe')  );
						}
						else
						{
							clicked.addClass( 'ipsButton--primary' );
							clicked.removeClass( 'ipsButton--text' );
							clicked.text( ips.getString('file_unsubscribe')  );
						}
					}

				})
				.always( function () {
					clicked.removeClass('i-opacity_3');
				});
		}
	});
}(jQuery));