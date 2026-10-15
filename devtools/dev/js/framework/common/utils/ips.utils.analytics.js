/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.utils.analytics.js - Analytics helper methods
 *
 * Author: Rikki Tissier
 */

;( function($){
	"use strict";
	
	ips.createModule('ips.utils.analytics', function () {

		/**
		 * Initialize analytics module
		 *
		 * @returns 	{void}
		 */
		var init = function () {

		},

		trackPageView = function (url) {
			try {
				if( ips.getSetting('googleAnalyticsEnabled') ){
					if( window.ga !== undefined ){
						var urlObj = ips.utils.url.getURIObject( url || document.location );
						Debug.log("Manual page view tracked with Google Analytics: " + urlObj.relative);
						ga('send', 'pageview', urlObj.relative);
					}
				}
				
				if( ips.getSetting('matomoEnabled') ){
					if( !_isUndefined( window._paq ) ){
						Debug.log("Manual page view tracked with Matomo");
						_paq.push(['trackPageView']);
					}
				}
				
				if( typeof ips.getSetting('paginateCode') === "function" ){
					ips.getSetting('paginateCode').call(url);
				}
			} catch (err) {
				Debug.log("Error tracking page view: " + err);
			}
		};

		return {
			init: init,
			trackPageView: trackPageView
		};
	});

}(jQuery));