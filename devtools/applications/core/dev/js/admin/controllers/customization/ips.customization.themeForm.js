/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * Author: Matt Mecham
 */

;( function($){
	"use strict";

	ips.controller.register('core.admin.customization.themeForm', {

		initialize: function () {
			this.headerFooterCssFieldSetUp();
		},

		
		/**
		 * Tweaks the form
		 *
		 */
		headerFooterCssFieldSetUp: function () {
			$('#theme_header').addClass('ipsFieldRow--fullWidth');
			$('#theme_footer').addClass('ipsFieldRow--fullWidth');
			$('#theme_css').addClass('ipsFieldRow--fullWidth');
		}
	});
}(jQuery));