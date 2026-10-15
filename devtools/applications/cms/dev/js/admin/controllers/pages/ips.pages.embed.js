/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.pages.embed.js - Pages embed dialog
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('cms.admin.pages.embed', {

		initialize: function () {
			this.on( 'change', '[type="checkbox"]', this.toggleInherit );
		},

		/**
		 * Event handler for toggling the 'inherit styles' check
		 *
		 * @param 		{event} 	e 		Event object
		 * @returns 	{void}
		 */
		toggleInherit: function (e) {
			var toggle = this.scope.find('[type="checkbox"]');
			var textbox = this.scope.find('[data-role="blockCode"]');

			if( toggle.is(':checked') ){
				textbox.val( textbox.val().replace("></div>", " data-inheritStyle='true'></div>") );
			} else {
				textbox.val( textbox.val().replace(" data-inheritStyle='true'></div>", "></div>") );
			}
		}
	});
}(jQuery));