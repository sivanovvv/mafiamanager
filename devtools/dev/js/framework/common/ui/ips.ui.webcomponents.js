/**
* Invision Community
* (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
*
* ips.ui.webcomponents.js - Module to register all ad-hoc web components
*
* Author: Matt Finger
*/
;(function($, _) {
	[
		"announcementBanner",
		"card",
		"carouselNavigation",
		"cookieConsent",
		"dropdown",
		"latex",
		"latexNodeview",
		"navigationMenu",
		"navigationPanel",
		"pushNotificationsPrompt",
		"pwaInstall",
		"themeEditor",
		"tooltip",
	].forEach(component => {
		ips.createModule(`ips.ui.${component}`, function() {
			// Load JS when the element is identified on page load
			ips.ui.registerWidget(component, false);
			return {};
		});
	});
}(jQuery));