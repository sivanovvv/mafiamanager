/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.mobileNav.js - ACP mobile navigation
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.core.mobileNav', {

		initialize: function () {
			this.on( document, 'click', '[data-role="clearCaches"]', this.clearCaches );
		},

		/**
		 * Callback when we click the "clear caches" button.
		 *
		 * @returns {void}
		 */
		clearCaches: function( e ) {
			e.preventDefault();

			var self = this;
			ips.getAjax()( '?app=core&module=support&controller=support&do=clearCaches' )
				.done( function( response ) {
					ips.ui.flashMsg.show( ips.getString( 'health_caches_cleared' ) );
				});
		}
	});
}(jQuery));