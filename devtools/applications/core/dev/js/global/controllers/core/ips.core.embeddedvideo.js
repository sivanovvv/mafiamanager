/**
 * IPS Social Suite 4
 * (c) 2018 Invision Power Services - http://www.invisionpower.com
 *
 * ips.core.embeddedVideo.js - Simple controller to swap an embedded video out for the link if the source is not supported
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.core.embeddedvideo', {
		
		initialize: function () {
			// Normally, videos will be lazy loaded automatically in content. However,
			// we need to retain this controller for legacy content, as well as saved
			// editor content which won't yet have the lazy load attributes applied.

			// The code here is slightly different, since we dealing directly with the src 
			// attribute here rather than our data-video-src lazyload attributes. Be sure
			// any future functionality changes are applied in both areas.
			var video = this.scope.get(0);
			var canPlay = false;
			
			this.scope.find('source').each( function () {
				if( video.canPlayType( $(this).attr('type') ) ){
					canPlay = true;
				}
			});	
			
			if( !canPlay ) {
				if( this.scope.find('embed').length ){
					this.scope.replaceWith( this.scope.find('embed') );
				} else {
					this.scope.replaceWith( $(this.scope).find('a') );
				}
			}
		}		
	});
}(jQuery));