/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.links.js - A module for working with links
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.links', function () {

		/**
		 * Fires a manual event on an element
		 */
		var updateExternalLinks = function (element) {            
			if( ips.getSetting('links_external') ) {
				if( element === undefined ){
					return;
				}
				
				element.find('a[rel*="external"]').each( function( index, elem ){
					elem.target = "_blank";
					elem.rel = elem.rel.replace(" noopener", "") + " noopener";
				});
			}
		};
		
		return {
			updateExternalLinks: updateExternalLinks
		};
	});
}(jQuery));