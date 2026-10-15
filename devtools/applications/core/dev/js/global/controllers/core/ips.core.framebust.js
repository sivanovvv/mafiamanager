/**
 * IPS Social Suite 4
 * (c) 2013 Invision Power Services - http://www.invisionpower.com
 *
 * ips.core.framebust.js - Frame Busting
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.core.framebust', {

		initialize: function () {
			if ( top != self ) {
				$(this.scope).html('');
			}
		}
		
	});
}(jQuery));