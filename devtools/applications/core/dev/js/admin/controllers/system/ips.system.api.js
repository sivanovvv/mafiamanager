/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.api.js - API Docs controller
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.system.api', {

		initialize: function () {
			this.on( 'click', '[data-action="showEndpoint"]', this.showEndpoint );
		},

		/**
		 * Dynamically loads an endpoint reference
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		showEndpoint: function (e) {
			e.preventDefault();

			var self = this;
			var url = $( e.currentTarget ).attr('href');

			// Make all endpoints inactive
			this.scope.find('.cApiTree_activeNode').removeClass('cApiTree_activeNode');

			// Make this one active
			$( e.currentTarget ).parent('li').addClass('cApiTree_activeNode');

			// Set the content area to loading
			this.scope.find('[data-role="referenceContainer"]')
				.html( 
					$('<div/>')
						.addClass('ipsLoading')
						.css({ height: '300px' })
				);

			ips.getAjax()( url )
				.done( function (response) {
					self.scope.find('[data-role="referenceContainer"]')
						.html( response )
				})
				.fail( function () {
					window.location = url;
				});

			// Scroll the content area into view
			this.scope.find('[data-role="referenceContainer"]')[0].scrollIntoView({ behavior: "smooth" });
		}
	});
}(jQuery));