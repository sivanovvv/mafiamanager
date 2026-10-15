/**
 * IPS Social Suite 4
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.datetime.js - Controller to update the contents of cached <time> tags with the appropriate timezone
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.core.datetime', {

		initialize: function () {
			this.setup();
		},

		/**
		 * Setup method
		 *
		 * @returns {void}
		 */
		setup: function () {
			var formatObject = { format: $(this.scope).attr('data-format') };
			
			var localeTimeFormat = ips.utils.time.localeTimeFormat( $('html').attr('lang') );
			if ( localeTimeFormat.meridiem ) {
				formatObject.meridiem = localeTimeFormat.meridiem;
			}
			
			$(this.scope).text( ips.utils.time.formatTime( new Date( $(this.scope).attr('data-time') ), formatObject ) );
		}
		
	});
}(jQuery));