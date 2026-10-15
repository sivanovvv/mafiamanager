/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.pwaLoading.js - A loading indicator for PWAs
 *
 * Author: Ehren Harber
 */
;(function($, _) {
	if (window.matchMedia('(display-mode: standalone)').matches) {
		ips.createModule('ips.ui.pwaLoading', function() {
			// Load JS when the element is identified on page load
			ips.ui.registerWidget('pwaLoading', false);
		});
	}
}(jQuery));